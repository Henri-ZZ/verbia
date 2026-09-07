export function RedditLogo({ size = 24, className = "reddit-logo" }: { size?: number; className?: string }) {
  return <img className={className} src="/reddit.svg" alt="" width={size} height={size}/>;
}
