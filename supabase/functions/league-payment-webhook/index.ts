// Stripe webhook for league payments. Handles both platform-level (league access unlock)
// and connected-account (membership / event fee) checkout.session.completed events.
// Configure the endpoint URL for both the platform account and Connect webhook, both point here.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();
  const secret = Deno.env.get("STRIPE_LEAGUE_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET");
  let event: Stripe.Event;
  try {
    event = secret
      ? await stripe.webhooks.constructEventAsync(body, sig, secret)
      : (JSON.parse(body) as Stripe.Event);
  } catch (e: any) {
    return new Response(`Signature error: ${e.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = session.metadata?.kind;

      if (kind === "league_access") {
        const purchaseId = session.metadata!.purchase_id;
        const leagueId = session.metadata!.league_id;
        const promo = session.metadata?.promo_code || null;
        await supabaseAdmin
          .from("league_access_purchases")
          .update({
            status: "paid",
            stripe_payment_intent: String(session.payment_intent || ""),
          })
          .eq("id", purchaseId);
        await supabaseAdmin
          .from("golf_leagues")
          .update({
            access_status: "paid",
            access_paid_at: new Date().toISOString(),
            access_amount_cents: session.amount_total || null,
          })
          .eq("id", leagueId);
        if (promo) {
          const { data: p } = await supabaseAdmin
            .from("league_access_promo_codes")
            .select("times_used")
            .eq("code", promo)
            .single();
          await supabaseAdmin
            .from("league_access_promo_codes")
            .update({ times_used: (p?.times_used || 0) + 1 })
            .eq("code", promo);
        }
      } else if (kind === "league_membership") {
        const paymentId = session.metadata!.payment_id;
        const memberId = session.metadata!.member_id;
        await supabaseAdmin
          .from("league_payments")
          .update({ status: "paid", stripe_payment_intent: String(session.payment_intent || "") })
          .eq("id", paymentId);
        await supabaseAdmin
          .from("league_members")
          .update({ membership_fee_paid: true, membership_status: "active" })
          .eq("id", memberId);
      } else if (kind === "league_event") {
        const paymentId = session.metadata!.payment_id;
        const regId = session.metadata!.registration_id;
        await supabaseAdmin
          .from("league_payments")
          .update({ status: "paid", stripe_payment_intent: String(session.payment_intent || "") })
          .eq("id", paymentId);
        await supabaseAdmin
          .from("league_event_registrations")
          .update({ fee_paid: true })
          .eq("id", regId);
      }
    }
  } catch (e: any) {
    console.error("Webhook handler error:", e?.message);
    return new Response(`Handler error: ${e.message}`, { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
