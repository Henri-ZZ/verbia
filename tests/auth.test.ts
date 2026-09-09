import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { verifyBearer } from "../services/api/src/auth";

const projectUrl = "https://jwt-tests.supabase.co";
let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let publicJwk: JWK;

beforeAll(async () => {
  const pair = await generateKeyPair("ES256");
  const otherPair = await generateKeyPair("ES256");
  privateKey = pair.privateKey;
  otherPrivateKey = otherPair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), alg: "ES256", kid: "auth-test", use: "sig" };
});

afterEach(() => vi.restoreAllMocks());

async function token(options: { issuer?: string; expiration?: string; role?: string; key?: CryptoKey } = {}) {
  return new SignJWT({ email: "person@example.com", role: options.role ?? "authenticated" })
    .setProtectedHeader({ alg: "ES256", kid: "auth-test" })
    .setSubject("11111111-1111-4111-8111-111111111111")
    .setIssuer(options.issuer ?? `${projectUrl}/auth/v1`)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime(options.expiration ?? "1h")
    .sign(options.key ?? privateKey);
}

describe("Supabase JWT verification", () => {
  it("accepts a valid ES256 access token and fetches only JWKS", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ keys: [publicJwk] }));
    const result = await verifyBearer(`Bearer ${await token()}`, { SUPABASE_URL: projectUrl });
    expect(result).toMatchObject({ status: "ok", userId: "11111111-1111-4111-8111-111111111111", email: "person@example.com" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${projectUrl}/auth/v1/.well-known/jwks.json`);
  });

  it.each([
    ["expired", () => token({ expiration: "0s" })],
    ["wrong issuer", () => token({ issuer: "https://other.supabase.co/auth/v1" })],
    ["wrong role", () => token({ role: "anon" })],
    ["wrong signature", () => token({ key: otherPrivateKey })]
  ])("rejects a token with %s", async (_label, createToken) => {
    expect(await verifyBearer(`Bearer ${await createToken()}`, { SUPABASE_URL: projectUrl })).toEqual({ status: "invalid" });
  });
});
