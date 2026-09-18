import type { Metadata } from "next";
import { SupportedPlatforms } from "../../../components/supported-platforms";

export const metadata: Metadata = {
  title: "Verbia 支持的平台与上下文模式",
  description: "查看 Verbia 自动模式支持的网站、可以使用 AI 识别的网页邮箱，以及在其他网站中加入所选文字的方法。",
  alternates: { canonical: "/zh/supported-platforms", languages: { en: "/supported-platforms", "zh-CN": "/zh/supported-platforms" } },
  openGraph: { type: "website", url: "/zh/supported-platforms", locale: "zh_CN", title: "Verbia 支持的平台", description: "自动模式、邮件 AI 识别与其他网站的所选文字上下文。" }
};

export default function SupportedPlatformsPage() { return <SupportedPlatforms locale="zh"/>; }
