import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { signupRequestSchema, intakeSchemaFor, intakeSubject, intakeEmailText, type Kind } from "./intake.schema";
import { trustedOrigin } from "./trustedOrigin";

const DISPOSABLE = new Set(["mailinator.com", "temp-mail.org", "tempmail.com", "temp-mail.io", "10minutemail.com", "10minutemail.net", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "yopmail.com", "trashmail.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mailsac.com", "mail.tm", "tempinbox.com", "minuteinbox.com", "emailondeck.com", "burnermail.io"]);
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function resend(payload: Record<string, unknown>): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "TeeVents Golf Management <info@notifications.teevents.golf>", ...payload }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  return !!res?.ok;
}

/** Admin-only notification of a submitted intake. Never sent to the organizer. */
export async function sendIntakeAdminEmail(kind: Kind, details: Record<string, unknown>, contact: Record<string, unknown>) {
  return resend({
    to: ["info@teevents.golf"],
    ...(contact["email"] ? { reply_to: String(contact["email"]) } : {}),
    subject: intakeSubject(kind, details),
    text: intakeEmailText(kind, details, contact) + "\n\nAdmin queue: https://www.teevents.golf/admin/intakes",
  });
}

/**
 * Create the organizer account from the signup steps, immediately.
 * No document checks, no verification hold. hCaptcha, disposable-email and IP limits stay.
 */
export const createSignup = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => signupRequestSchema.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const headers = getRequestHeaders();
    const ip = headers.get("cf-connecting-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const c = data.contact;
    const domain = c.email.split("@")[1] || "";
    if (DISPOSABLE.has(domain)) return { ok: false as const, message: "Temporary email addresses aren't accepted. Please use your organization email." };

    const secret = process.env["HCAPTCHA_SECRET_KEY"];
    if (secret) {
      if (!data.captchaToken) return { ok: false as const, message: "Please complete the human verification." };
      const vr = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: data.captchaToken }),
      }).then(r => r.json()).catch(() => ({ success: false }));
      if (!vr.success) return { ok: false as const, message: "Human verification failed. Please try again." };
    }
    const { data: black } = await admin.from("security_ip_blacklist").select("id").eq("ip_address", ip).maybeSingle();
    if (black) return { ok: false as const, message: "Signups from your network are blocked. Contact info@teevents.golf." };
    const { data: rl } = await admin.rpc("check_auth_rate_limit", { _ip: ip, _action: "signup", _max: 5, _window_seconds: 3600 });
    if (rl?.allowed === false) return { ok: false as const, message: "Too many signup attempts from your network. Please try again later." };

    let details: Record<string, any> = data.details;
    if (!data.skipped) {
      const parsed = intakeSchemaFor(data.interest).safeParse(data.details);
      if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message || "Please check the required fields." };
      details = parsed.data as Record<string, any>;
    }
    const full_name = `${c.first_name} ${c.last_name}`.trim();
    const organization_name = String(details["orgName"] || "").trim().slice(0, 150) || null;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: c.email, password: crypto.randomUUID() + "Aa1!", email_confirm: true,
      user_metadata: { full_name, first_name: c.first_name, last_name: c.last_name, phone: c.phone_number },
    });
    if (createErr || !created?.user) {
      return { ok: false as const, message: /already|registered|exists/i.test(createErr?.message || "") ? "An account already exists for this email. Please sign in." : "We could not create your account. Please try again." };
    }
    const userId = created.user.id as string;

    const { data: vet } = await admin.from("signup_vetting").insert({
      user_id: userId, email: c.email, full_name, full_legal_name: full_name, phone: c.phone_number, phone_number: c.phone_number,
      organization_name, interest_area: data.interest, vetting_status: "approved", flag_reasons: [], ip_address: ip, email_verified: false,
    }).select("id").single();

    const contact = { first_name: c.first_name, last_name: c.last_name, email: c.email, phone_number: c.phone_number, organization_name, selected_plan: data.selectedPlan || null };
    const now = new Date().toISOString();
    const { data: intake } = await admin.from("organizer_intakes").insert({
      user_id: userId, vetting_id: vet?.id ?? null, interest_area: data.interest, contact, details,
      status: data.skipped ? "not_submitted" : "new", submitted_at: data.skipped ? null : now,
    }).select("access_token").single();

    if (!data.skipped) await sendIntakeAdminEmail(data.interest, details, contact);

    // Set-password link so the organizer can sign in again later (not a document request).
    const site = trustedOrigin(data.origin) || "https://www.teevents.golf";
    const { data: rec } = await admin.auth.admin.generateLink({ type: "recovery", email: c.email, options: { redirectTo: `${site}/reset-password?new=1&type=${data.interest}` } });
    const recLink = rec?.properties?.action_link;
    if (recLink) {
      await resend({
        to: [c.email], reply_to: "info@teevents.golf",
        subject: "Welcome to TeeVents — Set Your Password",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827;"><h1 style="color:#1a5c38;font-size:24px;">Welcome to TeeVents</h1><p style="font-size:16px;">Hi ${esc(c.first_name)},</p><p style="font-size:16px;">Your account is ready. Set a password so you can sign in anytime:</p><p style="text-align:center;margin:28px 0;"><a href="${recLink}" style="background:#F5A623;color:#1a5c38;padding:14px 28px;border-radius:8px;font-weight:bold;text-decoration:none;">Set My Password</a></p><p style="font-size:16px;">Best,<br/>The TeeVents Team</p></div>`,
      });
    }

    // One-time sign-in for this brand-new account, so the dashboard opens right away.
    const { data: ml } = await admin.auth.admin.generateLink({ type: "magiclink", email: c.email });
    return { ok: true as const, intakeToken: (intake?.access_token as string) || null, tokenHash: (ml?.properties?.hashed_token as string) || null, details };
  });
