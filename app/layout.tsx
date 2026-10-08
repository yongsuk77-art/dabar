import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "다바르 | 설교 준비",
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
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
