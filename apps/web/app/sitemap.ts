import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/zh", "/getting-started", "/zh/getting-started", "/supported-platforms", "/zh/supported-platforms", "/situations", "/career", "/ai-reply-generator", "/reddit-reply-generator", "/multilingual-reply-generator", "/context-aware-reply-generator", "/ai-reddit-assistant", "/ai-browser-writing-assistant", "/ai-email-reply-generator", "/follow-up-email-after-no-response", "/how-to-follow-up-on-an-email-politely", "/how-to-ask-for-payment-politely", "/how-to-respond-to-a-job-offer-email", "/how-to-politely-decline-a-job-offer", "/reply-to-email-confirmation", "/how-to-remind-someone-politely-in-an-email", "/how-to-respond-to-an-interview-invitation-email", "/gmail-ai-reply-assistant", "/outlook-ai-reply-assistant", "/contact", "/privacy", "/terms", "/refund", "/zh/contact", "/zh/privacy", "/zh/terms", "/zh/refund"].map(path => ({
    url: `https://verbia.henriz.dev${path}`,
    changeFrequency: path === "" || path === "/zh" || path.includes("getting-started") || path.includes("supported-platforms") || path === "/situations" || path === "/career" || path.includes("reply-generator") || path.includes("assistant") ? "weekly" : "yearly",
    priority: path === "" || path === "/zh" ? 1 : path.includes("getting-started") || path.includes("supported-platforms") || path === "/situations" || path === "/career" || path.includes("reply-generator") || path.includes("assistant") ? 0.8 : 0.4,
  }));
}
