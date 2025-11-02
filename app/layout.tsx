import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_JP, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "YOMIAJI: βテスト版",
  description: "一読み味で探す毒書体験 - 読む前の自分には戻れなくなるような毒書を探そう",
  keywords: ["本", "書籍", "読書", "毒書", "感想", "レビュー", "検索"],
  authors: [{ name: "YOMIAJI Team" }],
  robots: "index, follow",
  openGraph: {
    title: "YOMIAJI: βテスト版",
    description: "一読み味で探す毒書体験",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary",
    title: "YOMIAJI: βテスト版",
    description: "一読み味で探す毒書体験",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifJP.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
