import { afterEach, describe, expect, it, vi } from "vitest";
import { billingStateForWaffoEvent, persistBillingWebhook } from "../services/api/src/billing";

afterEach(() => vi.restoreAllMocks());

describe("Waffo entitlement mapping", () => {
  it.each([
    "subscription.activated",
    "subscription.payment_succeeded",
    "subscription.uncanceled",
    "subscription.updated"
  ])("marks %s active", eventType => {
    expect(billingStateForWaffoEvent(eventType)).toEqual({ plan: "premium", status: "active" });
  });

  it("keeps Premium during the paid cancellation period", () => {
    expect(billingStateForWaffoEvent("subscription.canceling")).toEqual({ plan: "premium", status: "canceling" });
  });

  it.each(["subscription.canceled", "subscription.past_due"])("removes Premium for %s", eventType => {
    expect(billingStateForWaffoEvent(eventType)).toEqual({ plan: "free", status: eventType.split(".")[1] });
  });

  it.each(["refund.succeeded", "refund.failed", "order.completed", "unknown"])("does not change entitlement for %s", eventType => {
    expect(billingStateForWaffoEvent(eventType)).toBeNull();
  });

  it("persists a verified event through the service-only Supabase RPC", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    await persistBillingWebhook({
      id: "delivery-1",
      timestamp: "2026-09-10T01:00:00.000Z",
      eventType: "subscription.activated",
      eventId: "event-1",
      storeId: "store-1",
      storeName: "Verbia",
      mode: "prod",
      data: {
        orderId: "subscription-1",
        buyerEmail: "billing@example.com",
        currency: "USD",
        amount: "9.99",
        taxAmount: "0",
        productName: "Verbia Pro",
        merchantProvidedBuyerIdentity: "11111111-1111-4111-8111-111111111111",
        currentPeriodEnd: "2026-10-10T01:00:00.000Z"
      }
    }, {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_server-key"
    });

    expect(request).toHaveBeenCalledOnce();
    const [input, init] = request.mock.calls[0]!;
    expect(String(input)).toBe("https://project.supabase.co/rest/v1/rpc/apply_billing_event");
    expect(new Headers(init?.headers).get("apikey")).toBe("sb_secret_server-key");
    expect(new Headers(init?.headers).has("authorization")).toBe(false);
    expect(JSON.parse(String(init?.body))).toMatchObject({
      p_provider: "waffo",
      p_subscription_id: "subscription-1",
      p_plan: "premium",
      p_status: "active",
      p_customer_id: null
    });
  });
});
