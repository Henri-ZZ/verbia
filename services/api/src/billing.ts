import { WaffoPancake, type WebhookEventData } from "@waffo/pancake-ts";
import type { ApiEnv } from "./app";

type BillingUser = { userId: string; email?: string };
type BillingCycle = "monthly" | "annual";
const planCache = new Map<string, { pro: boolean; expiresAt: number }>();

function clientFor(env: ApiEnv) {
  const merchantId = env.WAFFO_MERCHANT_ID;
  const privateKey = env.WAFFO_PRIVATE_KEY;
  if (!merchantId || !privateKey) throw new Error("NOT_CONFIGURED: Waffo billing credentials are missing");
  return new WaffoPancake({ merchantId, privateKey, environment: env.WAFFO_ENVIRONMENT === "test" ? "test" : "prod" });
}

export function billingConfigured(env: ApiEnv): boolean {
  return Boolean(env.WAFFO_MERCHANT_ID && env.WAFFO_PRIVATE_KEY && env.WAFFO_STORE_ID && env.WAFFO_MONTHLY_PRODUCT_ID && env.WAFFO_ANNUAL_PRODUCT_ID);
}

export async function createCheckout(user: BillingUser, cycle: BillingCycle, locale: string, env: ApiEnv) {
  if (!user.email) throw new Error("A verified email is required for checkout");
  const productId = cycle === "annual" ? env.WAFFO_ANNUAL_PRODUCT_ID : env.WAFFO_MONTHLY_PRODUCT_ID;
  if (!productId) throw new Error("NOT_CONFIGURED: Waffo product is missing");
  const language = locale.toLowerCase().startsWith("zh") ? "zh-Hans" : "en";
  const result = await clientFor(env).checkout.authenticated.create({
    productId,
    currency: "USD",
    buyerIdentity: user.userId,
    buyerEmail: user.email,
    successUrl: `https://verbia.henriz.dev/account?checkout=success&cycle=${cycle}`,
    metadata: { plan: "pro", cycle, supabaseUserId: user.userId },
    orderMerchantExternalId: `verbia-${user.userId}-${cycle}`.slice(0, 128),
    language,
    darkMode: false,
    expiresInSeconds: 3600,
  });
  return { checkoutUrl: result.checkoutUrl, expiresAt: result.expiresAt };
}

export async function hasActiveProSubscription(user: BillingUser, env: ApiEnv): Promise<boolean> {
  if (!billingConfigured(env)) return false;
  const cached = planCache.get(user.userId);
  if (cached && cached.expiresAt > Date.now()) return cached.pro;
  const result = await clientFor(env).graphql.query<{
    subscriptionOrders: Array<{ status: string; testMode: boolean; merchantProvidedBuyerIdentity?: string; subscriptionProduct?: { id: string } }>;
  }>({
    query: `query ($storeId: String!, $userId: String!) {
      subscriptionOrders(storeId: $storeId, filter: { merchantProvidedBuyerIdentity: { eq: $userId } }) {
        status testMode merchantProvidedBuyerIdentity subscriptionProduct { id }
      }
    }`,
    variables: { storeId: env.WAFFO_STORE_ID, userId: user.userId },
  });
  if (result.errors?.length) throw new Error(result.errors[0]?.message ?? "Waffo subscription lookup failed");
  const products = new Set([env.WAFFO_MONTHLY_PRODUCT_ID, env.WAFFO_ANNUAL_PRODUCT_ID]);
  const pro = (result.data?.subscriptionOrders ?? []).some(order => !order.testMode && ["active", "canceling"].includes(order.status) && products.has(order.subscriptionProduct?.id));
  planCache.set(user.userId, { pro, expiresAt: Date.now() + 120_000 });
  return pro;
}

export function verifyBillingWebhook(rawBody: string, signature: string | null, env: ApiEnv) {
  const event = clientFor(env).webhooks.verify<WebhookEventData>(rawBody, signature, { environment: env.WAFFO_ENVIRONMENT === "test" ? "test" : "prod" });
  if (event.storeId !== env.WAFFO_STORE_ID || event.mode !== (env.WAFFO_ENVIRONMENT === "test" ? "test" : "prod")) throw new Error("Webhook store or environment mismatch");
  const userId = event.data.merchantProvidedBuyerIdentity;
  if (userId) planCache.delete(userId);
  return event;
}

export type { BillingCycle };
