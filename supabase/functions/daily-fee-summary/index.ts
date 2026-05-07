import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECIPIENT = "info@teevents.golf";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Yesterday window in UTC
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = new Date(end.getTime() - 86400000);

    const { data: logs, error } = await supabase
      .from("payment_routing_logs")
      .select("context, routing_decision, gross_cents, platform_fee_cents, stripe_fee_cents, application_fee_cents, organizer_stripe_account_id, created_at")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());

    if (error) throw error;

    const dest = (logs || []).filter((l: any) => l.routing_decision === "destination");
    const platformFee = dest.reduce((s: number, l: any) => s + (l.platform_fee_cents || 0), 0);
    const appFee = dest.reduce((s: number, l: any) => s + (l.application_fee_cents || 0), 0);
    const gross = dest.reduce((s: number, l: any) => s + (l.gross_cents || 0), 0);

    const byContext: Record<string, { count: number; platformFee: number; gross: number }> = {};
    for (const l of dest as any[]) {
      const k = l.context || "other";
      if (!byContext[k]) byContext[k] = { count: 0, platformFee: 0, gross: 0 };
      byContext[k].count++;
      byContext[k].platformFee += l.platform_fee_cents || 0;
      byContext[k].gross += l.gross_cents || 0;
    }

    const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
    const dateLabel = start.toISOString().slice(0, 10);

    const rows = Object.entries(byContext)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;text-transform:capitalize">${k}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${v.count}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(v.gross)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;color:#1a5c38;font-weight:600">${fmt(v.platformFee)}</td></tr>`,
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222">
        <h2 style="color:#1a5c38;margin-bottom:4px">TeeVents Daily Fee Summary</h2>
        <p style="color:#666;margin-top:0">${dateLabel} (UTC) · Stripe Connect destination charges</p>
        <div style="background:#f7f7f5;border-radius:8px;padding:16px;margin:16px 0">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:6px 0">Charges</td>
              <td style="text-align:right;font-weight:600">${dest.length}</td>
            </tr>
            <tr>
              <td style="padding:6px 0">Gross volume</td>
              <td style="text-align:right;font-weight:600">${fmt(gross)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0">Platform fee (5%)</td>
              <td style="text-align:right;font-weight:700;color:#1a5c38">${fmt(platformFee)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0">Total application fee (incl. Stripe pass-through)</td>
              <td style="text-align:right;font-weight:600">${fmt(appFee)}</td>
            </tr>
          </table>
        </div>
        ${
          rows
            ? `<h3 style="margin-bottom:6px">Breakdown by source</h3>
        <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;border-radius:6px;overflow:hidden">
          <thead><tr style="background:#fafafa"><th style="padding:8px 10px;text-align:left">Source</th><th style="padding:8px 10px;text-align:right">Count</th><th style="padding:8px 10px;text-align:right">Gross</th><th style="padding:8px 10px;text-align:right">Platform fee</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
            : "<p style=\"color:#888\">No charges processed in this window.</p>"
        }
        <p style="color:#888;font-size:12px;margin-top:24px">
          Funds clear into the TeeVents Stripe balance 2–7 days after the charge while Stripe completes Connect settlement. View detail in Stripe → Connect → Application fees.
        </p>
      </div>
    `;

    // Send via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "TeeVents <noreply@teevents.golf>",
        to: [RECIPIENT],
        subject: `TeeVents fees — ${dateLabel} · ${fmt(platformFee)} (${dest.length} charges)`,
        html,
      }),
    });

    const respBody = await resp.text();
    if (!resp.ok) throw new Error(`Resend error: ${resp.status} ${respBody}`);

    return new Response(
      JSON.stringify({ ok: true, charges: dest.length, platform_fee_cents: platformFee, date: dateLabel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[daily-fee-summary]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
