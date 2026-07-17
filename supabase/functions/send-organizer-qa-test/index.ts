import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildNotificationHtml, buildRegistrationAnswersHtml } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    ).auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { tournament_id, recipients } = await req.json();
    if (!tournament_id) throw new Error("tournament_id required");

    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, contact_email, organization_id")
      .eq("id", tournament_id)
      .maybeSingle() as any;
    if (!t) throw new Error("Tournament not found");

    // Auth: admin or org member
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isMember } = await supabaseAdmin.rpc("is_org_member", { _user_id: user.id, _org_id: t.organization_id });
    if (!isAdmin && !isMember) throw new Error("Not authorized");

    // Pick most recent registration for the tournament for a real Q&A sample.
    const { data: latestRegs } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournament_id)
      .order("created_at", { ascending: false })
      .limit(1);
    const regIds = (latestRegs || []).map((r: any) => r.id);

    const answersHtml = regIds.length
      ? await buildRegistrationAnswersHtml(supabaseAdmin, regIds)
      : `<p style="color:#6b7280;font-size:14px;"><em>No registrations found yet — the Q&amp;A block will render one section per player when a real submission comes in.</em></p>`;

    const html = buildNotificationHtml("[TEST] Registration Confirmation Preview 🎉", [
      `This is a <strong>test email</strong> confirming that going forward, every registration confirmation for <strong>${t.title}</strong> will include the full list of questions and answers submitted by the registrant.`,
      `The section below is rendered exactly as it will appear in the real organizer + platform-admin confirmation emails for future paid and manual registrations.`,
      regIds.length
        ? `Sample built from the most recent registration on file.`
        : `No registrations exist yet — this preview shows the placeholder message that would be replaced with the player's real Q&amp;A.`,
    ], answersHtml);

    const to: string[] = Array.isArray(recipients) && recipients.length
      ? recipients
      : [t.contact_email, "info@teevents.golf"].filter(Boolean);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Email service not configured");

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

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(JSON.stringify({ success: true, sent_to: to, sample_registration_id: regIds[0] || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    console.error("[send-organizer-qa-test]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
