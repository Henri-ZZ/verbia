import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign-in complete — Verbia",
  description: "Complete your Verbia account sign-in.",
  robots: { index: false, follow: false }
};

export default function AuthCompleteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
