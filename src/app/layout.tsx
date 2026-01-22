import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
// [수정] 파일 위치에 맞게 경로 변경 (./globals.css -> ../styles/globals.css)
import "../styles/globals.css";
import TestPrinter from "@/components/shared/TestPrinter";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Collegiate Grill Kiosk",
  description: "POS System",
  manifest: "/manifest.json", // 매니페스트 연결
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "POS",
  },
};

// 뷰포트 설정 (확대/축소 방지 -> 앱처럼 느껴지게 함)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.className} antialiased`}>
        {children}
        {/* 👈 2. 여기에 추가 (화면 구석에 뜹니다) */}
      </body>
    </html>
  );
}