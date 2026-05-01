import Stripe from "https://esm.sh/stripe@18.5.0";
import { buildNotificationHtml } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";
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

    const plan = session.metadata?.plan || "unknown";
    const customerEmail = session.customer_details?.email || session.customer_email || "unknown";
    const customerName = session.customer_details?.name || customerEmail;
    const amountPaid = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : "N/A";

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      // 1. Send admin notification
      const adminHtml = buildNotificationHtml("🎉 New Plan Purchase!", [
        `<strong>${customerName}</strong> just purchased the <strong>${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan.`,
        `📧 <strong>Email:</strong> ${customerEmail}`,
        `💰 <strong>Amount:</strong> ${amountPaid}`,
        session.metadata?.promo_code ? `🏷️ <strong>Promo Code:</strong> ${session.metadata.promo_code}` : "",
      ].filter(Boolean));

      const adminEmailPromise = fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          to: [ADMIN_EMAIL],
          subject: `New ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Purchase — ${customerName}`,
          html: adminHtml,
        }),
      });

      // 2. Send welcome email to buyer
      const welcomeHtml = buildWelcomeHtml(customerName.split(" ")[0] || "there", plan);

      const welcomeEmailPromise = fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          to: [customerEmail],
          subject: `Welcome to TeeVents — Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Is Ready!`,
          html: welcomeHtml,
        }),
      });

      await Promise.all([adminEmailPromise, welcomeEmailPromise]);
      console.log(`[Purchase] Emails sent for ${plan} purchase by ${customerEmail}`);
    }

    return new Response(JSON.stringify({ verified: true, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function buildWelcomeHtml(firstName: string, plan: string): string {
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1a5c38;padding:28px 32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:32px;">⛳</p>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Welcome to TeeVents!</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${firstName}</strong>,</p>
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">Thank you for purchasing the <strong>${planName}</strong> plan! Your tournament tools are ready to go.</p>
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">Here's what to do next:</p>
          <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.7;">1️⃣ <strong>Create your account</strong> if you haven't already</p>
          <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.7;">2️⃣ <strong>Set up your tournament</strong> — add details, dates, and your course</p>
          <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.7;">3️⃣ <strong>Publish your website</strong> and start accepting registrations</p>
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;"></p>
          <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:#1a5c38;border-radius:6px;padding:12px 28px;">
              <a href="https://teevents.golf/get-started" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px;">GET STARTED →</a>
            </td></tr>
          </table>
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">If you have any questions, just reply to this email — we're here to help!</p>
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">See you on the course! ⛳</p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
