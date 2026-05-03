import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAndLog } from "../_shared/emailLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { email, full_name, phone } = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const subject = "🆕 New Free Platform Signup";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a5c38;">New Free Platform User</h2>
        <p>A new tournament organizer has signed up for the <strong>Free (Base) Platform</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Name</td><td style="padding:8px;border:1px solid #e5e7eb;">${full_name || "—"}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Email</td><td style="padding:8px;border:1px solid #e5e7eb;">${email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Phone</td><td style="padding:8px;border:1px solid #e5e7eb;">${phone || "—"}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Plan</td><td style="padding:8px;border:1px solid #e5e7eb;">Base (Free – 5% platform fee per transaction)</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Date</td><td style="padding:8px;border:1px solid #e5e7eb;">${new Date().toLocaleString("en-US")}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:14px;">View this user in Admin Dashboard → Platform Tournaments.</p>
      </div>`;

    const result = await sendAndLog(
      supabaseAdmin,
      RESEND_API_KEY,
      {
        from: "TeeVents Golf Management <notifications@notifications.teevents.golf>",
        to: ["info@teevents.golf"],
        subject,
        html,
      },
      {
        templateName: "admin-new-signup-notification",
        source: "notify-new-signup",
        metadata: { signup_email: email },
      },
    );

    return new Response(JSON.stringify({ success: result.ok, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.ok ? 200 : 500,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
