import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_MAP = {
  live: {
    base: "price_1TE7QpLT3p5VmsQsqZOGHHwc",
    starter: "price_1TE7QqLT3p5VmsQskHWwh0oh",
    premium: "price_1TD0XzLT3p5VmsQsT3qfmU2N",
  },
  test: {
    base: "price_1TEWWwLT3p5VmsQsQzBVDBbT",
    starter: "price_1TEWWwLT3p5VmsQsQ4kgruRT",
    premium: "price_1TEWWwLT3p5VmsQs2xtKitwH",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan, email, promo_code } = await req.json();
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const priceSet = stripeKey.includes("_test_") ? PRICE_MAP.test : PRICE_MAP.live;
    const priceId = priceSet[plan as keyof typeof priceSet];
    if (!priceId) throw new Error("Invalid plan selected");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Validate promo code if provided
    let couponId: string | undefined;
    if (promo_code) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      const { data: promo } = await adminClient
        .from("promo_codes")
        .select("*")
        .eq("code", promo_code.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (!promo) throw new Error("Invalid or expired promo code");
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) throw new Error("Promo code has expired");
      if (promo.max_uses && promo.current_uses >= promo.max_uses) throw new Error("Promo code has reached its usage limit");
      if (promo.applicable_plans && !promo.applicable_plans.includes(plan)) throw new Error("Promo code is not valid for this plan");

      // Create a Stripe coupon for this discount
      const coupon = await stripe.coupons.create(
        promo.discount_type === "percent"
          ? { percent_off: Number(promo.discount_value), duration: "once" }
          : { amount_off: Math.round(Number(promo.discount_value) * 100), currency: "usd", duration: "once" }
      );
      couponId = coupon.id;

      // Increment usage
      await adminClient
        .from("promo_codes")
        .update({ current_uses: promo.current_uses + 1 })
        .eq("id", promo.id);
    }

    // Check for existing customer
    let customerId: string | undefined;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/payment-success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: { plan, ...(promo_code ? { promo_code: promo_code.trim().toUpperCase() } : {}) },
    };

    if (couponId) {
      sessionParams.discounts = [{ coupon: couponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
