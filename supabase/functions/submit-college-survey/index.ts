import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { slug, response_data } = body || {};
    if (!slug || !response_data || typeof response_data !== "object") {
      return new Response(JSON.stringify({ error: "Missing slug or response_data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: survey, error: sErr } = await admin
      .from("college_surveys")
      .select("id, title, is_active, notify_respondent")
      .eq("slug", slug)
      .maybeSingle();
    if (sErr || !survey || !survey.is_active) {
      return new Response(JSON.stringify({ error: "Survey not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rd = response_data as Record<string, string>;
    const pick = (keys: string[]) => {
      for (const k of Object.keys(rd)) {
        const lk = k.toLowerCase();
        if (keys.some((s) => lk.includes(s))) return String(rd[k] ?? "");
      }
      return null;
    };
    const respondent_name = pick(["name"]);
    const respondent_email = pick(["email"]);
    const respondent_school = pick(["school"]);
    const respondent_year = pick(["year"]);
    const respondent_major = pick(["major"]);
    const respondent_career_goals = pick(["career", "goal"]);

    const { data: inserted, error: iErr } = await admin
      .from("college_survey_responses")
      .insert({
        survey_id: survey.id,
        respondent_name,
        respondent_email,
        respondent_school,
        respondent_year,
        respondent_major,
        respondent_career_goals,
        response_data: rd,
      })
      .select("id, submitted_at")
      .single();
    if (iErr) throw iErr;

    // Send admin notification via Resend (best-effort)
    const RESEND = Deno.env.get("RESEND_API_KEY");
    if (RESEND) {
      const submittedAt = new Date(inserted.submitted_at).toLocaleString();
      const answersHtml = Object.entries(rd)
        .map(([k, v]) => `<tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>${k}</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${String(v ?? "")}</td></tr>`)
        .join("");
      const adminBody = {
        from: "TeeVents <notifications@teevents.golf>",
        to: ["info@teevents.golf"],
        subject: `New Survey Submission – ${survey.title}`,
        html: `<p>A new survey response has been submitted.</p>
          <p><strong>Survey:</strong> ${survey.title}<br/>
          <strong>Respondent:</strong> ${respondent_name || "—"}<br/>
          <strong>Email:</strong> ${respondent_email || "—"}<br/>
          <strong>School:</strong> ${respondent_school || "—"}<br/>
          <strong>Submitted:</strong> ${submittedAt}</p>
          <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">${answersHtml}</table>
          <p style="margin-top:16px;font-size:12px;color:#666;">Automated notification from TeeVents.</p>`,
      };
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND}` },
          body: JSON.stringify(adminBody),
        });
        if (survey.notify_respondent && respondent_email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND}` },
            body: JSON.stringify({
              from: "TeeVents <notifications@teevents.golf>",
              to: [respondent_email],
              subject: `Thank you for completing the ${survey.title} survey`,
              html: `<p>Thank you for completing the survey. Your responses have been recorded.</p>
                <p>If you have any questions, please contact us at info@teevents.golf.</p>
                <p style="margin-top:16px;font-size:12px;color:#666;">TeeVents Golf Management</p>`,
            }),
          });
        }
      } catch (e) {
        console.error("Email send failed", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
