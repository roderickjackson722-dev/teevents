import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { item_id, buyer_name, buyer_email, tournament_slug } = await req.json();
    if (!item_id) throw new Error("Missing item_id");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch auction item
    const { data: item, error: iErr } = await supabaseAdmin
      .from("tournament_auction_items")
      .select("id, title, description, buy_now_price, image_url, tournament_id, type")
      .eq("id", item_id)
      .eq("is_active", true)
      .single();

    if (iErr || !item) throw new Error("Item not found or inactive");
    if (!item.buy_now_price || item.buy_now_price <= 0) throw new Error("Buy now not available for this item");

    const priceCents = Math.round(item.buy_now_price * 100);

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("organization_id, slug")
      .eq("id", item.tournament_id)
      .single();

    let connectedAccountId: string | null = null;
    let feeRate = 0.05;
    if (tournament) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("stripe_account_id, plan")
        .eq("id", tournament.organization_id)
        .single();
      connectedAccountId = org?.stripe_account_id || null;
      const FEE_RATES: Record<string, number> = { base: 0.05, starter: 0.03, pro: 0.02, enterprise: 0.01 };
      feeRate = FEE_RATES[org?.plan || "base"] ?? 0.05;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let customerId: string | undefined;
    if (buyer_email) {
      const customers = await stripe.customers.list({ email: buyer_email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";
    const slug = tournament_slug || tournament?.slug || "";

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : buyer_email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Buy Now — ${item.title}`,
              description: item.description || undefined,
              images: item.image_url ? [item.image_url] : undefined,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/t/${slug}?auction_purchased=true&item_id=${item_id}`,
      cancel_url: `${origin}/t/${slug}#auction`,
      metadata: {
        type: "auction_buy_now",
        item_id,
        tournament_id: item.tournament_id,
        buyer_name: buyer_name || "",
        buyer_email: buyer_email || "",
      },
    };

    if (connectedAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(priceCents * feeRate),
        transfer_data: { destination: connectedAccountId },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Mark item as sold
    await supabaseAdmin
      .from("tournament_auction_items")
      .update({
        is_active: false,
        winner_name: buyer_name || null,
        winner_email: buyer_email || null,
      })
      .eq("id", item_id);

    // Send notification emails
    try {
      if (tournament) {
        const { data: notifEmails } = await supabaseAdmin
          .from("notification_emails")
          .select("email")
          .eq("organization_id", tournament.organization_id)
          .eq("notify_auction_bid", true);

        if (notifEmails && notifEmails.length > 0) {
          console.log(`[Notification] Auction buy-now: ${item.title} by ${buyer_name || buyer_email || "unknown"} → ${notifEmails.map((n: any) => n.email).join(", ")}`);
        }
      }
    } catch (e) {
      console.error("Notification error:", e);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
