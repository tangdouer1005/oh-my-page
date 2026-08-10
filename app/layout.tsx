import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "起始页",
  description: "快速搜索并打开常用网站的极简浏览器起始页。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

const preferenceScript = `
  try {
    const saved = localStorage.getItem("oh-my-page:theme:v1");
    const theme = saved === "light" || saved === "dark"
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const savedStyle = localStorage.getItem("oh-my-page:style:v1");
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.style = savedStyle === "apple" ? "apple" : "utility";
  } catch {}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: preferenceScript }} /></head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
