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

    // 3) Last-resort fallback: the organization OWNER's account email. Without this,
    // an organizer who never opened Notification Settings AND never entered a
    // tournament contact email would silently receive NO transaction emails.
    if (recipientsSet.size === 0) {
      try {
        const { data: owner } = await supabaseAdmin
          .from("org_members")
          .select("user_id")
          .eq("organization_id", organizationId)
          .eq("role", "owner")
          .limit(1)
          .maybeSingle() as any;
        if (owner?.user_id) {
          const { data: authUser } = await (supabaseAdmin as any).auth.admin.getUserById(owner.user_id);
          const ownerEmail = authUser?.user?.email;
          if (ownerEmail) recipientsSet.add(String(ownerEmail).trim().toLowerCase());
        }
      } catch (ownerErr) {
        console.error("[Notification] Owner email fallback failed:", ownerErr);
      }
    }

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

    console.log(`[Notification] Sending ${eventType} to ${recipients.join(", ")} from ${SENDER_EMAIL}`);

    const result = await sendAndLog(
      supabaseAdmin,
      RESEND_API_KEY,
      {
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: recipients,
        // Platform admin (info@teevents.golf) is intentionally NOT copied here.
        // Admin only receives payout notices (auto-payout / manual payout required).
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
        // No BCC to info@teevents.golf — admin only receives payout notices.
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
    // NOTE: only select columns that actually exist on tournament_registrations.
    // A bad column here makes the whole query error and silently drops the Q&A block.
    const { data: regs, error: regErr } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, tournament_id, first_name, last_name, email, phone, handicap, shirt_size, dietary_restrictions, notes, custom_answers, created_at")
      .in("id", registrationIds);
    if (regErr) {
      console.error("[buildRegistrationAnswersHtml] registration query failed:", regErr);
      return "";
    }
    if (!regs || regs.length === 0) return "";

    const tournamentId = (regs[0] as any).tournament_id;
    const { data: fields } = await supabaseAdmin
      .from("tournament_registration_fields")
      .select("id, label, field_type, is_enabled, sort_order")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true });

    const escape = (s: any) =>
      String(s ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
    // Preserve line breaks in long free-text answers; never truncate.
    const fmt = (v: any) => {
      if (v === null || v === undefined || v === "") return "<em style='color:#9ca3af'>Not provided</em>";
      if (typeof v === "boolean") return v ? "Yes" : "No";
      if (Array.isArray(v)) return escape(v.map((x) => (typeof x === "object" ? JSON.stringify(x) : x)).join(", ")).replace(/\n/g, "<br/>");
      if (typeof v === "object") return escape(JSON.stringify(v, null, 2)).replace(/\n/g, "<br/>");
      return escape(v).replace(/\n/g, "<br/>");
    };

    const sections = regs.map((r: any, idx: number) => {
      const rows: Array<[string, any]> = [];
      rows.push(["Name", `${r.first_name || ""} ${r.last_name || ""}`.trim()]);
      rows.push(["Email", r.email]);
      if (r.phone) rows.push(["Phone", r.phone]);

      const seenLabels = new Set(rows.map(([l]) => l.toLowerCase()));

      // Normalize custom_answers: supports the canonical array form
      // [{label, answer, field_id}] as well as legacy object maps keyed by
      // field id or label, and JSON strings.
      let raw = r.custom_answers;
      if (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch { raw = []; }
      }
      const fieldById = new Map<string, string>();
      for (const f of (fields || []) as any[]) fieldById.set(String(f.id), String(f.label || ""));

      const answerPairs: Array<[string, any]> = [];
      if (Array.isArray(raw)) {
        for (const a of raw) {
          const label = String(a?.label || fieldById.get(String(a?.field_id)) || a?.question || "").trim();
          if (!label) continue;
          answerPairs.push([label, a?.answer ?? a?.value ?? ""]);
        }
      } else if (raw && typeof raw === "object") {
        for (const [k, v] of Object.entries(raw)) {
          const label = (fieldById.get(String(k)) || String(k)).trim();
          if (!label) continue;
          answerPairs.push([label, v]);
        }
      }

      for (const [label, value] of answerPairs) {
        if (seenLabels.has(label.toLowerCase())) continue;
        rows.push([label, value]);
        seenLabels.add(label.toLowerCase());
      }

      // Backfill from tournament field defs so recipients always see every configured
      // question — even ones with no answer stored (rendered as "Not provided").
      for (const f of (fields || []) as any[]) {
        const label = String(f.label || "").trim();
        if (!label || seenLabels.has(label.toLowerCase())) continue;
        const nativeMap: Record<string, string> = {
          "handicap": "handicap",
          "shirt size": "shirt_size",
          "dietary restrictions": "dietary_restrictions",
          "notes": "notes",
        };
        const nativeKey = nativeMap[label.toLowerCase()];
        const val = nativeKey ? (r as any)[nativeKey] : "";
        rows.push([label, val]);
        seenLabels.add(label.toLowerCase());
      }

      // Always surface native values that weren't covered by a field label.
      const nativeExtras: Array<[string, any]> = [
        ["Handicap", r.handicap],
        ["Shirt Size", r.shirt_size],
        ["Dietary Restrictions", r.dietary_restrictions],
        ["Notes", r.notes],
      ];
      for (const [label, val] of nativeExtras) {
        if (val === null || val === undefined || val === "") continue;
        if (seenLabels.has(label.toLowerCase())) continue;
        rows.push([label, val]);
        seenLabels.add(label.toLowerCase());
      }

      const rowsHtml = rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;font-weight:600;vertical-align:top;width:38%;word-break:break-word;overflow-wrap:anywhere;">${escape(label)}</td>
          <td style="padding:6px 0;color:#111827;font-size:14px;line-height:1.5;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;">${fmt(value)}</td>
        </tr>`,
        )
        .join("");

      return `
      <div style="margin:14px 0;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
        <p style="margin:0 0 8px;color:#1a5c38;font-size:14px;font-weight:700;">
          🏌️ Player ${regs.length > 1 ? idx + 1 + " of " + regs.length : ""} — ${escape(`${r.first_name || ""} ${r.last_name || ""}`.trim())}
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;border-collapse:collapse;">${rowsHtml}</table>
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


const _esc = (s: any) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const _fmt = (v: any) => {
  if (v === null || v === undefined || v === "") return "<em style='color:#9ca3af'>Not provided</em>";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return _esc(v.map((x) => (typeof x === "object" ? JSON.stringify(x) : x)).join(", ")).replace(/\n/g, "<br/>");
  if (typeof v === "object") return _esc(JSON.stringify(v, null, 2)).replace(/\n/g, "<br/>");
  return _esc(v).replace(/\n/g, "<br/>");
};
function _renderRows(rows: Array<[string, any]>): string {
  return rows.map(([label, value]) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;font-weight:600;vertical-align:top;width:38%;word-break:break-word;overflow-wrap:anywhere;">${_esc(label)}</td>
      <td style="padding:6px 0;color:#111827;font-size:14px;line-height:1.5;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;">${_fmt(value)}</td>
    </tr>`).join("");
}

function _wrapSection(title: string, subtitle: string, innerHtml: string): string {
  return `
    <div style="margin:18px 0 6px;">
      <p style="margin:0 0 4px;color:#111827;font-size:15px;font-weight:700;">${_esc(title)}</p>
      <p style="margin:0 0 10px;color:#6b7280;font-size:13px;">${_esc(subtitle)}</p>
      <div style="margin:14px 0;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${innerHtml}</table>
      </div>
    </div>`;
}

/** Renders every field submitted on a sponsor registration. */
export async function buildSponsorAnswersHtml(supabaseAdmin: any, sponsorRegId: string): Promise<string> {
  try {
    const { data: r } = await supabaseAdmin
      .from("sponsor_registrations")
      .select("*, sponsorship_tiers(name)")
      .eq("id", sponsorRegId).maybeSingle();
    if (!r) return "";
    const tierName = (r as any).sponsorship_tiers?.name || "Custom";
    const rows: Array<[string, any]> = [
      ["Company", r.company_name],
      ["Sponsorship Tier", tierName],
      ["Amount", r.amount_cents != null ? `$${(r.amount_cents/100).toFixed(2)}` : ""],
      ["Contact Name", r.contact_name],
      ["Email", r.contact_email],
      ["Phone", r.contact_phone],
      ["Website", r.website_url],
      ["Address", r.address],
      ["Description", r.description],
      ["Logo URL", r.logo_url],
      ["Additional Notes", r.additional_notes],
      ["Show on Public Page", r.show_on_public ? "Yes" : "No"],
    ];
    return _wrapSection("🏢 Full Sponsor Submission", "Every field submitted by the sponsor:", _renderRows(rows));
  } catch (err) {
    console.error("[buildSponsorAnswersHtml]", err); return "";
  }
}

/** Renders every field + custom answer submitted on a vendor registration. */
export async function buildVendorAnswersHtml(supabaseAdmin: any, vendorRegId: string): Promise<string> {
  try {
    const { data: r } = await supabaseAdmin
      .from("vendor_registrations")
      .select("*, vendor_tiers(name)")
      .eq("id", vendorRegId).maybeSingle();
    if (!r) return "";
    const rows: Array<[string, any]> = [
      ["Vendor / Business Name", r.vendor_name],
      ["Business Type", r.business_type],
      ["Tier", (r as any).vendor_tiers?.name || null],
      ["Booth Fee", r.booth_fee_cents != null ? `$${(r.booth_fee_cents/100).toFixed(2)}` : ""],
      ["Booth Location", r.booth_location],
      ["Contact Name", r.contact_name],
      ["Email", r.contact_email],
      ["Phone", r.contact_phone],
      ["Website", r.website_url],
      ["Description", r.description],
      ["Logo URL", r.logo_url],
      ["Notes", r.notes],
    ];
    // Merge custom form answers
    try {
      const { data: form } = await supabaseAdmin
        .from("vendor_forms").select("questions").eq("tournament_id", r.tournament_id).maybeSingle();
      const questions: any[] = Array.isArray(form?.questions) ? form.questions : [];
      const answers: any = r.answers || {};
      const seen = new Set(rows.map(([l]) => l.toLowerCase()));
      // If answers are keyed by id, resolve labels via questions
      for (const q of questions) {
        const label = String(q?.label || q?.question || q?.id || "").trim();
        if (!label || seen.has(label.toLowerCase())) continue;
        const key = q?.id || q?.key || label;
        const val = (answers && typeof answers === "object") ? (answers[key] ?? answers[label]) : "";
        rows.push([label, val]);
        seen.add(label.toLowerCase());
      }
      // Also drop any raw answer keys not mapped above
      if (answers && typeof answers === "object" && !Array.isArray(answers)) {
        for (const [k, v] of Object.entries(answers)) {
          if (seen.has(String(k).toLowerCase())) continue;
          if (questions.some((q: any) => (q?.id || q?.key) === k)) continue;
          rows.push([k, v]);
          seen.add(String(k).toLowerCase());
        }
      }
    } catch (e) { console.warn("[buildVendorAnswersHtml] questions merge failed", e); }
    return _wrapSection("🛍️ Full Vendor Submission", "Every field submitted by the vendor:", _renderRows(rows));
  } catch (err) {
    console.error("[buildVendorAnswersHtml]", err); return "";
  }
}

/**
 * Renders every question & answer submitted on a league membership registration
 * (league_registration_responses.response_data), backfilled with the league's
 * configured custom fields so unanswered questions still appear.
 */
export async function buildLeagueRegistrationAnswersHtml(
  supabaseAdmin: any,
  responseId: string,
): Promise<string> {
  try {
    if (!responseId) return "";
    const { data: r } = await supabaseAdmin
      .from("league_registration_responses")
      .select("id, league_id, member_id, response_data, amount_cents, promo_code, payment_status, created_at")
      .eq("id", responseId)
      .maybeSingle();
    if (!r) return "";

    const { data: member } = await supabaseAdmin
      .from("league_members")
      .select("member_name, email, phone, handicap_index, scoring_code")
      .eq("id", r.member_id)
      .maybeSingle();

    const rows: Array<[string, any]> = [];
    if (member) {
      rows.push(["Name", member.member_name]);
      rows.push(["Email", member.email]);
      if (member.phone) rows.push(["Phone", member.phone]);
      if (member.handicap_index != null) rows.push(["Handicap Index", member.handicap_index]);
    }
    rows.push(["Amount Paid", r.amount_cents != null ? `$${(r.amount_cents / 100).toFixed(2)}` : ""]);
    if (r.promo_code) rows.push(["Promo Code", r.promo_code]);

    const seen = new Set(rows.map(([l]) => String(l).toLowerCase()));
    const data: any = r.response_data || {};

    // Backfill from the league's configured registration form fields
    const { data: form } = await supabaseAdmin
      .from("league_registration_forms")
      .select("custom_fields")
      .eq("league_id", r.league_id)
      .maybeSingle();
    const fields: any[] = Array.isArray(form?.custom_fields) ? form!.custom_fields : [];

    for (const f of fields) {
      const label = String(f?.label || f?.question || f?.id || "").trim();
      if (!label || seen.has(label.toLowerCase())) continue;
      const key = f?.id || f?.key || label;
      const val = data && typeof data === "object" ? (data[key] ?? data[label] ?? "") : "";
      rows.push([label, val]);
      seen.add(label.toLowerCase());
    }

    // Include any remaining raw answers not covered by the field defs
    if (data && typeof data === "object" && !Array.isArray(data)) {
      for (const [k, v] of Object.entries(data)) {
        if (seen.has(String(k).toLowerCase())) continue;
        if (fields.some((f: any) => (f?.id || f?.key) === k)) continue;
        rows.push([k, v]);
        seen.add(String(k).toLowerCase());
      }
    }

    return _wrapSection(
      "📝 Full Registration Submission",
      "Every question shown to the member and their submitted answer:",
      _renderRows(rows),
    );
  } catch (err) {
    console.error("[buildLeagueRegistrationAnswersHtml]", err);
    return "";
  }
}

/**
 * Emails the league's managers (org owners/admins) plus the platform admin with
 * a transaction notification. Used so league managers get the same full Q&A
 * backup copy that tournament organizers receive.
 */
export async function notifyLeagueManagers(opts: {
  supabaseAdmin: any;
  leagueId: string;
  subject: string;
  htmlBody: string;
}) {
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return;
    const admin = opts.supabaseAdmin;
    const { data: league } = await admin
      .from("golf_leagues")
      .select("organization_id")
      .eq("id", opts.leagueId)
      .maybeSingle();

    const recipients = new Set<string>();
    if (league?.organization_id) {
      const { data: members } = await admin
        .from("org_members")
        .select("user_id, role")
        .eq("organization_id", league.organization_id);
      for (const m of (members || []) as any[]) {
        if (!["owner", "admin"].includes(String(m.role || "").toLowerCase())) continue;
        try {
          const { data: u } = await admin.auth.admin.getUserById(m.user_id);
          const email = u?.user?.email;
          if (email) recipients.add(String(email).trim().toLowerCase());
        } catch (_e) { /* ignore */ }
      }
    }
    if (recipients.size === 0) recipients.add(PLATFORM_ADMIN_EMAIL);

    await sendAndLog(
      admin,
      RESEND_API_KEY,
      {
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: Array.from(recipients),
        bcc: PLATFORM_ADMIN_EMAIL,
        subject: opts.subject,
        html: opts.htmlBody,
      },
      {
        templateName: "league-manager-registration",
        source: "notifyLeagueManagers",
        organizationId: league?.organization_id || null,
      },
    );
  } catch (err) {
    console.error("[notifyLeagueManagers]", err);
  }
}


// HTML email template helper for admin notifications
export function buildNotificationHtml(title: string, lines: string[], extraHtml: string = ""): string {
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
          ${extraHtml || ""}
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

