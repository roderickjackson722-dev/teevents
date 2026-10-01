import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ENTERPRISE_PRICE_ID = "price_1ULsJk7UK8GxgadTfFgR9Fbx";

async function assertOrganizationOwner(supabase: any, userId: string, organizationId: string) {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || !["owner", "admin"].includes(data.role)) {
    throw new Error("Organization owner access is required");
  }
}

/** Starts the approved $2,999 annual Enterprise subscription. */
export const createEnterpriseCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; origin: string }) => {
    if (!input?.organizationId) throw new Error("organizationId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    await assertOrganizationOwner(context.supabase, context.userId, data.organizationId);
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("Stripe is not configured");
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
    const origin = data.origin || "https://teevents.golf";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: ENTERPRISE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/enterprise?enterprise_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/enterprise-pricing?enterprise_canceled=1`,
      metadata: {
        type: "enterprise_annual",
        pricing_version: "2026-10",
        organization_id: data.organizationId,
        user_id: context.userId,
      },
    });
    return { url: session.url };
  });

/** Confirms Enterprise payment before activating zero-fee pricing. */
export const verifyEnterpriseCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => {
    if (!input?.sessionId) throw new Error("sessionId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("Stripe is not configured");
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
    const session = await stripe.checkout.sessions.retrieve(data.sessionId);
    const organizationId = session.metadata?.organization_id;
    if (!organizationId || session.metadata?.type !== "enterprise_annual") {
      throw new Error("Invalid Enterprise checkout session");
    }
    await assertOrganizationOwner(context.supabase, context.userId, organizationId);
    if (session.payment_status !== "paid" || !session.subscription) {
      return { verified: false as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const subscriptionId = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;
    await supabaseAdmin.from("organizations").update({
      pricing_model: "enterprise",
      enterprise_subscription_id: subscriptionId,
    }).eq("id", organizationId);
    return { verified: true as const, organization_id: organizationId };
  });