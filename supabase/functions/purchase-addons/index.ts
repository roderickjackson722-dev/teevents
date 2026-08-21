import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * purchase-addons
 * Body: { tournament_id: string, addons: string[] }
 *   addons ⊆ ["custom_domain","unlimited_manual_entries","auction_raffle","custom_event_page","priority_support","bundle"]
 * Creates a Stripe Checkout session for the selected add-ons.
 */
const PRICES: Record<string, { name: string; cents: number }> = {
  custom_domain: { name: "Custom Domain", cents: 9900 },
  unlimited_manual_entries: { name: "Unlimited Manual Entries", cents: 14900 },
  auction_raffle: { name: "Auction & Raffle", cents: 14900 },
  custom_event_page: { name: "Custom Event Page Build Out", cents: 9900 },
  priority_support: { name: "Priority Support", cents: 9900 },
  bundle: { name: "All Add-ons Bundle", cents: 39900 },
  sms_100: { name: "SMS Blasts – 100 Text Messages", cents: 2900 },
  sms_unlimited: { name: "SMS Blasts – Unlimited Text Messages", cents: 9900 },
};

// SMS plans are standalone; the All Add-ons Bundle never includes them.
const SMS_KEYS = ["sms_100", "sms_unlimited"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const { tournament_id, addons } = await req.json();
    if (!tournament_id) throw new Error("tournament_id is required");
    if (!Array.isArray(addons) || addons.length === 0) throw new Error("addons must be a non-empty array");

    // Validate keys
    const invalid = addons.filter((a: string) => !PRICES[a]);
    if (invalid.length) throw new Error(`Unknown addon(s): ${invalid.join(", ")}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, organization_id, paid_features")
      .eq("id", tournament_id)
      .maybeSingle();
    if (!t) throw new Error("Tournament not found");

    const { data: membership } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("organization_id", t.organization_id)
      .maybeSingle();
    if (!membership) throw new Error("You are not a member of this organization");

    // If bundle chosen, collapse to just bundle line item
    const smsAddons: string[] = addons.filter((a: string) => SMS_KEYS.includes(a));
    const nonSms: string[] = addons.filter((a: string) => !SMS_KEYS.includes(a));
    const finalAddons: string[] = [
      ...(nonSms.includes("bundle") ? ["bundle"] : nonSms),
      ...smsAddons,
    ];

    const line_items = finalAddons.map((k) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `TeeVents – ${PRICES[k].name}`,
          description: `For: ${t.title}`,
        },
        unit_amount: PRICES[k].cents,
      },
      quantity: 1,
    }));

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const origin = req.headers.get("origin") ?? "https://teevents.golf";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items,
      success_url: `${origin}/dashboard/upgrade?addon_session_id={CHECKOUT_SESSION_ID}&tournament_id=${t.id}`,
      cancel_url: `${origin}/dashboard/upgrade?addon_canceled=1`,
      metadata: {
        type: "addon_purchase",
        tournament_id: t.id,
        organization_id: t.organization_id,
        user_id: user.id,
        addons: finalAddons.join(","),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
