import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_MAP: Record<string, string> = {
  starter: "price_1T6NmGLXW44Q7xfEnpuXOzvZ",
  pro: "price_1T6NnMLXW44Q7xfECw8H7d9C",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan, email, promo_code } = await req.json();
    const priceId = PRICE_MAP[plan];
    if (!priceId) throw new Error("Invalid plan selected");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Validate promo code if provided
    let discountAmount = 0;
    let promoCodeId: string | null = null;
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

      promoCodeId = promo.id;

      // Calculate discount for metadata
      const priceAmount = plan === "starter" ? 49900 : 99900; // cents
      if (promo.discount_type === "percent") {
        discountAmount = Math.round(priceAmount * (Number(promo.discount_value) / 100));
      } else {
        discountAmount = Math.round(Number(promo.discount_value) * 100);
      }

      // Create a Stripe coupon for this discount
      const coupon = await stripe.coupons.create(
        promo.discount_type === "percent"
          ? { percent_off: Number(promo.discount_value), duration: "once" }
          : { amount_off: Math.round(Number(promo.discount_value) * 100), currency: "usd", duration: "once" }
      );

      // Increment usage
      await adminClient
        .from("promo_codes")
        .update({ current_uses: promo.current_uses + 1 })
        .eq("id", promo.id);

      // Check for existing customer
      let customerId: string | undefined;
      if (email) {
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      }

      const origin = req.headers.get("origin") || "https://teevents.lovable.app";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : email || undefined,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        discounts: [{ coupon: coupon.id }],
        success_url: `${origin}/payment-success?plan=${plan}`,
        cancel_url: `${origin}/platform#pricing`,
        metadata: { plan, promo_code: promo_code.trim().toUpperCase() },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // No promo code path
    let customerId: string | undefined;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/payment-success?plan=${plan}`,
      cancel_url: `${origin}/platform#pricing`,
      metadata: { plan },
    });

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
