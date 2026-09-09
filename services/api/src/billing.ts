import { WaffoPancake, type WebhookEvent, type WebhookEventData } from "@waffo/pancake-ts";
import type { ApiEnv } from "./app";

type BillingUser = { userId: string; email?: string };
type BillingCycle = "monthly" | "annual";
const clientCache = new WeakMap<ApiEnv, WaffoPancake>();

function isTestEnvironment(env: ApiEnv): boolean {
  return env.WAFFO_ENVIRONMENT === "test";
}

function clientFor(env: ApiEnv) {
  const cached = clientCache.get(env);
  if (cached) return cached;
  const merchantId = env.WAFFO_MERCHANT_ID;
  const privateKey = env.WAFFO_PRIVATE_KEY;
  if (!merchantId || !privateKey) throw new Error("NOT_CONFIGURED: Waffo billing credentials are missing");
  const client = new WaffoPancake({ merchantId, privateKey, environment: isTestEnvironment(env) ? "test" : "prod" });
  clientCache.set(env, client);
  return client;
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

export function verifyBillingWebhook(rawBody: string, signature: string | null, env: ApiEnv) {
  const environment = isTestEnvironment(env) ? "test" : "prod";
  const event = clientFor(env).webhooks.verify<WebhookEventData>(rawBody, signature, { environment });
  if (event.storeId !== env.WAFFO_STORE_ID || event.mode !== environment) throw new Error("Webhook store or environment mismatch");
  return event;
}

type BillingState = { plan: "free" | "premium"; status: string };

export function billingStateForWaffoEvent(eventType: string): BillingState | null {
  if (["subscription.activated", "subscription.payment_succeeded", "subscription.uncanceled", "subscription.updated"].includes(eventType)) {
    return { plan: "premium", status: "active" };
  }
  if (eventType === "subscription.canceling") return { plan: "premium", status: "canceling" };
  if (eventType === "subscription.canceled") return { plan: "free", status: "canceled" };
  if (eventType === "subscription.past_due") return { plan: "free", status: "past_due" };
  return null;
}

export async function persistBillingWebhook(event: WebhookEvent<WebhookEventData>, env: ApiEnv): Promise<void> {
  const userId = event.data.merchantProvidedBuyerIdentity;
  if (!userId) throw new Error("Waffo webhook is missing merchantProvidedBuyerIdentity");
  const supabaseUrl = (env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const secretKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !secretKey) throw new Error("NOT_CONFIGURED: Supabase billing storage is missing");
  const state = billingStateForWaffoEvent(event.eventType);
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/apply_billing_event`, {
    method: "POST",
    headers: { apikey: secretKey, "content-type": "application/json" },
    body: JSON.stringify({
      p_provider: "waffo",
      p_environment: event.mode,
      p_delivery_id: event.id,
      p_event_id: event.eventId,
      p_event_type: event.eventType,
      p_event_at: event.timestamp,
      p_user_id: userId,
      // Waffo exposes the billing email but no durable customer ID in this
      // webhook shape. Do not use mutable personal data as an identifier.
      p_customer_id: null,
      p_subscription_id: event.data.orderId,
      p_plan: state?.plan ?? null,
      p_status: state?.status ?? null,
      p_current_period_end: event.data.currentPeriodEnd ?? null
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase billing event write returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }
}

export type { BillingCycle };
