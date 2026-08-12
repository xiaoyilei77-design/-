import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("x-forwarded-host") ?? incomingHeaders.get("host") ?? "localhost:3001";
  const protocol = incomingHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "方言语音控制开关｜让每一种乡音，点亮一个家",
    description: "万声智家旗下千音语音助手概念产品：面向 86 型底盒的零火线四路触控灯控开关，以及它从生活出发的创建思路。",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "方言语音控制开关｜让每一种乡音，点亮一个家",
      description: "普通话与潮汕话离线首发、四块独立齐平触控面的产品构想、创建思路与真实工程进度。",
      url: origin,
      locale: "zh_CN",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1680, height: 945, alt: "方言语音控制开关概念渲染" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "方言语音控制开关｜让每一种乡音，点亮一个家",
      description: "普通话与潮汕话离线首发、四块独立齐平触控面的产品构想、创建思路与真实工程进度。",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
