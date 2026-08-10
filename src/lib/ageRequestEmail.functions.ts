import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AGE_REQUEST_DEFAULTS, buildAgeRequestHtml, replaceAgeVars } from "./ageRequestEmail.shared";

interface Input {
  tournamentId: string;
  registrationIds?: string[];
  testEmail?: string;
}

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";
const SITE = "https://www.teevents.golf";

const ageOf = (answers: unknown): string | null => {
  if (!Array.isArray(answers)) return null;
  const hit = answers.find((a: any) => String(a?.label || "").toLowerCase().includes("age"));
  const raw = (hit as any)?.answer;
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  return String(raw);
};

/** Sends the Age Verification Request email with a unique age-update link per player. */
export const sendAgeRequestEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => {
    if (!data?.tournamentId) throw new Error("tournamentId is required");
    return {
      tournamentId: data.tournamentId,
      registrationIds: Array.isArray(data.registrationIds) ? data.registrationIds.slice(0, 500) : [],
      testEmail: (data.testEmail || "").trim(),
    };
  })
  .handler(async ({ data, context }: any) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id, age_request_email_config, contact_name, contact_phone, contact_email")
      .eq("id", data.tournamentId)
      .maybeSingle();
    if (!t) throw new Error("Tournament not found");

    const { data: membership } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("organization_id", (t as any).organization_id)
      .eq("user_id", userId)
      .maybeSingle();
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!membership && !isAdmin) throw new Error("Not authorized for this tournament");

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", (t as any).organization_id)
      .maybeSingle();

    const resendKey = process.env["RESEND_API_KEY"];
    if (!resendKey) throw new Error("Email service is not configured");

    const config = { ...AGE_REQUEST_DEFAULTS, ...((t as any).age_request_email_config || {}) };
    const baseVars: Record<string, string> = {
      event_name: (t as any).title || "",
      tournament_name: (t as any).title || "",
      contact_name: (t as any).contact_name || "",
      tournament_organizer_name: (t as any).contact_name || "",
      organization_name: (org as any)?.name || "",
      contact_phone: (t as any).contact_phone || "",
      contact_email: (t as any).contact_email || "",
    };

    const organizerEmail = String((t as any).contact_email || "").trim();
    const replyTo = ["info@teevents.golf", ...(organizerEmail && organizerEmail.toLowerCase() !== "info@teevents.golf" ? [organizerEmail] : [])];

    const send = async (to: string, subject: string, html: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: SENDER, to, subject, html, reply_to: replyTo }),
      });

      const body = await res.json().catch(() => ({}));
      const ok = res.ok;
      await supabaseAdmin.from("email_send_log").insert({
        message_id: crypto.randomUUID(),
        template_name: "age_request",
        recipient_email: to,
        subject,
        status: ok ? "sent" : "failed",
        source: "sendAgeRequestEmails",
        resend_id: ok ? (body as any)?.id ?? null : null,
        error_message: ok ? null : (body as any)?.message || `Resend HTTP ${res.status}`,
        tournament_id: data.tournamentId,
        organization_id: (t as any).organization_id,
        triggered_by: userId,
        metadata: {},
      });
      return { ok, error: ok ? undefined : (body as any)?.message || `Resend HTTP ${res.status}` };
    };

    if (data.testEmail) {
      const link = `${SITE}/update-age/${(t as any).slug || data.tournamentId}/preview`;
      const vars = { ...baseVars, first_name: "Test", last_name: "Player", player_name: "Test Player", link_to_age_update_form: link };
      const res = await send(
        data.testEmail,
        `[TEST] ${replaceAgeVars(config.subject, vars)}`,
        buildAgeRequestHtml(config, vars, link),
      );
      return { sent: res.ok ? 1 : 0, failed: res.ok ? 0 : 1, results: [{ email: data.testEmail, status: res.ok ? "sent" : "failed", error: res.error }] };
    }

    let q = supabaseAdmin
      .from("tournament_registrations")
      .select("id, first_name, last_name, email, custom_answers, age_update_token")
      .eq("tournament_id", data.tournamentId);
    if (data.registrationIds.length) q = q.in("id", data.registrationIds);
    const { data: regs } = await q;

    let recipients = ((regs as any[]) || []).filter((r) => r.email);
    if (!data.registrationIds.length) recipients = recipients.filter((r) => ageOf(r.custom_answers) === null);
    if (!recipients.length) throw new Error("No recipients with an email address");

    const results: { registration_id: string; email: string; status: string; error?: string }[] = [];
    let sent = 0;
    let failed = 0;
    for (const r of recipients) {
      const link = `${SITE}/update-age/${(t as any).slug || data.tournamentId}/${r.age_update_token}`;
      const vars = {
        ...baseVars,
        first_name: r.first_name || "",
        last_name: r.last_name || "",
        player_name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
        link_to_age_update_form: link,
      };
      const res = await send(r.email, replaceAgeVars(config.subject, vars), buildAgeRequestHtml(config, vars, link));
      if (res.ok) sent++;
      else failed++;
      results.push({ registration_id: r.id, email: r.email, status: res.ok ? "sent" : "failed", error: res.error });
    }

    return { sent, failed, results };
  });
