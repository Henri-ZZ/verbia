// Browser-only auth singleton for the marketing site / account console.
//
// The site is statically exported (next.config `output: "export"`), so login
// runs fully client-side with the Supabase PKCE flow — the same mechanism the
// Chrome extension uses. Both surfaces point at the SAME Supabase project, so
// a website account and an extension account are one identity (same auth user,
// same profiles / quota_usage rows). Sessions stay separate on purpose: the
// web keeps its session in localStorage, the extension in chrome.storage. A
// fresh login can create a separate session on the other surface through the
// extension bridge and the API handoff endpoint.
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

// Both OAuth buttons go through here, so only the provider name and its scopes
// can differ between them.
async function signInWithProvider(provider: "google" | "azure", scopes?: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const client = await getClient();
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: scopes ? { redirectTo: currentCallbackUrl(), scopes } : { redirectTo: currentCallbackUrl() }
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Sign-in failed." };
  }
}

export function signInWithGoogle(): Promise<{ ok: true } | { ok: false; message: string }> {
  return signInWithProvider("google");
}

// Microsoft must be asked for the email scope explicitly: Azure returns no email
// address without it, and Supabase Auth needs one to create the account
// (@see docs/auth-setup.md, §二.3).
export function signInWithAzure(): Promise<{ ok: true } | { ok: false; message: string }> {
  return signInWithProvider("azure", "email");
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

export async function syncSignedInSessionToExtension(): Promise<"synced" | "unavailable" | "failed"> {
  const bridgeReady = () => document.documentElement.dataset.verbiaExtension === "connected";
  if (!bridgeReady()) {
    await new Promise<void>(resolve => {
      const done = () => { window.clearTimeout(timer); resolve(); };
      const timer = window.setTimeout(done, 350);
      window.addEventListener("verbia:bridge-ready", done, { once: true });
    });
  }
  if (!bridgeReady()) return "unavailable";
  return new Promise(resolve => {
    let settled = false;
    const done = (result: "synced" | "failed") => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener("verbia:extension-session-ready", ready);
      window.removeEventListener("verbia:extension-session-failed", failed);
      resolve(result);
    };
    const ready = () => done("synced");
    const failed = () => done("failed");
    const timer = window.setTimeout(failed, 10_000);
    window.addEventListener("verbia:extension-session-ready", ready, { once: true });
    window.addEventListener("verbia:extension-session-failed", failed, { once: true });
    window.dispatchEvent(new CustomEvent("verbia:sync-extension-session"));
  });
}

export async function signOut(): Promise<void> {
  try {
    const client = await getClient();
    // Local scope only. supabase-js defaults to "global", which revokes this
    // account's sessions on every device — but the state the surfaces share is
    // shared *in this browser*, and that is what announceWebSignOut below
    // carries. The user's phone is not ours to sign out from here.
    await client.auth.signOut({ scope: "local" });
  } catch {
    // Local session clearing below still applies.
  }
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  announceWebSignOut();
}

// Tells the extension this website signed out, so a page that is open hears
// about it at once. Nothing is left behind for a page that is not open: the
// bridge reads this website's signed-in state whenever it loads, which cannot
// go stale the way a record of the event would.
function announceWebSignOut(): void {
  window.dispatchEvent(new CustomEvent("verbia:web-signed-out"));
}

// The extension signed out, so this page follows it out — the two surfaces keep
// one signed-in state. Announced twice because the bridge may have run before
// this app mounted: as a data attribute, and as an event (@see bridge.ts).
export function onExtensionSignOutRequest(handler: () => void): () => void {
  // Consume the attribute rather than only reading it: it belongs to the whole
  // document, while this app can mount the page again without a reload, and a
  // sign-out that already happened must not keep firing.
  if (document.documentElement.dataset.verbiaWebSignOut === "1") {
    delete document.documentElement.dataset.verbiaWebSignOut;
    handler();
  }
  window.addEventListener("verbia:web-sign-out", handler);
  return () => window.removeEventListener("verbia:web-sign-out", handler);
}

export function providerOf(user: User): "google" | "azure" | "email" | undefined {
  const provider = user.app_metadata?.provider as string | undefined;
  return provider === "google" || provider === "azure" || provider === "email" ? provider : undefined;
}

