import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TAX_RATE = 6.25;
const SIGNAGE_SHIPPING_CENTS = 3995;
const STANDARD_SHIPPING_CENTS = 1299;
const SIGNAGE_CATEGORY = "signage";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      product_id,
      buyer_email,
      contact_name,
      contact_phone,
      logo_url,
      order_notes,
    } = await req.json();
    if (!product_id) throw new Error("Missing product_id");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: product, error: pErr } = await supabaseAdmin
      .from("platform_store_products")
      .select("id, name, description, price, image_url, category")
      .eq("id", product_id)
      .eq("is_active", true)
      .single();

    if (pErr || !product) throw new Error("Product not found or inactive");

    const priceCents = Math.round(product.price * 100);
    if (priceCents < 50) throw new Error("Price too low for checkout");

    // Create order record with pending_payment status
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("director_shop_orders")
      .insert({
        product_id: product.id,
        product_name: product.name,
        contact_name: contact_name || "",
        contact_email: buyer_email || "",
        contact_phone: contact_phone || "",
        logo_url: logo_url || null,
        order_notes: order_notes || null,
        payment_status: "pending_payment",
        amount_cents: priceCents,
      })
      .select("id")
      .single();

    if (orderErr) throw new Error("Failed to create order: " + orderErr.message);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let customerId: string | undefined;
    if (buyer_email) {
      const customers = await stripe.customers.list({ email: buyer_email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";

    const lineItems: any[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: product.description || undefined,
            images: product.image_url ? [product.image_url] : undefined,
          },
          unit_amount: priceCents,
        },
        quantity: 1,
      },
    ];

    const isSignage = (product.category || "").toLowerCase() === SIGNAGE_CATEGORY;
    const shippingCents = isSignage ? SIGNAGE_SHIPPING_CENTS : STANDARD_SHIPPING_CENTS;
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: isSignage ? "Shipping — Standard Ground (UPS/FedEx/USPS)" : "Shipping",
        },
        unit_amount: shippingCents,
      },
      quantity: 1,
    });

    const taxRates = await stripe.taxRates.list({ limit: 10, active: true });
    let taxRateId = taxRates.data.find(
      (tr) => tr.percentage === TAX_RATE && tr.inclusive === false && tr.display_name === "Sales Tax",
    )?.id;

    if (!taxRateId) {
      const newTaxRate = await stripe.taxRates.create({
        display_name: "Sales Tax",
        percentage: TAX_RATE,
        inclusive: false,
      });
      taxRateId = newTaxRate.id;
    }

    lineItems[0].tax_rates = [taxRateId];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : buyer_email || undefined,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/dashboard/director-shop?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/director-shop`,
      metadata: {
        type: "director_shop_order",
        order_id: order.id,
        product_id,
        contact_name: contact_name || "",
        contact_email: buyer_email || "",
        product_name: product.name,
      },
    });

    // Update order with stripe session id
    await supabaseAdmin
      .from("director_shop_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    // NO email sent here — email is sent only after payment verification

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
