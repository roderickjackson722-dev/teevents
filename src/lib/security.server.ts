// Server-only helpers for the admin Security & Monitoring dashboard.
// Never import this file from client code — it is blocked from client bundles.

export type Severity = "low" | "medium" | "high" | "critical";

export const ALLOWED_ACTION_TYPES = [
  "login",
  "login_failed",
  "logout",
  "signup",
  "registration",
  "tournament_create",
  "payment",
  "payout",
  "password_reset",
  "score_edit",
  "admin_action",
] as const;

export type ActionType = (typeof ALLOWED_ACTION_TYPES)[number];

export async function getAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Throws when the caller is not a platform admin. */
export async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden: admin access required");
}

export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for") || "";
  return (
    fwd.split(",")[0]?.trim() ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

export interface GeoInfo {
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
}

const PRIVATE_IP = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|unknown$)/;

export async function geoLookup(ip: string): Promise<GeoInfo> {
  const empty: GeoInfo = { city: null, country: null, lat: null, lng: null };
  if (!ip || PRIVATE_IP.test(ip)) return empty;
  try {
    const res = await fetch(
      `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return empty;
    const j: any = await res.json();
    return {
      city: j?.city ?? null,
      country: j?.country_code ?? j?.country ?? null,
      lat: typeof j?.latitude === "number" ? j.latitude : null,
      lng: typeof j?.longitude === "number" ? j.longitude : null,
    };
  } catch {
    return empty;
  }
}

export function friendlyDevice(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  return `${browser} / ${os}`;
}

export interface ActivityInput {
  userId?: string | null;
  userEmail?: string | null;
  actionType: string;
  actionDetails?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  geo?: GeoInfo;
}

export async function logActivity(admin: any, input: ActivityInput) {
  try {
    await admin.from("security_activity_log").insert({
      user_id: input.userId ?? null,
      user_email: input.userEmail ?? null,
      action_type: input.actionType,
      action_details: input.actionDetails ?? {},
      ip_address: input.ip ?? null,
      user_agent: input.userAgent ?? null,
      location_city: input.geo?.city ?? null,
      location_country: input.geo?.country ?? null,
      location_lat: input.geo?.lat ?? null,
      location_lng: input.geo?.lng ?? null,
    });
  } catch (e) {
    console.error("[security] activity log failed", e);
  }
}

export interface FlagInput {
  userId?: string | null;
  userEmail?: string | null;
  flagType: string;
  severity: Severity;
  description: string;
  ip?: string | null;
  geo?: GeoInfo;
}

/** Creates a flag and fires the alert email when settings allow it. */
export async function createFlag(admin: any, input: FlagInput) {
  const { data: flag, error } = await admin
    .from("security_flags")
    .insert({
      user_id: input.userId ?? null,
      user_email: input.userEmail ?? null,
      flag_type: input.flagType,
      severity: input.severity,
      description: input.description,
      ip_address: input.ip ?? null,
      location_city: input.geo?.city ?? null,
      location_country: input.geo?.country ?? null,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("[security] flag insert failed", error);
    return null;
  }

  await sendSecurityAlert(admin, flag);
  return flag;
}

const SITE_URL = "https://www.teevents.golf";

function alertHtml(flag: any, urgent: boolean) {
  const loc = [flag.location_city, flag.location_country].filter(Boolean).join(", ") || "Unknown";
  const rows = `
    <tr><td style="padding:4px 8px;"><strong>Type</strong></td><td style="padding:4px 8px;">${flag.flag_type}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Severity</strong></td><td style="padding:4px 8px;">${String(flag.severity).toUpperCase()}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>User</strong></td><td style="padding:4px 8px;">${flag.user_email || "Unknown"}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>User ID</strong></td><td style="padding:4px 8px;">${flag.user_id || "—"}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>IP Address</strong></td><td style="padding:4px 8px;">${flag.ip_address || "Unknown"}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Location</strong></td><td style="padding:4px 8px;">${loc}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Time</strong></td><td style="padding:4px 8px;">${new Date(flag.created_at).toLocaleString("en-US")}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Description</strong></td><td style="padding:4px 8px;">${flag.description || "—"}</td></tr>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;">
    <h2 style="color:${urgent ? "#b91c1c" : "#1a5c38"};margin-top:0;">
      ${urgent ? "🚨 URGENT SECURITY ALERT" : "⚠️ SECURITY ALERT"} – TeeVents Platform
    </h2>
    <p>${urgent
      ? "A HIGH SEVERITY security event has been detected. Immediate attention is required."
      : "Suspicious activity has been detected on the TeeVents platform."}</p>
    <table style="border-collapse:collapse;border:1px solid #e5e7eb;width:100%;font-size:14px;">${rows}</table>
    <h3 style="margin-top:24px;">Recommended Actions</h3>
    <ol style="font-size:14px;color:#374151;">
      <li>Log in to the admin dashboard</li>
      <li>Go to Security → Suspicious Activity</li>
      <li>Review the flag and user history</li>
      <li>Suspend the user if necessary</li>
    </ol>
    <p style="margin:24px 0;">
      <a href="${SITE_URL}/admin/security" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">View Details</a>
    </p>
    <p style="color:#6b7280;font-size:13px;">This is an automated alert. Please review and take action.</p>
    <p style="margin-top:16px;">TeeVents Golf Management</p>
  </div>`;
}

export async function sendSecurityAlert(admin: any, flag: any) {
  if (!flag) return;
  try {
    const { data: settings } = await admin
      .from("security_alert_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!settings?.enabled) return;

    const sev = String(flag.severity || "medium").toLowerCase();
    const allowed =
      (sev === "high" || sev === "critical") ? settings.alert_high
        : sev === "medium" ? settings.alert_medium
          : settings.alert_low;
    if (!allowed) return;

    const recipients = String(settings.recipients || "info@teevents.golf")
      .split(",")
      .map((r: string) => r.trim())
      .filter(Boolean);
    if (recipients.length === 0) return;

    const urgent = sev === "high" || sev === "critical";
    const subject = urgent
      ? "🚨 URGENT – High Severity Security Alert"
      : "⚠️ Security Alert – Suspicious Activity Detected";

    const key = process.env["RESEND_API_KEY"];
    if (!key) {
      await admin.from("security_alert_log").insert({
        flag_id: flag.id, recipients: recipients.join(", "), severity: sev,
        subject, sent: false, error_message: "RESEND_API_KEY not configured",
      });
      return;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "TeeVents Security <info@notifications.teevents.golf>",
        to: recipients,
        reply_to: "info@teevents.golf",
        subject,
        html: alertHtml(flag, urgent),
      }),
    });
    const body: any = await res.json().catch(() => ({}));

    await admin.from("security_alert_log").insert({
      flag_id: flag.id,
      recipients: recipients.join(", "),
      severity: sev,
      subject,
      sent: res.ok,
      error_message: res.ok ? null : (body?.message || `Resend HTTP ${res.status}`),
    });
  } catch (e: any) {
    console.error("[security] alert email failed", e);
  }
}

export function suspensionEmailHtml(name: string, reason: string, permanent: boolean) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827;">
    <h2 style="color:#1a5c38;margin-top:0;">Account Suspension – TeeVents Golf</h2>
    <p>Hello ${name || "there"},</p>
    <p>Your TeeVents account has been ${permanent ? "suspended" : "temporarily suspended"} due to suspicious activity.</p>
    ${reason ? `<p style="color:#374151;"><strong>Reason:</strong> ${reason}</p>` : ""}
    <p>If you believe this is an error, please contact us at
      <a href="mailto:info@teevents.golf">info@teevents.golf</a> to resolve the issue.</p>
    <p style="margin-top:24px;">Thank you,<br/>TeeVents Golf Management</p>
  </div>`;
}

export async function sendPlainEmail(to: string, subject: string, html: string) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "TeeVents Golf Management <info@notifications.teevents.golf>",
        to: [to],
        reply_to: "info@teevents.golf",
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
