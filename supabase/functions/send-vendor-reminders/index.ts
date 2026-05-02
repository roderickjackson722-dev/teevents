// Cron-invoked: send reminder emails 7 days and 1 day before tournament date.
// Only sends to approved vendors (and those that paid if a booth fee exists).
// Idempotent: tracks reminder_week_sent_at / reminder_day_sent_at.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

const escape = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildEmail(opts: {
  contactName: string;
  vendorName: string;
  tournamentTitle: string;
  tournamentDate: string;
  boothLocation?: string | null;
  checkInCode: string;
  daysOut: 7 | 1;
}) {
  const dateLabel = new Date(opts.tournamentDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const subject =
    opts.daysOut === 7
      ? `Reminder: ${opts.tournamentTitle} is one week away`
      : `Tomorrow: ${opts.tournamentTitle} — your vendor check-in details`;
  const headline = opts.daysOut === 7 ? "One week to go" : "See you tomorrow";

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f4f4f5;padding:24px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;margin:auto;">
  <tr><td style="background:#1a5c38;padding:24px;text-align:center;color:#fff;">
    <h2 style="margin:0;">${headline}</h2>
  </td></tr>
  <tr><td style="padding:24px;color:#374151;line-height:1.6;">
    <p>Hi ${escape(opts.contactName)},</p>
    <p>This is a friendly reminder that <strong>${escape(opts.vendorName)}</strong> is scheduled to be a vendor at <strong>${escape(opts.tournamentTitle)}</strong> on <strong>${escape(dateLabel)}</strong>.</p>
    ${opts.boothLocation ? `<p><strong>Booth location:</strong> ${escape(opts.boothLocation)}</p>` : ""}
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Check-in code</div>
      <div style="font-size:28px;font-weight:700;color:#1a5c38;letter-spacing:4px;font-family:monospace;">${escape(opts.checkInCode)}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:6px;">Show this to staff at check-in</div>
    </div>
    <p>If you have any questions, reply to this email and the organizer will get back to you.</p>
    <p>Thanks,<br/>The TeeVents Team</p>
  </td></tr>
</table></body></html>`;
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find vendors whose tournament is 7 or 1 day away
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneDayOut = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const sevenDaysOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: tournaments } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, date")
      .in("date", [oneDayOut, sevenDaysOut]);

    const results: Array<{ id: string; sent: number; type: "week" | "day" }> = [];

    for (const t of (tournaments || []) as any[]) {
      const isDay = t.date === oneDayOut;
      const filterCol = isDay ? "reminder_day_sent_at" : "reminder_week_sent_at";

      const { data: vendors } = await supabaseAdmin
        .from("vendor_registrations")
        .select("id, vendor_name, contact_name, contact_email, booth_location, booth_fee_cents, payment_status, status, checked_in, check_in_code, reminder_day_sent_at, reminder_week_sent_at")
        .eq("tournament_id", t.id)
        .eq("status", "approved")
        .eq("checked_in", false)
        .is(filterCol, null);

      let sent = 0;
      for (const v of (vendors || []) as any[]) {
        // Skip if booth fee exists but not paid
        if (v.booth_fee_cents && v.booth_fee_cents > 0 && v.payment_status !== "paid" && v.payment_status !== "waived") continue;

        const { subject, html } = buildEmail({
          contactName: v.contact_name,
          vendorName: v.vendor_name,
          tournamentTitle: t.title,
          tournamentDate: t.date,
          boothLocation: v.booth_location,
          checkInCode: v.check_in_code || "—",
          daysOut: isDay ? 1 : 7,
        });

        try {
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
              to: [v.contact_email],
              subject,
              html,
            }),
          });
          if (resp.ok) {
            await supabaseAdmin
              .from("vendor_registrations")
              .update({ [filterCol]: new Date().toISOString() })
              .eq("id", v.id);
            sent++;
          } else {
            console.error("Resend error", await resp.text());
          }
        } catch (e) {
          console.error("Send failure for vendor", v.id, e);
        }
      }
      results.push({ id: t.id, sent, type: isDay ? "day" : "week" });
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
