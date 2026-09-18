import type { Metadata } from "next";
import { SupportedPlatforms } from "../../components/supported-platforms";

export const metadata: Metadata = {
  title: "Supported Platforms and Context Modes | Verbia",
  description: "See where Verbia Automatic Mode works, which webmail services support AI Identify, and how to use selected-text context on other websites.",
  alternates: { canonical: "/supported-platforms", languages: { en: "/supported-platforms", "zh-CN": "/zh/supported-platforms" } },
  openGraph: { type: "website", url: "/supported-platforms", title: "Platforms Supported by Verbia", description: "Automatic context on supported sites, AI Identify for webmail, and selected-text context elsewhere." }
};

export default function SupportedPlatformsPage() { return <SupportedPlatforms locale="en"/>; }

