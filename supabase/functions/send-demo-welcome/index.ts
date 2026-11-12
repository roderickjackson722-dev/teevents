import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAndLog } from "../_shared/emailLogger.ts";
import { demoEmailFrom, welcomeEmail } from "../_shared/demoEmails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Email not configured");

    const { lead_id } = await req.json();
    if (!lead_id || typeof lead_id !== "string") throw new Error("lead_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Idempotent: skip if already sent
    const { data: lead } = await admin
      .from("demo_leads")
      .select("email, created_at, welcome_email_sent_at")
      .eq("id", lead_id)
      .maybeSingle();
    // Only send to the address stored on a lead captured in the last 30 minutes;
    // the caller can never choose the recipient.
    const email = String(lead?.email || "").trim();
    const fresh = lead?.created_at && Date.now() - new Date(lead.created_at).getTime() < 30 * 60 * 1000;
    if (!lead || !email || !fresh) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (lead?.welcome_email_sent_at) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = welcomeEmail();
    const result = await sendAndLog(admin, RESEND_API_KEY, {
      from: demoEmailFrom(),
      to: [email],
      subject,
      html,
    }, {
      templateName: "demo-welcome",
      source: "send-demo-welcome",
      metadata: { lead_id },
    });

    if (result.ok) {
      await admin.from("demo_leads").update({ welcome_email_sent_at: new Date().toISOString() }).eq("id", lead_id);
    }

    return new Response(JSON.stringify(result), {
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
