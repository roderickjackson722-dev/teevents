// League Manager Access unlock — $199 one-time, paid to TeeVents platform.
// Supports admin promo codes via public.validate_league_promo_code().
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEAGUE_ACCESS_BASE_CENTS = 19900;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { league_id, promo_code, admin_invoice, invoice_notes } = await req.json();
    if (!league_id) throw new Error("Missing league_id");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    const user = userData?.user;
    if (!user) throw new Error("Not authenticated");

    const { data: league, error: lErr } = await supabaseAdmin
      .from("golf_leagues")
      .select("id, league_name, organization_id, access_status")
      .eq("id", league_id)
      .single();
    if (lErr || !league) throw new Error("League not found");
    if (league.access_status === "paid") throw new Error("League is already unlocked");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    // Admin invoice bypass: unlock without payment; record for later invoicing.
    if (admin_invoice) {
      if (!isAdmin) throw new Error("Only platform admins can bypass payment");
      const { data: purchase, error: pErr } = await supabaseAdmin
        .from("league_access_purchases")
        .insert({
          organization_id: league.organization_id,
          league_id: league.id,
          amount_cents: LEAGUE_ACCESS_BASE_CENTS,
          discount_cents: 0,
          status: "paid",
          payment_method: "invoice",
          invoice_status: "pending",
          invoice_notes: invoice_notes || null,
          purchased_by: user.id,
          created_by_admin: user.id,
        })
        .select()
        .single();
      if (pErr) throw pErr;
      await supabaseAdmin
        .from("golf_leagues")
        .update({
          access_status: "paid",
          access_paid_at: new Date().toISOString(),
          access_amount_cents: LEAGUE_ACCESS_BASE_CENTS,
        })
        .eq("id", league.id);
      const origin = req.headers.get("origin") || "https://teevents.golf";
      return new Response(
        JSON.stringify({ invoice: true, purchase_id: purchase.id, url: `${origin}/dashboard/leagues/${league.id}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // authorize: caller must be org member (non-admin path)
    const { data: isMember } = await supabaseAdmin.rpc("is_org_member", {
      _user_id: user.id,
      _org_id: league.organization_id,
    });
    if (!isMember && !isAdmin) throw new Error("Not authorized");


    // apply promo code
    let discountCents = 0;
    let finalCents = LEAGUE_ACCESS_BASE_CENTS;
    let appliedCode: string | null = null;
    if (promo_code && String(promo_code).trim()) {
      const { data: valid } = await supabaseAdmin.rpc("validate_league_promo_code", {
        _code: String(promo_code).trim(),
        _base_cents: LEAGUE_ACCESS_BASE_CENTS,
      });
      if (valid && (valid as any).valid) {
        discountCents = (valid as any).discount_cents || 0;
        finalCents = (valid as any).final_cents ?? LEAGUE_ACCESS_BASE_CENTS;
        appliedCode = (valid as any).code || String(promo_code).trim().toUpperCase();
      } else {
        throw new Error("Invalid promo code");
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://teevents.golf";

    // Insert pending purchase
    const { data: purchase, error: pErr } = await supabaseAdmin
      .from("league_access_purchases")
      .insert({
        organization_id: league.organization_id,
        league_id: league.id,
        amount_cents: finalCents,
        discount_cents: discountCents,
        promo_code: appliedCode,
        status: "pending",
        purchased_by: user.id,
      })
      .select()
      .single();
    if (pErr) throw pErr;

    // If 100% off — skip Stripe and mark paid immediately.
    if (finalCents <= 0) {
      await supabaseAdmin
        .from("league_access_purchases")
        .update({ status: "paid" })
        .eq("id", purchase.id);
      await supabaseAdmin
        .from("golf_leagues")
        .update({
          access_status: "paid",
          access_paid_at: new Date().toISOString(),
          access_amount_cents: 0,
        })
        .eq("id", league.id);
      if (appliedCode) {
        await supabaseAdmin.rpc("execute_sql" as any, {}).catch(() => {});
        await supabaseAdmin
          .from("league_access_promo_codes")
          .update({ times_used: (await supabaseAdmin
            .from("league_access_promo_codes")
            .select("times_used")
            .eq("code", appliedCode)
            .single()).data?.times_used! + 1 })
          .eq("code", appliedCode);
      }
      return new Response(
        JSON.stringify({ free: true, url: `${origin}/dashboard/leagues/${league.id}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: finalCents,
            product_data: {
              name: `Golf League Manager Access — ${league.league_name}`,
              description: appliedCode
                ? `Includes promo code ${appliedCode} ($${(discountCents / 100).toFixed(2)} off)`
                : "One-time unlock to run this golf league",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/leagues/${league.id}?access=success`,
      cancel_url: `${origin}/dashboard/leagues?access=cancelled`,
      metadata: {
        kind: "league_access",
        league_id: league.id,
        purchase_id: purchase.id,
        promo_code: appliedCode || "",
        organization_id: league.organization_id,
      },
    });

    await supabaseAdmin
      .from("league_access_purchases")
      .update({ stripe_session_id: session.id })
      .eq("id", purchase.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
