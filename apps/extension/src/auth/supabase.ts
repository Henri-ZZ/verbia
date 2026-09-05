import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Values are injected at build time by scripts/build.mjs from .env.local
// (esbuild `define` replaces the process.env.* references below). When they
// are missing the build ships with sign-in disabled so the extension keeps
// working as a plain anonymous client.
export const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
export const authEnabled = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// One session storage key for every surface (background service worker,
// options page, popup, auth callback page). Supabase persists the session
// JSON through this adapter, so wherever a client signs in or refreshes, the
// others see the same state without message round-trips.
export const AUTH_STORAGE_KEY = "verbia-auth-token";

// Landing target for every OAuth / email round-trip (Google OAuth and Magic
// Link). It is the Supabase project root — a normal https URL — because
// Chrome blocks server-side 302 navigations into chrome-extension:// pages
// (ERR_BLOCKED_BY_CLIENT). The background service worker watches for ?code=
// landings on this root and exchanges them into a session (see
// background/index.ts); nothing ever needs to render this URL.
export const SUPABASE_SIGNIN_REDIRECT = `${SUPABASE_URL}/`;

let clientInstance: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  return (clientInstance ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      flowType: "pkce",
      // Service workers sleep: never rely on the client's own timer. Every
      // surface refreshes explicitly through refreshIfNeeded() before use.
      autoRefreshToken: false,
      // The auth callback page handles email links (?code / #access_token)
      // itself. Google OAuth is captured in a normal tab by signInWithGoogle
      // (see below), so no surface ever needs URL-based session detection.
      detectSessionInUrl: false,
      persistSession: true,
      storageKey: AUTH_STORAGE_KEY,
      storage: {
        getItem: async key => {
          const data = await chrome.storage.local.get(key);
          const value = data[key];
          return typeof value === "string" ? value : null;
        },
        setItem: async (key, value) => {
          await chrome.storage.local.set({ [key]: value });
        },
        removeItem: async key => {
          await chrome.storage.local.remove(key);
        }
      }
    }
  }));
}

// The shape Supabase persists under AUTH_STORAGE_KEY. Only the fields we read
// are modelled; unknown fields are left untouched when parsing.
type PersistedSession = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  user?: {
    id?: string;
    email?: string;
    app_metadata?: { provider?: string };
    user_metadata?: { avatar_url?: string; picture?: string };
  } | null;
};

export async function readSession(): Promise<PersistedSession | null> {
  if (!authEnabled) return null;
  const data = await chrome.storage.local.get(AUTH_STORAGE_KEY);
  const raw = data[AUTH_STORAGE_KEY];
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    return parsed.access_token ? parsed : null;
  } catch {
    return null;
  }
}

// Renew 30s early to absorb clock skew between the extension and Supabase.
function isExpired(session: PersistedSession): boolean {
  return typeof session.expires_at === "number" && session.expires_at * 1000 <= Date.now() + 30_000;
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY);
}

// Returns a valid session, silently refreshing the access token when it is
// close to expiry. Failed refreshes sign the user out rather than letting a
// stale token reach the gateway (which would surface confusing 401s).
export async function currentSession(): Promise<PersistedSession | null> {
  const session = await readSession();
  if (!session || !session.access_token) return null;
  if (!isExpired(session)) return session;
  if (!session.refresh_token) {
    await clearSession();
    return null;
  }
  try {
    const { error } = await getSupabase().auth.refreshSession({ refresh_token: session.refresh_token });
    if (error) {
      await clearSession();
      return null;
    }
    return readSession();
  } catch {
    await clearSession();
    return null;
  }
}

export async function authBearer(): Promise<string | undefined> {
  const session = await currentSession();
  return session?.access_token ? `Bearer ${session.access_token}` : undefined;
}

export type AuthSnapshot = {
  signedIn: boolean;
  email?: string;
  provider?: "google" | "email";
  avatarUrl?: string;
};

// The sign-in method Supabase records on the user (app_metadata.provider):
// "google" for the OAuth button, "email" for Magic Link. Anything else (or an
// older session without it) reports no provider so the UI shows no badge.
function sessionProvider(user: PersistedSession["user"]): "google" | "email" | undefined {
  const provider = user?.app_metadata?.provider;
  return provider === "google" || provider === "email" ? provider : undefined;
}

function sessionAvatarUrl(user: PersistedSession["user"]): string | undefined {
  if (sessionProvider(user) !== "google") return undefined;
  const raw = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export async function authSnapshot(): Promise<AuthSnapshot> {
  if (!authEnabled) return { signedIn: false };
  const session = await currentSession();
  if (!session) return { signedIn: false };
  return {
    signedIn: true,
    email: session.user?.email ?? undefined,
    provider: sessionProvider(session.user),
    avatarUrl: sessionAvatarUrl(session.user)
  };
}

export async function signOut(): Promise<void> {
  try {
    if (authEnabled) await getSupabase().auth.signOut();
  } catch {
    // Sign-out still must clear local state even if the remote call fails.
  }
  await clearSession();
}

// Google OAuth cannot land on a real chrome-extension:// page — Chrome blocks
// server-side 302 navigations into extension pages (ERR_BLOCKED_BY_CLIENT) —
// and chrome.identity.launchWebAuthFlow proved unreliable on this machine. The
// flow opens the Supabase authorize URL in a normal tab (the user's ordinary
// network path). The background capture listener (background/index.ts)
// exchanges the ?code= landing — it also serves Magic Link emails, where no
// options page is open — so this function only waits for the session to show
// up in the shared storage key.
export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; error: unknown }> {
  const client = getSupabase();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: SUPABASE_SIGNIN_REDIRECT, skipBrowserRedirect: true }
  });
  if (error) return { ok: false, error };
  const authorizeUrl = data?.url;
  if (!authorizeUrl) return { ok: false, error: new Error("no authorize URL returned") };
  await chrome.tabs.create({ url: authorizeUrl });
  return waitForStoredSession(3 * 60_000);
}

// Resolves once a real session (a storage write under AUTH_STORAGE_KEY whose
// JSON carries an access token) appears — which is exactly what the exchange
// in the background capture listener produces.
function waitForStoredSession(timeoutMs: number): Promise<{ ok: true } | { ok: false; error: unknown }> {
  return new Promise(resolve => {
    let settled = false;
    const done = (result: { ok: true } | { ok: false; error: unknown }) => {
      if (settled) return;
      settled = true;
      chrome.storage.onChanged.removeListener(onChange);
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => done({ ok: false, error: new Error("sign-in timed out") }), timeoutMs);
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return;
      const change = changes[AUTH_STORAGE_KEY];
      if (!change || typeof change.newValue !== "string") return;
      try {
        const parsed = JSON.parse(change.newValue) as PersistedSession;
        if (parsed.access_token) done({ ok: true });
      } catch {
        // Not a session write — keep waiting.
      }
    };
    chrome.storage.onChanged.addListener(onChange);
  });
}
