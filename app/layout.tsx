import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jeus.ai | AI 에이전트 비용을 한눈에",
  description:
    "Heliosoft의 기업형 AI 솔루션 홈페이지. 첫 솔루션 Jeus.fin은 LLM 에이전트 비용을 측정, 통제, 최적화하는 Agent FinOps 플랫폼입니다.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
