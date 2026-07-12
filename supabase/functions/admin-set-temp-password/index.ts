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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .limit(1);

    if (!isAdmin || isAdmin.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body.email?.toLowerCase().trim();
    const send_email: boolean = body.send_email !== false; // default true
    const custom_password: string | undefined = body.password;

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find user
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = list?.users?.find(
      (u: any) => u.email?.toLowerCase() === email,
    );
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = custom_password && custom_password.length >= 8
      ? custom_password
      : generateTempPassword();

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      {
        password: tempPassword,
        user_metadata: {
          ...(targetUser.user_metadata || {}),
          force_password_change: true,
        },
      },
    );
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Audit
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: caller.id,
      action: "set_temp_password",
      target_type: "user",
      target_id: targetUser.id,
      details: { email, sent_email: send_email },
    }).select().maybeSingle().then(() => {}, () => {});

    // Optionally email the user
    if (send_email) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const baseUrl = Deno.env.get("SITE_URL") || "https://www.teevents.golf";
      const signInUrl = `${baseUrl}/get-started`;
      const subject = "Your TeeVents temporary password";
      const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;padding:40px 20px;margin:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#1a5c38;padding:24px 32px;"><h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Temporary Password Issued</h1></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">A TeeVents administrator has issued you a new temporary password. Use it to sign in — you'll be prompted to set your own password immediately after login.</p>
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin:20px 0;">
<p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
<p style="margin:0 0 16px;color:#111827;font-size:15px;font-weight:600;">${email}</p>
<p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Temporary Password</p>
<p style="margin:0;color:#111827;font-size:18px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:1px;">${tempPassword}</p>
</div>
<div style="text-align:center;margin:28px 0;">
<a href="${signInUrl}" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">Sign In Now</a>
</div>
<p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">If you didn't expect this, please contact TeeVents support immediately.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;"><p style="margin:0;color:#9ca3af;font-size:12px;">Sent by <a href="https://www.teevents.golf" style="color:#1a5c38;text-decoration:none;font-weight:bold;">TeeVents</a></p></td></tr>
</table></td></tr></table></body></html>`;

      if (RESEND_API_KEY) {
        const messageId = crypto.randomUUID();
        await logEmailSend(supabaseAdmin, {
          messageId, templateName: "admin-temp-password", recipientEmail: email, subject,
          status: "pending", source: "admin-set-temp-password",
        });
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: "TeeVents Golf Management <info@notifications.teevents.golf>",
              to: [email], subject, html,
            }),
          });
          const data = await res.json().catch(() => ({}));
          await logEmailSend(supabaseAdmin, {
            messageId, templateName: "admin-temp-password", recipientEmail: email, subject,
            status: res.ok ? "sent" : "failed", source: "admin-set-temp-password",
            resendId: data?.id, errorMessage: res.ok ? undefined : (data?.message || `HTTP ${res.status}`),
          });
        } catch (err: any) {
          await logEmailSend(supabaseAdmin, {
            messageId, templateName: "admin-temp-password", recipientEmail: email, subject,
            status: "failed", source: "admin-set-temp-password", errorMessage: err.message,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, temp_password: tempPassword, email_sent: send_email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("admin-set-temp-password error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
