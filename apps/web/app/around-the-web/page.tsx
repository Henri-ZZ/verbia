import type { Metadata } from "next";
import { AroundTheWeb } from "../../components/around-the-web";

// Canonical has no trailing slash, matching every other page on the site and the
// file the export actually writes (out/around-the-web.html).
export const metadata: Metadata = {
  title: "Verbia Around the Web | Verbia",
  description: "Discover Verbia on software directories, product communities, and independent platforms around the web.",
  alternates: { canonical: "/around-the-web" },
  openGraph: { type: "website", url: "/around-the-web", title: "Verbia Around the Web", description: "Where Verbia is listed: software directories, product communities, and independent platforms." }
};

export default function AroundTheWebPage() { return <AroundTheWeb/>; }
