// Server-side welcome email sender. Renders an outreach_templates row with
// {{contact_name}} / {{tournament_name}} / {{sender_name}} replacement and
// sends via Resend, logging to email_send_log. Admin-only.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAndLog } from "../_shared/emailLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_NAME = "Rod Jackson";
const FROM = "TeeVents <hello@notifications.teevents.golf>";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });
    }
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json();
    const {
      template_id,           // outreach_templates row to render
      recipient_email,
      contact_name = "",
      tournament_name = "",
      preview_only = false,  // if true, only return rendered subject/body
      override_subject,      // optional ad-hoc edits
      override_body,
    } = body;

    if (!template_id && !override_subject) {
      return new Response(JSON.stringify({ error: "template_id or override required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = override_subject || "";
    let bodyText = override_body || "";

    if (template_id) {
      const { data: tmpl, error: tErr } = await supabaseAdmin
        .from("outreach_templates")
        .select("id, name, subject, body")
        .eq("id", template_id)
        .maybeSingle();
      if (tErr || !tmpl) {
        return new Response(JSON.stringify({ error: "Template not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      subject = override_subject || tmpl.subject;
      bodyText = override_body || tmpl.body;
    }

    const fill = (s: string) =>
      s.replace(/\{\{contact_name\}\}/g, contact_name)
       .replace(/\{\{tournament_name\}\}/g, tournament_name)
       .replace(/\{\{sender_name\}\}/g, SENDER_NAME);

    const renderedSubject = fill(subject);
    const renderedText = fill(bodyText);
    const renderedHtml = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#1a1a1a;white-space:pre-wrap;">${
      renderedText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    }</div>`;

    if (preview_only) {
      return new Response(JSON.stringify({
        subject: renderedSubject, text: renderedText, html: renderedHtml,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!recipient_email) {
      return new Response(JSON.stringify({ error: "recipient_email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await sendAndLog(
      supabaseAdmin,
      RESEND_API_KEY,
      { from: FROM, to: [recipient_email], subject: renderedSubject, html: renderedHtml, text: renderedText },
      {
        templateName: "admin-outreach",
        source: "send-welcome-email",
        triggeredBy: user.id,
        metadata: { template_id, contact_name, tournament_name },
      },
    );

    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
