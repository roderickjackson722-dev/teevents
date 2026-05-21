// Cron-invoked: send post-event survey emails to all registered players
// when (end_date or date) + post_event_survey_delay_days has passed.
// Idempotent: each tournament's post_event_survey_sent_at is set after a successful pass.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";
const PUBLIC_BASE = "https://teevents.golf";

const escape = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildEmail(opts: {
  playerName: string;
  tournamentTitle: string;
  message: string | null;
  surveyUrl: string;
}) {
  const subject = `Tell us about your day at ${opts.tournamentTitle}`;
  const message = (opts.message && opts.message.trim()) ||
    `Thank you for playing in ${opts.tournamentTitle}! We'd love your feedback to make next year even better.`;
  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f4f4f5;padding:24px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;margin:auto;">
  <tr><td style="background:#1a5c38;padding:24px;text-align:center;color:#fff;">
    <h2 style="margin:0;">We'd love your feedback</h2>
  </td></tr>
  <tr><td style="padding:24px;color:#374151;line-height:1.6;">
    <p>Hi ${escape(opts.playerName) || "there"},</p>
    <p style="white-space:pre-wrap;">${escape(message)}</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${escape(opts.surveyUrl)}" style="background:#F5A623;color:#1a5c38;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;display:inline-block;">Take the Survey</a>
    </div>
    <p style="font-size:12px;color:#6b7280;">This link is unique to you, so you only need to fill it out once.</p>
    <p>Thanks,<br/>The ${escape(opts.tournamentTitle)} team</p>
  </td></tr>
</table></body></html>`;
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: candidates, error } = await supabase
      .from("tournaments")
      .select("id, title, date, end_date, post_event_survey_delay_days, post_event_survey_message")
      .eq("post_event_survey_enabled", true)
      .is("post_event_survey_sent_at", null)
      .limit(50);
    if (error) throw error;

    const results: any[] = [];
    const nowMs = Date.now();
    const day = 86400000;

    for (const t of (candidates || [])) {
      const endRaw = t.end_date || t.date;
      if (!endRaw) continue;
      const endMs = new Date(endRaw + (String(endRaw).length === 10 ? "T23:59:59" : "")).getTime();
      const dueMs = endMs + (Number(t.post_event_survey_delay_days || 0) * day);
      if (dueMs > nowMs) continue;

      // Verify there's an active survey configured
      const { data: survey } = await supabase
        .from("tournament_surveys")
        .select("id")
        .eq("tournament_id", t.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!survey) {
        await supabase.from("tournaments").update({ post_event_survey_sent_at: new Date().toISOString() }).eq("id", t.id);
        results.push({ tournament_id: t.id, skipped: "no active survey" });
        continue;
      }

      const { data: regs } = await supabase
        .from("tournament_registrations")
        .select("id, email, first_name, survey_response_token")
        .eq("tournament_id", t.id);

      let sent = 0;
      const seen = new Set<string>();
      for (const r of (regs || [])) {
        if (!r.email || !r.survey_response_token) continue;
        const key = r.email.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const { subject, html } = buildEmail({
          playerName: r.first_name || "",
          tournamentTitle: t.title,
          message: t.post_event_survey_message,
          surveyUrl: `${PUBLIC_BASE}/survey/${r.survey_response_token}`,
        });

        try {
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
              to: [r.email],
              subject,
              html,
            }),
          });
          if (resp.ok) sent++;
          else console.error("Resend error", await resp.text());
        } catch (e) {
          console.error("Send failure for registration", r.id, e);
        }
      }

      await supabase.from("tournaments").update({ post_event_survey_sent_at: new Date().toISOString() }).eq("id", t.id);
      results.push({ tournament_id: t.id, sent });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
