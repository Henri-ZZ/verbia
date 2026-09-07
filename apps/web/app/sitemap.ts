import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ["", "/zh", "/ai-reply-generator", "/reddit-reply-generator", "/privacy", "/terms", "/refund", "/zh/privacy", "/zh/terms", "/zh/refund"].map(path => ({
    url: `https://verbia.henriz.dev${path}`,
    lastModified,
    changeFrequency: path === "" || path === "/zh" || path.endsWith("reply-generator") ? "weekly" : "yearly",
    priority: path === "" || path === "/zh" ? 1 : path.endsWith("reply-generator") ? 0.8 : 0.4,
  }));
}
