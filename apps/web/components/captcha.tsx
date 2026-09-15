"use client";

import { useEffect, useRef } from "react";

// CAPTCHA, for the auth calls Supabase refuses without a token: with CAPTCHA
// protection enabled, requesting a sign-in code, signing in with a password, and
// resending a code all fail unless the request carries one ("captcha protection:
// request disallowed"). Supabase stores the secret that verifies tokens; the site
// key below is the public half and comes from the provider's own dashboard.
//
// Turnstile is the default because it is free without a request ceiling (hCaptcha's
// free tier stops at 10,000 requests a month) and its "interaction-only"
// appearance keeps the widget out of the way for visitors who pass unchallenged.
// Which provider Supabase is set to must match NEXT_PUBLIC_CAPTCHA_PROVIDER —
// the secret in the Supabase dashboard and the site key here belong to the same
// provider, from the same account.
//
// With no site key configured this renders nothing and reports "not required", so
// an environment that has no CAPTCHA set up (local dev, previews) keeps making
// exactly the requests it made before.
const PROVIDERS = {
  turnstile: {
    script: "https://challenges.cloudflare.com/turnstile/v0/api.js",
    options: { appearance: "interaction-only" }
  },
  hcaptcha: {
    script: "https://js.hcaptcha.com/1/api.js",
    options: {}
  }
} as const;

type ProviderName = keyof typeof PROVIDERS;

// Both expose the same four calls, which is why nothing below is provider-specific.
type CaptchaApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  getResponse: (widgetId?: string) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window { turnstile?: CaptchaApi; hcaptcha?: CaptchaApi }
}

export const PROVIDER: ProviderName = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER?.toLowerCase() === "hcaptcha" ? "hcaptcha" : "turnstile";
const SITE_KEY = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ?? "";

function api(): CaptchaApi | undefined {
  return PROVIDER === "turnstile" ? window.turnstile : window.hcaptcha;
}

// What a form needs from the widget. Tokens are single-use and short-lived, so a
// form reads one at submit time and resets the widget after *every* attempt —
// including failed ones, which is the case that would otherwise leave the form
// unable to submit again.
export type CaptchaHandle = {
  required: () => boolean;
  token: () => string | undefined;
  reset: () => void;
};

// One script for the whole page, however many widgets ask for it.
let scriptPromise: Promise<void> | undefined;

function loadScript(language: string): Promise<void> {
  if (api()) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    // hl is fixed at load time because the script keeps it for every widget it
    // renders afterwards; it is read once, from the page's current language.
    script.src = `${PROVIDERS[PROVIDER].script}?render=explicit&hl=${encodeURIComponent(language)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("The CAPTCHA script could not be loaded"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function Captcha({ handleRef, locale }: { handleRef: { current: CaptchaHandle | null }; locale: "en" | "zh" }) {
  const container = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    void loadScript(locale === "zh" ? "zh-CN" : "en").then(() => {
      const captcha = api();
      if (cancelled || widgetId.current || !container.current || !captcha) return;
      widgetId.current = captcha.render(container.current, {
        sitekey: SITE_KEY,
        theme: "light",
        ...PROVIDERS[PROVIDER].options
      });
      handleRef.current = {
        required: () => true,
        token: () => (api() && widgetId.current ? api()!.getResponse(widgetId.current) : "") || undefined,
        reset: () => { if (api() && widgetId.current) api()!.reset(widgetId.current); }
      };
    }).catch(() => {
      // A blocked script leaves the form as it was: the request goes without a
      // token and the server answers with its own captcha error, which the form
      // already has copy for.
    });
    return () => {
      cancelled = true;
      // Development mounts these effects twice: the widget has to go with the
      // node it was rendered into, or the second pass renders into a node the
      // first one still owns.
      const captcha = api();
      if (captcha && widgetId.current) captcha.remove(widgetId.current);
      widgetId.current = undefined;
      handleRef.current = null;
    };
  }, [handleRef, locale]);

  if (!SITE_KEY) return null;
  return <div className="account-captcha" ref={container} />;
}
