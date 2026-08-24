// Vendor booth checkout — Direct Charge to organizer's Connect account.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireConnectedAccount, logDirectCharge, PLATFORM_FEE_RATE, isFlatRateTournament, stripeAccountOpts, acctQuerySuffix, applicationFeeBlock, notifyPlatformFallback } from "../_shared/connectRouting.ts";

const calculateGrossedUpStripeFee = (subtotalCents: number) =>
  Math.max(0, Math.round((subtotalCents + 30) / (1 - 0.029)) - subtotalCents);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      tournament_id, tier_id, company_name, contact_name, contact_email,
      contact_phone, website_url, description, logo_url, logo_base64, logo_filename,
    } = body;

    if (!tournament_id || !tier_id || !company_name?.trim() || !contact_name?.trim() || !contact_email?.trim()) {
      throw new Error("Missing required fields");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tournament, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id")
      .eq("id", tournament_id)
      .single();
    if (tErr || !tournament) throw new Error("Tournament not found");

    const { data: tier, error: tierErr } = await supabaseAdmin
      .from("vendor_tiers")
      .select("id, name, description, price_cents, total_spots, spots_used")
      .eq("id", tier_id)
      .eq("tournament_id", tournament_id)
      .eq("is_active", true)
      .single();
    if (tierErr || !tier) throw new Error("Vendor package not found or inactive");
    if (tier.price_cents <= 0) throw new Error("Invalid package price");
    if (tier.total_spots != null && (tier.spots_used || 0) >= tier.total_spots) {
      throw new Error("This vendor package is sold out. Please choose a different one.");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const connected = await requireConnectedAccount(
      supabaseAdmin, stripe, tournament.organization_id, "vendor",
    );
    const organizerStripeAccountId = connected.stripeAccountId;

    // Server-side logo upload (vendors are anonymous; client upload blocked by RLS).
    let finalLogoUrl: string | null = logo_url || null;
    if (logo_base64 && logo_filename) {
      try {
        const ext = (logo_filename.split(".").pop() || "png").toLowerCase();
        const ctMap: Record<string, string> = {
          png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
          svg: "image/svg+xml", webp: "image/webp",
        };
        const path = `vendor-logos/${tournament_id}/${Date.now()}.${ext}`;
        const base64Data = logo_base64.includes(",") ? logo_base64.split(",")[1] : logo_base64;
        const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const { error: upErr } = await supabaseAdmin.storage
          .from("tournament-assets")
          .upload(path, binary, { contentType: ctMap[ext] || "image/png", upsert: true });
        if (!upErr) {
          finalLogoUrl = supabaseAdmin.storage.from("tournament-assets").getPublicUrl(path).data.publicUrl;
        }
      } catch (e) {
        console.error("[vendor-checkout] logo upload failed:", e);
      }
    }

    const { data: registration, error: regErr } = await supabaseAdmin
      .from("vendor_registrations")
      .insert({
        tournament_id, tier_id,
        vendor_name: company_name.trim(),
        company_name: company_name.trim(),
        contact_name: contact_name.trim(),
        contact_email: contact_email.trim(),
        contact_phone: contact_phone?.trim() || null,
        website_url: website_url?.trim() || null,
        description: description?.trim() || null,
        logo_url: finalLogoUrl,
        amount_cents: tier.price_cents,
        booth_fee_cents: tier.price_cents,
        payment_status: "pending",
        status: "pending",
      })
      .select("id")
      .single();
    if (regErr || !registration) throw new Error(regErr?.message || "Failed to create vendor registration");

    const flatRate = await isFlatRateTournament(supabaseAdmin, tournament_id);
    const platformFeeCents = flatRate ? 0 : Math.round(tier.price_cents * PLATFORM_FEE_RATE);
    const stripeFeeCents = calculateGrossedUpStripeFee(tier.price_cents + platformFeeCents);
    const combinedFeesCents = platformFeeCents + stripeFeeCents;
    const applicationFeeAmount = platformFeeCents;
    const chargeTotalCents = tier.price_cents + combinedFeesCents;

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";
    const lineItems: any[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${tier.name} — ${tournament.title}`,
            description: tier.description || `Vendor booth for ${tournament.title}`,
          },
          unit_amount: tier.price_cents,
        },
        quantity: 1,
      },
    ];
    if (combinedFeesCents > 0) {
      lineItems.push({
        price_data: { currency: "usd", product_data: { name: "Fees" }, unit_amount: combinedFeesCents },
        quantity: 1,
      });
    }

    const checkoutParams: any = {
      customer_email: contact_email.trim(),
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${tournament.slug}?vendor_success=true&session_id={CHECKOUT_SESSION_ID}${acctQuerySuffix(connected)}`,
      cancel_url: `${origin}/t/${tournament.slug}?vendor_cancel=true`,
      ...applicationFeeBlock(connected, applicationFeeAmount),
      metadata: {
        type: "vendor_registration",
        tournament_id,
        organization_id: tournament.organization_id,
        tier_id,
        vendor_registration_id: registration.id,
        company_name: company_name.trim(),
        gross_amount_cents: String(tier.price_cents),
        platform_fee_cents: String(platformFeeCents),
        stripe_fee_cents: String(stripeFeeCents),
        application_fee_cents: String(applicationFeeAmount),
        charge_total_cents: String(chargeTotalCents),
        routing: "direct",
      },
    };

    const session = await stripe.checkout.sessions.create(
      checkoutParams, stripeAccountOpts(connected),
    );

    await logDirectCharge(supabaseAdmin, {
      context: "vendor",
      tournamentId: tournament_id,
      organizationId: tournament.organization_id,
      stripeAccountId: organizerStripeAccountId,
      grossCents: tier.price_cents,
      platformFeeCents, stripeFeeCents,
      applicationFeeCents: applicationFeeAmount,
      passFeesToParticipants: true,
      stripeSessionId: session.id,
      buyerEmail: contact_email?.trim() || null,
      notes: `vendor_tier=${tier.name} company=${company_name.trim()}`,
      isPlatformFallback: connected.isPlatformFallback
    });

    if (connected.isPlatformFallback) {
      await notifyPlatformFallback({
        context: "vendor",
        organizationId: tournament.organization_id,
        organizationName: connected.organizationName,
        tournamentId: tournament_id,
        tournamentTitle: null,
        grossCents: tier.price_cents,
        buyerEmail: contact_email?.trim() || null,
        stripeSessionId: session.id,
      });
    }

    await supabaseAdmin
      .from("vendor_registrations")
      .update({ stripe_session_id: session.id })
      .eq("id", registration.id);

    return new Response(
      JSON.stringify({ success: true, checkout_url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
