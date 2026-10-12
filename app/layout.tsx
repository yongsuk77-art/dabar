import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "다바르 | 설교 준비 스튜디오",
  description: "성경 본문을 입력하면 연구 → 개요 → 설교문 워크플로우를 따라가는 설교 준비 웹앱",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700;900&display=swap"
        />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
