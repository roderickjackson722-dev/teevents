import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SENDER_EMAIL = "notifications@teevents.golf";
const SENDER_NAME = "TeeVents";

// Send notification emails via Resend to configured recipients
export async function sendNotificationEmails(
  supabaseAdmin: ReturnType<typeof createClient>,
  organizationId: string,
  eventType: "notify_registration" | "notify_donation" | "notify_store_purchase" | "notify_auction_bid",
  subject: string,
  htmlBody: string,
) {
  try {
    const { data: notifEmails } = await supabaseAdmin
      .from("notification_emails")
      .select("email")
      .eq("organization_id", organizationId)
      .eq(eventType, true);

    if (!notifEmails || notifEmails.length === 0) return;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set, skipping notification emails");
      return;
    }

    const recipients = notifEmails.map((n: any) => n.email);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: recipients,
        subject,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Resend API error (${res.status}):`, err);
    } else {
      console.log(`[Notification] ${eventType} sent to ${recipients.join(", ")}`);
    }
  } catch (err) {
    console.error("Failed to send notification emails:", err);
  }
}

// HTML email template helper
export function buildNotificationHtml(title: string, lines: string[]): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1a5c38;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${title}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          ${lines.map(l => `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">${l}</p>`).join("")}
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by TeeVents • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
