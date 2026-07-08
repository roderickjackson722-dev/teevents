import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { event_id, tier_id, quantity, buyer_name, buyer_email } = await req.json();
    const qty = Math.max(1, Math.min(20, Number(quantity) || 1));

    if (!event_id || !tier_id || !buyer_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tier, error: tierErr } = await admin
      .from("event_ticket_tiers")
      .select("id, event_id, tier_name, price_cents, max_quantity, sold_quantity")
      .eq("id", tier_id)
      .eq("event_id", event_id)
      .maybeSingle();

    if (tierErr || !tier) throw new Error("Ticket tier not found");

    const remaining =
      tier.max_quantity == null ? Infinity : tier.max_quantity - (tier.sold_quantity || 0);
    if (remaining < qty) throw new Error("Not enough tickets remaining");

    const { data: event, error: eventErr } = await admin
      .from("public_events")
      .select("id, event_title, event_slug, status")
      .eq("id", event_id)
      .maybeSingle();
    if (eventErr || !event) throw new Error("Event not found");
    if (event.status !== "published") throw new Error("Event is not available for purchase");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://teevents.golf";
    const totalCents = tier.price_cents * qty;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: buyer_email,
      line_items: [
        {
          quantity: qty,
          price_data: {
            currency: "usd",
            unit_amount: tier.price_cents,
            product_data: {
              name: `${event.event_title} — ${tier.tier_name}`,
            },
          },
        },
      ],
      metadata: {
        event_id,
        tier_id,
        quantity: String(qty),
        buyer_name: buyer_name || "",
      },
      success_url: `${origin}/events/${event.event_slug}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/events/${event.event_slug}?purchase=cancel`,
    });

    await admin.from("event_ticket_purchases").insert({
      event_id,
      tier_id,
      buyer_name: buyer_name || null,
      buyer_email,
      quantity: qty,
      total_cents: totalCents,
      stripe_session_id: session.id,
      payment_status: "pending",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
