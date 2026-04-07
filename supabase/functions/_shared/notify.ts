import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
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

// Send a registration confirmation email to the registrant
export async function sendRegistrantConfirmationEmail(
  firstName: string,
  lastName: string,
  recipientEmail: string,
  tournamentTitle: string,
  tournamentDate: string | null,
  tournamentLocation: string | null,
  tournamentSlug: string | null = null,
  tournamentId: string | null = null,
) {
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set, skipping registrant confirmation email");
      return;
    }

    const dateStr = tournamentDate
      ? new Date(tournamentDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : null;

    const refundUrl = tournamentSlug
      ? `https://www.teevents.golf/t/${tournamentSlug}?tab=refund&email=${encodeURIComponent(recipientEmail)}`
      : tournamentId
        ? `https://www.teevents.golf/refund/${tournamentId}?email=${encodeURIComponent(recipientEmail)}`
        : null;

    const lines = [
      `Hi <strong>${firstName}</strong>,`,
      `We've received your registration for <strong>${tournamentTitle}</strong>. Thank you for signing up!`,
      dateStr ? `📅 <strong>Date:</strong> ${dateStr}` : "",
      tournamentLocation ? `📍 <strong>Location:</strong> ${tournamentLocation}` : "",
      dateStr ? `We look forward to seeing you on <strong>${dateStr}</strong>. Keep an eye on your inbox for any updates leading up to the event.` : "We look forward to seeing you there! Keep an eye on your inbox for any updates leading up to the event.",
      "See you on the course! ⛳",
    ].filter(Boolean);

    const html = buildConfirmationHtml("Registration Confirmed!", lines as string[], refundUrl);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: [recipientEmail],
        subject: `You're Registered — ${tournamentTitle}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Resend API error (${res.status}):`, err);
    } else {
      console.log(`[Confirmation] Registration confirmation sent to ${recipientEmail}`);
    }
  } catch (err) {
    console.error("Failed to send registrant confirmation email:", err);
  }
}

// HTML email template helper for admin notifications
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

// HTML email template for registrant confirmations (friendlier design)
function buildConfirmationHtml(title: string, lines: string[], refundUrl: string | null = null): string {
  const refundBlock = refundUrl ? `
        <tr><td style="padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <a href="${refundUrl}" style="display:inline-block;padding:10px 24px;background-color:#6b7280;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Request a Refund</a>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;">Need to cancel? Click above to submit a refund request.</p>
        </td></tr>` : "";

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
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${title}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          ${lines.map(l => `<p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">${l}</p>`).join("")}
        </td></tr>${refundBlock}
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
