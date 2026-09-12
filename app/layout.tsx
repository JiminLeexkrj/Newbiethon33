import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Route Data Layer Demo",
  description: "해커톤용 지도 및 후보 경로 데이터 계층",
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

