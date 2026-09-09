import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from "jose";
import { reportError } from "./monitoring";
import type { ApiEnv } from "./app";

export type BearerResult = { status: "none" | "invalid" } | { status: "ok"; userId: string; email?: string; token: string };
export type AuthenticatedBearer = Extract<BearerResult, { status: "ok" }>;

const jwksByProject = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function projectJwks(supabaseUrl: string) {
  let jwks = jwksByProject.get(supabaseUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`), {
      // Supabase's edge caches this endpoint for 10 minutes. jose also keeps
      // the resolved public key in this Worker isolate between requests.
      cacheMaxAge: 10 * 60_000,
      cooldownDuration: 30_000,
      timeoutDuration: 5_000
    });
    jwksByProject.set(supabaseUrl, jwks);
  }
  return jwks;
}

function claimEmail(payload: JWTPayload): string | undefined {
  return typeof payload.email === "string" && payload.email ? payload.email : undefined;
}

export async function verifyBearer(header: string | null, env: ApiEnv): Promise<BearerResult> {
  if (!header?.startsWith("Bearer ")) return { status: "none" };
  const token = header.slice("Bearer ".length).trim();
  if (!token) return { status: "none" };
  const supabaseUrl = (env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  if (!supabaseUrl) {
    console.warn("[verbia-api] Authorization header sent but Supabase auth is not configured");
    return { status: "none" };
  }
  try {
    const { payload } = await jwtVerify(token, projectJwks(supabaseUrl), {
      algorithms: ["ES256"],
      issuer: `${supabaseUrl}/auth/v1`,
      audience: "authenticated"
    });
    if (typeof payload.sub !== "string" || !payload.sub || payload.role !== "authenticated") return { status: "invalid" };
    return { status: "ok", userId: payload.sub, email: claimEmail(payload), token };
  } catch (error) {
    // Invalid, expired, wrong-project, and incorrectly signed tokens are all
    // authentication failures. JWKS network failures are reported as well;
    // callers still fail closed while AUTH_REQUIRED is enabled.
    if ((error as { code?: string }).code === "ERR_JWKS_TIMEOUT" || !(error instanceof errors.JOSEError)) {
      reportError(error, "auth_jwks");
    }
    return { status: "invalid" };
  }
}
