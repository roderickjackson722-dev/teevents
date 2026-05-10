import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull all transactions and reconcile from metadata when available
    const { data: txs, error: txErr } = await admin
      .from("platform_transactions")
      .select("id, amount_cents, platform_fee_cents, stripe_fee_cents, net_amount_cents, metadata");
    if (txErr) throw txErr;

    let updated = 0;
    const errors: string[] = [];

    for (const t of txs || []) {
      const md = (t.metadata || {}) as Record<string, any>;
      const chargeTotal = md.charge_total_cents ? Number(md.charge_total_cents) : null;
      const passFees = md.pass_fees_to_golfer === true || md.pass_fees_to_golfer === "true";

      // Determine corrected amount_cents (true customer-paid)
      const correctedAmount = chargeTotal ?? t.amount_cents;
      const platformFee = t.platform_fee_cents ?? 0;
      const stripeFee = t.stripe_fee_cents ?? 0;
      const correctedNet = Math.max(correctedAmount - platformFee - stripeFee, 0);

      const needsUpdate =
        correctedAmount !== t.amount_cents || correctedNet !== t.net_amount_cents;

      if (needsUpdate) {
        const { error: upErr } = await admin
          .from("platform_transactions")
          .update({
            amount_cents: correctedAmount,
            net_amount_cents: correctedNet,
          })
          .eq("id", t.id);
        if (upErr) errors.push(`${t.id}: ${upErr.message}`);
        else updated++;
      }
    }

    return new Response(
      JSON.stringify({ scanned: txs?.length || 0, updated, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
