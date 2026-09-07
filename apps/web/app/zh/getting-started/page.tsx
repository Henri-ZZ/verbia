import type { Metadata } from "next";
import { GettingStarted } from "../../../components/getting-started";

export const metadata: Metadata = { title: "快速开始 — Verbia", description: "了解如何在 Reddit 和其他网站上使用 Verbia。", robots: { index: false }, alternates: { canonical: "/zh/getting-started", languages: { en: "/getting-started", "zh-CN": "/zh/getting-started" } } };

export default function GettingStartedPage() { return <GettingStarted locale="zh"/>; }
