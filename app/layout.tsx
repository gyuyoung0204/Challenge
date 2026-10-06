import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const SITE_URL = process.env.SITE_URL ?? "https://challenge-psi-nine.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "운동 챌린지",
  description: "2026 하반기 운동 챌린지 진행 현황",
  // 링크 공유 미리보기 (이미지는 app/opengraph-image.jpg 자동 사용)
  openGraph: {
    type: "website",
    siteName: "운동 챌린지",
    title: "2026 하반기 운동 챌린지",
    description: "오늘의 인증 현황과 랭킹을 확인하세요 🐸",
    locale: "ko_KR",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "운동 챌린지", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
