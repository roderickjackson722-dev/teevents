import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TAX_RATE = 6.25; // percent
const SIGNAGE_SHIPPING_CENTS = 3995; // $39.95 flat rate
const STANDARD_SHIPPING_CENTS = 1299; // $12.99 for non-signage
const SIGNAGE_CATEGORY = "signage";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id, buyer_email } = await req.json();
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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let customerId: string | undefined;
    if (buyer_email) {
      const customers = await stripe.customers.list({ email: buyer_email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";

    // Build line items
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

    // Add shipping
    const isSignage = (product.category || "").toLowerCase() === SIGNAGE_CATEGORY;
    const shippingCents = isSignage ? SIGNAGE_SHIPPING_CENTS : STANDARD_SHIPPING_CENTS;
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: isSignage
            ? "Shipping — Standard Ground (UPS/FedEx/USPS)"
            : "Shipping",
        },
        unit_amount: shippingCents,
      },
      quantity: 1,
    });

    // Create a Stripe Tax Rate on-the-fly (or reuse)
    // We'll use automatic_tax off and add a tax line manually via tax_rates
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

    // Attach tax rate to product line item (not shipping)
    lineItems[0].tax_rates = [taxRateId];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : buyer_email || undefined,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/store?purchased=true`,
      cancel_url: `${origin}/store`,
      metadata: {
        type: "platform_store_purchase",
        product_id,
      },
    });

    // Send admin notification email
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const adminEmail = "info@teevents.golf";
        const shippingNote = isSignage ? " + $39.95 shipping" : " + $12.99 shipping";
        const html = buildNotificationHtml("New Platform Store Purchase", [
          `<strong>${product.name}</strong> was purchased for <strong>$${product.price.toFixed(2)}</strong>${shippingNote} + 6.25% tax.`,
          buyer_email ? `📧 Buyer: ${buyer_email}` : "👤 Guest buyer (no email provided)",
          `🆔 Product ID: ${product.id}`,
        ]);

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "TeeVents <notifications@notifications.teevents.golf>",
            to: [adminEmail],
            subject: `New Store Purchase — ${product.name}`,
            html,
          }),
        });
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
