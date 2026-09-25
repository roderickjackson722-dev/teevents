// Tiered signup: Tier 1 automated checks (disposable email, hCaptcha, IP
// blacklist/rate limit/velocity), Tier 2 business questions, Tier 3 flagging
// for manual review. Clean signups get instant access via a set-password
// (email verification) link. Flagged signups are held until an admin approves.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ADMIN_EMAIL, button, esc, firstName, isDisposable, sendVettingEmail, shell,
} from "../_shared/vetting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ROLES = ["Tournament Director", "Club Manager", "Event Coordinator", "Coach", "League Manager", "Other"];
const EVENTS = ["1-2", "3-5", "6-10", "10+"];
const SOURCES = ["Facebook", "Instagram", "LinkedIn", "Google Search", "Word of Mouth", "Golf Course", "Other"];

async function websiteReachable(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    let res = await fetch(u.toString(), { method: "HEAD", redirect: "follow", signal: ctrl.signal }).catch(() => null);
    if (!res || res.status >= 400) {
      res = await fetch(u.toString(), { method: "GET", redirect: "follow", signal: ctrl.signal }).catch(() => null);
    }
    clearTimeout(t);
    return !!res && res.status < 500 && res.status !== 404;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") {
    return json({ hcaptcha_site_key: Deno.env.get("HCAPTCHA_SITE_KEY") || null });
  }
  try {
    const b = await req.json();
    const s = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
    const full_legal_name = s(b.full_legal_name, 120);
    const email = s(b.email, 255).toLowerCase();
    const phone_number = s(b.phone_number, 30);
    const organization_name = s(b.organization_name, 150);
    let organization_website = s(b.organization_website, 300);
    const role = s(b.role, 60);
    const events_per_year = s(b.events_per_year, 10);
    const event_description = s(b.event_description, 2000);
    const paid_registrations = b.paid_registrations === true;
    const referral_source = s(b.referral_source, 60) || null;
    const interest_area = b.interest_area === "league" ? "league" : "tournament";
    const origin = s(b.origin, 200);

    if (!full_legal_name || !email || !phone_number || !organization_name || !organization_website ||
      !role || !events_per_year || !event_description || typeof b.paid_registrations !== "boolean") {
      return json({ error: "Please complete every required field." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please enter a valid email address." }, 400);
    if (phone_number.replace(/\D/g, "").length < 10) return json({ error: "Please enter a valid phone number." }, 400);
    if (!ROLES.includes(role) || !EVENTS.includes(events_per_year) || (referral_source && !SOURCES.includes(referral_source))) {
      return json({ error: "Invalid selection." }, 400);
    }
    if (!/^https?:\/\//i.test(organization_website)) organization_website = `https://${organization_website}`;

    // Tier 1: disposable email
    if (isDisposable(email)) {
      return json({ error: "Disposable or temporary email addresses aren't accepted. Please use your organization email." }, 400);
    }

    // Tier 1: hCaptcha (enforced when configured)
    const hSecret = Deno.env.get("HCAPTCHA_SECRET_KEY");
    if (hSecret) {
      const token = s(b.captcha_token, 5000);
      if (!token) return json({ error: "Please complete the human verification." }, 400);
      const vr = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: hSecret, response: token }),
      }).then((r) => r.json()).catch(() => ({ success: false }));
      if (!vr.success) return json({ error: "Human verification failed. Please try again." }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const fwd = req.headers.get("x-forwarded-for") || "";
    const ip = (req.headers.get("cf-connecting-ip") || fwd.split(",")[0] || "unknown").trim();

    // Tier 1: IP blacklist → block
    const { data: black } = await admin.from("security_ip_blacklist").select("id").eq("ip_address", ip).maybeSingle();
    if (black) return json({ error: "Signups from your network are blocked. Contact info@teevents.golf." }, 403);

    // Tier 1: rate limit (5 signups / hour / IP)
    const { data: rl } = await admin.rpc("check_auth_rate_limit", {
      _ip: ip, _action: "signup", _max: 5, _window_seconds: 3600,
    });
    if ((rl as any)?.allowed === false) {
      return json({ error: "Too many signup attempts from your network. Please try again later." }, 429);
    }

    // Tier 3: flag rules
    const flags: string[] = [];
    if (ip !== "unknown") {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await admin.from("signup_vetting").select("id", { count: "exact", head: true })
        .eq("ip_address", ip).gte("created_at", since);
      if ((count ?? 0) >= 3) flags.push("IP reputation: 3+ signups from this IP in 24 hours");
      const { count: flaggedCount } = await admin.from("security_flags").select("id", { count: "exact", head: true })
        .eq("ip_address", ip);
      if ((flaggedCount ?? 0) > 0) flags.push("IP reputation: IP has prior security flags");
    }
    if (events_per_year === "10+") flags.push("High volume: plans to run 10+ events");
    if (!(await websiteReachable(organization_website))) flags.push("Organization website could not be verified");

    const flagged = flags.length > 0;
    const status = flagged ? "flagged" : "approved";

    // Create or reuse auth user
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password: crypto.randomUUID() + "Aa1!", email_confirm: true,
      user_metadata: { full_name: full_legal_name, phone: phone_number },
    });
    if (createErr) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
      if (!found) throw createErr;
      userId = found.id;
    } else {
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("Could not create account");

    // Hold flagged accounts until approved
    if (flagged) await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });

    const { data: row, error: insErr } = await admin.from("signup_vetting").insert({
      user_id: userId, email, full_name: full_legal_name, phone: phone_number,
      full_legal_name, phone_number, organization_name, organization_website, role,
      events_per_year, event_description, paid_registrations, referral_source,
      heard_from: referral_source, interest_area, vetting_status: status, flag_reasons: flags,
      ip_address: ip, email_verified: false,
    }).select("id, review_token").single();
    if (insErr) throw insErr;

    const siteOrigin = origin || req.headers.get("origin") || "https://www.teevents.golf";
    const name = firstName(full_legal_name);

    if (!flagged) {
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: "recovery", email,
        options: { redirectTo: `${siteOrigin}/reset-password?new=1&type=${interest_area}` },
      });
      if (linkErr) throw linkErr;
      const actionLink = link?.properties?.action_link!;
      await sendVettingEmail(admin, email, "Welcome to TeeVents — Verify Your Email",
        shell("Welcome to TeeVents", `<p style="font-size:16px;">Hi ${esc(name)},</p>
          <p style="font-size:16px;">Thanks for signing up. Please verify your email and set your password to access your dashboard:</p>
          ${button(actionLink, "Verify Email &amp; Set Password")}
          <p style="font-size:14px;color:#6b7280;">This link expires in 24 hours.</p>`),
        "vetting-welcome-verify", { vetting_id: row.id });
    } else {
      const docsLink = `${siteOrigin}/verify-account?token=${row.review_token}`;
      await sendVettingEmail(admin, email, "TeeVents — We need a little more information",
        shell("Help us verify your account", `<p style="font-size:16px;">Hi ${esc(name)},</p>
          <p style="font-size:16px;">Thanks for signing up for TeeVents. Before we activate your account, we need to confirm your organization. Please provide:</p>
          <ul style="font-size:15px;">
            <li>A link to a verifiable business social profile (e.g., LinkedIn company page)</li>
            <li>Your business registration number or tax ID</li>
            <li>A recent utility bill or bank statement in the organization's name</li>
          </ul>
          ${button(docsLink, "Submit Verification Details")}
          <p style="font-size:14px;color:#6b7280;">You'll receive an email as soon as your account is reviewed.</p>`),
        "vetting-manual-review-request", { vetting_id: row.id });

      await sendVettingEmail(admin, ADMIN_EMAIL, `🚩 Signup flagged for review – ${full_legal_name}`,
        shell("New account flagged for review", `
          <p><b>${esc(full_legal_name)}</b> · ${esc(email)} · ${esc(phone_number)}</p>
          <p>${esc(organization_name)} · <a href="${esc(organization_website)}">${esc(organization_website)}</a></p>
          <p>Role: ${esc(role)} · Events/yr: ${esc(events_per_year)} · Paid registrations: ${paid_registrations ? "Yes" : "No"}</p>
          <p><b>Reasons:</b></p><ul>${flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
          ${button("https://www.teevents.golf/admin?tab=vetting", "Open Vetting Panel")}`),
        "admin-vetting-flagged", { vetting_id: row.id });
    }

    return json({ ok: true, status });
  } catch (e: any) {
    console.error("[signup-with-vetting]", e?.message || e);
    return json({ error: e?.message || "Unknown error" }, 400);
  }
});