// The OAuth identities the account actually has — which is what the marks have to
// follow, not app_metadata.provider. That field records the identity the account
// was created or last linked with, so an account that began with an email code and
// later added Microsoft still reports "email" and would show no mark at all
// (@see docs/auth-setup.md, §六.7).
export function socialProvidersOf(user: User): ("google" | "azure")[] {
  const identities = (user.identities ?? []).map(identity => identity.provider);
  if (identities.length === 0) {
    // A session stored before identities were part of what we read: fall back to
    // the provider field, so an existing Google account keeps its mark.
    const provider = providerOf(user);
    return provider === "google" || provider === "azure" ? [provider] : [];
  }
  const social: ("google" | "azure")[] = [];
  if (identities.includes("google")) social.push("google");
  if (identities.includes("azure")) social.push("azure");
  return social;
}

export function avatarUrlOf(user: User): string | undefined {
  // Same rule as the marks, and the same reason: only Google hands us a picture
  // (Microsoft does not), and an account that started with an email code and
  // later linked Google has one even though its provider says "email".
  if (!socialProvidersOf(user).includes("google")) return undefined;
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

// ---------------------------------------------------------------------------
// Email codes, passwords, and reset
//
// Sign-up and sign-in are the same call here. The account is created the moment
// a code is verified (shouldCreateUser), so an address that never verifies never
// leaves a user row behind — nothing to clean up, and nothing to enumerate.
// ---------------------------------------------------------------------------

// The address is carried between the account page and the verify page in session
// storage rather than the query string: it is only needed to re-send and to label
// the screen, and an email in a URL ends up in history and screenshots.
export const VERIFY_EMAIL_KEY = "verbia-verify-email";

export function verifyUrl(): string {
  return `${sessionOrigin()}/account/verify`;
}

export function resetUrl(): string {
  return `${sessionOrigin()}/account/reset`;
}

// Failures travel as codes, not sentences. Supabase returns one English sentence
// per error and these pages are bilingual, so the copy lives in one table below
// instead of being re-derived at each call site.
export type AuthErrorCode =
  | "invalid_code"
  | "expired_code"
  | "invalid_credentials"
  | "weak_password"
  | "same_password"
  | "reauthentication_needed"
  | "rate_limited"
  | "captcha_failed"
  | "captcha_required"
  | "not_configured"
  | "unknown";

function authErrorCode(error: { code?: string | null; message?: string | null } | null | undefined): AuthErrorCode {
  const raw = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  if (!raw.trim()) return "unknown";
  if (raw.includes("captcha")) return "captcha_failed";
  if (raw.includes("rate limit") || raw.includes("too many")) return "rate_limited";
  if (raw.includes("reauthentication")) return "reauthentication_needed";
  if (raw.includes("different from the old") || raw.includes("same password")) return "same_password";
  if (raw.includes("weak") || raw.includes("password should")) return "weak_password";
  // "Token has expired or is invalid" carries both words: expired first, or every
  // expired code would be reported as a mistyped one.
  if (raw.includes("expired")) return "expired_code";
  if (raw.includes("token") || raw.includes("otp")) return "invalid_code";
  if (raw.includes("invalid login") || raw.includes("invalid credential")) return "invalid_credentials";
  return "unknown";
}

const AUTH_ERROR_COPY = {
  en: {
    invalid_code: "That code is not right. Check the 6 digits, or send a new code.",
    expired_code: "That code has expired. Send a new code.",
    invalid_credentials: "Wrong email or password.",
    weak_password: "That password was rejected — try a longer or less common one.",
    same_password: "That is already your password.",
    reauthentication_needed: "For security, sign in again before changing your password.",
    rate_limited: "Too many attempts. Wait a minute and try again.",
    captcha_failed: "The anti-bot check failed. Reload the page and try again.",
    captcha_required: "Complete the human check first.",
    not_configured: "Sign-in is not configured on this site.",
    unknown: "Something went wrong. Please try again."
  },
  zh: {
    invalid_code: "验证码不正确，请检查这 6 位数字，或重新发送。",
    expired_code: "验证码已过期，请重新发送。",
    invalid_credentials: "邮箱或密码不正确。",
    weak_password: "该密码被拒绝，请换一个更长或更少见的。",
    same_password: "这就是你当前的密码。",
    reauthentication_needed: "出于安全考虑，请重新登录后再修改密码。",
    rate_limited: "尝试过于频繁，请等一分钟再试。",
    captcha_failed: "人机校验未通过，请刷新页面重试。",
    captcha_required: "请先完成人机校验。",
    not_configured: "本站尚未配置登录。",
    unknown: "出错了，请重试。"
  }
} as const;

export function authErrorCopy(locale: "en" | "zh", code: AuthErrorCode): string {
  return AUTH_ERROR_COPY[locale][code] ?? AUTH_ERROR_COPY[locale].unknown;
}

type Verified = { ok: true; createdAt?: string } | { ok: false; code: AuthErrorCode };

export async function sendEmailCode(email: string, captchaToken?: string): Promise<{ ok: true } | { ok: false; code: AuthErrorCode }> {
  try {
    const client = await getClient();
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // Kept so a template that still uses the default confirmation URL lands
        // on the callback page; the custom link in the template goes to /account/verify.
        emailRedirectTo: currentCallbackUrl(),
        ...(captchaToken ? { captchaToken } : {})
      }
    });
    return error ? { ok: false, code: authErrorCode(error) } : { ok: true };
  } catch {
    return { ok: false, code: "not_configured" };
  }
}

