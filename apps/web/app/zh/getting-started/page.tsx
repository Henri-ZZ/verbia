import type { Metadata } from "next";
import { GettingStarted } from "../../../components/getting-started";

export const metadata: Metadata = {
  title: "Verbia 使用教程 — 安装与快速开始",
  description: "了解如何安装并登录 Verbia，使用自动对话上下文，选择回复语言和语气，并在发送前检查生成的回复草稿。",
  alternates: { canonical: "/zh/getting-started", languages: { en: "/getting-started", "zh-CN": "/zh/getting-started" } },
  openGraph: {
    type: "article",
    url: "/zh/getting-started",
    title: "Verbia 使用教程",
    description: "安装 Verbia，并学习如何在浏览器中生成理解上下文的回复草稿。"
  }
};

export default function GettingStartedPage() { return <GettingStarted locale="zh"/>; }
