import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goodbye — Verbia",
  robots: { index: false }
};

// Farewell page opened by the browser when the extension is uninstalled.
// Content intentionally empty for now.
export default function GoodbyePage() {
  return <main />;
}
