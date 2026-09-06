import Link from "next/link";

export const metadata = { title: "Terms — Verbia", description: "Terms for using Verbia." };
export default function TermsPage() { return <main className="legal-page"><Link className="brand" href="/"><img src="/verbia-mark.svg" alt="" width="32" height="32"/>Verbia</Link><p className="eyebrow">Terms</p><h1>Terms of service.</h1><p>This page is reserved for the final terms of service before public launch.</p><Link href="/">Back to home</Link></main>; }
