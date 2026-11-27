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

// Web fonts load without blocking the first paint: system fonts show at once,
// then swap to Noto when ready (display=swap). Only weights used in the CSS.
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;500&display=swap";
const FONT_LOADER = `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(FONT_URL)};document.head.appendChild(l);})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: FONT_LOADER }} />
        <noscript>
          <link rel="stylesheet" href={FONT_URL} />
        </noscript>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
