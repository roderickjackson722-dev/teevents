import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PRICE_CENTS = 9900;

/** Creates a $99 one-time Stripe Checkout session to remove TeeVents branding. */
export const createBrandingRemovalCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; origin?: string }) => {
    if (!input?.tournamentId) throw new Error("tournamentId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) throw new Error("Payments are not configured");

    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, organization_id, branding_removed")
      .eq("id", data.tournamentId)
      .maybeSingle();
    if (!t) throw new Error("Tournament not found");
    if ((t as any).branding_removed) throw new Error("Branding is already removed for this tournament");

    const { data: membership } = await context.supabase
      .from("org_members")
      .select("user_id")
      .eq("organization_id", (t as any).organization_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!membership) throw new Error("Not authorized for this tournament");

    const origin = (data.origin || "https://www.teevents.golf").replace(/\/$/, "");
    const body = new URLSearchParams({
      mode: "payment",
      "payment_method_types[0]": "card",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(PRICE_CENTS),
      "line_items[0][price_data][product_data][name]": "TeeVents – Remove TeeVents Branding",
      "line_items[0][price_data][product_data][description]": `For: ${(t as any).title}`,
      success_url: `${origin}/dashboard/upgrade?branding_session_id={CHECKOUT_SESSION_ID}&tournament_id=${t.id}`,
      cancel_url: `${origin}/dashboard/upgrade?branding_canceled=1`,
      "metadata[type]": "branding_removal",
      "metadata[tournament_id]": String(t.id),
      "metadata[user_id]": String(context.userId),
    });
    if (context.claims?.email) body.set("customer_email", String(context.claims.email));

    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const session: any = await resp.json();
    if (!resp.ok) throw new Error(session?.error?.message || "Could not start checkout");

    return { url: session.url as string };
  });

/** Confirms a completed checkout session and removes branding for the tournament. */
export const verifyBrandingRemoval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => {
    if (!input?.sessionId) throw new Error("sessionId is required");
    return input;
  })
  .handler(async ({ data }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) throw new Error("Payments are not configured");

    const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${data.sessionId}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const session: any = await resp.json();
    if (!resp.ok) throw new Error(session?.error?.message || "Could not verify payment");
    if (session.payment_status !== "paid") return { verified: false };

    const tournamentId = session.metadata?.tournament_id;
    if (!tournamentId) throw new Error("Missing tournament in session metadata");

    await supabaseAdmin
      .from("tournaments")
      .update({ branding_removed: true } as any)
      .eq("id", tournamentId);

    return { verified: true, tournamentId };
  });

/** Platform admin: remove (or restore) branding for a tournament at no charge. */
export const adminSetBrandingOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; removed: boolean; reason?: string }) => {
    if (!input?.tournamentId) throw new Error("tournamentId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const reason = (data.reason || "").trim() || null;
    const { error } = await admin
      .from("tournaments")
      .update({
        branding_removed_by_admin: !!data.removed,
        branding_override_reason: data.removed ? reason : null,
      } as any)
      .eq("id", data.tournamentId);
    if (error) throw new Error(error.message);

    await admin.from("admin_audit_log").insert({
      admin_id: context.userId,
      action: data.removed ? "branding_override_added" : "branding_override_removed",
      target_type: "tournament",
      target_id: data.tournamentId,
      changes: { branding_removed_by_admin: !!data.removed, reason },
    } as any);

    return { ok: true };
  });
