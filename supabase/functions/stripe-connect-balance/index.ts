import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) throw new Error("Unauthorized");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.split(" ")[1]?.trim();
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Allow admin impersonation via body.organization_id
    let requestedOrgId: string | null = null;
    try {
      if (req.headers.get("content-type")?.includes("application/json")) {
        const body = await req.json().catch(() => ({}));
        requestedOrgId = body?.organization_id || null;
      }
    } catch (_) { /* ignore */ }

    let organizationId: string | null = null;
    if (requestedOrgId) {
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (isAdmin) {
        organizationId = requestedOrgId;
      }
    }

    if (!organizationId) {
      const { data: membership } = await supabaseAdmin
        .from("org_members")
        .select("organization_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (!membership) throw new Error("No organization");
      organizationId = membership.organization_id;
    }

    const { data: payoutMethod } = await supabaseAdmin
      .from("organization_payout_methods")
      .select("stripe_account_id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", organizationId)
      .maybeSingle();

    const stripeAccountId = payoutMethod?.stripe_account_id || org?.stripe_account_id || null;

    if (!stripeAccountId) {
      return new Response(
        JSON.stringify({ connected: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const [account, balance] = await Promise.all([
      stripe.accounts.retrieve(stripeAccountId),
      stripe.balance.retrieve({ stripeAccount: stripeAccountId }),
    ]);

    const sumByCurrency = (entries: Array<{ amount: number; currency: string }>) => {
      const out: Record<string, number> = {};
      for (const e of entries) out[e.currency] = (out[e.currency] || 0) + e.amount;
      return out;
    };

    const available = sumByCurrency(balance.available || []);
    const pending = sumByCurrency(balance.pending || []);
    const instantAvailable = balance.instant_available
      ? sumByCurrency(balance.instant_available as any)
      : {};

    // Try to find the next scheduled payout
    let nextPayout: { amount: number; currency: string; arrival_date: number } | null = null;
    try {
      const payouts = await stripe.payouts.list(
        { limit: 5, status: "pending" },
        { stripeAccount: stripeAccountId },
      );
      const upcoming = payouts.data
        .filter((p) => p.arrival_date)
        .sort((a, b) => a.arrival_date - b.arrival_date)[0];
      if (upcoming) {
        nextPayout = {
          amount: upcoming.amount,
          currency: upcoming.currency,
          arrival_date: upcoming.arrival_date,
        };
      }
    } catch (e) {
      console.warn("payouts.list failed:", (e as Error).message);
    }

    return new Response(
      JSON.stringify({
        connected: true,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        payout_schedule: account.settings?.payouts?.schedule || null,
        available,
        pending,
        instant_available: instantAvailable,
        next_payout: nextPayout,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("stripe-connect-balance error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: message === "Unauthorized" ? 401 : 500,
    });
  }
});
