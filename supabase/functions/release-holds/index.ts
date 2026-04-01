import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HOLD_RELEASE_DAYS = 15;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const today = new Date().toISOString().split("T")[0];

    // Find all platform_transactions with active holds where release date has passed
    const { data: releasable, error: fetchErr } = await supabaseAdmin
      .from("platform_transactions")
      .select("id, organization_id, hold_amount_cents, net_amount_cents, tournament_id")
      .eq("hold_status", "active")
      .lte("hold_release_date", today)
      .gt("hold_amount_cents", 0);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!releasable || releasable.length === 0) {
      return new Response(JSON.stringify({ message: "No holds to release", released: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Group by organization for batch processing and email
    const orgGroups: Record<string, typeof releasable> = {};
    for (const tx of releasable) {
      if (!orgGroups[tx.organization_id]) orgGroups[tx.organization_id] = [];
      orgGroups[tx.organization_id].push(tx);
    }

    let totalReleased = 0;

    for (const [orgId, transactions] of Object.entries(orgGroups)) {
      const totalHoldAmount = transactions.reduce((sum, tx) => sum + (tx.hold_amount_cents || 0), 0);

      // Insert hold_releases records
      const releaseRecords = transactions.map((tx) => ({
        transaction_id: tx.id,
        organization_id: orgId,
        amount_cents: tx.hold_amount_cents || 0,
      }));

      await supabaseAdmin.from("hold_releases").insert(releaseRecords);

      // Update transactions: mark hold as released
      const txIds = transactions.map((tx) => tx.id);
      await supabaseAdmin
        .from("platform_transactions")
        .update({ hold_status: "released" })
        .in("id", txIds);

      totalReleased += transactions.length;

      // Send notification email to organizer
      if (RESEND_API_KEY && totalHoldAmount > 0) {
        try {
          const { data: org } = await supabaseAdmin
            .from("organizations")
            .select("name")
            .eq("id", orgId)
            .single();

          const { data: notifEmails } = await supabaseAdmin
            .from("notification_emails")
            .select("email")
            .eq("organization_id", orgId);

          const amountStr = `$${(totalHoldAmount / 100).toFixed(2)}`;

          for (const ne of notifEmails || []) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "TeeVents <notifications@notifications.teevents.golf>",
                to: [ne.email],
                subject: `Hold Released — ${amountStr} now available`,
                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
                  <h2 style="color:#1a5c38;">🎉 Held Funds Released</h2>
                  <p>Great news! Your held funds of <strong>${amountStr}</strong> for <strong>${org?.name || "your organization"}</strong> have been released and are now available for payout.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Transactions Released</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${transactions.length}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Amount Released</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">${amountStr}</td></tr>
                  </table>
                  <p>These funds will be included in your next automatic payout (1st or 15th of the month), or you can request a manual withdrawal from your dashboard.</p>
                  <p style="color:#9ca3af;font-size:12px;margin-top:24px;">— TeeVents Platform</p>
                </div>`,
              }),
            });
          }
        } catch (emailErr) {
          console.error(`Email notification error for org ${orgId}:`, emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        released: totalReleased,
        organizations: Object.keys(orgGroups).length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("release-holds error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
