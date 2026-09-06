import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ["", "/zh", "/privacy", "/terms", "/refund", "/zh/privacy", "/zh/terms", "/zh/refund"].map(path => ({ url: `https://verbia.henriz.dev${path}`, lastModified, changeFrequency: path === "" || path === "/zh" ? "weekly" : "yearly", priority: path === "" || path === "/zh" ? 1 : 0.4 }));
}
