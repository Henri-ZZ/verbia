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

// The website owns sign-in. The extension never talks to an identity provider
// itself: it opens a page on our own origin, and the bridge content script hands
// the finished session back (@see syncWebsiteSignIn in background/index.ts, which
// mints a *separate* extension session through the API's one-time handoff token,
// so the two surfaces never share a refresh token).
export const WEB_AUTH_ORIGIN = (process.env.VERBIA_WEB_ORIGIN ?? "https://verbia.henriz.dev").replace(/\/+$/, "");

// Opened in a normal tab by the Sign in button on the popup and the settings
// page. ?from=extension only asks the account page to show its “back to the
// extension” affordance; the session itself is handed over whenever either side
// finds the other missing one, because the two surfaces share a single sign-in
// state (@see the sign-out cooperative below).
export function webSignInUrl(): string {
  return `${WEB_AUTH_ORIGIN}/account?from=extension`;
}

// Left behind when the extension signs out, and read by the website's bridge on
// its next load: a website with no open tab would otherwise never hear about it.
// Cleared at the one place an extension session can come into being, so a stale
// sign-out can never undo a session the user signed in again afterwards.
export const WEB_SIGN_OUT_KEY = "verbia-web-sign-out";

let clientInstance: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  return (clientInstance ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      flowType: "pkce",
      // Service workers sleep: never rely on the client's own timer. Every
      // surface refreshes explicitly through refreshIfNeeded() before use.
      autoRefreshToken: false,
      // No surface exchanges codes from a URL any more: sign-in happens on the
      // website and the session arrives through the bridge, so URL-based session
      // detection would only risk picking up an unrelated ?code=.
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

// Force one refresh of the stored session, e.g. after the server rejected the
// current access token with 401. Returns true when a new token was obtained;
// on failure the local session is cleared so every surface shows signed out.
export async function refreshStoredSession(): Promise<boolean> {
  if (!authEnabled) return false;
  const session = await readSession();
  if (!session?.refresh_token) return false;
  try {
    const { error } = await getSupabase().auth.refreshSession({ refresh_token: session.refresh_token });
    if (error) { await clearSession(); return false; }
    return Boolean((await readSession())?.access_token);
  } catch {
    await clearSession();
    return false;
  }
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
    if (authEnabled) await getSupabase().auth.signOut({ scope: "local" });
  } catch {
    // Sign-out still must clear local state even if the remote call fails.
  }
  await clearSession();
  // Signing out is one shared state, not one per surface: leave the marker the
  // website's bridge reads, so the website follows even with no tab open. Only
  // a sign-out the user asked for does this — losing the session to a failed
  // refresh is a local problem and must not sign the website out.
  await chrome.storage.local.set({ [WEB_SIGN_OUT_KEY]: true });
}

export async function establishSessionFromTokenHash(tokenHash: string): Promise<boolean> {
  if (!authEnabled || !tokenHash) return false;
  const { data, error } = await getSupabase().auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error || !data.session?.access_token) return false;
  // The only way an extension session comes into being, which makes this the one
  // place that can guarantee an old sign-out marker is gone: it describes a
  // state the user has since left, and honouring it later would sign out a
  // session they just signed in to.
  await chrome.storage.local.remove(WEB_SIGN_OUT_KEY);
  return true;
}

// Sign-in moved to the website (@see webSignInUrl above, and syncWebsiteSignIn in
// background/index.ts). What used to live here — opening the Supabase authorize
// URL in a tab and waiting for the background to exchange the landing — was the
// extension's own Google OAuth and magic-link flows. Both are gone on purpose:
// the extension now has exactly one way in, and one place to fix when it breaks.
