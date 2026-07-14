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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: uerr } = await anon.auth.getUser(token);
    if (uerr || !userData.user) throw new Error("Not authenticated");
    const adminUser = userData.user;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: isPlatformAdmin } = await admin.rpc("has_role", {
      _user_id: adminUser.id, _role: "admin",
    });
    if (!isPlatformAdmin) throw new Error("Platform admin access required");

    const { tournament_id, reset_password, email: emailInput, organization_name } = await req.json();
    if (!tournament_id) throw new Error("tournament_id is required");

    // Load tournament
    const { data: t, error: terr } = await admin
      .from("tournaments")
      .select("id, title, organization_id, admin_invitation_sent_at")
      .eq("id", tournament_id).single();
    if (terr || !t) throw new Error("Tournament not found");

    // Find current org owner
    const { data: owners, error: oerr } = await admin
      .from("org_members")
      .select("user_id")
      .eq("organization_id", t.organization_id)
      .eq("role", "owner")
      .limit(1);
    if (oerr) throw new Error(oerr.message);
    const currentOwnerId = owners && owners.length > 0 ? owners[0].user_id : null;

    // If the current owner is the admin themselves (defer flow), an email is required
    // to assign the real client. Otherwise, use the owner already on the org.
    const needsAssignment = !currentOwnerId || currentOwnerId === adminUser.id;
    if (needsAssignment && !emailInput) {
      throw new Error("This tournament has no organizer assigned yet. Provide an email to assign the organizer.");
    }

    let ownerUserId: string;
    let didCreateUser = false;
    let tempPassword: string | null = null;
    let emailLc: string;

    if (emailInput) {
      emailLc = String(emailInput).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLc)) throw new Error("Invalid email address");

      const { data: usersList } = await admin.auth.admin.listUsers();
      const existing = usersList?.users?.find((u: any) => u.email?.toLowerCase() === emailLc);

      if (existing) {
        ownerUserId = existing.id;
      } else {
        tempPassword = generateTempPassword();
        const { data: created, error: cerr } = await admin.auth.admin.createUser({
          email: emailLc,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { force_password_change: true },
        });
        if (cerr || !created?.user) throw new Error(cerr?.message || "Failed to create user");
        ownerUserId = created.user.id;
        didCreateUser = true;
      }

      if (needsAssignment) {
        // Make the client the owner of this org
        const { error: upErr } = await admin.from("org_members").upsert({
          organization_id: t.organization_id, user_id: ownerUserId, role: "owner",
        }, { onConflict: "organization_id,user_id" });
        if (upErr) throw new Error("Failed to assign organizer: " + upErr.message);

        // Remove the placeholder admin owner (keep admin access via platform admin role)
        if (currentOwnerId && currentOwnerId !== ownerUserId) {
          await admin.from("org_members")
            .delete()
            .eq("organization_id", t.organization_id)
            .eq("user_id", currentOwnerId);
        }

        // Optionally rename the placeholder org
        if (organization_name && String(organization_name).trim()) {
          await admin.from("organizations")
            .update({ name: String(organization_name).trim() })
            .eq("id", t.organization_id);
        } else {
          // Rename the "(unassigned)" placeholder to something meaningful
          const { data: orgRow } = await admin.from("organizations")
            .select("name").eq("id", t.organization_id).single();
          if (orgRow?.name?.includes("(unassigned)")) {
            await admin.from("organizations")
              .update({ name: `${emailLc.split("@")[0]}'s Tournaments` })
              .eq("id", t.organization_id);
          }
        }
      } else if (ownerUserId !== currentOwnerId) {
        throw new Error("An organizer is already assigned. Cannot change organizer here.");
      }
    } else {
      ownerUserId = currentOwnerId as string;
    }

    // Look up auth user
    const { data: usersList2 } = await admin.auth.admin.listUsers();
    const ownerAuth = usersList2?.users?.find((u: any) => u.id === ownerUserId);
    if (!ownerAuth?.email) throw new Error("Organizer email not found");
    emailLc = ownerAuth.email.toLowerCase();
    const clientName = (ownerAuth.user_metadata?.full_name as string) || null;
    const greeting = clientName ? `Hi ${clientName},` : "Hi,";

    // Decide if this is a "new user" invite (needs temp password) or existing user
    const neverSignedIn = !ownerAuth.last_sign_in_at;
    // SAFETY: never rotate the password of another platform admin — that
    // would lock a TeeVents team member out of their own account.
    const { data: ownerIsPlatformAdmin } = await admin.rpc("has_role", {
      _user_id: ownerUserId, _role: "admin",
    });
    if (!tempPassword && (neverSignedIn || reset_password) && ownerIsPlatformAdmin !== true) {
      tempPassword = generateTempPassword();
      const { error: perr } = await admin.auth.admin.updateUserById(ownerUserId, {
        password: tempPassword,
        user_metadata: { ...(ownerAuth.user_metadata || {}), force_password_change: true },
      });
      if (perr) throw new Error("Failed to reset password: " + perr.message);
    }


    const dashboardUrl = `${BASE_URL}/dashboard`;
    let subject: string;
    let html: string;
    if (tempPassword) {
      subject = `You've been invited to manage ${t.title} on TeeVents`;
      html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:40px 20px;margin:0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#1a5c38;padding:24px 32px;"><h1 style="margin:0;color:#fff;font-size:20px;">You're invited to manage ${t.title}</h1></td></tr>
<tr><td style="padding:32px;color:#374151;font-size:15px;line-height:1.6;">
<p>${greeting}</p>
<p>An admin at TeeVents has set up the tournament <strong>${t.title}</strong> for you and given you full organizer access.</p>
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
      subject = `A tournament has been assigned to you: ${t.title}`;
      html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:40px 20px;margin:0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#1a5c38;padding:24px 32px;"><h1 style="margin:0;color:#fff;font-size:20px;">New tournament assigned to you</h1></td></tr>
<tr><td style="padding:32px;color:#374151;font-size:15px;line-height:1.6;">
<p>${greeting}</p>
<p>You have been assigned as the tournament organizer for <strong>${t.title}</strong>.</p>
<p>You have full admin rights to manage this tournament — as if you had created it yourself.</p>
<div style="text-align:center;margin:28px 0;">
  <a href="${dashboardUrl}" style="background:#F5A623;color:#1a5c38;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;">Open Dashboard</a>
</div>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">Sent by TeeVents Golf Management</td></tr>
</table></td></tr></table></body></html>`;
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Email service not configured");

    const messageId = crypto.randomUUID();
    await logEmailSend(admin, {
      messageId, templateName: "admin-tournament-invite-send",
      recipientEmail: emailLc, subject, status: "pending", source: "admin-send-tournament-invitation",
    });
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "TeeVents Golf Management <info@notifications.teevents.golf>",
        to: [emailLc], subject, html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    await logEmailSend(admin, {
      messageId, templateName: "admin-tournament-invite-send",
      recipientEmail: emailLc, subject,
      status: res.ok ? "sent" : "failed", source: "admin-send-tournament-invitation",
      resendId: data?.id, errorMessage: res.ok ? undefined : (data?.message || `HTTP ${res.status}`),
    });
    if (!res.ok) throw new Error(data?.message || `Email failed: HTTP ${res.status}`);

    await admin.from("tournaments").update({
      admin_invitation_sent_at: new Date().toISOString(),
    }).eq("id", t.id);

    return new Response(JSON.stringify({
      success: true, email: emailLc, temp_password_reset: !!tempPassword,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("admin-send-tournament-invitation error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
