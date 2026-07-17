import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAndLog } from "./emailLogger.ts";

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";
const PLATFORM_ADMIN_EMAIL = "info@teevents.golf";

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Send a platform-admin notification email (always goes to info@teevents.golf)
 * for every transaction type. Logs to email_send_log so deliverability is traceable.
 */
export async function notifyPlatformAdmin(opts: {
  supabaseAdmin?: any;
  type: "registration" | "donation" | "sponsorship" | "vendor" | "side_event" | "store" | "auction" | "refund" | "other";
  subject: string;
  htmlBody: string;
  organizationId?: string | null;
  tournamentId?: string | null;
}) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.warn("[PlatformAdmin] RESEND_API_KEY missing — skipping admin notification");
    return;
  }
  const client = opts.supabaseAdmin || getAdminClient();
  const res = await sendAndLog(
    client,
    RESEND_API_KEY,
    {
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: PLATFORM_ADMIN_EMAIL,
      subject: opts.subject,
      html: opts.htmlBody,
    },
    {
      templateName: `platform-admin-${opts.type}`,
      source: "notifyPlatformAdmin",
      organizationId: opts.organizationId || null,
      tournamentId: opts.tournamentId || null,
    },
  );
  if (!res.ok) {
    console.error(`[PlatformAdmin] Failed to email admin for ${opts.type}:`, res.error);
  }
}

// Send notification emails via Resend to configured recipients PLUS the tournament's
// contact_email entered at tournament setup (always included as a guaranteed fallback so
// organizers receive transaction notifications even if they never opened Notification
// Settings to opt extra emails in).
export async function sendNotificationEmails(
  supabaseAdmin: ReturnType<typeof createClient>,
  organizationId: string,
  eventType: "notify_registration" | "notify_donation" | "notify_store_purchase" | "notify_auction_bid",
  subject: string,
  htmlBody: string,
  tournamentId?: string | null,
) {
  try {
    const recipientsSet = new Set<string>();

    // 1) Configured per-event notification emails (opt-in by organizer)
    const { data: notifEmails } = await supabaseAdmin
      .from("notification_emails")
      .select("email")
      .eq("organization_id", organizationId)
      .eq(eventType, true);
    for (const n of (notifEmails || []) as any[]) {
      if (n?.email) recipientsSet.add(String(n.email).trim().toLowerCase());
    }

    // 2) Tournament contact email entered during tournament setup — always included
    if (tournamentId) {
      const { data: t } = await supabaseAdmin
        .from("tournaments")
        .select("contact_email")
        .eq("id", tournamentId)
        .maybeSingle() as any;
      if (t?.contact_email) recipientsSet.add(String(t.contact_email).trim().toLowerCase());
    }

    // (Organizations table has no contact_email — tournament.contact_email is the canonical organizer address.)

    if (recipientsSet.size === 0) {
      console.warn(`[Notification] No recipients found for ${eventType} (org=${organizationId} tournament=${tournamentId || "n/a"})`);
      return;
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set, skipping notification emails");
      return;
    }

    const recipients = Array.from(recipientsSet);

    console.log(`[Notification] Sending ${eventType} to ${recipients.join(", ")} (bcc=${PLATFORM_ADMIN_EMAIL}) from ${SENDER_EMAIL}`);

    const result = await sendAndLog(
      supabaseAdmin,
      RESEND_API_KEY,
      {
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: recipients,
        // BCC platform admin on every organizer notification so TeeVents receives
        // a copy of every transaction without exposing our address to the organizer.
        bcc: PLATFORM_ADMIN_EMAIL,
        subject,
        html: htmlBody,
      },
      {
        templateName: `notification-${eventType}`,
        source: "sendNotificationEmails",
        organizationId,
        tournamentId: tournamentId || null,
      },
    );
    if (!result.ok) console.error(`[Notification] ${eventType} failed:`, result.error);
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
  qrToken: string | null = null,
) {
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set, skipping registrant confirmation email");
      return;
    }

    // Pin date-only strings to local midnight so timezone never shifts the displayed day.
    const dateStr = tournamentDate
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(tournamentDate) ? `${tournamentDate}T00:00:00` : tournamentDate)
          .toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : null;

    // Tournament page URL for "View Tournament Page" button
    const tournamentPageUrl = tournamentSlug
      ? `https://www.teevents.golf/t/${tournamentSlug}`
      : tournamentId
        ? `https://www.teevents.golf/t/${tournamentId}`
        : null;

    // Refund URL (shown as small footer link)
    const refundUrl = tournamentSlug
      ? `https://www.teevents.golf/t/${tournamentSlug}?tab=refund&email=${encodeURIComponent(recipientEmail)}`
      : tournamentId
        ? `https://www.teevents.golf/refund/${tournamentId}?email=${encodeURIComponent(recipientEmail)}`
        : null;

    // Personal Player Hub URL + QR (mobile bookmark for player)
    const hubUrl = qrToken && tournamentSlug
      ? `https://www.teevents.golf/player/${tournamentSlug}/${qrToken}`
      : null;
    const qrImg = hubUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(hubUrl)}`
      : null;

    // Fetch organizer/tournament logo (falls back to org logo)
    let logoUrl: string | null = null;
    if (tournamentId) {
      try {
        const admin = getAdminClient();
        const { data: t } = await admin
          .from("tournaments")
          .select("logo_url, organization_id")
          .eq("id", tournamentId)
          .maybeSingle();
        logoUrl = (t as any)?.logo_url || null;
        if (!logoUrl && (t as any)?.organization_id) {
          const { data: org } = await admin
            .from("organizations")
            .select("logo_url")
            .eq("id", (t as any).organization_id)
            .maybeSingle();
          logoUrl = (org as any)?.logo_url || null;
        }
      } catch (e) {
        console.warn("[Confirmation] logo lookup failed", e);
      }
    }

    const lines = [
      `Hi <strong>${firstName}</strong>,`,
      `We've received your registration for <strong>${tournamentTitle}</strong>. Thank you for signing up!`,
      dateStr ? `📅 <strong>Date:</strong> ${dateStr}` : "",
      tournamentLocation ? `📍 <strong>Location:</strong> ${tournamentLocation}` : "",
      dateStr ? `We look forward to seeing you on <strong>${dateStr}</strong>. Keep an eye on your inbox for any updates leading up to the event.` : "We look forward to seeing you there! Keep an eye on your inbox for any updates leading up to the event.",
      "See you on the course! ⛳",
    ].filter(Boolean);

    const html = buildConfirmationHtml("Registration Confirmed!", lines as string[], tournamentPageUrl, refundUrl, hubUrl, qrImg, logoUrl);


    console.log(`[Confirmation] Sending registration confirmation to ${recipientEmail} from ${SENDER_EMAIL}`);

    const client = getAdminClient();
    const result = await sendAndLog(
      client,
      RESEND_API_KEY,
      {
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: [recipientEmail],
        // Silent BCC to TeeVents so the platform has a record of every
        // confirmation email — the recipient/organizer never sees this address.
        bcc: PLATFORM_ADMIN_EMAIL,
        subject: `You're Registered — ${tournamentTitle}`,
        html,
      },
      {
        templateName: "registration-confirmation",
        source: "sendRegistrantConfirmationEmail",
        tournamentId: tournamentId || null,
      },
    );
    if (!result.ok) {
      console.error(`[Confirmation] Failed:`, result.error);
    } else {
      console.log(`[Confirmation] Sent to ${recipientEmail} (resend_id=${result.resendId})`);
    }
  } catch (err) {
    console.error("Failed to send registrant confirmation email:", err);
  }
}

