import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SessionWatch } from "../components/session-watch";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://verbia.henriz.dev"),
  title: "Verbia — AI Reply & Writing Assistant",
  description: "Draft natural replies with Automatic Mode on supported sites, AI-assisted email context, and selected text elsewhere. Express your intent in any language.",
  applicationName: "Verbia",
  alternates: { canonical: "/", languages: { en: "/", "zh-CN": "/zh" } },
  openGraph: {
    type: "website", url: "/", siteName: "Verbia",
    title: "Verbia — Tell me what you want to say, in any language.",
    description: "Automatic context on supported sites, your intent in any language, and a natural draft you review before sending."
  },
  twitter: { card: "summary", title: "Verbia — AI Reply & Writing Assistant", description: "Your intent. The right words." },
  icons: { icon: "/verbia-mark.svg", apple: "/verbia-mark.svg" },
  // Site-ownership proofs for the search consoles (Google, Baidu).
  other: {
    "google-site-verification": "xAcO-ctraDUIb4jND6iUlnNowsjS8EyMmHTllYHirZI",
    "baidu-site-verification": "codeva-TV3D248ge"
  }
};

export const viewport: Viewport = { themeColor: "#f2fcf4", colorScheme: "light" };

const GA_ID = "G-540Y1K231S";

// suppressHydrationWarning belongs on <html> and nowhere else: the attribute
// mismatches reported here are injected by browser extensions (Google Analytics
// opt-out add-ons put data-google-analytics-opt-out on this element before React
// hydrates), and React cannot patch what it did not render. The two attributes we
// do render — lang and class — are static, so silencing this element hides
// nothing of ours. @see https://react.dev/link/hydration-mismatch
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning><body><a className="skip-link" href="#main">Skip to content</a><SessionWatch />{children}
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
    <Script id="ga-config" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA_ID}');` }} />
  </body></html>;
}
