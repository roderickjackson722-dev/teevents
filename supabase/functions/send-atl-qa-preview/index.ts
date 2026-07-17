// One-shot: emails the ATL Championships organizer + platform admin a preview
// showing exactly what the "Full Registration Submission" block will look like
// on future confirmation emails. Uses a fully-populated SAMPLE payload so the
// demonstration is unmistakable — real registrations will show the actual
// answers each registrant submitted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildNotificationHtml } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";
const ATL_TOURNAMENT_ID = "8d241ebc-4fd3-4dcb-bfad-27f7e92e9c6a";
const PLATFORM_ADMIN = "info@teevents.golf";

function esc(s: any) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

function buildSampleAnswersHtml(fields: Array<{ label: string; sample: string }>, playerName: string): string {
  const rows = fields.map(f => `
    <tr>
      <td style="padding:8px 14px 8px 0;color:#6b7280;font-size:13px;font-weight:600;vertical-align:top;white-space:nowrap;">${esc(f.label)}</td>
      <td style="padding:8px 0;color:#111827;font-size:14px;vertical-align:top;">${esc(f.sample)}</td>
    </tr>`).join("");

  return `
  <div style="margin:20px 0 6px;padding:18px;background:#ecfdf5;border:2px solid #1a5c38;border-radius:10px;">
    <p style="margin:0 0 6px;color:#1a5c38;font-size:16px;font-weight:800;">📝 Full Registration Submission — SAMPLE PREVIEW</p>
    <p style="margin:0 0 14px;color:#374151;font-size:13px;line-height:1.5;">
      <strong>This is exactly the block that will appear at the bottom of every registration confirmation email going forward</strong> — for both organizers and the TeeVents platform admin. Every question you added to your registration form will render here with the registrant's actual answer.
    </p>
    <div style="margin:0;padding:14px 16px;background:#ffffff;border:1px solid #d1fae5;border-radius:8px;">
      <p style="margin:0 0 10px;color:#1a5c38;font-size:14px;font-weight:700;">🏌️ ${esc(playerName)}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>
    <p style="margin:12px 0 0;color:#065f46;font-size:12px;font-style:italic;">
      ↑ The sample answers above are illustrative. Real confirmations will contain each registrant's actual submitted answers.
    </p>
  </div>`;
}

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

    // Pull the tournament's configured registration fields so the sample block
    // reflects THIS organizer's actual questions.
    const { data: fieldRows } = await supabaseAdmin
      .from("tournament_registration_fields")
      .select("label, field_type, is_enabled, sort_order")
      .eq("tournament_id", ATL_TOURNAMENT_ID)
      .order("sort_order", { ascending: true });

    // Reasonable sample answers by common label keywords
    const sampleFor = (label: string): string => {
      const l = label.toLowerCase();
      if (l.includes("age")) return "42";
      if (l.includes("city") && l.includes("state")) return "Atlanta, GA";
      if (l.includes("city")) return "Atlanta";
      if (l.includes("state")) return "GA";
      if (l.includes("handicap")) return "12.4";
      if (l.includes("shirt")) return "Large";
      if (l.includes("dietary")) return "No restrictions";
      if (l.includes("company") || l.includes("organization")) return "Acme Golf Co.";
      if (l.includes("skill")) return "Intermediate";
      if (l.includes("phone")) return "(404) 555-0142";
      if (l.includes("email")) return "sample.player@example.com";
      if (l.includes("emergency")) return "Jane Doe — (404) 555-0199";
      return "Sample answer";
    };

    const baseRows: Array<{ label: string; sample: string }> = [
      { label: "Name", sample: "Sample Player" },
      { label: "Email", sample: "sample.player@example.com" },
      { label: "Phone", sample: "(404) 555-0142" },
    ];

    const configuredRows = ((fieldRows || []) as any[])
      .filter(f => f.is_enabled !== false)
      .map(f => ({ label: String(f.label || "").trim(), sample: sampleFor(String(f.label || "")) }))
      .filter(f => f.label && !baseRows.some(b => b.label.toLowerCase() === f.label.toLowerCase()));

    // Guarantee the two the organizer specifically flagged as missing on old data
    for (const req of ["Age", "City & State Traveling From"]) {
      if (!configuredRows.some(r => r.label.toLowerCase() === req.toLowerCase()) &&
          !baseRows.some(r => r.label.toLowerCase() === req.toLowerCase())) {
        configuredRows.push({ label: req, sample: sampleFor(req) });
      }
    }

    const sampleBlock = buildSampleAnswersHtml([...baseRows, ...configuredRows], "Sample Player");

    const html = buildNotificationHtml("[TEST] Registration Confirmation Preview 🎉", [
      `This is a <strong>test email</strong> showing exactly what the bottom of every future registration confirmation email will look like for <strong>${t.title}</strong>.`,
      `Scroll down — you should see a green-bordered box titled <strong>"Full Registration Submission — SAMPLE PREVIEW"</strong> containing every question on your registration form along with a sample answer.`,
      `Every real registration confirmation (organizer copy + TeeVents admin copy) from now on will include this same block, populated with the registrant's actual answers.`,
    ], sampleBlock);

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

    return new Response(JSON.stringify({
      success: true,
      sent_to: to,
      fields_included: [...baseRows, ...configuredRows].map(r => r.label),
      resend: body,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    console.error("[send-atl-qa-preview]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
