import { fail } from "@/lib/api";
import { isDbConfigured } from "@/server/db/client";
import { DbBillingStore } from "@/server/billing/billing-store-db";
import { handleRevenueCatWebhook } from "@/server/billing/webhook";

/**
 * POST /api/billing/revenuecat — RevenueCat webhook (story 9.5). The only place
 * that changes a user's entitlement. Authenticated by the Authorization header
 * configured in the RevenueCat dashboard (REVENUECAT_WEBHOOK_AUTH).
 */
export async function POST(request: Request): Promise<Response> {
  if (!isDbConfigured()) {
    return fail("INTERNAL", "Billing isn't configured on this server.");
  }
  return handleRevenueCatWebhook(request, {
    store: new DbBillingStore(),
    config: {
      authHeader: process.env.REVENUECAT_WEBHOOK_AUTH,
      entitlementId: process.env.REVENUECAT_ENTITLEMENT_ID || "pro",
      allowSandbox: process.env.REVENUECAT_ALLOW_SANDBOX === "true",
    },
  });
}
