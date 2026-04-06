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

    // Check if manual withdrawal for a specific org
    let body: any = {};
    try { body = await req.json(); } catch { /* cron call with no body */ }
    const isManual = body?.manual === true;
    const targetOrgId = body?.organization_id;

    const now = new Date();
    const periodEnd = now;
    const periodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // For manual: check 7-day dispute window
    if (isManual && targetOrgId) {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: recentRefunds } = await supabaseAdmin
        .from("tournament_refund_requests")
        .select("id, tournament_id")
        .gte("created_at", sevenDaysAgo.toISOString())
        .in("status", ["pending", "approved"]);

      // Check if any refunds belong to this org's tournaments
      if (recentRefunds && recentRefunds.length > 0) {
        const tournamentIds = recentRefunds.map(r => r.tournament_id);
        const { data: orgTournaments } = await supabaseAdmin
          .from("tournaments")
          .select("id")
          .eq("organization_id", targetOrgId)
          .in("id", tournamentIds);

        if (orgTournaments && orgTournaments.length > 0) {
          return new Response(JSON.stringify({
            error: "Cannot withdraw: there are recent refunds or disputes within the last 7 days. Please wait and try again."
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
      }
    }

    // Get transactions that are eligible for payout:
    // - hold_status = 'released' (hold period passed) OR status = 'held' with released holds
    // - not yet paid out (status != 'paid_out')
    let txQuery = supabaseAdmin
      .from("platform_transactions")
      .select("*")
      .eq("hold_status", "released")
      .neq("status", "paid_out");

    if (isManual && targetOrgId) {
      txQuery = txQuery.eq("organization_id", targetOrgId);
    }

    const { data: eligibleTransactions, error: txErr } = await txQuery;

    if (txErr) throw new Error(txErr.message);

    // Also get transactions where hold is still active but net (minus hold) is available
    let heldQuery = supabaseAdmin
      .from("platform_transactions")
      .select("*")
      .eq("hold_status", "active")
      .eq("status", "held");

    if (isManual && targetOrgId) {
      heldQuery = heldQuery.eq("organization_id", targetOrgId);
    }

    const { data: heldTransactions } = await heldQuery;

    // Combine: released transactions get full net, held ones get net minus hold
    const allTransactions = [
      ...(eligibleTransactions || []).map(tx => ({
        ...tx,
        payout_amount: tx.net_amount_cents, // Full net since hold is released
      })),
      ...(heldTransactions || []).map(tx => {
        const holdAmount = tx.hold_amount_cents || Math.round(tx.net_amount_cents * (RESERVE_PERCENT / 100));
        return {
          ...tx,
          payout_amount: tx.net_amount_cents - holdAmount, // Net minus reserve
        };
      }),
    ];

    if (allTransactions.length === 0) {
      return new Response(JSON.stringify({ message: "No eligible transactions for payout" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Group by organization
    const orgGroups: Record<string, any[]> = {};
    for (const tx of allTransactions) {
      if (tx.payout_amount <= 0) continue;
      if (!orgGroups[tx.organization_id]) orgGroups[tx.organization_id] = [];
      orgGroups[tx.organization_id].push(tx);
    }

    const MIN_PAYOUT = 2500; // $25 minimum
    const results: any[] = [];

    for (const [orgId, transactions] of Object.entries(orgGroups)) {
      const totalPayoutAmount = transactions.reduce((sum, tx) => sum + tx.payout_amount, 0);
      const totalFees = transactions.reduce((sum, tx) => sum + tx.platform_fee_cents, 0);

      if (totalPayoutAmount < MIN_PAYOUT) continue;

      // Get org's Stripe Connect account
      const { data: orgData } = await supabaseAdmin
        .from("organizations")
        .select("name, stripe_account_id")
        .eq("id", orgId)
        .single();

      // Get payout method
      const { data: payoutMethod } = await supabaseAdmin
        .from("organization_payout_methods")
        .select("*")
        .eq("organization_id", orgId)
        .single();

      const stripeAccountId = orgData?.stripe_account_id;
      const hasVerifiedPayout = payoutMethod?.is_verified && stripeAccountId;

      // Create payout record
      const { data: payout, error: payoutErr } = await supabaseAdmin
        .from("organization_payouts")
        .insert({
          organization_id: orgId,
          amount_cents: totalPayoutAmount,
          platform_fees_cents: totalFees,
          status: hasVerifiedPayout ? "processing" : "pending_setup",
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          transaction_count: transactions.length,
          notes: hasVerifiedPayout
            ? `${isManual ? "Manual withdrawal" : "Bi-weekly payout"}: $${(totalPayoutAmount / 100).toFixed(2)}`
            : "Waiting for payout method setup — connect Stripe in Settings → Payouts",
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

      // If verified Stripe Connect, create actual transfer
      if (hasVerifiedPayout) {
        try {
          const transfer = await stripe.transfers.create({
            amount: totalPayoutAmount,
            currency: "usd",
            destination: stripeAccountId,
            description: `TeeVents ${isManual ? "manual withdrawal" : "bi-weekly payout"} — ${orgData?.name || orgId}`,
            metadata: {
              payout_id: payout!.id,
              organization_id: orgId,
              type: isManual ? "manual" : "biweekly",
            },
          });

          await supabaseAdmin
            .from("organization_payouts")
            .update({ status: "completed", stripe_transfer_id: transfer.id })
            .eq("id", payout!.id);

          await supabaseAdmin
            .from("platform_transactions")
            .update({ status: "paid_out" })
            .in("id", txIds);
        } catch (stripeErr: any) {
          console.error(`Stripe transfer error for org ${orgId}:`, stripeErr);
          await supabaseAdmin
            .from("organization_payouts")
            .update({
              status: "failed",
              notes: `Transfer failed: ${stripeErr?.message || stripeErr}`,
            })
            .eq("id", payout!.id);

          // Revert transaction status
          await supabaseAdmin
            .from("platform_transactions")
            .update({ status: "held" })
            .in("id", txIds);
        }
      }

      // Send notification email
      try {
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
                subject: `${isManual ? "Withdrawal" : "Payout"} ${hasVerifiedPayout ? "Processed" : "Queued"} — ${orgData?.name || "Your Organization"}`,
                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
                  <h2 style="color:#1a5c38;">${isManual ? "Withdrawal" : "Bi-Weekly Payout"} Summary</h2>
                  <p>A ${isManual ? "withdrawal" : "payout"} of <strong>$${(totalPayoutAmount / 100).toFixed(2)}</strong> has been ${hasVerifiedPayout ? "transferred to your Stripe account" : "queued"} for <strong>${orgData?.name}</strong>.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Transactions</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${transactions.length}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Platform Fees (5%)</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">$${(totalFees / 100).toFixed(2)}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Amount Transferred</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">$${(totalPayoutAmount / 100).toFixed(2)}</td></tr>
                  </table>
                  ${hasVerifiedPayout ? '<p style="color:#059669;">✅ Funds will arrive in your bank account within 1-3 business days.</p>' : '<p style="color:#d97706;">⚠️ Please connect your Stripe account in Dashboard → Settings → Payouts to receive your funds.</p>'}
                  <p style="color:#9ca3af;font-size:12px;">— TeeVents Platform</p>
                </div>`,
              }),
            });
          }
        }
      } catch (e) {
        console.error("Notification error:", e);
      }

      results.push({
        orgId,
        orgName: orgData?.name,
        amount: totalPayoutAmount,
        transactions: transactions.length,
        status: hasVerifiedPayout ? "transferred" : "pending_setup",
        type: isManual ? "manual" : "biweekly",
      });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
