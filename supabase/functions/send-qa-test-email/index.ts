// Admin/organizer tool: renders a TEST confirmation email using the exact same
// Q&A builders used by the live tournament + league confirmation emails, so the
// full question/answer block can be verified before going live.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildNotificationHtml,
  buildRegistrationAnswersHtml,
  buildLeagueRegistrationAnswersHtml,
} from "../_shared/notify.ts";
import { sendAndLog } from "../_shared/emailLogger.ts";

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

    const body = await req.json().catch(() => ({}));
    const mode: string = body.mode === "league" ? "league" : "tournament";
    const recipientEmail: string = String(body.recipient_email || "").trim();
    const sendEmail: boolean = body.send !== false;
    if (sendEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipientEmail)) {
      return new Response(JSON.stringify({ error: "Valid recipient_email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });

    let html = "";
    let subject = "";
    let sampleId: string | null = null;
    let organizationId: string | null = null;
    let tournamentId: string | null = null;

    if (mode === "tournament") {
      let regIds: string[] = [];
      if (body.registration_id) {
        regIds = [String(body.registration_id)];
      } else {
        let q = supabaseAdmin
          .from("tournament_registrations")
          .select("id, tournament_id, group_id, created_at")
          .order("created_at", { ascending: false })
          .limit(1);
        if (body.tournament_id) q = q.eq("tournament_id", String(body.tournament_id));
        const { data: latest } = await q;
        const first: any = (latest || [])[0];
        if (!first) throw new Error("No registrations found to build a sample from");
        regIds = [first.id];
        // Include every teammate in the same registration group so multi-player
        // submissions render exactly as they do in the real email.
        if (first.group_id) {
          const { data: mates } = await supabaseAdmin
            .from("tournament_registrations")
            .select("id")
            .eq("group_id", first.group_id);
          regIds = (mates || []).map((m: any) => m.id);
        }
      }

      const { data: reg } = await supabaseAdmin
        .from("tournament_registrations")
        .select("id, tournament_id, first_name, last_name, email")
        .eq("id", regIds[0])
        .maybeSingle() as any;
      if (!reg) throw new Error("Registration not found");
      sampleId = reg.id;

      const { data: t } = await supabaseAdmin
        .from("tournaments")
        .select("id, title, organization_id")
        .eq("id", reg.tournament_id)
        .maybeSingle() as any;
      if (!t) throw new Error("Tournament not found");
      tournamentId = t.id;
      organizationId = t.organization_id;

      if (!isAdmin) {
        const { data: isMember } = await supabaseAdmin.rpc("is_org_member", { _user_id: user.id, _org_id: t.organization_id });
        if (!isMember) throw new Error("Not authorized");
      }

      const answersHtml = await buildRegistrationAnswersHtml(supabaseAdmin, regIds);
      if (!answersHtml) throw new Error("Q&A block came back empty — the registration has no retrievable answers");

      const names = `${reg.first_name || ""} ${reg.last_name || ""}`.trim();
      subject = `[TEST] ✅ New Registration Confirmed — ${t.title}`;
      html = buildNotificationHtml("[TEST] New Registration Confirmed 🎉", [
        `This is a <strong>test copy</strong> of the organizer confirmation email for <strong>${t.title}</strong>.`,
        `🏌️ <strong>Player${regIds.length > 1 ? "s" : ""}:</strong> ${names}${regIds.length > 1 ? ` (+${regIds.length - 1} more)` : ""}`,
        `📧 <strong>Contact:</strong> ${reg.email || "—"}`,
        `The block below renders with the exact same code used for live paid, free, and manual registrations.`,
      ], answersHtml);
    } else {
      let responseId: string | null = body.response_id ? String(body.response_id) : null;
      if (!responseId) {
        let q = supabaseAdmin
          .from("league_registration_responses")
          .select("id, league_id, created_at")
          .order("created_at", { ascending: false })
          .limit(1);
        if (body.league_id) q = q.eq("league_id", String(body.league_id));
        const { data: latest } = await q;
        responseId = (latest || [])[0]?.id || null;
      }
      if (!responseId) throw new Error("No league registrations found to build a sample from");
      sampleId = responseId;

      const { data: resp } = await supabaseAdmin
        .from("league_registration_responses")
        .select("id, league_id")
        .eq("id", responseId)
        .maybeSingle() as any;
      if (!resp) throw new Error("League registration not found");

      const { data: league } = await supabaseAdmin
        .from("golf_leagues")
        .select("id, name, organization_id")
        .eq("id", resp.league_id)
        .maybeSingle() as any;
      organizationId = league?.organization_id || null;

      if (!isAdmin) {
        if (!organizationId) throw new Error("Not authorized");
        const { data: isMember } = await supabaseAdmin.rpc("is_org_member", { _user_id: user.id, _org_id: organizationId });
        if (!isMember) throw new Error("Not authorized");
      }

      const answersHtml = await buildLeagueRegistrationAnswersHtml(supabaseAdmin, responseId);
      if (!answersHtml) throw new Error("Q&A block came back empty — the league registration has no retrievable answers");

      subject = `[TEST] 🎉 New League Registration — ${league?.name || "League"}`;
      html = buildNotificationHtml("[TEST] New League Registration 🎉", [
        `This is a <strong>test copy</strong> of the league manager confirmation email for <strong>${league?.name || "your league"}</strong>.`,
        `The block below renders with the exact same code used for live league membership and event registrations.`,
      ], answersHtml);
    }

    if (!sendEmail) {
      return new Response(JSON.stringify({ success: true, preview_html: html, sample_id: sampleId, subject }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Email service not configured");

    const result = await sendAndLog(
      supabaseAdmin,
      RESEND_API_KEY,
      {
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: [recipientEmail],
        subject,
        html,
      },
      {
        templateName: `qa-test-${mode}`,
        source: "send-qa-test-email",
        organizationId,
        tournamentId,
      },
    );
    if (!result.ok) throw new Error(String(result.error || "Send failed"));

    return new Response(JSON.stringify({ success: true, sent_to: recipientEmail, sample_id: sampleId, subject, preview_html: html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    console.error("[send-qa-test-email]", error);
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
