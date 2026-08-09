import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("x-forwarded-host") ?? incomingHeaders.get("host") ?? "localhost:3001";
  const protocol = incomingHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "方言语音控制开关｜让一句乡音，点亮一整个家",
    description: "一块为中国家庭语境而做的 AI 语音四路灯控开关，以及它从生活出发的创建思路。",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "方言语音控制开关｜让一句乡音，点亮一整个家",
      description: "AI 语音多路灯控开关的产品构想、创建思路与真实工程进度。",
      url: origin,
      locale: "zh_CN",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1680, height: 945, alt: "方言语音控制开关概念渲染" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "方言语音控制开关｜让一句乡音，点亮一整个家",
      description: "AI 语音多路灯控开关的产品构想、创建思路与真实工程进度。",
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
