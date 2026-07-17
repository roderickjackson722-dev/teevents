// Stripe webhook for platform-account League Subscription events.
// Handles: checkout.session.completed, invoice.paid, customer.subscription.updated,
// customer.subscription.deleted.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();
  const secret =
    Deno.env.get("STRIPE_LEAGUE_SUBSCRIPTION_WEBHOOK_SECRET") ||
    Deno.env.get("STRIPE_WEBHOOK_SECRET");
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
      if (session.metadata?.kind !== "league_subscription") {
        return new Response(JSON.stringify({ ignored: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rowId = session.metadata!.subscription_row_id;
      const subId = String(session.subscription || "");
      const custId = String(session.customer || "");
      let periodStart: string | null = null;
      let periodEnd: string | null = null;
      let priceId: string | null = null;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        periodStart = new Date((sub as any).current_period_start * 1000).toISOString();
        periodEnd = new Date((sub as any).current_period_end * 1000).toISOString();
        priceId = sub.items.data[0]?.price?.id || null;
      }
      await supabaseAdmin
        .from("league_subscriptions")
        .update({
          status: "active",
          stripe_subscription_id: subId || null,
          stripe_customer_id: custId || null,
          stripe_price_id: priceId,
          current_period_start: periodStart,
          current_period_end: periodEnd,
        })
        .eq("id", rowId);
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = String((invoice as any).subscription || "");
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        await supabaseAdmin
          .from("league_subscriptions")
          .update({
            status: "active",
            current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: !!(sub as any).cancel_at_period_end,
          })
          .eq("stripe_subscription_id", subId);
      }
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const statusMap: Record<string, string> = {
        active: "active",
        trialing: "trialing",
        past_due: "past_due",
        canceled: "cancelled",
        unpaid: "past_due",
        incomplete: "incomplete",
        incomplete_expired: "expired",
      };
      await supabaseAdmin
        .from("league_subscriptions")
        .update({
          status: statusMap[sub.status] || sub.status,
          current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
          current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
          cancel_at_period_end: !!(sub as any).cancel_at_period_end,
        })
        .eq("stripe_subscription_id", sub.id);
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await supabaseAdmin
        .from("league_subscriptions")
        .update({ status: "cancelled", cancel_at_period_end: true })
        .eq("stripe_subscription_id", sub.id);
    }
  } catch (e: any) {
    console.error("league-subscription-webhook error", e?.message);
    return new Response(`Handler error: ${e.message}`, { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
