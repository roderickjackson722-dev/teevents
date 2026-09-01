import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PRICE_CENTS = 49900;

/** Creates a $499 one-time Stripe Checkout session for Branding Removal + Digital Sponsor. */
export const createBrandingRemovalCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; origin?: string; returnPath?: string }) => {
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
    // Organizers can buy from the Leaderboard Branding card or the Upgrade page —
    // send them back to whichever surface they started from.
    const rawReturn = typeof data.returnPath === "string" ? data.returnPath : "";
    const returnPath = /^\/[A-Za-z0-9\-_/]*$/.test(rawReturn) ? rawReturn : "/dashboard/upgrade";
    const body = new URLSearchParams({
      mode: "payment",
      "payment_method_types[0]": "card",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(PRICE_CENTS),
      "line_items[0][price_data][product_data][name]": "TeeVents – Branding Removal + Digital Sponsor",
      "line_items[0][price_data][product_data][description]": `For: ${(t as any).title}`,
      success_url: `${origin}${returnPath}?branding_session_id={CHECKOUT_SESSION_ID}&tournament_id=${t.id}`,
      cancel_url: `${origin}${returnPath}?branding_canceled=1&tournament_id=${t.id}`,
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

    await supabaseAdmin.from("branding_audit_log").insert({
      tournament_id: t.id,
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      actor_type: "organizer",
      action: "checkout_started",
      amount_cents: PRICE_CENTS,
      stripe_session_id: session.id ?? null,
      details: { tournament_title: (t as any).title },
    } as any);

    return { url: session.url as string };
  });

/** Confirms a completed checkout session and removes branding for the tournament. */
export const verifyBrandingRemoval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => {
    if (!input?.sessionId) throw new Error("sessionId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) throw new Error("Payments are not configured");

    const resp = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${data.sessionId}?expand[]=payment_intent.latest_charge`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    const session: any = await resp.json();
    if (!resp.ok) throw new Error(session?.error?.message || "Could not verify payment");
    if (session.payment_status !== "paid") return { verified: false };

    const tournamentId = session.metadata?.tournament_id;
    if (!tournamentId) throw new Error("Missing tournament in session metadata");

    const pi = typeof session.payment_intent === "object" ? session.payment_intent : null;
    const charge = pi && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
    const receiptUrl: string | null = charge?.receipt_url ?? null;
    const paymentIntentId: string | null = pi?.id ?? (typeof session.payment_intent === "string" ? session.payment_intent : null);
    const confirmedAt = new Date((session.created ? session.created * 1000 : Date.now())).toISOString();

    const { data: existing } = await supabaseAdmin
      .from("tournaments")
      .select("branding_removed, organization_id")
      .eq("id", tournamentId)
      .maybeSingle();

    await supabaseAdmin
      .from("tournaments")
      .update({
        branding_removed: true,
        branding_removed_paid: true,
        branding_removed_paid_at: new Date().toISOString(),
        branding_removed_at: new Date().toISOString(),
        branding_removed_by: session.metadata?.user_id ?? context.userId,
        branding_payment_session_id: session.id ?? data.sessionId,
        branding_payment_intent_id: paymentIntentId,
        branding_receipt_url: receiptUrl,
        // The $499 package bundles the Digital Sponsor benefits.
        digital_sponsor_purchased: true,
        digital_sponsor_purchased_at: new Date().toISOString(),
        digital_sponsor_amount_cents: session.amount_total ?? PRICE_CENTS,
      } as any)
      .eq("id", tournamentId);

    if (!(existing as any)?.branding_removed) {
      await supabaseAdmin.from("branding_audit_log").insert({
        tournament_id: tournamentId,
        actor_id: session.metadata?.user_id ?? context.userId,
        actor_email: session.customer_details?.email ?? context.claims?.email ?? null,
        actor_type: "organizer",
        action: "payment_confirmed",
        amount_cents: session.amount_total ?? PRICE_CENTS,
        stripe_session_id: session.id ?? data.sessionId,
        stripe_payment_intent_id: paymentIntentId,
        receipt_url: receiptUrl,
        details: { stripe_confirmed_at: confirmedAt, branding: "disabled" },
      } as any);
    }

    // Platform revenue line for the Admin → Revenue Dashboard.
    const { recordUpgradeRevenue } = await import("./upgradeRevenue.server");
    await recordUpgradeRevenue(supabaseAdmin, {
      type: "branding_removal",
      organizationId: (existing as any)?.organization_id,
      tournamentId,
      amountCents: session.amount_total ?? PRICE_CENTS,
      stripeSessionId: session.id ?? data.sessionId,
      stripePaymentIntentId: paymentIntentId,
      userId: session.metadata?.user_id ?? context.userId,
    });

    return {
      verified: true,
      tournamentId,
      receiptUrl,
      sessionId: session.id ?? data.sessionId,
      paymentIntentId,
      amountCents: session.amount_total ?? PRICE_CENTS,
    };
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
        branding_admin_override_at: data.removed ? new Date().toISOString() : null,
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

    await admin.from("branding_audit_log").insert({
      tournament_id: data.tournamentId,
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      actor_type: "admin",
      action: data.removed ? "admin_override_added" : "admin_override_removed",
      reason,
      details: { branding: data.removed ? "disabled" : "enabled" },
    } as any);

    return { ok: true };
  });

/** Organizer-facing branding status + audit history for one tournament. */
export const getBrandingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => {
    if (!input?.tournamentId) throw new Error("tournamentId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { data: t, error } = await context.supabase
      .from("tournaments")
      .select(
        "id, branding_removed, branding_removed_by_admin, branding_removed_at, branding_admin_override_at, branding_payment_session_id, branding_payment_intent_id, branding_receipt_url",
      )
      .eq("id", data.tournamentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) throw new Error("Tournament not found");

    const { data: history } = await context.supabase
      .from("branding_audit_log")
      .select("id, action, actor_type, actor_email, amount_cents, receipt_url, stripe_session_id, reason, created_at")
      .eq("tournament_id", data.tournamentId)
      .order("created_at", { ascending: false })
      .limit(20);

    const paid = !!(t as any).branding_removed;
    const admin = !!(t as any).branding_removed_by_admin;
    return {
      removed: paid || admin,
      source: paid ? "paid" : admin ? "admin" : null,
      removedAt: paid ? (t as any).branding_removed_at : admin ? (t as any).branding_admin_override_at : null,
      receiptUrl: (t as any).branding_receipt_url ?? null,
      sessionId: (t as any).branding_payment_session_id ?? null,
      paymentIntentId: (t as any).branding_payment_intent_id ?? null,
      history: history ?? [],
    };
  });


/**
 * Safety net for the Stripe redirect: if an organizer closes the tab before
 * returning from Checkout, the payment is still real. This re-checks every
 * Checkout session we started for the tournament and applies the removal when
 * Stripe reports it paid. Called on mount by the Leaderboard Branding card.
 */
export const reconcileBrandingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => {
    if (!input?.tournamentId) throw new Error("tournamentId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) return { removed: false, reconciled: false };

    const { data: t } = await context.supabase
      .from("tournaments")
      .select("id, branding_removed")
      .eq("id", data.tournamentId)
      .maybeSingle();
    if (!t) throw new Error("Tournament not found");
    if ((t as any).branding_removed) return { removed: true, reconciled: false };

    const { data: started } = await context.supabase
      .from("branding_audit_log")
      .select("stripe_session_id, created_at")
      .eq("tournament_id", data.tournamentId)
      .eq("action", "checkout_started")
      .order("created_at", { ascending: false })
      .limit(5);
    const sessionIds = (started || [])
      .map((r: any) => r.stripe_session_id)
      .filter((id: any): id is string => typeof id === "string" && id.length > 0);
    if (sessionIds.length === 0) return { removed: false, reconciled: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    for (const sessionId of sessionIds) {
      const resp = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=payment_intent.latest_charge`,
        { headers: { Authorization: `Bearer ${stripeKey}` } },
      );
      if (!resp.ok) continue;
      const session: any = await resp.json();
      if (session.payment_status !== "paid") continue;

      const pi = typeof session.payment_intent === "object" ? session.payment_intent : null;
      const charge = pi && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
      const receiptUrl: string | null = charge?.receipt_url ?? null;
      const paymentIntentId: string | null =
        pi?.id ?? (typeof session.payment_intent === "string" ? session.payment_intent : null);

      await supabaseAdmin
        .from("tournaments")
        .update({
          branding_removed: true,
          branding_removed_paid: true,
          branding_removed_paid_at: new Date().toISOString(),
          branding_removed_at: new Date().toISOString(),
          branding_removed_by: session.metadata?.user_id ?? context.userId,
          branding_payment_session_id: session.id ?? sessionId,
          branding_payment_intent_id: paymentIntentId,
          branding_receipt_url: receiptUrl,
        } as any)
        .eq("id", data.tournamentId);

      await supabaseAdmin.from("branding_audit_log").insert({
        tournament_id: data.tournamentId,
        actor_id: session.metadata?.user_id ?? context.userId,
        actor_email: session.customer_details?.email ?? context.claims?.email ?? null,
        actor_type: "organizer",
        action: "payment_confirmed",
        amount_cents: session.amount_total ?? PRICE_CENTS,
        stripe_session_id: session.id ?? sessionId,
        stripe_payment_intent_id: paymentIntentId,
        receipt_url: receiptUrl,
        details: { branding: "disabled", source: "reconcile" },
      } as any);

      return { removed: true, reconciled: true, receiptUrl };
    }

    return { removed: false, reconciled: false };
  });
