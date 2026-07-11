import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmailSend } from "../_shared/emailLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = Deno.env.get("SITE_URL") || "https://www.teevents.golf";

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

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: uerr } = await anon.auth.getUser(token);
    if (uerr || !userData.user) throw new Error("Not authenticated");
    const adminUser = userData.user;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isPlatformAdmin } = await admin.rpc("has_role", {
      _user_id: adminUser.id, _role: "admin",
    });
    if (!isPlatformAdmin) throw new Error("Platform admin access required");

    const body = await req.json();
    const {
      title, date, location, course_name, registration_fee_cents, scoring_format,
      admin_notes, mode, email, organization_name, send_invitation,
    } = body || {};
    const shouldSendInvitation = send_invitation !== false; // default true

    if (!title || typeof title !== "string") throw new Error("Title is required");
    const isDefer = mode === "defer";
    let emailLc = "";
    if (!isDefer) {
      if (!email || typeof email !== "string") throw new Error("Organizer email is required");
      emailLc = email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLc)) throw new Error("Invalid email address");
      if (mode !== "existing" && mode !== "invite") throw new Error("Invalid assignment mode");
    }

    // 1) Resolve/create the target user (skipped for defer)
    let clientUserId: string = adminUser.id; // fallback owner for defer mode
    let clientName: string | null = null;
    let didCreateUser = false;
    let tempPassword: string | null = null;

    if (!isDefer) {
      const { data: usersList } = await admin.auth.admin.listUsers();
      const existing = usersList?.users?.find((u: any) => u.email?.toLowerCase() === emailLc);
      if (existing) {
        clientUserId = existing.id;
        clientName = (existing.user_metadata?.full_name as string) || null;
      } else {
        if (mode === "existing") {
          throw new Error("No account found for that email. Switch to 'Invite new organizer'.");
        }
        tempPassword = generateTempPassword();
        const { data: created, error: cerr } = await admin.auth.admin.createUser({
          email: emailLc,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { force_password_change: true },
        });
        if (cerr || !created?.user) throw new Error(cerr?.message || "Failed to create user");
        clientUserId = created.user.id;
        didCreateUser = true;
      }
    }

    // 2) Resolve/create organization for the client (or a placeholder for defer)
    let orgId: string | null = null;
    let orgName: string;

    if (!isDefer) {
      const { data: ownedOrgs } = await admin
        .from("org_members")
        .select("organization_id, role, organizations(id,name)")
        .eq("user_id", clientUserId)
        .eq("role", "owner")
        .limit(1);

      if (ownedOrgs && ownedOrgs.length > 0) {
        orgId = (ownedOrgs[0] as any).organization_id;
        orgName = ((ownedOrgs[0] as any).organizations?.name) || "Organization";
      } else {
        orgName = (organization_name && String(organization_name).trim())
          || `${emailLc.split("@")[0]}'s Tournaments`;
        const subdomain = slugify(orgName) + "-" + Math.random().toString(36).slice(2, 6);
        orgId = crypto.randomUUID();
        const { error: oerr } = await admin.from("organizations").insert({
          id: orgId, name: orgName, subdomain, plan: "free",
        });
        if (oerr) throw new Error("Failed to create organization: " + oerr.message);
        const { error: merr } = await admin.from("org_members").insert({
          organization_id: orgId, user_id: clientUserId, role: "owner",
        });
        if (merr) throw new Error("Failed to add owner: " + merr.message);
      }
    } else {
      // Defer: create a placeholder org owned by the admin. When an organizer
      // is later assigned via admin-send-tournament-invitation, they become
      // the owner and the org may be renamed.
      orgName = (organization_name && String(organization_name).trim())
        || `${String(title).trim()} (unassigned)`;
      const subdomain = slugify(orgName) + "-" + Math.random().toString(36).slice(2, 6);
      orgId = crypto.randomUUID();
      const { error: oerr } = await admin.from("organizations").insert({
        id: orgId, name: orgName, subdomain, plan: "free",
      });
      if (oerr) throw new Error("Failed to create organization: " + oerr.message);
      const { error: merr } = await admin.from("org_members").insert({
        organization_id: orgId, user_id: adminUser.id, role: "owner",
      });
      if (merr) throw new Error("Failed to add admin as temporary owner: " + merr.message);
    }

    // 3) Create the tournament
    const tPayload: Record<string, unknown> = {
      title: String(title).trim(),
      organization_id: orgId,
      managed_by_teevents: true,
      created_by_admin_id: adminUser.id,
    };
    if (date) tPayload.date = date;
    if (location) tPayload.location = String(location).trim();
    if (course_name) tPayload.course_name = String(course_name).trim();
    if (Number.isFinite(registration_fee_cents)) tPayload.registration_fee_cents = registration_fee_cents;
    if (scoring_format) tPayload.scoring_format = scoring_format;
    if (admin_notes) tPayload.admin_notes = String(admin_notes).slice(0, 4000);

    const { data: newT, error: terr } = await admin
      .from("tournaments").insert(tPayload).select("id,slug,title").single();
    if (terr) throw new Error("Failed to create tournament: " + terr.message);

    // 4) Send an email — either welcome (existing user) or temp-password (new user)
    const dashboardUrl = `${BASE_URL}/dashboard`;
    const subjectExisting = `A new tournament has been assigned to you: ${newT.title}`;
    const subjectNew = `You've been invited to manage ${newT.title} on TeeVents`;
    const greeting = clientName ? `Hi ${clientName},` : "Hi,";

    let html = "";
    let subject = "";
    if (didCreateUser && tempPassword) {
      subject = subjectNew;
      html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:40px 20px;margin:0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#1a5c38;padding:24px 32px;"><h1 style="margin:0;color:#fff;font-size:20px;">You're invited to manage ${newT.title}</h1></td></tr>
<tr><td style="padding:32px;color:#374151;font-size:15px;line-height:1.6;">
<p>${greeting}</p>
<p>An admin at TeeVents has created the tournament <strong>${newT.title}</strong> for you and given you full organizer access.</p>
<p>Use the credentials below to sign in. You'll be prompted to change your password on first login.</p>
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin:20px 0;">
  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;">Email</p>
  <p style="margin:0 0 12px;font-weight:600;">${emailLc}</p>
  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;">Temporary Password</p>
  <p style="margin:0;font-family:monospace;font-size:18px;font-weight:700;letter-spacing:1px;">${tempPassword}</p>
</div>
<div style="text-align:center;margin:28px 0;">
  <a href="${BASE_URL}/get-started" style="background:#F5A623;color:#1a5c38;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;">Sign In</a>
</div>
<p style="color:#6b7280;font-size:13px;">You have full admin rights to manage this tournament — as if you had created it yourself.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">Sent by TeeVents Golf Management</td></tr>
</table></td></tr></table></body></html>`;
    } else {
      subject = subjectExisting;
      html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:40px 20px;margin:0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#1a5c38;padding:24px 32px;"><h1 style="margin:0;color:#fff;font-size:20px;">New tournament assigned to you</h1></td></tr>
<tr><td style="padding:32px;color:#374151;font-size:15px;line-height:1.6;">
<p>${greeting}</p>
<p>You have been assigned as the tournament organizer for <strong>${newT.title}</strong>.</p>
<p>You have full admin rights to manage this tournament — as if you had created it yourself.</p>
<div style="text-align:center;margin:28px 0;">
  <a href="${dashboardUrl}" style="background:#F5A623;color:#1a5c38;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;">Open Dashboard</a>
</div>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">Sent by TeeVents Golf Management</td></tr>
</table></td></tr></table></body></html>`;
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let invitationSent = false;
    if (shouldSendInvitation && RESEND_API_KEY) {
      const messageId = crypto.randomUUID();
      await logEmailSend(admin, {
        messageId, templateName: didCreateUser ? "admin-created-tournament-invite" : "admin-created-tournament-assign",
        recipientEmail: emailLc, subject, status: "pending", source: "admin-create-tournament-for-client",
      });
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "TeeVents Golf Management <info@notifications.teevents.golf>",
            to: [emailLc], subject, html,
          }),
        });
        const data = await res.json().catch(() => ({}));
        invitationSent = res.ok;
        await logEmailSend(admin, {
          messageId, templateName: didCreateUser ? "admin-created-tournament-invite" : "admin-created-tournament-assign",
          recipientEmail: emailLc, subject,
          status: res.ok ? "sent" : "failed", source: "admin-create-tournament-for-client",
          resendId: data?.id, errorMessage: res.ok ? undefined : (data?.message || `HTTP ${res.status}`),
        });
      } catch (err: any) {
        await logEmailSend(admin, {
          messageId, templateName: "admin-created-tournament", recipientEmail: emailLc, subject,
          status: "failed", source: "admin-create-tournament-for-client", errorMessage: err.message,
        });
      }
    }

    if (invitationSent) {
      await admin.from("tournaments").update({ admin_invitation_sent_at: new Date().toISOString() }).eq("id", newT.id);
    }

    return new Response(JSON.stringify({
      success: true,
      tournament_id: newT.id,
      tournament_slug: newT.slug,
      organization_id: orgId,
      organization_name: orgName,
      user_id: clientUserId,
      created_user: didCreateUser,
      invitation_sent: invitationSent,
      invitation_deferred: !shouldSendInvitation,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("admin-create-tournament-for-client error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
