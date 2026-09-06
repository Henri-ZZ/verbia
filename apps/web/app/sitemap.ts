import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ["", "/privacy", "/terms"].map(path => ({ url: `https://verbia.henriz.dev${path}`, lastModified, changeFrequency: path ? "yearly" : "weekly", priority: path ? 0.4 : 1 }));
}
