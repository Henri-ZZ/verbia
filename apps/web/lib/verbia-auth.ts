// Browser-only auth singleton for the marketing site / account console.
//
// The site is statically exported (next.config `output: "export"`), so login
// runs fully client-side with the Supabase PKCE flow — the same mechanism the
// Chrome extension uses. Both surfaces point at the SAME Supabase project, so
// a website account and an extension account are one identity (same auth user,
// same profiles / quota_usage rows). Sessions stay separate on purpose: the
// web keeps its session in localStorage, the extension in chrome.storage.
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const AUTH_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const API_BASE = (process.env.NEXT_PUBLIC_VERBIA_API || "https://api.verbia.henriz.dev").replace(/\/+$/, "");

const SESSION_STORAGE_KEY = "verbia-web-auth";

let clientPromise: Promise<SupabaseClient> | undefined;

export function getClient(): Promise<SupabaseClient> {
  if (!clientPromise) {
    if (!AUTH_CONFIGURED) return Promise.reject(new Error("Supabase is not configured for the web app."));
    clientPromise = import("@supabase/supabase-js").then(({ createClient: create }) =>
      create(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: {
          flowType: "pkce",
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storageKey: SESSION_STORAGE_KEY
        }
      })
    );
  }
  return clientPromise;
}

export function sessionOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function currentCallbackUrl(): string {
  return `${sessionOrigin()}/account/callback`;
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const client = await getClient();
    const { data } = await client.auth.getSession();
    return data.session?.user ?? null;
  } catch {
    return null;
  }
}

export type AccountState =
  | { status: "signed_out" }
  | { status: "signed_in"; user: User };

export async function accountState(): Promise<AccountState> {
  const user = await getSessionUser();
  return user ? { status: "signed_in", user } : { status: "signed_out" };
}

export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const client = await getClient();
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: currentCallbackUrl() }
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Sign-in failed." };
  }
}

export async function sendMagicLink(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const client = await getClient();
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: currentCallbackUrl(), shouldCreateUser: true }
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not send the sign-in link." };
  }
}

export async function exchangeSignInCode(): Promise<{ ok: boolean; message?: string }> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const description = params.get("error_description") ?? params.get("error");
  if (description) return { ok: false, message: description };
  if (!code) return { ok: false };
  try {
    const client = await getClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not finish sign-in." };
  }
}

export async function signOut(): Promise<void> {
  try {
    const client = await getClient();
    // Local scope only: supabase-js defaults to "global", which revokes the
    // SAME account's sessions on other surfaces (e.g. the browser extension).
    // Website and extension keep independent login states by design.
    await client.auth.signOut({ scope: "local" });
  } catch {
    // Local session clearing below still applies.
  }
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function providerOf(user: User): "google" | "email" | undefined {
  const provider = user.app_metadata?.provider as string | undefined;
  return provider === "google" || provider === "email" ? provider : undefined;
}

export function avatarUrlOf(user: User): string | undefined {
  if (providerOf(user) !== "google") return undefined;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const raw = meta.avatar_url ?? meta.picture;
  if (typeof raw !== "string") return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
