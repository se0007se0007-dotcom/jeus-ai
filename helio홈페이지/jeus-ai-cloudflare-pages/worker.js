import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext/browser";

/* Jeus.ai 백엔드 Worker — 정적 자산 서빙 + 문의 게시판 API (KV 저장) + 이메일 알림 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
function s(v, n) { return String(v == null ? "" : v).trim().slice(0, n); }
function maskName(n) {
  if (!n) return "익명";
  const t = String(n).trim();
  return t.length <= 1 ? t + "*" : t[0] + "*".repeat(Math.min(3, t.length - 1));
}
// 상수 시간 비교(타이밍 공격 완화)
function timingSafeEqual(a, b) {
  a = String(a == null ? "" : a);
  b = String(b == null ? "" : b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function isAdmin(request, env) {
  const t = request.headers.get("X-Admin-Token") || "";
  return !!env.ADMIN_PASSWORD && timingSafeEqual(t, env.ADMIN_PASSWORD);
}
function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
}
// KV 기반 간이 rate limit (고정 윈도우). 한도 초과 시 false(차단). KV 미연결/IP불명 시 통과(fail-open).
async function rateLimit(env, kind, ip, limit, windowSec) {
  try {
    if (!env.INQUIRIES || !ip || ip === "unknown") return true;
    const key = "rl:" + kind + ":" + ip;
    const cur = parseInt((await env.INQUIRIES.get(key)) || "0", 10) || 0;
    if (cur >= limit) return false;
    await env.INQUIRIES.put(key, String(cur + 1), { expirationTtl: Math.max(60, windowSec) });
    return true;
  } catch (e) { return true; }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try { return await handleApi(request, env, ctx, url); }
      catch (e) { return json({ error: String((e && e.message) || e) }, 500); }
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleApi(request, env, ctx, url) {
  const p = url.pathname;
  const method = request.method;
  const kv = env.INQUIRIES;
  if (!kv) return json({ error: "저장소(KV)가 연결되지 않았습니다" }, 500);
  const ip = clientIp(request);

  // 목록 (공개: 연락처/내용 비공개)
  if (p === "/api/inquiries" && method === "GET") {
    const admin = isAdmin(request, env);
    const list = await kv.list({ prefix: "inq:" });
    const items = await Promise.all(list.keys.map(k => kv.get(k.name, "json")));
    const rows = items.filter(Boolean).sort((a, b) => b.created - a.created).map(q => ({
      id: q.id, title: q.title, author: admin ? (q.name || "익명") : maskName(q.name),
      created: q.created, answered: !!q.reply,
    }));
    return json({ rows });
  }

  // 등록 (스팸/이메일 폭탄 방지: IP당 분당 제한)
  if (p === "/api/inquiries" && method === "POST") {
    if (!(await rateLimit(env, "inq", ip, 5, 60)))
      return json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, 429);
    const b = await request.json().catch(() => ({}));
    for (const f of ["name", "phone", "email", "title", "content"]) {
      if (!b[f] || !String(b[f]).trim()) return json({ error: "필수 항목이 누락되었습니다" }, 400);
    }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const rec = {
      id, name: s(b.name, 40), phone: s(b.phone, 20), email: s(b.email, 80),
      title: s(b.title, 80), content: s(b.content, 2000),
      created: Date.now(), reply: null, reply_at: null,
    };
    await kv.put("inq:" + id, JSON.stringify(rec));
    ctx.waitUntil(notify(env, rec));
    return json({ ok: true, id });
  }

  // 상세 / 답변
  const m = p.match(/^\/api\/inquiries\/([^/]+)(\/reply)?$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const isReply = !!m[2];
    const rec = await kv.get("inq:" + id, "json");
    if (!rec) return json({ error: "문의를 찾을 수 없습니다" }, 404);

    // 삭제 (관리자 전용)
    if (method === "DELETE") {
      if (!isAdmin(request, env)) return json({ error: "관리자 인증이 필요합니다" }, 401);
      await kv.delete("inq:" + id);
      return json({ ok: true });
    }

    if (isReply) {
      if (method !== "POST") return json({ error: "허용되지 않은 메서드" }, 405);
      if (!isAdmin(request, env)) return json({ error: "관리자 인증이 필요합니다" }, 401);
      const b = await request.json().catch(() => ({}));
      if (!b.reply || !String(b.reply).trim()) return json({ error: "답변 내용이 비어 있습니다" }, 400);
      rec.reply = s(b.reply, 4000);
      rec.reply_at = Date.now();
      await kv.put("inq:" + id, JSON.stringify(rec));
      return json({ ok: true });
    }

    const admin = isAdmin(request, env);
    const out = { id: rec.id, title: rec.title, content: rec.content, name: rec.name, created: rec.created, reply: rec.reply, reply_at: rec.reply_at };
    if (admin) { out.phone = rec.phone; out.email = rec.email; }
    return json({ inquiry: out });
  }

  // 관리자 비밀번호 확인 (무차별 대입 방지: IP당 분당 제한)
  if (p === "/api/admin/login" && method === "POST") {
    if (!(await rateLimit(env, "login", ip, 8, 60)))
      return json({ error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." }, 429);
    return isAdmin(request, env) ? json({ ok: true }) : json({ error: "비밀번호가 일치하지 않습니다" }, 401);
  }

  return json({ error: "not found" }, 404);
}

// 이메일 알림 — Cloudflare Email Routing(send_email) 우선, 없으면 Resend, 둘 다 없으면 건너뜀(문의는 이미 저장됨)
function mailText(rec) {
  return "새 문의가 등록되었습니다.\n\n" +
    "제목: " + rec.title + "\n" +
    "이름/회사: " + rec.name + "\n" +
    "전화: " + rec.phone + "\n" +
    "이메일: " + rec.email + "\n\n" +
    "내용:\n" + rec.content + "\n\n" +
    "등록시각: " + new Date(rec.created).toLocaleString("ko-KR") + "\n" +
    "관리자 답변: https://jeus.ai.kr/board/?admin=1";
}

async function notify(env, rec) {
  const to = env.NOTIFY_TO || "se0007@naver.com";
  // 1) Cloudflare Email Routing
  if (env.SEND_MAIL) {
    try {
      const from = env.MAIL_FROM || "noreply@jeus.ai.kr";
      const msg = createMimeMessage();
      msg.setSender({ name: "Jeus.ai 문의", addr: from });
      msg.setRecipient(to);
      msg.setSubject("[Jeus.ai 문의] " + rec.title);
      msg.addMessage({ contentType: "text/plain", data: mailText(rec) });
      await env.SEND_MAIL.send(new EmailMessage(from, to, msg.asRaw()));
      return;
    } catch (e) { /* 라우팅 미설정/주소 미인증 시 무시 */ }
  }
  // 2) Resend (RESEND_API_KEY 설정 시)
  if (env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.NOTIFY_FROM || "Jeus.ai 문의 <onboarding@resend.dev>", to: [to], subject: "[Jeus.ai 문의] " + rec.title, text: mailText(rec), reply_to: rec.email }),
      });
    } catch (e) { /* 무시 */ }
  }
}
