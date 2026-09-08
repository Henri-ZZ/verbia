export function GmailLogo({ size = 24, className = "email-platform-logo" }: { size?: number; className?: string }) {
  return <img className={className} src="/gmail.png" alt="" width={size} height={size}/>;
}

export function OutlookLogo({ size = 24, className = "email-platform-logo" }: { size?: number; className?: string }) {
  return <img className={className} src="/outlook.svg" alt="" width={size} height={size}/>;
}

export function EmailPlatformLogos({ size = 28 }: { size?: number }) {
  return <span className="email-platform-logos" aria-hidden="true"><GmailLogo size={size}/><OutlookLogo size={size}/></span>;
}
