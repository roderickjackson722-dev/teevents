import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Not authenticated");

    const { organization_id, email, name, role, permissions } = await req.json();

    if (!organization_id || !email) {
      throw new Error("organization_id and email are required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email address");

    const validRoles = ["admin", "editor", "viewer"];
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
      .single();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only organization owners can invite members");
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

    if (invitedUser) {
      // Existing user — check if already a member
      const { data: alreadyMember } = await supabaseAdmin
        .from("org_members")
        .select("id")
        .eq("organization_id", organization_id)
        .eq("user_id", invitedUser.id)
        .single();

      if (!alreadyMember) {
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

        await sendInvitationEmail(email.toLowerCase(), memberName, orgName, invite.token, true, memberRole, null);

        return new Response(
          JSON.stringify({ success: true, auto_accepted: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Already a member
      return new Response(
        JSON.stringify({ success: true, already_member: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // New user — generate a magic link so they can authenticate without a password
    const baseUrl = Deno.env.get("SITE_URL") || "https://www.teevents.golf";
    const redirectTo = `${baseUrl}/accept-invitation?token=${invite.token}`;

    let magicLinkUrl: string | null = null;
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: email.toLowerCase(),
        options: {
          redirectTo,
        },
      });

      if (!linkError && linkData?.properties?.action_link) {
        magicLinkUrl = linkData.properties.action_link;
      } else {
        console.warn("Could not generate magic link:", linkError?.message);
      }
    } catch (err) {
      console.warn("Magic link generation failed, falling back to standard invite:", err);
    }

    await sendInvitationEmail(email.toLowerCase(), memberName, orgName, invite.token, false, memberRole, magicLinkUrl);

    return new Response(
      JSON.stringify({ success: true, invitation_id: invite.id }),
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

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TeeVents Golf Management <notifications@notifications.teevents.golf>",
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Failed to send invitation email to ${recipientEmail}:`, err);
    } else {
      console.log(`Invitation email sent to ${recipientEmail}`);
    }
  } catch (err) {
    console.error(`Error sending invitation email to ${recipientEmail}:`, err);
  }
}
