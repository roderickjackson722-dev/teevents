// Sends due outreach emails (cron-invokable). Picks up rows from outreach_queue
// where scheduled_for <= now() and sent_at is null. Personalises and sends via
// Resend, logs to email_send_log, then schedules the next email in the sequence.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAndLog } from "../_shared/emailLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "TeeVents <hello@notifications.teevents.golf>";
const APP_URL = "https://teevents.golf";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function personalize(body: string, lead: any) {
  return body
    .replace(/\{\{first_name\}\}/g, lead.first_name || "there")
    .replace(/\[First Name\]/g, lead.first_name || "there")
    .replace(/\{\{tournament_name\}\}/g, lead.tournament_name || "your tournament")
    .replace(/\{\{source\}\}/g, lead.source || "your current tool");
}

function wrapLinksForTracking(html: string, queueId: string, supabaseUrl: string) {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_m, url) => `href="${supabaseUrl}/functions/v1/track-outreach-click?q=${queueId}&u=${encodeURIComponent(url)}"`
  );
}

function buildHtml(bodyText: string, queueId: string, leadEmail: string, supabaseUrl: string) {
  const paragraphs = escapeHtml(bodyText)
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 14px 0;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const pixel = `<img src="${supabaseUrl}/functions/v1/track-outreach-open?q=${queueId}" width="1" height="1" alt="" style="display:none" />`;
  const unsub = `${APP_URL}/unsubscribe?e=${encodeURIComponent(leadEmail)}`;
  const footer = `
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px;" />
    <p style="font-size:11px;color:#888;line-height:1.5;margin:0;">
      Built by golf tournament managers, for golf tournament managers.<br/>
      TeeVents Golf · <a href="${APP_URL}" style="color:#888;">teevents.golf</a> ·
      <a href="${unsub}" style="color:#888;">Unsubscribe</a>
    </p>`;
  let html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#1a1a1a;max-width:600px;">${paragraphs}${footer}${pixel}</div>`;
  html = wrapLinksForTracking(html, queueId, supabaseUrl);
  return html;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500, headers: corsHeaders });
    }
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: pending, error } = await sb
      .from("outreach_queue")
      .select("*, lead:outreach_leads(*), campaign:outreach_campaigns(*)")
      .lte("scheduled_for", new Date().toISOString())
      .is("sent_at", null)
      .limit(50);
    if (error) throw error;

    const results: any[] = [];
    for (const item of pending || []) {
      const lead = (item as any).lead;
      const campaign = (item as any).campaign;
      if (!lead || !campaign) continue;
      if (lead.status === "unsubscribed") {
        await sb.from("outreach_queue").update({ sent_at: new Date().toISOString(), error: "unsubscribed" }).eq("id", item.id);
        continue;
      }
      const n = item.email_number;
      const subject = personalize(campaign[`email${n}_subject`] || "", lead);
      const bodyText = personalize(campaign[`email${n}_body`] || "", lead);
      if (!subject || !bodyText) continue;

      const html = buildHtml(bodyText, item.id, lead.email, SUPABASE_URL);
      const unsubUrl = `${SUPABASE_URL}/functions/v1/outreach-unsubscribe?e=${encodeURIComponent(lead.email)}`;
      const result = await sendAndLog(
        sb,
        RESEND_API_KEY,
        {
          from: FROM,
          to: [lead.email],
          subject,
          html,
          text: bodyText,
          reply_to: "hello@teevents.golf",
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>, <mailto:unsubscribe@teevents.golf?subject=unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        },
        { templateName: `outreach-email-${n}`, source: "send-outreach-emails", metadata: { queue_id: item.id, lead_id: lead.id, campaign_id: campaign.id } },
      );

      if (result.ok) {
        await sb.from("outreach_queue").update({ sent_at: new Date().toISOString() }).eq("id", item.id);
        // Schedule next email
        if (n < 3) {
          const next = new Date();
          next.setDate(next.getDate() + (campaign.delay_days || 2));
          // Check if next already exists
          const { data: existing } = await sb
            .from("outreach_queue")
            .select("id")
            .eq("lead_id", lead.id)
            .eq("campaign_id", campaign.id)
            .eq("email_number", n + 1)
            .maybeSingle();
          if (!existing) {
            await sb.from("outreach_queue").insert({
              lead_id: lead.id,
              campaign_id: campaign.id,
              email_number: n + 1,
              scheduled_for: next.toISOString(),
            });
          }
        }
        results.push({ id: item.id, status: "sent" });
      } else {
        await sb.from("outreach_queue").update({ error: result.error || "send failed" }).eq("id", item.id);
        results.push({ id: item.id, status: "failed", error: result.error });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
