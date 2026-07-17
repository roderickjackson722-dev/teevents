// One-shot: emails the ATL Championships organizer + platform admin a preview
// showing that future registration confirmations will include the full Q&A block.
// Safe to invoke unauthenticated because recipients are hardcoded to trusted
// addresses (the tournament's stored contact_email + info@teevents.golf).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildNotificationHtml, buildRegistrationAnswersHtml } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";
const ATL_TOURNAMENT_ID = "8d241ebc-4fd3-4dcb-bfad-27f7e92e9c6a";
const PLATFORM_ADMIN = "info@teevents.golf";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, contact_email")
      .eq("id", ATL_TOURNAMENT_ID)
      .maybeSingle() as any;
    if (!t) throw new Error("ATL tournament not found");

    const { data: latestRegs } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", ATL_TOURNAMENT_ID)
      .order("created_at", { ascending: false })
      .limit(1);
    const regIds = (latestRegs || []).map((r: any) => r.id);

    const answersHtml = regIds.length
      ? await buildRegistrationAnswersHtml(supabaseAdmin, regIds)
      : `<p style="color:#6b7280;font-size:14px;"><em>No registrations found — the Q&amp;A block will render one section per player when a real submission comes in.</em></p>`;

    const html = buildNotificationHtml("[TEST] Registration Confirmation Preview 🎉", [
      `This is a <strong>test email</strong> confirming that going forward, every registration confirmation email — for both organizers and the TeeVents platform admin — will include the full list of questions and answers submitted by the registrant for <strong>${t.title}</strong>.`,
      `The section below is rendered exactly as it will appear in real confirmation emails for future paid <em>and</em> manual registrations.`,
      regIds.length
        ? `Sample built from the most recent registration on file.`
        : `Placeholder shown because no registrations exist yet for this tournament.`,
    ], answersHtml);

    const to = Array.from(new Set([t.contact_email, PLATFORM_ADMIN].filter(Boolean)));

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to,
        subject: `[TEST] Q&A Confirmation Preview — ${t.title}`,
        html,
      }),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Resend ${res.status}: ${body}`);

    return new Response(JSON.stringify({ success: true, sent_to: to, sample_registration_id: regIds[0] || null, resend: body }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    console.error("[send-atl-qa-preview]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
