// Daily verifier: pulls last-24h Stripe payment intents, cross-checks them against
// payment_routing_logs, and records each result (ok / misrouted / fee_mismatch / error)
// in payment_routing_verification_findings, with a summary row in payment_routing_verifications.
//
// Trigger: pg_cron (daily) — also callable on-demand by admins from the dashboard.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Optional admin auth check when invoked from UI
  let isAdminInvoke = false;
  const authHeader = req.headers.get("Authorization");
  if (authHeader && !authHeader.includes("service_role")) {
    try {
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      );
      const { data: { user } } = await userClient.auth.getUser(token);
      if (user) {
        const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        isAdminInvoke = true;
      }
    } catch (_e) { /* ignore — treat as cron */ }
  }

  // Window: default last 24h, override via { hours }
  let hours = 24;
  try {
    const body = await req.json();
    if (body?.hours && Number.isFinite(body.hours)) hours = Math.min(168, Math.max(1, body.hours));
  } catch (_) { /* no body */ }

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - hours * 3600 * 1000);

  // Create run row
  const { data: run, error: runErr } = await supabaseAdmin
    .from("payment_routing_verifications")
    .insert({
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      status: "running",
    })
    .select("id")
    .single();

  if (runErr || !run) {
    return new Response(JSON.stringify({ error: runErr?.message || "Failed to create run" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const runId = run.id;
  let total = 0;
  let ok = 0;
  let misrouted = 0;
  let feeMismatch = 0;
  let errors = 0;

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const startTs = Math.floor(windowStart.getTime() / 1000);
    const endTs = Math.floor(windowEnd.getTime() / 1000);

    // Page through payment intents in the window. Cap at 500 to bound runtime.
    let lastId: string | undefined;
    const collected: any[] = [];
    while (collected.length < 500) {
      const list: any = await stripe.paymentIntents.list({
        limit: 100,
        created: { gte: startTs, lte: endTs },
        starting_after: lastId,
      });
      collected.push(...list.data);
      if (!list.has_more || list.data.length === 0) break;
      lastId = list.data[list.data.length - 1].id;
    }

    for (const pi of collected) {
      total++;
      try {
        if (pi.status !== "succeeded") {
          // Skip non-succeeded — they don't need destination verification
          await supabaseAdmin.from("payment_routing_verification_findings").insert({
            verification_id: runId,
            stripe_payment_intent_id: pi.id,
            amount_cents: pi.amount,
            status: "ok",
            detail: `skipped (status=${pi.status})`,
          });
          ok++;
          continue;
        }

        // Try to match to our routing log via PI or session metadata
        let logRow: any = null;
        const { data: byPi } = await supabaseAdmin
          .from("payment_routing_logs")
          .select("*")
          .eq("stripe_payment_intent_id", pi.id)
          .maybeSingle();
        logRow = byPi;

        if (!logRow) {
          // Try via checkout session lookup
          const sessions: any = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
          if (sessions.data.length) {
            const sid = sessions.data[0].id;
            const { data: byS } = await supabaseAdmin
              .from("payment_routing_logs")
              .select("*")
              .eq("stripe_session_id", sid)
              .maybeSingle();
            logRow = byS;

            // Backfill PI on the log
            if (logRow) {
              await supabaseAdmin
                .from("payment_routing_logs")
                .update({ stripe_payment_intent_id: pi.id })
                .eq("id", logRow.id);
            }
          }
        }

        const expectedDestination = logRow?.organizer_stripe_account_id || null;
        const expectedAppFee = logRow?.application_fee_cents ?? null;
        const actualDestination = pi.transfer_data?.destination || null;
        const actualAppFee = pi.application_fee_amount ?? null;

        let status: "ok" | "misrouted" | "fee_mismatch" | "error" = "ok";
        let detail = "";

        if (logRow?.routing_decision === "destination") {
          if (!actualDestination) {
            status = "misrouted";
            detail = `Expected destination ${expectedDestination} but PI has no transfer_data — funds landed in platform account`;
          } else if (expectedDestination && actualDestination !== expectedDestination) {
            status = "misrouted";
            detail = `Expected destination ${expectedDestination} but actual was ${actualDestination}`;
          } else if (expectedAppFee !== null && actualAppFee !== expectedAppFee) {
            status = "fee_mismatch";
            detail = `Expected application_fee_amount ${expectedAppFee} cents but actual was ${actualAppFee} cents`;
          }
        } else if (logRow?.routing_decision === "platform_escrow") {
          if (actualDestination) {
            status = "fee_mismatch";
            detail = `Logged as platform_escrow but PI has transfer_data destination ${actualDestination}`;
          }
        } else {
          // No log row found — only flag as misrouted if it's clearly one of our payment types
          // and it has no destination.
          const meta = pi.metadata || {};
          const isOurs = meta.type && ["registration", "sponsor_registration", "store_purchase", "auction"].includes(meta.type);
          const isDonation = !!meta.tournament_id && (meta.type === "donation" || pi.description?.toLowerCase().includes("donation"));
          if ((isOurs || isDonation) && !actualDestination) {
            status = "misrouted";
            detail = `No routing log found AND no destination on PI — likely escrow fallback`;
          } else {
            detail = "No routing log found (older payment or non-platform charge)";
          }
        }

        await supabaseAdmin.from("payment_routing_verification_findings").insert({
          verification_id: runId,
          stripe_payment_intent_id: pi.id,
          stripe_session_id: logRow?.stripe_session_id || null,
          amount_cents: pi.amount,
          expected_destination: expectedDestination,
          actual_destination: actualDestination,
          expected_application_fee_cents: expectedAppFee,
          actual_application_fee_cents: actualAppFee,
          context: logRow?.context || pi.metadata?.type || null,
          tournament_id: logRow?.tournament_id || pi.metadata?.tournament_id || null,
          organization_id: logRow?.organization_id || pi.metadata?.organization_id || null,
          status,
          detail,
        });

        if (status === "ok") ok++;
        else if (status === "misrouted") misrouted++;
        else if (status === "fee_mismatch") feeMismatch++;
      } catch (e: any) {
        errors++;
        await supabaseAdmin.from("payment_routing_verification_findings").insert({
          verification_id: runId,
          stripe_payment_intent_id: pi.id,
          status: "error",
          detail: e?.message || String(e),
        });
      }
    }

    await supabaseAdmin
      .from("payment_routing_verifications")
      .update({
        completed_at: new Date().toISOString(),
        total_payments: total,
        ok_count: ok,
        misrouted_count: misrouted,
        fee_mismatch_count: feeMismatch,
        error_count: errors,
        status: "completed",
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({
        run_id: runId,
        total_payments: total,
        ok_count: ok,
        misrouted_count: misrouted,
        fee_mismatch_count: feeMismatch,
        error_count: errors,
        invoked_by: isAdminInvoke ? "admin" : "cron",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e: any) {
    await supabaseAdmin
      .from("payment_routing_verifications")
      .update({ status: "failed", error: e?.message || String(e), completed_at: new Date().toISOString() })
      .eq("id", runId);
    return new Response(JSON.stringify({ error: e?.message || String(e), run_id: runId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
