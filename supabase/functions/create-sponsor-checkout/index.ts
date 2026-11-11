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

// Accept only real PNG / JPEG / WebP images up to 5 MB, detected from the
// file bytes (not the filename). Anything else is skipped.
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
function sniffLogo(b: Uint8Array): { ext: string; type: string } | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: "webp", type: "image/webp" };
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      tournament_id, tier_id, company_name, contact_name, contact_email,
      contact_phone, website_url, description, address, logo_url, logo_base64, logo_filename,
      additional_notes,
    } = body;

    // Server-side required-field enforcement uses the tournament's sponsor_form_config
    // (loaded below). We only hard-require tournament_id + tier_id + company_name here;
    // other fields are validated after we know the config.
    if (!tournament_id || !tier_id || !company_name?.trim()) {
      throw new Error("Missing required fields");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tournament, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id, site_published, sponsor_form_config")
      .eq("id", tournament_id)
      .single();
    if (tErr || !tournament) throw new Error("Tournament not found");

    // Enforce required fields per organizer configuration.
    const cfg: any = tournament.sponsor_form_config || {};
    const check = (key: string, value: any, label: string) => {
      if (cfg[key] === "required" && (!value || !String(value).trim())) {
        throw new Error(`${label} is required`);
      }
    };
    check("contact_name", contact_name, "Contact name");
    check("contact_email", contact_email, "Contact email");
    check("contact_phone", contact_phone, "Contact phone");
    check("website_url", website_url, "Website");
    check("address", address, "Address");
    check("description", description, "Company description");
    check("additional_notes", additional_notes, "Additional notes");

    const { data: tier, error: tierErr } = await supabaseAdmin
      .from("sponsorship_tiers")
      .select("id, name, description, price_cents, total_spots, spots_used")
      .eq("id", tier_id)
      .eq("tournament_id", tournament_id)
      .eq("is_active", true)
      .single();
    if (tierErr || !tier) throw new Error("Sponsorship tier not found or inactive");
    if (tier.price_cents <= 0) throw new Error("Invalid tier price");
    if (tier.total_spots != null && (tier.spots_used || 0) >= tier.total_spots) {
      throw new Error("This sponsorship level is sold out. Please choose a different package.");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const connected = await requireConnectedAccount(
      supabaseAdmin, stripe, tournament.organization_id, "sponsor",
    );
    const organizerStripeAccountId = connected.stripeAccountId;

    // Upload logo server-side (anonymous sponsors can't satisfy storage RLS).
    let finalLogoUrl: string | null = logo_url || null;
    if (logo_base64 && logo_filename) {
      try {
        const base64Data = String(logo_base64).includes(",") ? String(logo_base64).split(",")[1] : String(logo_base64);
        if (base64Data.length > Math.ceil(MAX_LOGO_BYTES / 3) * 4 + 4) throw new Error("Logo too large");
        const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const kind = binary.length <= MAX_LOGO_BYTES ? sniffLogo(binary) : null;
        if (!kind) throw new Error("Unsupported logo file");
        const contentType = kind.type;
        const path = `sponsor-logos/${tournament_id}/${Date.now()}.${kind.ext}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("tournament-assets")
          .upload(path, binary, { contentType, upsert: true });
        if (!upErr) {
          finalLogoUrl = supabaseAdmin.storage.from("tournament-assets").getPublicUrl(path).data.publicUrl;
        } else {
          console.error("Logo upload error:", upErr);
        }
      } catch (e) {
        console.error("Logo decode/upload failed:", e);
      }
    }

    const { data: registration, error: regErr } = await supabaseAdmin
      .from("sponsor_registrations")
      .insert({
        tournament_id, tier_id,
        company_name: company_name.trim(),
        contact_name: contact_name?.trim() || "",
        contact_email: contact_email?.trim() || "",
        contact_phone: contact_phone?.trim() || null,
        website_url: website_url?.trim() || null,
        description: description?.trim() || null,
        address: address?.trim() || null,
        logo_url: finalLogoUrl,
        additional_notes: additional_notes?.toString().trim() || null,
        amount_cents: tier.price_cents,
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (regErr || !registration) throw new Error(regErr?.message || "Failed to create sponsor registration");

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
            description: tier.description || `Sponsorship for ${tournament.title}`,
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
      ...(contact_email?.trim() ? { customer_email: contact_email.trim() } : {}),
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${tournament.slug}?sponsor_success=true&session_id={CHECKOUT_SESSION_ID}${acctQuerySuffix(connected)}`,
      cancel_url: `${origin}/t/${tournament.slug}?sponsor_cancel=true`,
      ...applicationFeeBlock(connected, applicationFeeAmount),
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
        routing: "direct",
      },
    };

    const session = await stripe.checkout.sessions.create(
      checkoutParams, stripeAccountOpts(connected),
    );

    await logDirectCharge(supabaseAdmin, {
      context: "sponsor",
      tournamentId: tournament_id,
      organizationId: tournament.organization_id,
      stripeAccountId: organizerStripeAccountId,
      grossCents: tier.price_cents,
      platformFeeCents, stripeFeeCents,
      applicationFeeCents: applicationFeeAmount,
      passFeesToParticipants: true,
      stripeSessionId: session.id,
      buyerEmail: contact_email?.trim() || null,
      notes: `tier=${tier.name} company=${company_name.trim()}`,
      isPlatformFallback: connected.isPlatformFallback
    });

    if (connected.isPlatformFallback) {
      await notifyPlatformFallback({
        context: "sponsor",
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
      .from("sponsor_registrations")
      .update({ stripe_session_id: session.id })
      .eq("id", registration.id);

    return new Response(
      JSON.stringify({ success: true, checkout_url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
