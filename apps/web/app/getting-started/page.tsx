import type { Metadata } from "next";
import { GettingStarted } from "../../components/getting-started";

export const metadata: Metadata = { title: "Getting Started — Verbia", description: "Learn how to use Verbia on Reddit and other websites.", robots: { index: false }, alternates: { canonical: "/getting-started", languages: { en: "/getting-started", "zh-CN": "/zh/getting-started" } } };

export default function GettingStartedPage() { return <GettingStarted locale="en"/>; }
