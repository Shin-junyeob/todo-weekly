import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todo Weekly",
  description: "월~금 주간 할 일 관리 서비스",
  manifest: "/manifest.json",
  themeColor: "#16a34a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
