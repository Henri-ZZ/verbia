"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { exchangeSignInCode, syncSignedInSessionToExtension } from "../../../lib/verbia-auth";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState<string>("");
  const [state, setState] = useState<"exchanging" | "done" | "error">("exchanging");
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;
    let cancelled = false;
    void exchangeSignInCode().then(async result => {
      if (cancelled) return;
      if (result.ok) {
        setState("done");
        await syncSignedInSessionToExtension();
        if (cancelled) return;
        window.location.replace("/account");
      } else {
        setState("error");
        setMessage(result.message ?? "Sign-in could not be completed.");
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="account-main shell">
      <section className="account-panel">
        <p className="account-eyebrow">Verbia Account</p>
        {state === "exchanging" && <h1>Signing you in…</h1>}
        {state === "done" && <h1>Signed in</h1>}
        {state === "error" && (<><h1>Sign-in failed</h1><p className="muted">{message}</p><Link className="button primary" href="/account">Back to account</Link></>)}
      </section>
    </main>
  );
}
