/* ===========================================================================
 * Jeus.FinOps 데모 데이터 레이어
 * 백엔드(Control Plane) 없이 대시보드를 그대로 시연하기 위한 mock fetch.
 * 모든 /api/* 호출을 가로채 현실적인 샘플 데이터를 반환한다.
 * 실제 제품에서는 동일 API를 라이브 원장 데이터가 채운다.
 * =========================================================================== */
(function () {
  const T0 = Date.now() / 1000;
  const now = () => Date.now() / 1000;

  // ---- 난수 유틸 ----
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rint = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = arr => arr[rint(0, arr.length - 1)];
  // 안정적 시드 RNG (run 풀 등 새로고침에도 고정돼야 하는 데이터용)
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- 마스터 데이터 ----
  const TENANTS = ["finance-team", "support-ops", "platform-eng", "data-science", "marketing"];
  const PROVIDERS = ["OpenAI", "Anthropic", "Google", "Self-host(H100)"];

  let MODELS = [
    { model: "gpt-4o", tier: "premium", input_usd: 2.50, output_usd: 10.00, cache_read_usd: 1.250, cache_write_usd: 3.130, downgrade_to: "gpt-4o-mini", active: true, provider: "OpenAI" },
    { model: "gpt-4o-mini", tier: "economy", input_usd: 0.15, output_usd: 0.60, cache_read_usd: 0.075, cache_write_usd: 0.190, downgrade_to: null, active: true, provider: "OpenAI" },
    { model: "claude-3.5-sonnet", tier: "premium", input_usd: 3.00, output_usd: 15.00, cache_read_usd: 0.300, cache_write_usd: 3.750, downgrade_to: "claude-3.5-haiku", active: true, provider: "Anthropic" },
    { model: "claude-3.5-haiku", tier: "standard", input_usd: 0.80, output_usd: 4.00, cache_read_usd: 0.080, cache_write_usd: 1.000, downgrade_to: null, active: true, provider: "Anthropic" },
    { model: "gemini-1.5-pro", tier: "premium", input_usd: 1.25, output_usd: 5.00, cache_read_usd: 0.313, cache_write_usd: 1.560, downgrade_to: "gemini-1.5-flash", active: true, provider: "Google" },
    { model: "gemini-1.5-flash", tier: "economy", input_usd: 0.075, output_usd: 0.30, cache_read_usd: 0.019, cache_write_usd: 0.090, downgrade_to: null, active: true, provider: "Google" },
    { model: "llama-3.1-70b", tier: "economy", input_usd: 0.10, output_usd: 0.40, cache_read_usd: 0.020, cache_write_usd: 0.050, downgrade_to: null, active: true, provider: "Self-host(H100)" },
  ];
  const MODEL_NAMES = MODELS.map(m => m.model);

  let AGENTS = [
    { agent: "contract-analyzer", description: "계약서에서 PII·핵심 조항을 추출하고 요약", primary_model: "claude-3.5-sonnet", downgrade_target: "claude-3.5-haiku", semantic_cache: true, cache_ttl: 1800, downgrade_enabled: true, complexity_routing: true, tool_registry_tokens: 4200, max_cost_per_run: 0.40, max_steps: 12, sensitive: true },
    { agent: "support-copilot", description: "고객 지원 상담원 실시간 응답 보조", primary_model: "gpt-4o", downgrade_target: "gpt-4o-mini", semantic_cache: true, cache_ttl: 900, downgrade_enabled: true, complexity_routing: true, tool_registry_tokens: 2600, max_cost_per_run: 0.15, max_steps: 8, sensitive: false },
    { agent: "code-reviewer", description: "PR 코드 리뷰·정적분석·취약점 탐지", primary_model: "claude-3.5-sonnet", downgrade_target: "claude-3.5-haiku", semantic_cache: false, cache_ttl: 0, downgrade_enabled: true, complexity_routing: false, tool_registry_tokens: 5400, max_cost_per_run: 0.60, max_steps: 16, sensitive: false },
    { agent: "rag-search", description: "사내 문서 RAG 검색·근거 인용", primary_model: "gpt-4o", downgrade_target: "gpt-4o-mini", semantic_cache: true, cache_ttl: 3600, downgrade_enabled: true, complexity_routing: true, tool_registry_tokens: 1800, max_cost_per_run: 0.10, max_steps: 6, sensitive: true },
    { agent: "sql-genie", description: "자연어 → SQL 변환·실행 계획 검토", primary_model: "gemini-1.5-pro", downgrade_target: "gemini-1.5-flash", semantic_cache: true, cache_ttl: 600, downgrade_enabled: true, complexity_routing: true, tool_registry_tokens: 3100, max_cost_per_run: 0.12, max_steps: 7, sensitive: false },
    { agent: "marketing-writer", description: "캠페인 카피·블로그 초안 생성", primary_model: "gpt-4o", downgrade_target: "gpt-4o-mini", semantic_cache: true, cache_ttl: 1200, downgrade_enabled: true, complexity_routing: true, tool_registry_tokens: 900, max_cost_per_run: 0.08, max_steps: 5, sensitive: false },
  ];
  const AGENT_NAMES = AGENTS.map(a => a.agent);

  const SAVINGS_KINDS = ["semantic_cache", "prompt_cache", "routing_downshift", "skill_packer"];

  // ---- 가변 정책 상태 (토글이 화면에 반영되도록) ----
  const STATE = {
    governance: {
      enabled: true, sensitive_classes: "PII, 기밀(CONFIDENTIAL)",
      high_risk_threshold: 0.75, escalate_risk_threshold: 0.6, safe_min_tier: "standard",
    },
    recommendations: null,   // 최초 1회 생성 후 상태 유지
    quality_guard: null,
  };

  // ---- 안정적 run 풀 (새로고침해도 고정) ----
  const runPool = (function () {
    const r = mulberry32(20260617);
    const rr = (a, b) => a + r() * (b - a);
    const ri = (a, b) => Math.floor(rr(a, b + 1));
    const pk = arr => arr[ri(0, arr.length - 1)];
    const runs = [];
    for (let i = 0; i < 140; i++) {
      const a = AGENTS[ri(0, AGENTS.length - 1)];
      const steps = ri(2, a.max_steps);
      const roll = r();
      let status = "success";
      if (roll > 0.93) status = "killed";
      else if (roll > 0.88) status = "failure";
      else if (i < 6) status = "running";
      const tenant = pk(TENANTS);
      // 스텝 생성
      const stepArr = [];
      let totalCost = 0, totalTok = 0, savings = 0;
      for (let s = 1; s <= steps; s++) {
        const cacheHit = r() < (a.semantic_cache ? 0.34 : 0.05);
        const downgrade = !cacheHit && a.downgrade_enabled && r() < 0.28;
        const reqModel = a.primary_model;
        const model = downgrade ? a.downgrade_target : reqModel;
        const inT = ri(400, 3200), outT = ri(120, 900);
        const crT = cacheHit ? ri(800, 4000) : 0, cwT = !cacheHit && r() < 0.3 ? ri(400, 1500) : 0;
        const reasoning = r() < 0.2 ? ri(200, 1200) : 0;
        const mp = MODELS.find(m => m.model === model) || MODELS[0];
        let cost = (inT * mp.input_usd + outT * mp.output_usd + crT * mp.cache_read_usd + cwT * mp.cache_write_usd + reasoning * mp.output_usd) / 1e6;
        if (cacheHit) cost *= 0.15;
        const sav = cacheHit ? rr(0.002, 0.02) : downgrade ? rr(0.001, 0.012) : 0;
        savings += sav;
        totalCost += cost; totalTok += inT + outT + crT + cwT + reasoning;
        stepArr.push({
          step: s, model, requested_model: reqModel,
          cost_usd: +cost.toFixed(6), cache_hit: cacheHit,
          routing_action: downgrade ? "downgrade" : "none",
          input_tokens: inT, output_tokens: outT, cache_read_tokens: crT,
          cache_write_tokens: cwT, reasoning_tokens: reasoning, savings_usd: +sav.toFixed(6),
        });
      }
      const q = status === "killed" ? null : +rr(0.62, 0.98).toFixed(2);
      const qpass = q != null && q >= 0.78;
      runs.push({
        run_id: "run-" + (10000 + i),
        agent: a.agent, tenant, status, steps,
        total_tokens: totalTok, total_cost: +totalCost.toFixed(6),
        quality_score: q, quality_passed: qpass,
        kill_reason: status === "killed" ? pk(["하드 예산 초과 — 서킷브레이커 발동", "run 비용 한도 초과", "최대 스텝 초과", "거버넌스: 고위험 캐시 차단 반복"]) : null,
        savings_usd: +savings.toFixed(6),
        started_at: T0 - ri(60, 86400),
        _steps: stepArr,
      });
    }
    return runs;
  })();

  // ---- 시계열 생성 ----
  function bucketSizeFor(minutes) {
    if (minutes <= 60) return 300;
    if (minutes <= 180) return 600;
    if (minutes <= 360) return 900;
    if (minutes <= 1440) return 3600;
    return 21600;
  }
  function spendSeries(group, minutes) {
    const bsz = bucketSizeFor(minutes);
    const n = Math.min(24, Math.max(8, Math.floor((minutes * 60) / bsz)));
    const base = Math.floor(now() / bsz) * bsz;
    let names;
    if (group === "tenant") names = TENANTS;
    else if (group === "agent") names = AGENT_NAMES;
    else if (group === "model") names = MODEL_NAMES;
    else names = PROVIDERS;
    const weight = {};
    names.forEach((nm, i) => weight[nm] = 1 / (i + 1.3));
    const rows = [];
    for (let b = n - 1; b >= 0; b--) {
      const ts = base - b * bsz;
      const wave = 0.6 + 0.4 * Math.sin((ts / 3600) + b);
      names.forEach(nm => {
        const c = (bsz / 300) * weight[nm] * wave * rnd(0.7, 1.3) * 2.4;
        rows.push({ bucket: ts, g: nm, c: +c.toFixed(4) });
      });
    }
    return { bucket: bsz, rows };
  }

  // ---- 엔드포인트 핸들러 ----
  function overview() {
    const passed = rint(1680, 1760);
    return {
      today_cost: +rnd(305, 340).toFixed(2),
      today_calls: rint(46000, 52000),
      burn_per_min: +rnd(0.18, 0.27).toFixed(4),
      today_savings: +rnd(195, 230).toFixed(2),
      cost_of_pass: +rnd(0.014, 0.021).toFixed(4),
      finished_runs: rint(1800, 1860),
      passed_runs: passed,
      active_runs: rint(8, 34),
      killed_today: rint(5, 11),
      downgrades_today: rint(3900, 4600),
      today_tokens: rint(78, 94) * 1e6,
      uptime_s: now() - T0 + 3 * 86400 + 14820,
    };
  }

  function alerts(limit) {
    const tpl = [
      ["info", "config_change", a => `정책 변경: ${a} 시맨틱 캐시 TTL 900→1800s`],
      ["warning", "budget_soft", a => `예산 경고: ${pick(TENANTS)} 일 예산 80% 도달 — 강등 모드 진입`],
      ["critical", "circuit_breaker", a => `서킷브레이커: ${a} run 비용 한도 초과로 차단`],
      ["warning", "quality_guard", a => `품질 가드레일: ${a} 강등 run 품질 11% 하락 — 자동 원복`],
      ["info", "anomaly", a => `이상감지: ${a} 토큰 사용량 IQR 스파이크 감지`],
      ["info", "config_change", a => `자동 권고 적용: ${a} 복잡도 라우팅 활성화`],
      ["critical", "budget_hard", a => `하드컷: ${pick(TENANTS)} 일 예산 한도 도달 — 신규 run 차단`],
      ["info", "anomaly", a => `거버넌스 패턴: ${a} 민감 등급 호출 비중 증가`],
    ];
    const rows = [];
    const N = Math.min(limit || 30, 40);
    for (let i = 0; i < N; i++) {
      const t = tpl[i % tpl.length];
      rows.push({ ts: now() - i * rnd(40, 260), severity: t[0], kind: t[1], message: t[2](pick(AGENT_NAMES)) });
    }
    return { rows };
  }

  function savings(hours) {
    const total = rnd(150, 240) * Math.min(hours / 24, 7 || 1) || rnd(150, 240);
    const split = { semantic_cache: 0.46, prompt_cache: 0.23, routing_downshift: 0.22, skill_packer: 0.09 };
    const by_kind = SAVINGS_KINDS.map(k => ({
      savings_kind: k, s: +(total * split[k] * rnd(0.9, 1.1)).toFixed(4), n: rint(300, 5200),
    }));
    // 5분 버킷 24h 시계열
    const bsz = 300, n = Math.min(48, Math.max(12, Math.floor(hours * 3600 / bsz)));
    const base = Math.floor(now() / bsz) * bsz;
    const series = [];
    for (let b = n - 1; b >= 0; b--) {
      const ts = base - b * bsz;
      const wave = 0.6 + 0.4 * Math.sin(ts / 3600 + b);
      series.push({ bucket: ts, cost: +(rnd(0.8, 1.6) * wave * 2).toFixed(4), savings: +(rnd(0.5, 1.1) * wave * 2).toFixed(4) });
    }
    return { by_kind, cache_hit_rate: rnd(0.31, 0.42), series };
  }

  function gateFor(a) {
    if (!a.downgrade_target) return null;
    const roll = Math.random();
    if (roll < 0.62) return { status: "approved", avg_quality: +rnd(0.82, 0.93).toFixed(2), samples: rint(120, 600) };
    if (roll < 0.82) return { status: "canary", avg_quality: +rnd(0.78, 0.88).toFixed(2), samples: rint(10, 40) };
    return { status: "rejected", avg_quality: +rnd(0.6, 0.74).toFixed(2), samples: rint(40, 200) };
  }
  function agents() {
    return {
      rows: AGENTS.map(a => ({
        agent: a.agent, description: a.description,
        semantic_cache: a.semantic_cache, cache_ttl: a.cache_ttl,
        primary_model: a.primary_model, downgrade_target: a.downgrade_target,
        gate: a.downgrade_enabled ? gateFor(a) : null,
        downgrade_enabled: a.downgrade_enabled, complexity_routing: a.complexity_routing,
        tool_registry_tokens: a.tool_registry_tokens,
        max_cost_per_run: a.max_cost_per_run, max_steps: a.max_steps,
        runs_24h: rint(180, 620), avg_quality_24h: +rnd(0.79, 0.93).toFixed(2),
      })),
    };
  }

  function runsRecent(limit, agent) {
    let rows = runPool;
    if (agent) rows = rows.filter(r => r.agent === agent);
    return { rows: rows.slice(0, limit || 40).map(r => ({ ...r, _steps: undefined })) };
  }
  function runStats(hours) {
    return {
      rows: AGENT_NAMES.map(agent => {
        const rs = runPool.filter(r => r.agent === agent);
        const costs = rs.map(r => r.total_cost).sort((a, b) => a - b);
        const pct = p => costs.length ? +costs[Math.floor((costs.length - 1) * p)].toFixed(5) : 0;
        const finished = rs.filter(r => r.status !== "running");
        const passed = finished.filter(r => r.quality_passed).length;
        const pass_rate = finished.length ? passed / finished.length : null;
        const avgq = +(rs.filter(r => r.quality_score != null).reduce((s, r) => s + r.quality_score, 0) / Math.max(1, rs.filter(r => r.quality_score != null).length)).toFixed(2);
        const p50 = pct(0.5);
        return {
          agent, runs: rs.length, p50, p95: pct(0.95), p99: pct(0.99),
          pass_rate, avg_quality: avgq,
          cost_of_pass: pass_rate ? +(p50 / Math.max(0.01, pass_rate)).toFixed(5) : null,
        };
      }),
    };
  }
  function runDetail(run_id) {
    const r = runPool.find(x => x.run_id === run_id);
    if (!r) return { run: null, steps: [] };
    return { run: { run_id: r.run_id, agent: r.agent, status: r.status, kill_reason: r.kill_reason, total_cost: r.total_cost, steps: r.steps, quality_score: r.quality_score }, steps: r._steps };
  }

  function budgets() {
    const rows = [];
    TENANTS.forEach((t, i) => {
      const hard = [60, 45, 80, 35, 25][i] || 40;
      rows.push({ scope_type: "tenant", scope_id: t, spent: +rnd(hard * 0.3, hard * 0.95).toFixed(2), soft_limit: hard * 0.6, downgrade_limit: hard * 0.8, hard_limit: hard });
    });
    AGENT_NAMES.forEach((a, i) => {
      const hard = [40, 30, 50, 20, 18, 12][i] || 20;
      rows.push({ scope_type: "agent", scope_id: a, spent: +rnd(hard * 0.25, hard * 0.9).toFixed(2), soft_limit: hard * 0.6, downgrade_limit: hard * 0.8, hard_limit: hard });
    });
    return { rows };
  }

  function gpu(minutes) {
    const nodes = ["h100-node-1", "h100-node-2", "h100-node-3", "h100-node-4"];
    const latest = nodes.map(node => ({
      node, cost_per_hour: 3.2, queue_depth: rint(0, 9),
      gpu_util: +rnd(0.18, 0.95).toFixed(2), mem_util: +rnd(0.3, 0.9).toFixed(2), kv_cache_util: +rnd(0.2, 0.85).toFixed(2),
    }));
    const idle = latest.filter(n => n.gpu_util < 0.4).length * 3.2;
    const bsz = 60, n = 30;
    const base = Math.floor(now() / bsz) * bsz;
    const series = [];
    for (let b = n - 1; b >= 0; b--) {
      const ts = base - b * bsz;
      nodes.forEach((node, i) => series.push({ node, ts, gpu_util: +Math.max(0.1, Math.min(0.98, 0.55 + 0.35 * Math.sin(ts / 600 + i) + rnd(-0.1, 0.1))).toFixed(2) }));
    }
    return { idle_cost_per_hour: +idle.toFixed(2), latest, series };
  }

  function showback(hours) {
    const rows = TENANTS.map((t, i) => ({ tenant: t, cost: +rnd(20, 90).toFixed(3), savings: +rnd(12, 60).toFixed(3), tokens: rint(8, 30) * 1e6, calls: rint(4000, 16000), share: 0 }));
    const tot = rows.reduce((s, r) => s + r.cost, 0);
    rows.forEach(r => r.share = r.cost / tot);
    return { rows: rows.sort((a, b) => b.cost - a.cost) };
  }

  function qualityCost(hours, agent) {
    const bsz = 1800, n = 28;
    const base = Math.floor(now() / bsz) * bsz;
    const rows = [];
    for (let b = n - 1; b >= 0; b--) {
      const ts = base - b * bsz;
      rows.push({ bucket: ts, q: +Math.max(0.6, Math.min(0.97, 0.85 + 0.06 * Math.sin(ts / 5000) + rnd(-0.03, 0.03))).toFixed(3), c: +rnd(0.02, 0.08).toFixed(4) });
    }
    return { rows, config_changes: [{ ts: rows[Math.floor(n * 0.55)].bucket }, { ts: rows[Math.floor(n * 0.8)].bucket }] };
  }

  function modelPrices() { return { rows: MODELS.map(m => ({ ...m })) }; }

  function governance(hours) {
    const p = STATE.governance;
    const total = rint(8000, 14000);
    const denied = p.enabled ? rint(140, 420) : 0;
    const escalations = p.enabled ? rint(40, 130) : 0;
    const leaks = p.enabled ? 0 : rint(2, 9);
    const cache_decisions = [
      { d: "ALLOW", n: rint(4200, 7000) },
      { d: "DENY_SENSITIVE_DATA", n: p.enabled ? rint(120, 340) : 0 },
      { d: "DENY_HIGH_RISK", n: p.enabled ? rint(30, 120) : 0 },
      { d: "CACHE_DISABLED", n: rint(200, 900) },
    ];
    const classes = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "PII"];
    const by_class = classes.map((d, i) => ({ d, n: rint(400, 4000) / (i * 0.6 + 1), c: +rnd(8, 70).toFixed(2) }));
    const events = [];
    const etpl = p.enabled ? [
      ["warning", a => `캐시 차단: ${a} 응답에 PII 포함 — 재사용 거부(DENY_SENSITIVE_DATA)`],
      ["info", a => `리스크 상향: ${a} 고위험 작업 강등 방어 — premium 유지`],
      ["warning", a => `정책 위반 시도: ${pick(TENANTS)} 기밀 등급 캐시 재사용 차단`],
    ] : [["critical", () => "거버넌스 비활성 상태 — 민감 데이터 캐시 누출 위험 노출"]];
    for (let i = 0; i < 14; i++) { const t = etpl[i % etpl.length]; events.push({ ts: now() - i * rnd(60, 400), severity: t[0], message: t[1](pick(AGENT_NAMES)) }); }
    return {
      compliance: leaks ? +(1 - leaks / total * 50).toFixed(4) : 1,
      sensitive_leaks: leaks, denied, escalations, total,
      cache_decisions, by_class,
      policy: { enabled: p.enabled, sensitive_classes: p.sensitive_classes, high_risk_threshold: p.high_risk_threshold, escalate_risk_threshold: p.escalate_risk_threshold, safe_min_tier: p.safe_min_tier },
      events,
    };
  }

  function forecast() {
    const d = new Date();
    const daysTotal = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const daysElapsed = d.getDate();
    const avgDaily = rnd(300, 345);
    const actual = avgDaily * daysElapsed;
    return {
      current_month_actual: +actual.toFixed(2),
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      days_elapsed: daysElapsed, days_total: daysTotal, avg_daily_cost: +avgDaily.toFixed(2),
      projected_month_total: +(avgDaily * daysTotal).toFixed(2),
      previous_month_total: +(avgDaily * daysTotal * rnd(1.08, 1.22)).toFixed(2),
      mom_pct: -rint(8, 18),
      current_month_savings: +(actual * rnd(0.55, 0.72)).toFixed(2),
      confidence: +rnd(0.74, 0.9).toFixed(2),
    };
  }

  function recommendations() {
    if (!STATE.recommendations) {
      STATE.recommendations = [
        { id: "rec-1", status: "pending", title: "rag-search 시맨틱 캐시 TTL 상향 (3600→7200s)", est_saving_usd: 1.84, body: "최근 7일 RAG 질의의 38%가 의미상 중복입니다. TTL을 2배로 늘리면 품질 저하 없이 캐시 히트율이 12%p 상승할 것으로 추정됩니다.", action: true },
        { id: "rec-2", status: "pending", title: "marketing-writer 주력 모델 강등 (gpt-4o→gpt-4o-mini)", est_saving_usd: 2.61, body: "카피 생성 작업의 복잡도 중앙값이 0.21로 낮습니다. 품질 게이트 통과율 94% — 강등 적용 권장.", action: true },
        { id: "rec-3", status: "pending", title: "h100-node-3 유휴 시간대 오토스케일", est_saving_usd: 3.10, body: "02:00~06:00 GPU 평균 사용률 17%. 야간 1대 축소 시 시간당 $3.2 절감.", action: true },
        { id: "rec-4", status: "pending", title: "code-reviewer 시맨틱 캐시 활성화", est_saving_usd: 0.92, body: "동일 파일 재리뷰가 21% 발생. 캐시 활성화로 중복 호출 제거 가능.", action: true },
      ];
    }
    return { rows: STATE.recommendations.map(r => ({ ...r })) };
  }

  function anomalies() {
    return {
      rows: [
        { kind: "token_spike", agent: "support-copilot", message: "출력 토큰이 24h 중앙값 대비 IQR 3.1배 — 프롬프트 누수 의심" },
        { kind: "quality_drift", agent: "sql-genie", message: "강등 run 품질 z-score -2.4 (7일 추세 하락)" },
        { kind: "latency_trend", agent: "rag-search", message: "p95 지연 18% 상승 추세 — 임베딩 서비스 점검 권장" },
        { kind: "governance_pattern", agent: "contract-analyzer", message: "PII 등급 호출 비중 11%p 증가 — 캐시 차단율 상승" },
      ],
    };
  }

  function qualityGuard() {
    if (!STATE.quality_guard) {
      STATE.quality_guard = [
        { agent: "marketing-writer", high_q: 0.91, high_n: 240, low_q: 0.86, low_n: 180, drop_pct: 5.5, reverted: false },
      ];
    }
    return { rows: STATE.quality_guard.map(r => ({ ...r })), drop_threshold_pct: 10, auto_revert_default: true };
  }

  function whatif(body) {
    const baseline = rnd(9200, 9800);
    const ttlSave = (body.cache_ttl_multiplier - 1) * rnd(180, 320);
    const downSave = body.downgrade_aggressive ? rnd(900, 1500) : 0;
    const trimSave = (body.skill_trim_ratio || 0) * rnd(600, 1100);
    const totalSave = ttlSave + downSave + trimSave;
    return {
      baseline_monthly_est: +baseline.toFixed(2),
      scenario_monthly_est: +(baseline - totalSave).toFixed(2),
      savings_monthly_est: +totalSave.toFixed(2),
      breakdown: { semantic_cache_ttl: +ttlSave.toFixed(2), routing_downshift_all: +downSave.toFixed(2), skill_packer_trim: +trimSave.toFixed(2) },
      window_hours: body.hours || 24,
    };
  }

  function insights() {
    return {
      rows: [
        { severity: "info", icon: "💸", title: "지출 집중", body: "전체 비용의 64%가 상위 2개 에이전트(contract-analyzer, code-reviewer)에 집중. 이 둘의 캐시·강등 정책 최적화 효과가 가장 큽니다." },
        { severity: "warning", icon: "📈", title: "롱테일 비용", body: "code-reviewer의 p99 run 비용이 p50의 6.8배. 소수의 대형 PR 리뷰가 비용 꼬리를 형성 — 스텝 한도·복잡도 라우팅 점검 권장." },
        { severity: "info", icon: "✅", title: "Cost-of-Pass 개선", body: "지난주 대비 성공 1건당 실질 비용 14% 하락. 품질 게이트가 무의미한 강등을 막아 재시도 비용을 줄였습니다." },
        { severity: "info", icon: "🔮", title: "월말 전망", body: "현재 추세로 이번 달 전월 대비 약 13% 절감 전망. 신뢰도 84%." },
        { severity: "critical", icon: "🛡️", title: "거버넌스 차단 유효", body: "민감(PII/기밀) 등급 캐시 누출 0건 유지. 비용 최적화가 보안을 침해하지 않음을 검증." },
        { severity: "info", icon: "🖥️", title: "GPU 유휴", body: "야간(02–06시) H100 풀 평균 사용률 17%. 오토스케일 적용 시 월 약 $390 절감 가능." },
      ],
    };
  }

  function qaReport(body) {
    const lang = /\.java$/.test(body.filename) ? "java" : /\.(c|h)$/.test(body.filename) ? "c" : "python";
    const rid = "run-qa-" + rint(1000, 9999);
    const md = `## 테스트 요약

| 항목 | 결과 |
|---|---|
| 언어 | ${lang} |
| 정적분석 이슈 | ${rint(2, 5)}건 |
| 컴파일/실행 | ✅ 통과 (격리 프로세스) |
| LLM 리뷰 점수 | ${rnd(0.7, 0.92).toFixed(2)} |

### 발견된 이슈
1. **보안** — 신뢰할 수 없는 입력 평가/복사 경로 발견 (데모 샘플의 의도된 취약점)
2. **품질** — 예외를 무시(swallow)하는 빈 catch/except 블록
3. **스타일** — 가변 기본 인자 / 문자열 동등 비교 등 관용 위반

### 권고
- 입력 검증 및 경계 검사 추가
- 예외는 로깅 후 상위로 전파
- 정적분석 룰을 CI 게이트에 통합

> 이 보고서는 데모용 샘플입니다. 실제 제품에서는 업로드한 코드가 격리 환경에서 컴파일·실행되고 LLM 리뷰가 수행됩니다.`;
    return { report_id: "rep-" + rid, run_id: rid, language: lang, elapsed_s: +rnd(2.1, 4.8).toFixed(1), cost_usd: +rnd(0.0008, 0.004).toFixed(6), mode: "데모(mock)", markdown: md };
  }

  // ---- 라우팅 ----
  function route(method, path, body) {
    const u = new URL(path, "http://x");
    const p = u.pathname, q = u.searchParams;
    const num = (k, d) => parseFloat(q.get(k) ?? d);
    // POST 변경 처리
    if (method === "POST") {
      if (p === "/api/agents/update") {
        const a = AGENTS.find(x => x.agent === body.agent);
        if (a) Object.assign(a, body);
        return { ok: true };
      }
      if (p === "/api/model_prices/update") {
        const m = MODELS.find(x => x.model === body.model);
        if (m) Object.assign(m, body);
        return { ok: true };
      }
      if (p === "/api/governance/update") { Object.assign(STATE.governance, body); return { ok: true }; }
      if (p.startsWith("/api/recommendations/")) {
        const id = p.split("/")[3];
        const r = (STATE.recommendations || []).find(x => x.id === id);
        if (r) r.status = p.endsWith("/apply") ? "applied" : "dismissed";
        return { ok: true };
      }
      if (p.match(/^\/api\/quality_guard\/.+\/revert$/)) {
        const ag = decodeURIComponent(p.split("/")[3]);
        const r = (STATE.quality_guard || []).find(x => x.agent === ag);
        if (r) r.reverted = true;
        return { ok: true };
      }
      if (p === "/api/whatif") return whatif(body);
      if (p === "/api/qa/test") return qaReport(body);
      return { ok: true };
    }
    // GET
    if (p === "/api/overview") return overview();
    if (p === "/api/spend_series") return spendSeries(q.get("group") || "tenant", num("minutes", 60));
    if (p === "/api/alerts") return alerts(num("limit", 30));
    if (p === "/api/savings") return savings(num("hours", 24));
    if (p === "/api/agents") return agents();
    if (p === "/api/runs/recent") return runsRecent(num("limit", 40), q.get("agent"));
    if (p === "/api/run_stats") return runStats(num("hours", 24));
    if (p === "/api/runs/detail") return runDetail(q.get("run_id"));
    if (p === "/api/budgets") return budgets();
    if (p === "/api/gpu") return gpu(num("minutes", 30));
    if (p === "/api/showback") return showback(num("hours", 24));
    if (p === "/api/quality_cost") return qualityCost(num("hours", 24), q.get("agent"));
    if (p === "/api/model_prices") return modelPrices();
    if (p === "/api/governance") return governance(num("hours", 24));
    if (p === "/api/forecast") return forecast();
    if (p === "/api/recommendations") return recommendations();
    if (p === "/api/anomalies") return anomalies();
    if (p === "/api/quality_guard") return qualityGuard();
    if (p === "/api/insights") return insights();
    return { error: "not found", path: p };
  }

  // ---- fetch / open 인터셉트 ----
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.includes("/api/")) {
      const method = (init && init.method) || "GET";
      let body = {};
      try { if (init && init.body) body = JSON.parse(init.body); } catch (e) {}
      const data = route(method, url, body);
      return Promise.resolve(new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    return _fetch.apply(this, arguments);
  };

  // FOCUS CSV 내보내기 → 클라이언트에서 샘플 CSV 생성
  const _open = window.open;
  window.open = function (url) {
    if (typeof url === "string" && url.includes("/api/export/focus")) {
      const header = "BilledCost,BillingCurrency,ChargePeriodStart,ServiceName,ResourceId,x_InputTokens,x_OutputTokens,x_CacheReadTokens";
      const lines = [header];
      for (let i = 0; i < 40; i++) {
        const r = runPool[i];
        lines.push(`${r.total_cost},USD,${new Date((r.started_at) * 1000).toISOString()},${r.agent},${r.run_id},${rint(1000, 5000)},${rint(200, 1500)},${rint(0, 4000)}`);
      }
      const blob = new Blob([lines.join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "jeus-finops-focus-1.4-24h.csv"; a.click();
      return null;
    }
    return _open.apply(this, arguments);
  };

  console.log("%cJeus.FinOps 데모 모드", "color:#4f8ff7;font-weight:bold", "— 샘플 데이터로 구동 중 (백엔드 없음)");
})();
