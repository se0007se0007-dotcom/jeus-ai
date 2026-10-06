import type { CSSProperties } from "react";

const painPoints = [
  {
    title: "토큰 비용 블랙박스",
    body: "어떤 에이전트가 어떤 모델로 얼마나 비용을 쓰는지, 청구서가 오기 전까지 파악하기 어렵습니다.",
  },
  {
    title: "부서별 배분의 어려움",
    body: "공용 API 키와 게이트웨이를 함께 쓰면 프로젝트, 부서, 고객 단위의 책임 비용을 나누기 어렵습니다.",
  },
  {
    title: "예산 초과를 늦게 발견",
    body: "루프에 빠진 에이전트나 갑작스러운 트래픽 증가를 실시간으로 막지 못하면 손실이 커집니다.",
  },
];

const layers = [
  "L1 수집: OpenAI 호환 게이트웨이에서 토큰과 호출 비용을 계측",
  "L2 저장: tenant, project, agent, run, step 단위로 비용 저장",
  "L3 통제: 예산 알림, 강등, 하드컷, 루프 감지",
  "L4 최적화: 캐시, 모델 라우팅, 반사실 절감 효과 분석",
  "L5 경험: 경영, 운영, 개발, 거버넌스 대시보드 제공",
];

const solutionCards = [
  {
    name: "Jeus.fin",
    label: "First launch",
    title: "Agent FinOps",
    body: "LLM 에이전트 운영 비용을 실시간으로 측정하고, 예산 통제와 최적화 인사이트까지 연결합니다.",
    state: "공개 준비 중",
  },
  {
    name: "Jeus.doc",
    label: "Next",
    title: "문서 AI 자동화",
    body: "문서 검색, 요약, 검토 자동화를 기업 업무 흐름에 맞춰 확장할 수 있는 솔루션 영역입니다.",
    state: "예정",
  },
  {
    name: "Jeus.gov",
    label: "Next",
    title: "AI 거버넌스",
    body: "사내 AI 사용 현황, 정책 준수, 민감정보 리스크를 한 화면에서 관리하는 영역으로 확장됩니다.",
    state: "예정",
  },
];

const trustItems = [
  {
    title: "온프레미스 설치",
    body: "고객 인프라 안에 설치해 프롬프트, 응답, 비용 데이터가 외부로 나가지 않는 구조를 지향합니다.",
  },
  {
    title: "멀티 모델 연동",
    body: "OpenAI, Azure OpenAI, Anthropic, 내부 LLM까지 하나의 게이트웨이 정책 아래로 통합합니다.",
  },
  {
    title: "운영 통제 내장",
    body: "예산, 알림, 차단, 감사 로그를 함께 제공해 AI 운영을 비용과 보안 관점에서 관리합니다.",
  },
];

const processSteps = [
  ["01", "도입 상담", "현재 AI 사용 환경과 비용 관리 과제를 함께 정리합니다."],
  ["02", "PoC", "실제 에이전트 트래픽으로 2~4주 검증을 진행합니다."],
  ["03", "설치 및 연동", "고객 인프라와 기존 LLM 게이트웨이에 맞춰 배포합니다."],
  ["04", "운영 고도화", "정책, 대시보드, 최적화 리포트를 운영 기준에 맞게 다듬습니다."],
];

