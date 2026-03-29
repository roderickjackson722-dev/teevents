import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESERVE_PERCENT = 15;

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const now = new Date();
    const periodEnd = now;
    const periodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get all held transactions
    const { data: heldTransactions, error: txErr } = await supabaseAdmin
      .from("platform_transactions")
      .select("*")
      .eq("status", "held")
      .lte("created_at", now.toISOString());

    if (txErr) throw new Error(txErr.message);
    if (!heldTransactions || heldTransactions.length === 0) {
      return new Response(JSON.stringify({ message: "No held transactions to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Group by organization
    const orgGroups: Record<string, any[]> = {};
    for (const tx of heldTransactions) {
      if (!orgGroups[tx.organization_id]) orgGroups[tx.organization_id] = [];
      orgGroups[tx.organization_id].push(tx);
    }

    const results: any[] = [];

    for (const [orgId, transactions] of Object.entries(orgGroups)) {
      const totalNetAmount = transactions.reduce((sum, tx) => sum + tx.net_amount_cents, 0);
      const totalFees = transactions.reduce((sum, tx) => sum + tx.platform_fee_cents, 0);

      if (totalNetAmount <= 0) continue;

      // Apply 15% reserve hold
      const reserveAmount = Math.round(totalNetAmount * (RESERVE_PERCENT / 100));
      const payoutAmount = totalNetAmount - reserveAmount;

      if (payoutAmount <= 0) continue;

      // Get org's payout method
      const { data: payoutMethod } = await supabaseAdmin
        .from("organization_payout_methods")
        .select("*")
        .eq("organization_id", orgId)
        .single();

      // Create payout record
      const { data: payout, error: payoutErr } = await supabaseAdmin
        .from("organization_payouts")
        .insert({
          organization_id: orgId,
          amount_cents: payoutAmount,
          platform_fees_cents: totalFees,
          status: payoutMethod?.is_verified ? "processing" : "pending_setup",
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          transaction_count: transactions.length,
          notes: payoutMethod?.is_verified
            ? `Payout $${(payoutAmount / 100).toFixed(2)} (after 4% platform fee + 15% reserve of $${(reserveAmount / 100).toFixed(2)})`
            : "Waiting for payout method setup",
        })
        .select("id")
        .single();

      if (payoutErr) {
        console.error(`Payout record error for org ${orgId}:`, payoutErr);
        continue;
      }

      // Update transaction statuses
      const txIds = transactions.map((tx) => tx.id);
      await supabaseAdmin
        .from("platform_transactions")
        .update({ status: "payout_pending", payout_id: payout!.id })
        .in("id", txIds);

      // If verified payout method, mark as completed
      if (payoutMethod?.is_verified && payoutMethod.stripe_bank_account_token) {
        try {
          await supabaseAdmin
            .from("organization_payouts")
            .update({ status: "completed" })
            .eq("id", payout!.id);

          await supabaseAdmin
            .from("platform_transactions")
            .update({ status: "paid_out" })
            .in("id", txIds);
        } catch (stripeErr) {
          console.error(`Stripe transfer error for org ${orgId}:`, stripeErr);
          await supabaseAdmin
            .from("organization_payouts")
            .update({ status: "failed", notes: `Transfer error: ${stripeErr}` })
            .eq("id", payout!.id);
        }
      }

      // Send notification email
      try {
        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("name")
          .eq("id", orgId)
          .single();

        if (RESEND_API_KEY) {
          const { data: notifEmails } = await supabaseAdmin
            .from("notification_emails")
            .select("email")
            .eq("organization_id", orgId);

          for (const ne of notifEmails || []) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({
                from: `TeeVents <notifications@notifications.teevents.golf>`,
                to: [ne.email],
                subject: `Payout Summary — ${org?.name || "Your Organization"}`,
                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
                  <h2 style="color:#1a5c38;">Payout Summary</h2>
                  <p>A payout of <strong>$${(payoutAmount / 100).toFixed(2)}</strong> has been ${payoutMethod?.is_verified ? "processed" : "queued"} for <strong>${org?.name}</strong>.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Transactions</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${transactions.length}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Gross Amount</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">$${((totalNetAmount + totalFees) / 100).toFixed(2)}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Platform Fees (4%)</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">$${(totalFees / 100).toFixed(2)}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Reserve Hold (15%)</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">$${(reserveAmount / 100).toFixed(2)}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Net Payout</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">$${(payoutAmount / 100).toFixed(2)}</td></tr>
                  </table>
                  <p style="color:#6b7280;font-size:13px;">The 15% reserve ($${(reserveAmount / 100).toFixed(2)}) will be released 60 days after your event ends.</p>
                  ${!payoutMethod?.is_verified ? '<p style="color:#d97706;">⚠️ Please add your bank account details in Dashboard → Settings → Payouts to receive your funds.</p>' : ""}
                  <p style="color:#9ca3af;font-size:12px;">— TeeVents Platform</p>
                </div>`,
              }),
            });
          }
        }
      } catch (e) {
        console.error("Notification error:", e);
      }

      results.push({ orgId, amount: payoutAmount, reserve: reserveAmount, transactions: transactions.length });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
