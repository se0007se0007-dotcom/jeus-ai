# Jeus.ai

Jeus.ai 홈페이지의 전체 소스입니다. 운영 사이트: https://jeus.ai.kr

## 프로젝트 구성

- `helio홈페이지/jeus-ai-cloudflare-pages/`: 운영 홈페이지, 문의 게시판과 관리자 API, ROI 계산기, 데모, Cloudflare Worker 설정
- `app/`, `public/`, `worker/`: React / vinext 개발 프로젝트
- `cloudflare-pages/`: 정적 홈페이지 버전
- `db/`, `drizzle/`, `examples/d1/`: 데이터베이스 구성과 D1 예제
- `helio홈페이지/`: 제안서와 마케팅 자료
- `index.html`: 기존 저장소의 홈페이지 파일

## 운영 프로젝트 실행 및 배포

Node.js와 npm이 필요합니다.

```bash
cd helio홈페이지/jeus-ai-cloudflare-pages
npm ci
npx wrangler dev
```

운영 환경에 배포할 때는 Cloudflare 계정 인증과 KV 저장소 연결이 필요합니다. 다른 계정에서는 `wrangler.jsonc`의 KV namespace ID와 메일 발신 설정을 해당 계정에 맞게 변경하세요.

```bash
npx wrangler login
npx wrangler secret put ADMIN_PASSWORD
npx wrangler deploy
```

관리자 비밀번호는 Cloudflare Secret `ADMIN_PASSWORD`로 설정합니다. 실제 비밀번호는 저장소에 포함하지 않습니다. 이메일 알림에 필요한 설정은 `worker.js`와 `wrangler.jsonc`를 참고하세요.

## React / vinext 개발 프로젝트

Node.js 22.13.0 이상이 필요합니다. 저장소 최상위에서 실행하세요.

```bash
npm ci
npm run dev
npm run build
```

의존성 디렉터리, 빌드 결과, 인증 로그, 비밀번호가 포함될 수 있는 환경 파일과 과거 백업 파일은 업로드에서 제외했습니다.
