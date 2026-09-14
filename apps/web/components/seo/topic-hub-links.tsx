import Link from "next/link";

export function TopicHubLinks({ career = false }: { career?: boolean }) {
  return <nav className="topic-hub-links shell" aria-label="Browse related topic collections">
    <span>Browse by topic</span>
    <Link href="/situations">All email situations <span aria-hidden="true">→</span></Link>
    {career && <Link href="/career">Career communication <span aria-hidden="true">→</span></Link>}
  </nav>;
}