export default function Home() {
  return (
    <main>
      <nav className="siteNav" aria-label="주요 메뉴">
        <a className="logo" href="#top" aria-label="Jeus.ai 홈">
          Jeus<span>.ai</span>
        </a>
        <div className="navLinks">
          <a href="#solutions">솔루션</a>
          <a href="#finops">FinOps</a>
          <a href="#process">도입 프로세스</a>
          <a className="navCta" href="mailto:contact@jeus.ai.kr">
            문의하기
          </a>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="heroText">
          <p className="eyebrow">Heliosoft AI Solution Studio</p>
          <h1>Jeus.ai</h1>
          <p className="heroLead">AI 에이전트 비용, 이제 한눈에 보입니다.</p>
          <p className="heroCopy">
            Jeus.ai는 기업의 LLM, 에이전트, 내부 AI 솔루션을 비용까지 책임지는
            운영 플랫폼으로 확장합니다. 첫 솔루션은 Agent FinOps, Jeus.fin입니다.
          </p>
          <div className="heroActions">
            <a className="primaryButton" href="mailto:contact@jeus.ai.kr">
              도입 문의
            </a>
            <a className="textButton" href="#finops">
              FinOps 먼저 보기
            </a>
          </div>
          <p className="heroNote">온프레미스 설치와 내부망 운영을 고려한 기업형 AI 솔루션</p>
        </div>

        <div className="heroVisual" aria-label="AI FinOps 대시보드 미리보기">
          <img
            src="/hero-finops-dashboard.png"
            alt="AI FinOps 비용 대시보드 목업"
            width="1792"
            height="1024"
            className="heroImage"
          />
        </div>
      </header>

      <section className="signalBand" aria-label="핵심 지표">
        <div>
          <b>47</b>
          <span>운영 에이전트 추적</span>
        </div>
        <div>
          <b>-32.4%</b>
          <span>절감 가능성 분석</span>
        </div>
        <div>
          <b>5 Layer</b>
          <span>수집부터 경험까지</span>
        </div>
      </section>

      <section className="section problemSection">
        <div className="sectionHead">
          <p className="eyebrow">Why now</p>
          <h2>AI 에이전트는 늘어나는데 비용은 아직 설명되지 않습니다.</h2>
          <p>
            AI 도입이 빨라질수록 토큰 비용, GPU 비용, 모델 라우팅 비용은 새로운
            운영 리스크가 됩니다. Jeus.fin은 그 리스크를 운영 지표로 바꿉니다.
          </p>
        </div>
        <div className="cardGrid three">
          {painPoints.map((item, index) => (
            <article className="plainCard" key={item.title}>
              <span className="cardNumber">{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section solutionBand" id="finops">
        <div className="split">
          <div>
            <p className="eyebrow">First solution</p>
            <h2>Jeus.fin, Agent FinOps를 먼저 공개합니다.</h2>
            <p>
              FinOps 솔루션은 기존 에이전트 코드 변경을 최소화하면서 LLM 호출을
              게이트웨이로 모으고, 비용 측정, 예산 통제, 최적화 제안을 하나의
              흐름으로 제공합니다.
            </p>
            <ul className="checkList">
              {layers.map((layer) => (
                <li key={layer}>{layer}</li>
              ))}
            </ul>
          </div>
          <div className="metricsPanel" aria-label="Jeus.fin 주요 화면">
            <div className="panelTop">
              <span>Jeus.fin</span>
              <b>Live cost control</b>
            </div>
            <div className="metricRow">
              <span>이번 달 LLM 비용</span>
              <b>₩2,484,200</b>
            </div>
            <div className="metricRow">
              <span>예상 절감액</span>
              <b className="good">₩780,000</b>
            </div>
            <div className="budgetGauge" aria-hidden="true">
              <i />
            </div>
            <div className="agentRows">
              <span style={{ "--w": "92%" } as CSSProperties} />
              <span style={{ "--w": "74%" } as CSSProperties} />
              <span style={{ "--w": "58%" } as CSSProperties} />
              <span style={{ "--w": "41%" } as CSSProperties} />
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="solutions">
        <div className="sectionHead">
          <p className="eyebrow">Solution roadmap</p>
          <h2>Jeus.ai는 실제 솔루션을 계속 올리는 허브로 확장됩니다.</h2>
          <p>
            현재는 FinOps를 첫 제품으로 전면 배치하고, 이후 문서 AI, 거버넌스,
            운영 자동화 솔루션을 같은 구조 안에서 추가할 수 있게 설계했습니다.
          </p>
        </div>
        <div className="cardGrid three">
          {solutionCards.map((item) => (
            <article className="solutionCard" key={item.name}>
              <div className="cardTopline">
                <span>{item.label}</span>
                <em>{item.state}</em>
              </div>
              <h3>{item.name}</h3>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section trustSection">
        <div className="sectionHead">
          <p className="eyebrow">Enterprise ready</p>
          <h2>데이터는 고객 환경 안에, 통제는 운영 화면 안에.</h2>
          <p>
            Jeus.ai는 단순한 데모 페이지가 아니라 기업 내부 도입을 전제로 한
            AI 솔루션 포트폴리오를 담는 홈페이지입니다.
          </p>
        </div>
        <div className="cardGrid three">
          {trustItems.map((item) => (
            <article className="plainCard compact" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section processSection" id="process">
        <div className="sectionHead">
          <p className="eyebrow">Process</p>
          <h2>도입은 4단계면 충분합니다.</h2>
        </div>
        <div className="processGrid">
          {processSteps.map(([number, title, body]) => (
            <article className="processCard" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ctaSection" id="contact">
        <div>
          <p className="eyebrow">Contact</p>
          <h2>AI 비용 관리, Jeus.fin으로 먼저 시작하세요.</h2>
          <p>PoC 일정과 현재 AI 운영 환경을 알려주시면 도입 범위를 함께 잡겠습니다.</p>
          <a className="primaryButton light" href="mailto:contact@jeus.ai.kr">
            contact@jeus.ai.kr
          </a>
        </div>
      </section>

      <footer>
        <div>
          <b>Jeus.ai</b>
          <p>Heliosoft AI Solution Studio</p>
        </div>
        <div className="footerLinks">
          <a href="#solutions">솔루션</a>
          <a href="#finops">FinOps</a>
          <a href="mailto:contact@jeus.ai.kr">문의</a>
        </div>
      </footer>
    </main>
  );
}
