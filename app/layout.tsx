import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Engine — 深度AI嵌入游戏实验",
  description: "三个由AI实时决策驱动的交互式游戏原型",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <nav className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 border-b border-[#2a2a4a] bg-[#0d0d24] shrink-0 overflow-x-auto">
          <Link href="/" className="text-sm font-bold tracking-wider text-gray-400 hover:text-white transition-colors">
            AI ENGINE
          </Link>
          <span className="text-gray-600">/</span>
          <Link href="/symbiote" className="text-xs sm:text-sm text-gray-500 hover:text-[#00ff88] transition-colors">
            共生体
          </Link>
          <Link href="/butterfly" className="text-xs sm:text-sm text-gray-500 hover:text-[#ff6b9d] transition-colors">
            蝴蝶效应
          </Link>
          <Link href="/xenogenesis" className="text-xs sm:text-sm text-gray-500 hover:text-[#64b5f6] transition-colors">
            异星造物主
          </Link>
        </nav>
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
