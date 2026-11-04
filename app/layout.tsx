import type { Metadata } from "next";
import "./globals.css";
import "./astral.css";

export const metadata: Metadata = {
  title: "白語寧｜城堡島嶼",
  description: "一座隨臺北時間流轉的島，收藏白語寧的作品、日常與尚未完成的夢。",
  robots: { index: false, follow: false },
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
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
