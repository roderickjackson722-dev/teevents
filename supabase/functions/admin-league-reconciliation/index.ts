// Admin reconciliation: for each league (or a specific league), compare TeeVents 5% platform
// fee totals (from league_payments) against Stripe application_fees for each Connect account.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return new Response(JSON.stringify({ error: "Invalid auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { league_id, since_days = 90 } = await req.json().catch(() => ({}));
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const since = Math.floor(Date.now() / 1000) - Number(since_days) * 86400;

    let q = admin
      .from("league_payments")
      .select("id, league_id, event_id, kind, amount_cents, platform_fee_cents, status, stripe_payment_intent, stripe_account_id, created_at, league:golf_leagues(league_name), event:league_events(event_name, event_date)")
      .eq("status", "paid")
      .gte("created_at", new Date(since * 1000).toISOString());
    if (league_id) q = q.eq("league_id", league_id);
    const { data: payments, error } = await q;
    if (error) throw error;

    // Group by (league, event, connect account)
    type Bucket = {
      league_id: string; league_name: string;
      event_id: string | null; event_name: string; event_date: string | null;
      stripe_account_id: string;
      count: number;
      db_gross_cents: number;
      db_fee_cents: number;
      stripe_fee_cents: number;
      matched: boolean;
      diff_cents: number;
      missing_in_stripe: string[];
    };
    const buckets = new Map<string, Bucket>();
    for (const p of payments || []) {
      const key = `${p.league_id}::${p.event_id || "membership"}::${p.stripe_account_id || ""}`;
      const b = buckets.get(key) || {
        league_id: p.league_id,
        league_name: (p as any).league?.league_name || "",
        event_id: p.event_id,
        event_name: (p as any).event?.event_name || (p.kind === "membership" ? "Memberships" : "—"),
        event_date: (p as any).event?.event_date || null,
        stripe_account_id: p.stripe_account_id || "",
        count: 0, db_gross_cents: 0, db_fee_cents: 0, stripe_fee_cents: 0,
        matched: false, diff_cents: 0, missing_in_stripe: [],
      };
      b.count += 1;
      b.db_gross_cents += p.amount_cents || 0;
      b.db_fee_cents += p.platform_fee_cents || 0;
      buckets.set(key, b);
    }

    // For each unique connect account, pull application fees since `since`; match by payment_intent.
    const acctFees = new Map<string, Map<string, number>>(); // acct -> pi -> fee cents
    const accounts = Array.from(new Set(Array.from(buckets.values()).map((b) => b.stripe_account_id).filter(Boolean)));
    for (const acct of accounts) {
      const map = new Map<string, number>();
      try {
        let starting_after: string | undefined;
        for (let i = 0; i < 5; i++) {
          const list = await stripe.applicationFees.list({ limit: 100, created: { gte: since }, starting_after });
          for (const f of list.data) {
            if (f.account !== acct) continue;
            const pi = typeof f.originating_transaction === "string"
              ? f.originating_transaction
              : (f.originating_transaction as any)?.payment_intent || "";
            // originating_transaction is a charge id; we compare by charge OR payment_intent — store both keys.
            const chargeId = typeof f.originating_transaction === "string" ? f.originating_transaction : "";
            if (chargeId) map.set(chargeId, (map.get(chargeId) || 0) + f.amount);
          }
          if (!list.has_more) break;
          starting_after = list.data[list.data.length - 1]?.id;
        }
      } catch (e) {
        console.error("Stripe list error for", acct, (e as Error).message);
      }
      acctFees.set(acct, map);
    }

    // For each payment intent, look up its latest charge id to compare.
    for (const b of buckets.values()) {
      const feeMap = acctFees.get(b.stripe_account_id);
      if (!feeMap) continue;
      let sum = 0;
      for (const p of payments || []) {
        const bkey = `${p.league_id}::${p.event_id || "membership"}::${p.stripe_account_id || ""}`;
        if (bkey !== `${b.league_id}::${b.event_id || "membership"}::${b.stripe_account_id}`) continue;
        if (!p.stripe_payment_intent) { b.missing_in_stripe.push(p.id); continue; }
        try {
          const pi = await stripe.paymentIntents.retrieve(p.stripe_payment_intent, {}, { stripeAccount: b.stripe_account_id });
          const chargeId = pi.latest_charge as string | null;
          const fee = chargeId ? (feeMap.get(chargeId) || 0) : 0;
          if (!fee) b.missing_in_stripe.push(p.id);
          sum += fee;
        } catch {
          b.missing_in_stripe.push(p.id);
        }
      }
      b.stripe_fee_cents = sum;
      b.diff_cents = b.db_fee_cents - b.stripe_fee_cents;
      b.matched = b.diff_cents === 0 && b.missing_in_stripe.length === 0;
    }

    const results = Array.from(buckets.values()).sort((a, b) => (b.db_gross_cents - a.db_gross_cents));
    const totals = results.reduce(
      (acc, r) => ({
        gross: acc.gross + r.db_gross_cents,
        db_fee: acc.db_fee + r.db_fee_cents,
        stripe_fee: acc.stripe_fee + r.stripe_fee_cents,
        matched: acc.matched + (r.matched ? 1 : 0),
        mismatched: acc.mismatched + (r.matched ? 0 : 1),
      }),
      { gross: 0, db_fee: 0, stripe_fee: 0, matched: 0, mismatched: 0 },
    );

    return new Response(JSON.stringify({ since_days, totals, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
