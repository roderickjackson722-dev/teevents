import { buildNotificationHtml } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, type } = await req.json();
    if (!to) throw new Error("Missing 'to' email");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    let subject: string;
    let html: string;

    if (type === "welcome") {
      subject = "Welcome to TeeVents — Your Starter Plan Is Ready!";
      html = buildWelcomeHtml("there", "Starter");
    } else {
      subject = "🎉 New Starter Plan Purchase — Test User";
      html = buildNotificationHtml("🎉 New Plan Purchase!", [
        `<strong>Test User</strong> just purchased the <strong>Starter</strong> plan.`,
        `📧 <strong>Email:</strong> ${to}`,
        `💰 <strong>Amount:</strong> $499.00`,
      ]);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const result = await res.json();
    return new Response(JSON.stringify({ success: res.ok, result }), {
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
