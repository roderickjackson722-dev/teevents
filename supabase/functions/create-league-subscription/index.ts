// Create a Stripe Checkout session for an annual Golf League subscription.
// Flat fee: $199/year unlimited golfers.
// Billed on the TeeVents platform Stripe account (NOT Connect).
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FLAT_FEE_CENTS = 19900; // $199/year

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const organization_id = body.organization_id;
    const promo_code = typeof body.promo_code === "string" ? body.promo_code.trim() : "";
    const contact_name = typeof body.contact_name === "string" ? body.contact_name.trim() : "";
    const contact_email = typeof body.contact_email === "string" ? body.contact_email.trim() : "";
    const contact_phone = typeof body.contact_phone === "string" ? body.contact_phone.trim() : "";
    const league_name = typeof body.league_name === "string" ? body.league_name.trim() : "";
    if (!organization_id) throw new Error("organization_id required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const { data: allowed, error: rpcErr } = await supabaseAdmin.rpc("is_org_admin_or_owner", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (rpcErr) throw new Error(`Auth check failed: ${rpcErr.message}`);
    if (!allowed) throw new Error("Not authorized for this organization");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let customerId: string | undefined;
    if (user.email) {
      const existing = await stripe.customers.list({ email: user.email, limit: 1 });
      if (existing.data.length > 0) customerId = existing.data[0].id;
    }

    const { data: subRow, error: subErr } = await supabaseAdmin
      .from("league_subscriptions")
      .insert({
        organization_id,
        subscription_type: "flat_fee",
        flat_fee_price_cents: FLAT_FEE_CENTS,
        per_golfer_price_cents: 0,
        current_golfers: 0,
        max_golfers: 0,
        status: "incomplete",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (subErr) throw new Error(`DB insert failed: ${subErr.message}`);

    const origin = req.headers.get("origin") || "https://teevents.golf";

    // Look up promotion code (if provided) so it's pre-applied at Stripe Checkout.
    let discounts: { promotion_code: string }[] | undefined;
    let promoError: string | null = null;
    if (promo_code) {
      const found = await stripe.promotionCodes.list({ code: promo_code, active: true, limit: 1 });
      if (found.data.length > 0) {
        discounts = [{ promotion_code: found.data[0].id }];
      } else {
        promoError = `Promo code "${promo_code}" is not valid`;
      }
    }
    if (promoError) throw new Error(promoError);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      customer_email: customerId ? undefined : user.email || undefined,
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "TeeVents Golf League Management — Annual Subscription",
              description: "Annual subscription for golf league management. Unlimited golfers. Cancel anytime.",
            },
            unit_amount: FLAT_FEE_CENTS,
            recurring: { interval: "year" },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/select-workspace?league_sub=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/select-workspace`,
      subscription_data: {
        metadata: {
          kind: "league_subscription",
          organization_id,
          subscription_row_id: subRow.id,
          subscription_type: "flat_fee",
        },
      },
      metadata: {
        kind: "league_subscription",
        organization_id,
        subscription_row_id: subRow.id,
        subscription_type: "flat_fee",
      },
    });

    // Notify TeeVents admin of the league sign-up (fires even when promo makes it 100% off).
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;">
            <h2 style="color:#1a5c38;margin:0 0 12px 0;">🏆 New Golf League Sign-Up</h2>
            <p style="color:#6b7280;margin:0 0 20px 0;">A user just initiated the Golf League subscription flow.</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;width:35%;">Contact Name</td><td style="padding:8px;border:1px solid #e5e7eb;">${contact_name || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Contact Email</td><td style="padding:8px;border:1px solid #e5e7eb;">${contact_email || user.email || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Phone</td><td style="padding:8px;border:1px solid #e5e7eb;">${contact_phone || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">League / Workspace</td><td style="padding:8px;border:1px solid #e5e7eb;">${league_name || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Organization ID</td><td style="padding:8px;border:1px solid #e5e7eb;">${organization_id}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Promo Code</td><td style="padding:8px;border:1px solid #e5e7eb;">${promo_code || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Auth User</td><td style="padding:8px;border:1px solid #e5e7eb;">${user.email || user.id}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Started</td><td style="padding:8px;border:1px solid #e5e7eb;">${new Date().toLocaleString("en-US")}</td></tr>
            </table>
            <p style="color:#6b7280;font-size:12px;margin-top:20px;">Stripe Checkout Session: ${session.id}</p>
          </div>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "TeeVents Golf Management <info@notifications.teevents.golf>",
            to: ["info@teevents.golf"],
            subject: `🏆 New Golf League Sign-Up – ${contact_name || contact_email || user.email || "user"}`,
            html,
          }),
        });
      }
    } catch (notifyErr) {
      console.error("[create-league-subscription] notify failed", notifyErr);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("[create-league-subscription]", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
