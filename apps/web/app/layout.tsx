import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://verbia.henriz.dev"),
  title: "Verbia — AI Reply & Writing Assistant",
  description: "Tell Verbia what you want to say, in any language. Get a natural, context-aware reply you can review and insert.",
  applicationName: "Verbia",
  alternates: { canonical: "/", languages: { en: "/", "zh-CN": "/zh" } },
  openGraph: {
    type: "website", url: "/", siteName: "Verbia",
    title: "Verbia — Tell me what you want to say, in any language.",
    description: "Turn your intent into natural, context-aware replies without leaving the conversation."
  },
  twitter: { card: "summary", title: "Verbia — AI Reply & Writing Assistant", description: "Your intent. The right words." },
  icons: { icon: "/verbia-mark.svg", apple: "/verbia-mark.svg" },
  other: { "google-site-verification": "xAcO-ctraDUIb4jND6iUlnNowsjS8EyMmHTllYHirZI" }
};

export const viewport: Viewport = { themeColor: "#f2fcf4", colorScheme: "light" };

const GA_ID = "G-540Y1K231S";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${inter.variable} ${jakarta.variable}`}><body><a className="skip-link" href="#main">Skip to content</a>{children}
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
    <Script id="ga-config" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA_ID}');` }} />
  </body></html>;
}
