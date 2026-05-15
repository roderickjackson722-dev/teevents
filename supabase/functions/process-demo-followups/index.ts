// Cron-triggered: scans demo_leads and sends 24h / 7d follow-ups.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAndLog } from "../_shared/emailLogger.ts";
import { demoEmailFrom, followup24hEmail, followup7dEmail } from "../_shared/demoEmails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Email not configured");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = Date.now();
    const cutoff24 = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const cutoff7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const cutoff14d = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

    // 24h follow-up: welcome sent ≥ 24h ago, 24h not sent yet, not signed up
    const { data: due24, error: e24 } = await admin
      .from("demo_leads")
      .select("id,email")
      .lt("welcome_email_sent_at", cutoff24)
      .is("followup_24h_sent_at", null)
      .is("signed_up_at", null)
      .limit(50);
    if (e24) throw e24;

    // 7d follow-up: between 7-14d after welcome, no 7d sent, not signed up
    const { data: due7d, error: e7 } = await admin
      .from("demo_leads")
      .select("id,email")
      .lt("welcome_email_sent_at", cutoff7d)
      .gt("welcome_email_sent_at", cutoff14d)
      .is("followup_7d_sent_at", null)
      .is("signed_up_at", null)
      .limit(50);
    if (e7) throw e7;

    let sent24 = 0;
    let sent7 = 0;

    for (const lead of due24 ?? []) {
      // Skip if user has since signed up (match auth.users by email)
      const signed = await checkSignedUp(admin, lead.email, lead.id);
      if (signed) continue;
      const { subject, html } = followup24hEmail();
      const r = await sendAndLog(admin, RESEND_API_KEY, {
        from: demoEmailFrom(),
        to: [lead.email],
        subject,
        html,
      }, { templateName: "demo-followup-24h", source: "process-demo-followups", metadata: { lead_id: lead.id } });
      if (r.ok) {
        sent24++;
        await admin.from("demo_leads").update({ followup_24h_sent_at: new Date().toISOString() }).eq("id", lead.id);
      }
    }

    for (const lead of due7d ?? []) {
      const signed = await checkSignedUp(admin, lead.email, lead.id);
      if (signed) continue;
      const { subject, html } = followup7dEmail(lead.id);
      const r = await sendAndLog(admin, RESEND_API_KEY, {
        from: demoEmailFrom(),
        to: [lead.email],
        subject,
        html,
      }, { templateName: "demo-followup-7d", source: "process-demo-followups", metadata: { lead_id: lead.id } });
      if (r.ok) {
        sent7++;
        await admin.from("demo_leads").update({ followup_7d_sent_at: new Date().toISOString() }).eq("id", lead.id);
      }
    }

    return new Response(JSON.stringify({ sent24, sent7 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[process-demo-followups]", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function checkSignedUp(admin: any, email: string, leadId: string): Promise<boolean> {
  try {
    const { data } = await admin.auth.admin.listUsers();
    const match = data?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      await admin.from("demo_leads").update({ signed_up_at: new Date().toISOString() }).eq("id", leadId);
      return true;
    }
  } catch (_) { /* ignore */ }
  return false;
}
