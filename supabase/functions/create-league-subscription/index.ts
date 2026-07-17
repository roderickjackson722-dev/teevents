// Create a Stripe Checkout session for an annual Golf League subscription.
// Two subscription types:
//   - flat_fee     — $199/year unlimited golfers
//   - per_golfer   — $10/golfer/year (quantity = golfer_count)
// Billed on the TeeVents platform Stripe account (NOT Connect).
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FLAT_FEE_CENTS = 19900; // $199/year
const PER_GOLFER_CENTS = 1000; // $10/golfer/year

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { organization_id, subscription_type, golfer_count } = await req.json();
    if (!organization_id) throw new Error("organization_id required");
    if (!["flat_fee", "per_golfer"].includes(subscription_type)) {
      throw new Error("subscription_type must be flat_fee or per_golfer");
    }
    const golferQty = subscription_type === "per_golfer" ? Math.max(1, Number(golfer_count || 1)) : 1;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    // Verify user is owner/admin of the org
    const { data: allowed } = await supabaseAdmin.rpc("is_org_admin_or_owner", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!allowed) throw new Error("Not authorized for this organization");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // Reuse a Stripe customer if one exists
    let customerId: string | undefined;
    if (user.email) {
      const existing = await stripe.customers.list({ email: user.email, limit: 1 });
      if (existing.data.length > 0) customerId = existing.data[0].id;
    }

    // Create pending subscription row
    const { data: subRow, error: subErr } = await supabaseAdmin
      .from("league_subscriptions")
      .insert({
        organization_id,
        subscription_type,
        flat_fee_price_cents: FLAT_FEE_CENTS,
        per_golfer_price_cents: PER_GOLFER_CENTS,
        current_golfers: subscription_type === "per_golfer" ? golferQty : 0,
        max_golfers: subscription_type === "flat_fee" ? 0 : golferQty,
        status: "incomplete",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (subErr) throw new Error(subErr.message);

    const origin = req.headers.get("origin") || "https://teevents.golf";
    const unit_amount = subscription_type === "flat_fee" ? FLAT_FEE_CENTS : PER_GOLFER_CENTS;
    const productName =
      subscription_type === "flat_fee"
        ? "TeeVents Golf League — Flat Fee (Unlimited Golfers)"
        : "TeeVents Golf League — Per Golfer";
    const productDesc =
      subscription_type === "flat_fee"
        ? "Annual subscription — unlimited golfers"
        : `Annual subscription for ${golferQty} golfer${golferQty === 1 ? "" : "s"}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      customer_email: customerId ? undefined : user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: productName, description: productDesc },
            unit_amount,
            recurring: { interval: "year" },
          },
          quantity: subscription_type === "per_golfer" ? golferQty : 1,
        },
      ],
      success_url: `${origin}/dashboard/leagues?league_sub=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/golf-leagues`,
      subscription_data: {
        metadata: {
          kind: "league_subscription",
          organization_id,
          subscription_row_id: subRow.id,
          subscription_type,
          golfer_count: String(golferQty),
        },
      },
      metadata: {
        kind: "league_subscription",
        organization_id,
        subscription_row_id: subRow.id,
        subscription_type,
        golfer_count: String(golferQty),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
