import Link from "next/link";

export const metadata = { title: "Privacy — Verbia", description: "How Verbia handles conversation context, account information, and reply drafts." };
export default function PrivacyPage() { return <main className="legal-page"><Link className="brand" href="/"><img src="/verbia-mark.svg" alt="" width="32" height="32"/>Verbia</Link><p className="eyebrow">Privacy</p><h1>Privacy by design.</h1><p>Verbia processes the minimum conversation context needed to generate a reply after you explicitly choose Generate. It does not automatically send messages.</p><p>This page is reserved for the final public privacy policy before store submission.</p><Link href="/">Back to home</Link></main>; }