// The code typed on the page. type "email" covers the code and the magic link;
// the wrong type reports "token has expired", which looks like a timing problem
// and is not one.
export async function verifyEmailCode(email: string, token: string): Promise<Verified> {
  try {
    const client = await getClient();
    const { data, error } = await client.auth.verifyOtp({ email, token, type: "email" });
    return error ? { ok: false, code: authErrorCode(error) } : { ok: true, createdAt: data.user?.created_at };
  } catch {
    return { ok: false, code: "not_configured" };
  }
}

// There is deliberately no verifyEmailLink() here. The sign-in email carries a
// 6-digit code and no link, so nothing ever lands on the site with a token hashed
// into the URL. That is also why the verify page asks for the address when it does
// not already know it: a code is verified against the email it was sent to, and
// only the tab that requested it has that address to hand.

// The code from the password-recovery email. Same shape as a sign-in code but a
// different type, which is what keeps the two from being interchangeable: a
// sign-in code cannot be spent on a password reset, and the other way round.
export async function verifyRecoveryCode(email: string, token: string): Promise<Verified> {
  try {
    const client = await getClient();
    const { data, error } = await client.auth.verifyOtp({ email, token, type: "recovery" });
    return error ? { ok: false, code: authErrorCode(error) } : { ok: true, createdAt: data.user?.created_at };
  } catch {
    return { ok: false, code: "not_configured" };
  }
}

// Setting a password is the last step of a sign-up, never a way in on its own:
// this only works on a live session, which is why it is called right after the
// code is verified.
export async function updatePassword(password: string): Promise<{ ok: true } | { ok: false; code: AuthErrorCode }> {
  try {
    const client = await getClient();
    const { error } = await client.auth.updateUser({ password });
    return error ? { ok: false, code: authErrorCode(error) } : { ok: true };
  } catch {
    return { ok: false, code: "not_configured" };
  }
}

export async function requestPasswordReset(email: string, captchaToken?: string): Promise<{ ok: true } | { ok: false; code: AuthErrorCode }> {
  try {
    const client = await getClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl(),
      ...(captchaToken ? { captchaToken } : {})
    });
    return error ? { ok: false, code: authErrorCode(error) } : { ok: true };
  } catch {
    return { ok: false, code: "not_configured" };
  }
}

export async function signInWithPasswordEmail(email: string, password: string, captchaToken?: string): Promise<{ ok: true } | { ok: false; code: AuthErrorCode }> {
  try {
    const client = await getClient();
    const { error } = await client.auth.signInWithPassword({
      email,
      password,
      ...(captchaToken ? { options: { captchaToken } } : {})
    });
    return error ? { ok: false, code: authErrorCode(error) } : { ok: true };
  } catch {
    return { ok: false, code: "not_configured" };
  }
}
