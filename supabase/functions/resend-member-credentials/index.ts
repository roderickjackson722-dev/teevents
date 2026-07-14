import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmailSend } from "../_shared/emailLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%&*";
  const all = upper + lower + nums + syms;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pw = pick(upper) + pick(lower) + pick(nums) + pick(syms);
  for (let i = 0; i < 8; i++) pw += pick(all);
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

async function sendTempPasswordEmail(
  supabaseLog: any,
  recipientEmail: string,
  recipientName: string | null,
  orgName: string,
  tempPassword: string,
  role: string,
  baseUrl: string,
) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return;
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const signInUrl = `${baseUrl}/get-started`;
  const subject = `Your TeeVents login for ${orgName}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;padding:40px 20px;margin:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#1a5c38;padding:24px 32px;"><h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Your TeeVents Login</h1></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">${greeting}<br><br>
A new temporary password has been issued for your access to <strong>${orgName}</strong> on TeeVents as a <strong>${roleLabel}</strong>.
Use the credentials below to sign in. You'll be prompted to set your own password on your first login.</p>
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin:20px 0;">
<p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
<p style="margin:0 0 16px;color:#111827;font-size:15px;font-weight:600;">${recipientEmail}</p>
<p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Temporary Password</p>
<p style="margin:0;color:#111827;font-size:18px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:1px;">${tempPassword}</p>
</div>
<div style="text-align:center;margin:28px 0;">
<a href="${signInUrl}" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">Sign In Now</a>
</div>
<p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">For security, this temporary password should be changed on first login.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
<p style="margin:0;color:#9ca3af;font-size:12px;">Sent by <a href="https://www.teevents.golf" style="color:#1a5c38;text-decoration:none;font-weight:bold;">TeeVents</a></p>
</td></tr></table></td></tr></table></body></html>`;

  const messageId = crypto.randomUUID();
  await logEmailSend(supabaseLog, {
    messageId, templateName: "team-temp-password", recipientEmail, subject,
    status: "pending", source: "resend-member-credentials",
  });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "TeeVents Golf Management <info@notifications.teevents.golf>",
        to: [recipientEmail], subject, html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    await logEmailSend(supabaseLog, {
      messageId, templateName: "team-temp-password", recipientEmail, subject,
      status: res.ok ? "sent" : "failed", source: "resend-member-credentials",
      resendId: data?.id, errorMessage: res.ok ? undefined : (data?.message || `HTTP ${res.status}`),
    });
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  } catch (err: any) {
    console.error("Error sending temp password:", err);
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { organization_id, member_id } = await req.json();
    if (!organization_id || !member_id) throw new Error("organization_id and member_id are required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: membership } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: isPlatformAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id, _role: "admin",
    });

    const allowed = isPlatformAdmin === true || (membership && membership.role === "owner");
    if (!allowed) throw new Error("Only the organization owner or a platform admin can resend credentials");

    const { data: target, error: targetErr } = await supabaseAdmin
      .from("org_members")
      .select("id, user_id, role, name")
      .eq("id", member_id)
      .eq("organization_id", organization_id)
      .maybeSingle();
    if (targetErr || !target) throw new Error("Team member not found in this organization");

    const { data: userRes, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(target.user_id);
    if (getUserErr || !userRes?.user?.email) throw new Error("Could not load member's account");

    const recipientEmail = userRes.user.email;
    const memberName = target.name || userRes.user.user_metadata?.full_name || null;

    const { data: orgData } = await supabaseAdmin
      .from("organizations").select("name").eq("id", organization_id).single();
    const orgName = orgData?.name || "your organization";

    const tempPassword = generateTempPassword();
    await supabaseAdmin.auth.admin.updateUserById(target.user_id, {
      password: tempPassword,
      user_metadata: {
        ...(userRes.user.user_metadata || {}),
        full_name: memberName || userRes.user.user_metadata?.full_name,
        force_password_change: true,
        invited_org_id: organization_id,
      },
    });

    const supabaseLog = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const baseUrl = Deno.env.get("SITE_URL") || "https://www.teevents.golf";
    await sendTempPasswordEmail(supabaseLog, recipientEmail, memberName, orgName, tempPassword, target.role, baseUrl);

    return new Response(
      JSON.stringify({ success: true, email: recipientEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("resend-member-credentials error:", err);
    return new Response(JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
