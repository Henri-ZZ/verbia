import Link from "next/link";

export default function NotFound() {
  return <main className="legal-page"><p className="eyebrow">404</p><h1>That page isn’t here.</h1><p>The link may have moved.</p><Link className="button primary" href="/">Return home</Link></main>;
}
