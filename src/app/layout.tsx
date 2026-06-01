import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Story English Quest",
  description: "小學生英文聽說讀寫故事任務 App"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