/**
 * Build an HTML block that renders every registration field & answer captured
 * for the given registration IDs. Used inside both organizer and platform-admin
 * confirmation emails so recipients see the full submission (name, email,
 * phone, plus every custom question/answer) for each player in the transaction.
 * Returns an empty string if no registrations are found.
 */
export async function buildRegistrationAnswersHtml(
  supabaseAdmin: any,
  registrationIds: string[],
): Promise<string> {
  try {
    if (!registrationIds || registrationIds.length === 0) return "";
    const { data: regs } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, tournament_id, first_name, last_name, email, phone, handicap, shirt_size, dietary_restrictions, company, skill_level, custom_answers, created_at")
      .in("id", registrationIds);
    if (!regs || regs.length === 0) return "";

    const tournamentId = (regs[0] as any).tournament_id;
    const { data: fields } = await supabaseAdmin
      .from("tournament_registration_fields")
      .select("id, label, field_type, is_enabled, sort_order")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true });

    const escape = (s: any) =>
      String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const fmt = (v: any) => {
      if (v === null || v === undefined || v === "") return "<em style='color:#9ca3af'>Not provided</em>";
      if (Array.isArray(v)) return escape(v.join(", "));
      if (typeof v === "object") return escape(JSON.stringify(v));
      return escape(v);
    };

    const sections = regs.map((r: any, idx: number) => {
      const rows: Array<[string, any]> = [];
      rows.push(["Name", `${r.first_name || ""} ${r.last_name || ""}`.trim()]);
      rows.push(["Email", r.email]);
      if (r.phone) rows.push(["Phone", r.phone]);

      const answers: any[] = Array.isArray(r.custom_answers) ? r.custom_answers : [];
      const seenLabels = new Set(rows.map(([l]) => l.toLowerCase()));

      // Prefer the canonical answers array (order matches the org's field setup)
      for (const a of answers) {
        const label = String(a?.label || "").trim();
        if (!label) continue;
        if (seenLabels.has(label.toLowerCase())) continue;
        rows.push([label, a?.answer ?? a?.value ?? ""]);
        seenLabels.add(label.toLowerCase());
      }

      // Backfill from tournament field defs so recipients always see every configured
      // question — even ones with no answer stored (rendered as "Not provided").
      for (const f of (fields || []) as any[]) {
        const label = String(f.label || "").trim();
        if (!label || seenLabels.has(label.toLowerCase())) continue;
        // Look up matching native column for default fields
        const nativeMap: Record<string, string> = {
          "handicap": "handicap",
          "shirt size": "shirt_size",
          "dietary restrictions": "dietary_restrictions",
          "company / organization": "company",
          "skill level": "skill_level",
        };
        const nativeKey = nativeMap[label.toLowerCase()];
        const val = nativeKey ? (r as any)[nativeKey] : "";
        rows.push([label, val]);
        seenLabels.add(label.toLowerCase());
      }

      const rowsHtml = rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;font-weight:600;vertical-align:top;white-space:nowrap;">${escape(label)}</td>
          <td style="padding:6px 0;color:#111827;font-size:14px;vertical-align:top;">${fmt(value)}</td>
        </tr>`,
        )
        .join("");

      return `
      <div style="margin:14px 0;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
        <p style="margin:0 0 8px;color:#1a5c38;font-size:14px;font-weight:700;">
          🏌️ Player ${regs.length > 1 ? idx + 1 + " of " + regs.length : ""} — ${escape(`${r.first_name || ""} ${r.last_name || ""}`.trim())}
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
      </div>`;
    });

    return `
    <div style="margin:18px 0 6px;">
      <p style="margin:0 0 4px;color:#111827;font-size:15px;font-weight:700;">📝 Full Registration Submission</p>
      <p style="margin:0 0 10px;color:#6b7280;font-size:13px;">Every question shown to the registrant and their submitted answer:</p>
      ${sections.join("")}
    </div>`;
  } catch (err) {
    console.error("[buildRegistrationAnswersHtml] failed:", err);
    return "";
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
function buildConfirmationHtml(title: string, lines: string[], tournamentPageUrl: string | null = null, refundUrl: string | null = null, hubUrl: string | null = null, qrImg: string | null = null, logoUrl: string | null = null): string {
  const tournamentBlock = tournamentPageUrl ? `
        <tr><td style="padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <a href="${tournamentPageUrl}" style="display:inline-block;padding:12px 28px;background-color:#1a5c38;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">View Tournament Page</a>
        </td></tr>` : "";

  const hubBlock = hubUrl && qrImg ? `
        <tr><td style="padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="margin:0 0 6px;color:#1a5c38;font-size:16px;font-weight:700;">📱 Your Personal Player Hub</p>
          <p style="margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.5;">Scan or tap on event day for live scoring, leaderboard, schedule & more — no login needed.</p>
          <a href="${hubUrl}" style="text-decoration:none;"><img src="${qrImg}" width="180" height="180" alt="Your Player Hub QR Code" style="display:block;margin:0 auto 12px;border:6px solid #ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);"/></a>
          <a href="${hubUrl}" style="display:inline-block;padding:10px 22px;background-color:#F5A623;color:#1a5c38;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700;">Open My Player Hub</a>
          <p style="margin:12px 0 0;color:#9ca3af;font-size:11px;">Bookmark this link on your phone — it's your personal pass for the entire tournament.</p>
        </td></tr>` : "";

  const refundFooterLink = refundUrl
    ? ` | <a href="${refundUrl}" style="color:#9ca3af;text-decoration:underline;">Request a refund</a>`
    : "";

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="Tournament logo" style="max-height:64px;max-width:220px;display:block;margin:0 auto 10px;background:#ffffff;padding:6px;border-radius:6px;" />`
    : `<p style="margin:0 0 8px;font-size:32px;">⛳</p>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1a5c38;padding:28px 32px;text-align:center;">
          ${logoBlock}
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${title}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          ${lines.map(l => `<p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">${l}</p>`).join("")}
        </td></tr>${hubBlock}${tournamentBlock}
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a> | <a href="mailto:info@teevents.golf" style="color:#9ca3af;text-decoration:underline;">Need help? Contact support</a>${refundFooterLink}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

