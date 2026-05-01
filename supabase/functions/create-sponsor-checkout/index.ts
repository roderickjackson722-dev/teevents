import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLATFORM_FEE_RATE = 0.05;
const calculateGrossedUpStripeFee = (subtotalCents: number) =>
  Math.max(0, Math.round((subtotalCents + 30) / (1 - 0.029)) - subtotalCents);

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
    const body = await req.json();
    const {
      tournament_id,
      tier_id,
      company_name,
      contact_name,
      contact_email,
      contact_phone,
      website_url,
      description,
      logo_url,
      logo_base64,
      logo_filename,
    } = body;

    if (!tournament_id || !tier_id || !company_name?.trim() || !contact_name?.trim() || !contact_email?.trim()) {
      throw new Error("Missing required fields");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch tournament (include payment_method_override for routing decision)
    const { data: tournament, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id, site_published, payment_method_override")
      .eq("id", tournament_id)
      .single();

    if (tErr || !tournament) throw new Error("Tournament not found");

    // Fetch tier
    const { data: tier, error: tierErr } = await supabaseAdmin
      .from("sponsorship_tiers")
      .select("id, name, description, price_cents")
      .eq("id", tier_id)
      .eq("tournament_id", tournament_id)
      .eq("is_active", true)
      .single();

    if (tierErr || !tier) throw new Error("Sponsorship tier not found or inactive");
    if (tier.price_cents <= 0) throw new Error("Invalid tier price");

    // Fetch organizer's Stripe Connect account
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", tournament.organization_id)
      .single();

    const organizerStripeAccountId = org?.stripe_account_id || null;

    // Determine routing using same rules as registration:
    //   default       → organizer Stripe if connected, else platform escrow
    //   force_stripe  → must use organizer Stripe (error if missing)
    //   force_platform → always platform escrow (direct charge to TeeVents)
    const override = (tournament as any).payment_method_override || "default";
    let useDestinationCharge = false;
    if (override === "force_stripe") {
      if (!organizerStripeAccountId) {
        throw new Error("Tournament organizer has not connected a payment account. Please contact the organizer.");
      }
      useDestinationCharge = true;
    } else if (override === "force_platform") {
      useDestinationCharge = false;
    } else {
      useDestinationCharge = !!organizerStripeAccountId;
    }

    // Upload logo server-side using service role (sponsors are anonymous, so client-side upload is blocked by RLS)
    let finalLogoUrl: string | null = logo_url || null;
    if (logo_base64 && logo_filename) {
      try {
        const ext = (logo_filename.split(".").pop() || "png").toLowerCase();
        const contentTypeMap: Record<string, string> = {
          png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
          svg: "image/svg+xml", webp: "image/webp",
        };
        const contentType = contentTypeMap[ext] || "image/png";
        const path = `sponsor-logos/${tournament_id}/${Date.now()}.${ext}`;
        const base64Data = logo_base64.includes(",") ? logo_base64.split(",")[1] : logo_base64;
        const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const { error: upErr } = await supabaseAdmin.storage
          .from("tournament-assets")
          .upload(path, binary, { contentType, upsert: true });
        if (upErr) {
          console.error("Logo upload error:", upErr);
        } else {
          const { data: urlData } = supabaseAdmin.storage
            .from("tournament-assets")
            .getPublicUrl(path);
          finalLogoUrl = urlData.publicUrl;
        }
      } catch (e) {
        console.error("Logo decode/upload failed:", e);
      }
    }

    // Insert sponsor registration as pending
    const { data: registration, error: regErr } = await supabaseAdmin
      .from("sponsor_registrations")
      .insert({
        tournament_id,
        tier_id,
        company_name: company_name.trim(),
        contact_name: contact_name.trim(),
        contact_email: contact_email.trim(),
        contact_phone: contact_phone?.trim() || null,
        website_url: website_url?.trim() || null,
        description: description?.trim() || null,
        logo_url: finalLogoUrl,
        amount_cents: tier.price_cents,
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (regErr || !registration) throw new Error(regErr?.message || "Failed to create sponsor registration");

    // Calculate fees — sponsor always pays fees (like registration flow)
    const platformFeeCents = Math.round(tier.price_cents * PLATFORM_FEE_RATE);
    const stripeFeeCents = calculateGrossedUpStripeFee(tier.price_cents + platformFeeCents);
    const combinedFeesCents = platformFeeCents + stripeFeeCents;
    const applicationFeeAmount = combinedFeesCents;
    const chargeTotalCents = tier.price_cents + combinedFeesCents;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: contact_email.trim(), limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";

    const lineItems: any[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${tier.name} — ${tournament.title}`,
            description: tier.description || `Sponsorship for ${tournament.title}`,
          },
          unit_amount: tier.price_cents,
        },
        quantity: 1,
      },
    ];

    if (combinedFeesCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Fees" },
          unit_amount: combinedFeesCents,
        },
        quantity: 1,
      });
    }

    const checkoutParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : contact_email.trim(),
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${tournament.slug}?sponsor_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/t/${tournament.slug}?sponsor_cancel=true`,
      metadata: {
        type: "sponsor_registration",
        tournament_id,
        organization_id: tournament.organization_id,
        tier_id,
        sponsor_registration_id: registration.id,
        company_name: company_name.trim(),
        gross_amount_cents: String(tier.price_cents),
        platform_fee_cents: String(platformFeeCents),
        stripe_fee_cents: String(stripeFeeCents),
        application_fee_cents: String(applicationFeeAmount),
        charge_total_cents: String(chargeTotalCents),
        routing: useDestinationCharge ? "destination" : "platform_escrow",
        payment_method_override: override,
      },
    };

    if (useDestinationCharge) {
      // Destination charge to organizer's Stripe Connect account; platform keeps the fee.
      checkoutParams.payment_intent_data = {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: organizerStripeAccountId },
        on_behalf_of: organizerStripeAccountId,
      };
    }
    // else: direct charge to TeeVents platform account (escrow). No transfer_data.

    const session = await stripe.checkout.sessions.create(checkoutParams);

    // Store session ID on the registration
    await supabaseAdmin
      .from("sponsor_registrations")
      .update({ stripe_session_id: session.id })
      .eq("id", registration.id);

    return new Response(
      JSON.stringify({ success: true, checkout_url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
