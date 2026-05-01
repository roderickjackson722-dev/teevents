import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildNotificationHtml } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const ADMIN_EMAIL = "info@teevents.golf";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ verified: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = session.metadata?.order_id;
    const contactName = session.metadata?.contact_name || "Customer";
    const contactEmail = session.metadata?.contact_email || session.customer_details?.email || "";
    const productName = session.metadata?.product_name || "Product";
    const amountPaid = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : "N/A";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Update order status to paid
    if (orderId) {
      await supabaseAdmin
        .from("director_shop_orders")
        .update({ payment_status: "paid" })
        .eq("id", orderId);
    }

    // Get logo info
    let hasLogo = false;
    if (orderId) {
      const { data: orderData } = await supabaseAdmin
        .from("director_shop_orders")
        .select("logo_url")
        .eq("id", orderId)
        .single();
      hasLogo = !!orderData?.logo_url;
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && contactEmail) {
      // 1. Customer confirmation email
      const customerHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1a5f2a; font-size: 24px; margin: 0;">Order Confirmed</h1>
          </div>
          <p>Dear ${contactName},</p>
          <p>Thank you for your order of <strong>${productName}</strong>.</p>
          <p>We have received your payment and will begin processing your order. Our team will contact you within <strong>2 business days</strong> to confirm details and arrange delivery.</p>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px;">Order Summary</h3>
            <table style="width: 100%; font-size: 14px;">
              <tr><td style="padding: 4px 0; color: #666;">Product:</td><td style="padding: 4px 0; font-weight: 600;">${productName}</td></tr>
              <tr><td style="padding: 4px 0; color: #666;">Total:</td><td style="padding: 4px 0; font-weight: 600;">${amountPaid}</td></tr>
              <tr><td style="padding: 4px 0; color: #666;">Logo received:</td><td style="padding: 4px 0; font-weight: 600;">${hasLogo ? "Yes" : "No"}</td></tr>
            </table>
          </div>
          <p>If you have any questions, reply to this email or contact us at <a href="mailto:info@teevents.golf">info@teevents.golf</a>.</p>
          <p>Thank you for choosing TeeVents!</p>
          <p style="color: #666; font-size: 14px;">— The TeeVents Team</p>
        </div>
      `;

      const customerEmailPromise = fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: `TeeVents Golf Management <${SENDER_EMAIL}>`,
          to: [contactEmail],
          subject: `Order Confirmed — ${productName}`,
          html: customerHtml,
        }),
      });

      // 2. Admin notification email
      const adminHtml = buildNotificationHtml("New Director Shop Order — Payment Received", [
        `<strong>${productName}</strong> ordered by <strong>${contactName}</strong>.`,
        `📧 Email: ${contactEmail}`,
        `💰 Amount: ${amountPaid}`,
        `🖼️ Logo: ${hasLogo ? "Uploaded" : "Not provided"}`,
        orderId ? `🆔 Order ID: ${orderId}` : "",
      ].filter(Boolean));

      const adminEmailPromise = fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: `TeeVents Golf Management <${SENDER_EMAIL}>`,
          to: [ADMIN_EMAIL],
          subject: `New Director Shop Order — ${productName} — ${contactName}`,
          html: adminHtml,
        }),
      });

      await Promise.allSettled([customerEmailPromise, adminEmailPromise]);
    }

    // Insert admin notification record
    await supabaseAdmin
      .from("admin_notifications")
      .insert({
        type: "director_shop_order",
        message: `New Director Shop order from ${contactName}: ${productName} (${amountPaid})`,
      });

    return new Response(JSON.stringify({ verified: true, product_name: productName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Verify platform purchase error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
