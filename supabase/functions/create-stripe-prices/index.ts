import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create $299 price for Starter (prod_UCWTm4Rl4T2rvb)
    const starterPrice = await stripe.prices.create({
      product: "prod_UCWTm4Rl4T2rvb",
      unit_amount: 29900,
      currency: "usd",
    });

    // Create $999 price for Premium (prod_UBNI5QyFcqnqKh)
    const premiumPrice = await stripe.prices.create({
      product: "prod_UBNI5QyFcqnqKh",
      unit_amount: 99900,
      currency: "usd",
    });

    return new Response(JSON.stringify({
      starter_price_id: starterPrice.id,
      premium_price_id: premiumPrice.id,
    }), {
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
