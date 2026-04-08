import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const resolveBankAccountDetails = async (
  stripe: Stripe,
  stripeAccountId: string,
  account: any,
) => {
  const externalAccount = account.external_accounts?.data?.[0] as any;
  if (externalAccount?.last4) {
    return {
      last4: externalAccount.last4 as string,
      brand: externalAccount.bank_name || externalAccount.brand || null,
    };
  }

  try {
    const payouts = await stripe.payouts.list(
      { limit: 10 },
      { stripeAccount: stripeAccountId },
    );

    const latestBankPayout = payouts.data.find(
      (payout) => payout.type === "bank_account" && typeof payout.destination === "string",
    );

    if (latestBankPayout) {
      const expandedPayout = await stripe.payouts.retrieve(
        latestBankPayout.id,
        { expand: ["destination"] },
        { stripeAccount: stripeAccountId },
      );

      const destination = expandedPayout.destination as any;
      if (destination && typeof destination !== "string" && destination.last4) {
        return {
          last4: destination.last4 as string,
          brand: destination.bank_name || null,
        };
      }
    }
  } catch (fallbackError) {
    const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "Unknown fallback error";
    console.warn("stripe-connect-status fallback error:", fallbackMessage);
  }

  return { last4: null, brand: null };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) throw new Error("Unauthorized");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.split(" ")[1]?.trim();
    let user = null;

    if (token) {
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error) user = data.user;
    }

    if (!user) {
      const { data, error } = await supabaseClient.auth.getUser();
      if (!error) user = data.user;
    }

    if (!user) throw new Error("Unauthorized");

    const userId = user.id;

    const { data: membership } = await supabaseClient
      .from("org_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (!membership) throw new Error("No organization found");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payoutMethod } = await supabaseAdmin
      .from("organization_payout_methods")
      .select("stripe_account_id")
      .eq("organization_id", membership.organization_id)
      .maybeSingle();

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", membership.organization_id)
      .maybeSingle();

    const stripeAccountId = payoutMethod?.stripe_account_id || org?.stripe_account_id || null;

    if (!stripeAccountId) {
      return new Response(
        JSON.stringify({ connected: false, charges_enabled: false, payouts_enabled: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const account = await stripe.accounts.retrieve(stripeAccountId);
    const { last4, brand } = await resolveBankAccountDetails(stripe, stripeAccountId, account);

    const payoutMethodUpdate: Record<string, string | boolean | null> = {
      organization_id: membership.organization_id,
      stripe_account_id: stripeAccountId,
      stripe_account_status: account.charges_enabled ? "active" : "pending",
      stripe_onboarding_complete: !!account.details_submitted,
      is_verified: !!account.payouts_enabled,
    };

    if (last4) payoutMethodUpdate.stripe_account_last4 = last4;
    if (brand) payoutMethodUpdate.stripe_account_brand = brand;

    await supabaseAdmin
      .from("organization_payout_methods")
      .upsert(payoutMethodUpdate, { onConflict: "organization_id" });

    return new Response(
      JSON.stringify({
        connected: true,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        account_id: account.id,
        last4,
        brand,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("stripe-connect-status error:", message);

    if (message === "Unauthorized") {
      return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // If Stripe can't access the account, return a structured "invalid" status
    // so the UI can show a helpful message instead of silently resetting
    const isAccessError = message.includes("does not have access") || message.includes("does not exist");
    if (isAccessError) {
      return new Response(
        JSON.stringify({
          connected: false,
          charges_enabled: false,
          payouts_enabled: false,
          invalid_account: true,
          error_message: "The saved Stripe account could not be verified. It may not be connected to this platform. Please use the 'Connect Stripe Account' button to properly link your account through Stripe's onboarding flow, or disconnect and try again.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
