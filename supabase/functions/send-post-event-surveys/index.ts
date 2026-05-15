import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Find tournaments where: enabled, not yet sent, and end_date + delay_days <= now
    const { data: candidates, error } = await supabase
      .from("tournaments")
      .select("id, title, slug, date, end_date, post_event_survey_delay_days, post_event_survey_message, organization_id")
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
      const endMs = new Date(endRaw).getTime();
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

      // Get all registrations
      const { data: regs } = await supabase
        .from("tournament_registrations")
        .select("id, email, first_name, survey_response_token")
        .eq("tournament_id", t.id);

      let sent = 0;
      for (const r of (regs || [])) {
        if (!r.email || !r.survey_response_token) continue;
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "post-event-survey",
              recipientEmail: r.email,
              idempotencyKey: `survey-${r.id}`,
              templateData: {
                playerName: r.first_name || "",
                tournamentTitle: t.title,
                message: t.post_event_survey_message || "",
                surveyUrl: `${Deno.env.get("PUBLIC_SITE_URL") || "https://teevents.golf"}/survey/${r.survey_response_token}`,
              },
            },
          });
          sent++;
        } catch (_e) { /* per-recipient failure is non-fatal */ }
      }

      await supabase.from("tournaments").update({ post_event_survey_sent_at: new Date().toISOString() }).eq("id", t.id);
      results.push({ tournament_id: t.id, sent });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
