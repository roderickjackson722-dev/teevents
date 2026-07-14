import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmailSend } from "../_shared/emailLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      return new Response(
        JSON.stringify({ error: "Your login session has expired. Please sign in again and retry the invitation." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { organization_id, email, name, role, permissions } = await req.json();

    if (!organization_id || !email) {
      throw new Error("organization_id and email are required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email address");

    const validRoles = ["admin", "editor", "viewer", "scoring_only"];
    const memberRole = validRoles.includes(role) ? role : "editor";

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

    // Platform admins can always invite (impersonation/support)
    const { data: isPlatformAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    const allowed =
      isPlatformAdmin === true ||
      (membership && membership.role === "owner");

    if (!allowed) {
      throw new Error("Only the organization owner can manage team members");
    }

    const { data: orgData } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    const orgName = orgData?.name || "your organization";
    const memberName = typeof name === "string" ? name.trim().slice(0, 255) : null;

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("org_invitations")
      .upsert(
        {
          organization_id,
          email: email.toLowerCase(),
          name: memberName,
          role: memberRole,
          permissions: permissions || [],
          invited_by: user.id,
          status: "pending",
        },
        { onConflict: "organization_id,email" }
      )
      .select()
      .single();

    if (inviteError) throw inviteError;

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const invitedUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    const baseUrl = Deno.env.get("SITE_URL") || "https://www.teevents.golf";

    if (invitedUser) {
      // SAFETY: never rotate the password of a platform admin — that would
      // lock the TeeVents team out of their own account.
      const { data: inviteeIsPlatformAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: invitedUser.id,
        _role: "admin",
      });
      const canRotatePassword = inviteeIsPlatformAdmin !== true;

      // Existing user — check if already a member of THIS org
      const { data: alreadyMember } = await supabaseAdmin
        .from("org_members")
        .select("id, role")
        .eq("organization_id", organization_id)
        .eq("user_id", invitedUser.id)
        .maybeSingle();

      if (alreadyMember) {
        // Already a member — treat this as a resend.
        if (canRotatePassword) {
          const tempPasswordResend = generateTempPassword();
          await supabaseAdmin.auth.admin.updateUserById(invitedUser.id, {
            password: tempPasswordResend,
            user_metadata: {
              ...(invitedUser.user_metadata || {}),
              full_name: memberName || invitedUser.user_metadata?.full_name,
              force_password_change: true,
              invited_org_id: organization_id,
            },
          });
          await sendTempPasswordEmail(
            email.toLowerCase(),
            memberName,
            orgName,
            tempPasswordResend,
            alreadyMember?.role || memberRole,
            baseUrl,
          );
        }
        return new Response(
          JSON.stringify({
            success: true,
            already_member: true,
            temp_password_sent: canRotatePassword,
            skipped_platform_admin: !canRotatePassword,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin.from("org_members").insert({
        organization_id,
        user_id: invitedUser.id,
        role: memberRole,
        permissions: permissions || [],
        name: memberName,
      });

      await supabaseAdmin
        .from("org_invitations")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      if (canRotatePassword) {
        const tempPasswordExisting = generateTempPassword();
        await supabaseAdmin.auth.admin.updateUserById(invitedUser.id, {
          password: tempPasswordExisting,
          user_metadata: {
            ...(invitedUser.user_metadata || {}),
            full_name: memberName || invitedUser.user_metadata?.full_name,

          force_password_change: true,
          invited_org_id: organization_id,
        },
      });
      await sendTempPasswordEmail(email.toLowerCase(), memberName, orgName, tempPasswordExisting, memberRole, baseUrl);

      return new Response(
        JSON.stringify({ success: true, auto_accepted: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // New user — create the auth account with a temporary password.
    const tempPassword = generateTempPassword();

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: memberName,
        force_password_change: true,
        invited_org_id: organization_id,
      },
    });

    if (createErr || !created?.user) {
      throw new Error(createErr?.message || "Failed to create user account");
    }

    // Add to org_members immediately so permissions take effect on first login
    await supabaseAdmin.from("org_members").insert({
      organization_id,
      user_id: created.user.id,
      role: memberRole,
      permissions: permissions || [],
      name: memberName,
    });

    await supabaseAdmin
      .from("org_invitations")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    await sendTempPasswordEmail(email.toLowerCase(), memberName, orgName, tempPassword, memberRole, baseUrl);

    return new Response(
      JSON.stringify({ success: true, temp_password_sent: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("invite-member error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendInvitationEmail(
  recipientEmail: string,
  recipientName: string | null,
  orgName: string,
  token: string,
  autoAccepted: boolean,
  role: string,
  magicLinkUrl: string | null
) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping invitation email to", recipientEmail);
    return;
  }

  const baseUrl = Deno.env.get("SITE_URL") || "https://www.teevents.golf";
  const acceptUrl = `${baseUrl}/accept-invitation?token=${token}`;
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  // For new users with a magic link, use the magic link as the CTA
  // For existing users, use the standard accept URL or dashboard link
  const buttonUrl = autoAccepted
    ? `${baseUrl}/dashboard`
    : (magicLinkUrl || acceptUrl);

  const subject = autoAccepted
    ? `You've been added to ${orgName} on TeeVents`
    : `You're invited to join ${orgName} on TeeVents`;

  const heading = autoAccepted
    ? `You've Been Added to ${orgName}`
    : `You're Invited!`;

  const bodyText = autoAccepted
    ? `${greeting}<br><br>You have been added as a <strong>${roleLabel}</strong> to <strong>${orgName}</strong> on TeeVents. You can now log in and start managing tournaments.`
    : magicLinkUrl
      ? `${greeting}<br><br>You've been invited to join <strong>${orgName}</strong> as a <strong>${roleLabel}</strong> on TeeVents.<br><br>Click the button below to accept the invitation — no password needed. You'll be signed in automatically.`
      : `${greeting}<br><br>You've been invited to join <strong>${orgName}</strong> as a <strong>${roleLabel}</strong> on TeeVents. Click the button below to accept the invitation and get started.`;

  const buttonText = autoAccepted
    ? "Go to Dashboard"
    : "Accept Invitation";

  const expiryNote = !autoAccepted && magicLinkUrl
    ? `<p style="margin: 16px 0 0; color: #6b7280; font-size: 13px; text-align: center;">This link expires in 24 hours. If it has expired, ask the tournament organizer to resend the invitation.</p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px; margin: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f4f5;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
        <tr><td style="background: #1a5c38; padding: 24px 32px;">
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">${heading}</h1>
        </td></tr>
        <tr><td style="padding: 32px;">
          <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">${bodyText}</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${buttonUrl}" style="display: inline-block; background: #1a5c38; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">${buttonText}</a>
          </div>
          ${expiryNote}
          <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">Sent by <a href="https://www.teevents.golf" style="color: #1a5c38; text-decoration: none; font-weight: bold;">TeeVents</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const supabaseLog = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const messageId = crypto.randomUUID();
  await logEmailSend(supabaseLog, {
    messageId, templateName: "team-invitation", recipientEmail, subject,
    status: "pending", source: "invite-member",
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
    if (!res.ok) {
      console.error(`Failed to send invitation email to ${recipientEmail}:`, data);
      await logEmailSend(supabaseLog, {
        messageId, templateName: "team-invitation", recipientEmail, subject,
        status: "failed", source: "invite-member",
        errorMessage: data?.message || `HTTP ${res.status}`,
      });
    } else {
      await logEmailSend(supabaseLog, {
        messageId, templateName: "team-invitation", recipientEmail, subject,
        status: "sent", source: "invite-member", resendId: data?.id,
      });
    }
  } catch (err: any) {
    await logEmailSend(supabaseLog, {
      messageId, templateName: "team-invitation", recipientEmail, subject,
      status: "failed", source: "invite-member", errorMessage: err.message,
    });
    console.error(`Error sending invitation email to ${recipientEmail}:`, err);
  }
}

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
  recipientEmail: string,
  recipientName: string | null,
  orgName: string,
  tempPassword: string,
  role: string,
  baseUrl: string,
) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping temp password email to", recipientEmail);
    return;
  }
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const signInUrl = `${baseUrl}/get-started`;
  const subject = `Your TeeVents login for ${orgName}`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px; margin: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">
      <tr><td style="background:#1a5c38; padding:24px 32px;">
        <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:600;">Welcome to ${orgName}</h1>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.6;">${greeting}<br><br>
          You've been added as a <strong>${roleLabel}</strong> to <strong>${orgName}</strong> on TeeVents.
          Use the credentials below to sign in. You'll be prompted to set your own password right after your first login.
        </p>
        <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:16px; margin:20px 0;">
          <p style="margin:0 0 8px; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Email</p>
          <p style="margin:0 0 16px; color:#111827; font-size:15px; font-weight:600;">${recipientEmail}</p>
          <p style="margin:0 0 8px; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Temporary Password</p>
          <p style="margin:0; color:#111827; font-size:18px; font-weight:700; font-family:'Courier New', monospace; letter-spacing:1px;">${tempPassword}</p>
        </div>
        <div style="text-align:center; margin:28px 0;">
          <a href="${signInUrl}" style="display:inline-block; background:#F5A623; color:#1a5c38; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:700; font-size:14px;">Sign In Now</a>
        </div>
        <p style="margin:16px 0 0; color:#9ca3af; font-size:12px; text-align:center;">For security, this temporary password should be changed on first login.</p>
      </td></tr>
      <tr><td style="padding:16px 32px; background:#f9fafb; border-top:1px solid #e5e7eb;">
        <p style="margin:0; color:#9ca3af; font-size:12px;">Sent by <a href="https://www.teevents.golf" style="color:#1a5c38; text-decoration:none; font-weight:bold;">TeeVents</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const supabaseLog = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const messageId = crypto.randomUUID();
  await logEmailSend(supabaseLog, {
    messageId, templateName: "team-temp-password", recipientEmail, subject,
    status: "pending", source: "invite-member",
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
    if (!res.ok) {
      await logEmailSend(supabaseLog, {
        messageId, templateName: "team-temp-password", recipientEmail, subject,
        status: "failed", source: "invite-member",
        errorMessage: data?.message || `HTTP ${res.status}`,
      });
    } else {
      await logEmailSend(supabaseLog, {
        messageId, templateName: "team-temp-password", recipientEmail, subject,
        status: "sent", source: "invite-member", resendId: data?.id,
      });
    }
  } catch (err: any) {
    await logEmailSend(supabaseLog, {
      messageId, templateName: "team-temp-password", recipientEmail, subject,
      status: "failed", source: "invite-member", errorMessage: err.message,
    });
  }
}
