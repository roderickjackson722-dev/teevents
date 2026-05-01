import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";
const ADMIN_RECIPIENT = "info@teevents.golf";

// Encode a string to base64 (UTF-8 safe) without using Buffer (Deno).
function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function prettyRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = start.toLocaleDateString("en-US", opts);
  const e = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${s} – ${e}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Compute previous week (Monday 00:00 → next Monday 00:00, UTC)
    const now = new Date();
    const dow = now.getUTCDay(); // 0=Sun..6=Sat
    const daysSinceThisMonday = (dow + 6) % 7;
    const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceThisMonday));
    const lastMonday = new Date(thisMonday); lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);
    const lastSundayDisplay = new Date(thisMonday); lastSundayDisplay.setUTCDate(thisMonday.getUTCDate() - 1);

    // Pull paid transactions in [lastMonday, thisMonday)
    const { data: txs, error: txErr } = await supabaseAdmin
      .from("platform_transactions")
      .select("id, created_at, organization_id, tournament_id, registration_id, golfer_name, golfer_email, payout_method, amount_cents, platform_fee_cents, stripe_fee_cents, net_amount_cents, status")
      .gte("created_at", lastMonday.toISOString())
      .lt("created_at", thisMonday.toISOString())
      .eq("type", "registration")
      .order("created_at", { ascending: false });

    if (txErr) throw txErr;

    const transactions = (txs || []) as any[];

    // Hydrate organizer + payout method + registration name in batch
    const orgIds = Array.from(new Set(transactions.map((t) => t.organization_id).filter(Boolean)));
    const regIds = Array.from(new Set(transactions.map((t) => t.registration_id).filter(Boolean)));

    const [{ data: orgs }, { data: payoutMethods }, { data: regs }] = await Promise.all([
      orgIds.length
        ? supabaseAdmin.from("organizations").select("id, name").in("id", orgIds)
        : Promise.resolve({ data: [] as any[] }),
      orgIds.length
        ? supabaseAdmin.from("organization_payout_methods").select("organization_id, preferred_method, stripe_onboarding_complete").in("organization_id", orgIds)
        : Promise.resolve({ data: [] as any[] }),
      regIds.length
        ? supabaseAdmin.from("tournament_registrations").select("id, first_name, last_name, email, payment_status").in("id", regIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const orgMap = new Map((orgs || []).map((o: any) => [o.id, o]));
    const pmMap = new Map((payoutMethods || []).map((p: any) => [p.organization_id, p]));
    const regMap = new Map((regs || []).map((r: any) => [r.id, r]));

    // Build CSV
    const header = [
      "transaction_date", "golfer_first_name", "golfer_last_name", "golfer_email",
      "organizer_name", "gross_amount", "platform_fee", "stripe_fee", "net_to_organizer",
      "payout_method", "payout_status", "is_refunded",
    ];

    let totalGross = 0, totalPlatform = 0, totalNet = 0, manualCount = 0, refundedCount = 0;

    const rows: string[] = [header.join(",")];
    for (const t of transactions) {
      const reg = regMap.get(t.registration_id) as any;
      const org = orgMap.get(t.organization_id) as any;
      const pm = pmMap.get(t.organization_id) as any;
      const preferred = pm?.preferred_method || t.payout_method || "check";
      const isStripeAuto = preferred === "stripe" && pm?.stripe_onboarding_complete;
      const payoutStatus = isStripeAuto ? "Automatic" : "Manual";
      const isRefunded = (reg?.payment_status === "refunded");
      const fallbackName = (t.golfer_name || "").trim();
      const [fnFallback, ...lnFallbackParts] = fallbackName.split(" ");
      const firstName = reg?.first_name || fnFallback || "";
      const lastName = reg?.last_name || lnFallbackParts.join(" ") || "";
      const email = reg?.email || t.golfer_email || "";

      const gross = (t.amount_cents || 0) / 100;
      const platform = (t.platform_fee_cents || 0) / 100;
      const stripe = (t.stripe_fee_cents || 0) / 100;
      const net = (t.net_amount_cents || 0) / 100;

      totalGross += gross;
      totalPlatform += platform;
      totalNet += net;
      if (!isStripeAuto) manualCount++;
      if (isRefunded) refundedCount++;

      rows.push([
        new Date(t.created_at).toISOString(),
        firstName, lastName, email,
        org?.name || "",
        gross.toFixed(2), platform.toFixed(2), stripe.toFixed(2), net.toFixed(2),
        preferred, payoutStatus, isRefunded ? "Yes" : "No",
      ].map(csvEscape).join(","));
    }
    const csvContent = rows.join("\n");

    const rangeLabel = prettyRange(lastMonday, lastSundayDisplay);
    const filename = `teevents_weekly_report_${fmtDate(lastMonday)}.csv`;

    const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
        <div style="background:#1a5c38;padding:24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;">Weekly Transaction Report</h1>
          <p style="margin:6px 0 0;color:#d1fae5;font-size:14px;">${rangeLabel}</p>
        </div>
        <div style="padding:24px;color:#374151;font-size:14px;line-height:1.6;">
          <p style="margin:0 0 14px;">Attached is your weekly transaction report covering registrations from <strong>${rangeLabel}</strong>.</p>
          <table width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:14px 0;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 6px;"><strong>Total transactions:</strong> ${transactions.length}</p>
              <p style="margin:0 0 6px;"><strong>Total collected:</strong> $${totalGross.toFixed(2)}</p>
              <p style="margin:0 0 6px;"><strong>Total platform fees:</strong> $${totalPlatform.toFixed(2)}</p>
              <p style="margin:0 0 6px;"><strong>Total net to organizers:</strong> $${totalNet.toFixed(2)}</p>
              <p style="margin:0 0 6px;"><strong>Manual payouts (PayPal/Check):</strong> ${manualCount}</p>
              <p style="margin:0;"><strong>Refunded:</strong> ${refundedCount}</p>
            </td></tr>
          </table>
          <p style="margin:14px 0 0;color:#6b7280;font-size:12px;">CSV attached: ${filename}</p>
        </div>
      </div>
    </body></html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: [ADMIN_RECIPIENT],
        subject: `Weekly Transaction Report (${rangeLabel}) — ${transactions.length} txns, $${totalGross.toFixed(2)}`,
        html,
        attachments: [{ filename, content: toBase64(csvContent) }],
      }),
    });

    const resBody = await res.text();
    if (!res.ok) {
      console.error("Resend error", res.status, resBody);
      throw new Error(`Resend send failed: ${res.status}`);
    }

    return new Response(
      JSON.stringify({ success: true, transactions: transactions.length, range: rangeLabel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("[weekly-transaction-report]", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
