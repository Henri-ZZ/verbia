import type { Metadata } from "next";
import { AroundTheWeb } from "../../../components/around-the-web";

export const metadata: Metadata = {
  title: "在这些地方找到 Verbia | Verbia",
  description: "查看 Verbia 在软件目录、产品社区与独立平台上的收录页面。",
  alternates: { canonical: "/zh/around-the-web", languages: { en: "/around-the-web", "zh-CN": "/zh/around-the-web" } },
  openGraph: { type: "website", url: "/zh/around-the-web", locale: "zh_CN", title: "在这些地方找到 Verbia", description: "Verbia 在软件目录、产品社区与独立平台上的收录页面。" }
};

export default function AroundTheWebZhPage() { return <AroundTheWeb locale="zh"/>; }
