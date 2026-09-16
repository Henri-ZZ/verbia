import type { Metadata } from "next";
import { GettingStarted } from "../../components/getting-started";

export const metadata: Metadata = {
  title: "Getting Started with Verbia — Browser Reply Assistant",
  description: "Learn how to install Verbia, sign in, use automatic conversation context, choose a reply language and tone, and review drafts before sending.",
  alternates: { canonical: "/getting-started", languages: { en: "/getting-started", "zh-CN": "/zh/getting-started" } },
  openGraph: {
    type: "article",
    url: "/getting-started",
    title: "Getting Started with Verbia",
    description: "Install Verbia and learn how to create context-aware reply drafts in your browser."
  }
};

export default function GettingStartedPage() { return <GettingStarted locale="en"/>; }
