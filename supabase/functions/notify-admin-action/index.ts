import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";
const ADMIN_EMAIL = "info@teevents.golf";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, organization_id, reason, subject, reply, details } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch org name
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();
    const orgName = org?.name || "Unknown Organization";

    // Fetch org owner email for organizer-facing notifications
    let organizerEmail: string | null = null;
    const { data: ownerMember } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("organization_id", organization_id)
      .eq("role", "owner")
      .limit(1)
      .single();
    if (ownerMember) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(ownerMember.user_id);
      organizerEmail = userData?.user?.email || null;
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set, skipping email");
      return new Response(JSON.stringify({ sent: false, reason: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendEmail = async (to: string[], emailSubject: string, html: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          to,
          subject: emailSubject,
          html,
        }),
      });
      if (!res.ok) {
        console.error("Resend error:", await res.text());
      }
      return res.ok;
    };

    const wrapHtml = (title: string, body: string) => `
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
        <tr><td style="padding:32px;">${body}</td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by TeeVents • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    let sent = false;

    switch (type) {
      case "bank_change_submitted": {
        // Notify admin about new bank change request
        const last4 = details?.new_account_last4 || "****";
        const holderName = details?.account_holder_name || "N/A";
        sent = await sendEmail(
          [ADMIN_EMAIL],
          `🏦 Bank Change Request — ${orgName}`,
          wrapHtml("New Bank Change Request", `
            <p style="margin:0 0 12px;color:#374151;font-size:15px;">A tournament organizer has requested a bank account change.</p>
            <p style="margin:0 0 8px;color:#374151;font-size:15px;"><strong>Organization:</strong> ${orgName}</p>
            <p style="margin:0 0 8px;color:#374151;font-size:15px;"><strong>Account Holder:</strong> ${holderName}</p>
            <p style="margin:0 0 8px;color:#374151;font-size:15px;"><strong>New Account (last 4):</strong> ···· ${last4}</p>
            <p style="margin:12px 0 0;color:#6b7280;font-size:13px;">Please verify this change via phone call before approving in the admin dashboard.</p>
          `),
        );
        break;
      }

      case "bank_change_approved": {
        if (organizerEmail) {
          sent = await sendEmail(
            [organizerEmail],
            "✅ Bank Account Change Approved — TeeVents",
            wrapHtml("Bank Account Change Approved", `
              <p style="margin:0 0 12px;color:#374151;font-size:15px;">Hi,</p>
              <p style="margin:0 0 12px;color:#374151;font-size:15px;">Your bank account change request for <strong>${orgName}</strong> has been <strong>approved</strong>.</p>
              <p style="margin:0 0 12px;color:#374151;font-size:15px;">You can now update your bank account via the Stripe Connect flow in your Payout Settings. Click "Update Account" in your dashboard to complete the change.</p>
              <p style="margin:0 0 0;color:#6b7280;font-size:13px;">If you did not request this change, please contact us immediately at info@teevents.golf.</p>
            `),
          );
        }
        break;
      }

      case "bank_change_denied": {
        if (organizerEmail) {
          sent = await sendEmail(
            [organizerEmail],
            "❌ Bank Account Change Request Denied — TeeVents",
            wrapHtml("Bank Account Change Denied", `
              <p style="margin:0 0 12px;color:#374151;font-size:15px;">Hi,</p>
              <p style="margin:0 0 12px;color:#374151;font-size:15px;">Your bank account change request for <strong>${orgName}</strong> has been <strong>denied</strong>.</p>
              ${reason ? `<p style="margin:0 0 12px;color:#374151;font-size:15px;"><strong>Reason:</strong> ${reason}</p>` : ""}
              <p style="margin:0 0 0;color:#6b7280;font-size:13px;">If you have questions, please contact us at info@teevents.golf.</p>
            `),
          );
        }
        break;
      }

      case "organizer_message": {
        // Notify admin about new organizer message
        sent = await sendEmail(
          [ADMIN_EMAIL],
          `📩 New Message from ${orgName}`,
          wrapHtml("New Organizer Message", `
            <p style="margin:0 0 12px;color:#374151;font-size:15px;"><strong>From:</strong> ${orgName}</p>
            <p style="margin:0 0 8px;color:#374151;font-size:15px;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin:0 0 12px;color:#374151;font-size:15px;">${details?.message || ""}</p>
            <p style="margin:12px 0 0;color:#6b7280;font-size:13px;">Reply from the admin dashboard → Notifications & Requests.</p>
          `),
        );
        break;
      }

      case "admin_reply": {
        if (organizerEmail) {
          sent = await sendEmail(
            [organizerEmail],
            `Re: ${subject || "Your Message"} — TeeVents Support`,
            wrapHtml("Reply from TeeVents", `
              <p style="margin:0 0 12px;color:#374151;font-size:15px;">Hi,</p>
              <p style="margin:0 0 12px;color:#374151;font-size:15px;">We've replied to your message:</p>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 12px;">
                <p style="margin:0;color:#374151;font-size:15px;">${reply}</p>
              </div>
              <p style="margin:0 0 0;color:#6b7280;font-size:13px;">You can view this in your dashboard or reply to this email.</p>
            `),
          );
        }
        break;
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-admin-action error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
