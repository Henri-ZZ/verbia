import { GmailLogo, OutlookLogo } from "./email-platform-logos";
import { RedditLogo } from "./reddit-logo";

export function WhatsAppLogo({ size = 24 }: { size?: number }) {
  return <img className="platform-logo" src="/whatsapp-icon.svg" alt="" width={size} height={size}/>;
}

export function QqMailLogo({ size = 24 }: { size?: number }) {
  return <img className="platform-logo" src="/qqmail.png" alt="" width={size} height={size}/>;
}

export function AutomaticPlatformLogos({ size = 26 }: { size?: number }) {
  return <span className="automatic-platform-logos" aria-hidden="true">
    <RedditLogo size={size}/><WhatsAppLogo size={size}/><GmailLogo size={size}/><OutlookLogo size={size}/><QqMailLogo size={size}/>
  </span>;
}

