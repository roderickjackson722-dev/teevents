import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml, sendRegistrantConfirmationEmail } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_BASE = Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type } = body; // "registration", "donation", "store"

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (type === "registration") {
      return await handleRegistration(body, supabaseAdmin, req);
    }

    throw new Error(`Unsupported PayPal order type: ${type}`);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleRegistration(body: any, supabaseAdmin: any, req: Request) {
  const isFoursome = body.foursome === true && Array.isArray(body.players);
  const players = isFoursome
    ? body.players
    : [{
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        handicap: body.handicap,
        shirt_size: body.shirt_size,
        dietary_restrictions: body.dietary_restrictions,
        notes: body.notes,
      }];

  const tournament_id = body.tournament_id;
  const first_name = players[0].first_name;
  const last_name = players[0].last_name;
  const email = players[0].email;

  if (!tournament_id || !first_name || !last_name || !email) {
    throw new Error("Missing required fields");
  }

  // Fetch tournament
  const { data: tournament, error: tErr } = await supabaseAdmin
    .from("tournaments")
    .select("id, title, slug, organization_id, registration_open, site_published, registration_fee_cents, date, location")
    .eq("id", tournament_id)
    .single();

  if (tErr || !tournament) throw new Error("Tournament not found");
  if (!tournament.registration_open || !tournament.site_published) {
    throw new Error("Registration is not open for this tournament");
  }

  // Fetch org
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("paypal_merchant_id, plan, is_nonprofit, fee_override")
    .eq("id", tournament.organization_id)
    .single();

  const paypalMerchantId = (org as any)?.paypal_merchant_id;
  if (!paypalMerchantId) throw new Error("Organization has no PayPal account connected");

  const orgPlan = org?.plan || "base";
  const isNonprofit = org?.is_nonprofit === true;

  const FEE_RATES: Record<string, number> = { base: 0.05, starter: 0, premium: 0 };
  const feeRate = (org as any)?.fee_override != null
    ? (org as any).fee_override / 100
    : isNonprofit ? 0.05 : (FEE_RATES[orgPlan] ?? 0.05);

  const feeCents = tournament.registration_fee_cents || 0;
  const totalFeeCents = feeCents * players.length;

  if (totalFeeCents <= 0) throw new Error("No fee required — use direct registration");

  // Insert registration records
  const registrationInserts = players.map((p: any) => ({
    tournament_id,
    first_name: (p.first_name || "").trim(),
    last_name: (p.last_name || "").trim(),
    email: (p.email || "").trim(),
    phone: p.phone || null,
    handicap: p.handicap ?? null,
    shirt_size: p.shirt_size || null,
    dietary_restrictions: p.dietary_restrictions || null,
    notes: p.notes || null,
    payment_status: "pending",
  }));

  const { data: registrations, error: regErr } = await supabaseAdmin
    .from("tournament_registrations")
    .insert(registrationInserts)
    .select("id");

  if (regErr) throw new Error(regErr.message);
  const registrationIds = (registrations || []).map((r: any) => r.id);

  // Calculate fees
  const platformFeeCents = Math.round(totalFeeCents * feeRate);
  const totalChargeUsd = (totalFeeCents / 100).toFixed(2);
  const platformFeeUsd = (platformFeeCents / 100).toFixed(2);

  // Create PayPal order
  const accessToken = await getPayPalAccessToken();
  const origin = req.headers.get("origin") || "https://teevents.lovable.app";

  const playerNames = players.map((p: any) => `${p.first_name} ${p.last_name}`).join(", ");

  const orderBody: any = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: registrationIds.join(","),
        description: `Registration — ${tournament.title}`,
        custom_id: JSON.stringify({ type: "registration", tournament_id, registration_ids: registrationIds }),
        amount: {
          currency_code: "USD",
          value: totalChargeUsd,
        },
        payee: {
          merchant_id: paypalMerchantId,
        },
        payment_instruction: {
          disbursement_mode: "INSTANT",
          platform_fees: platformFeeCents > 0 ? [
            {
              amount: {
                currency_code: "USD",
                value: platformFeeUsd,
              },
            },
          ] : [],
        },
      },
    ],
    application_context: {
      return_url: `${origin}/t/${tournament.slug}?registered=true&paypal=true`,
      cancel_url: `${origin}/t/${tournament.slug}#register`,
      brand_name: "TeeVents",
      user_action: "PAY_NOW",
    },
  };

  const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderBody),
  });

  if (!orderRes.ok) {
    const errText = await orderRes.text();
    console.error("PayPal order creation failed:", errText);
    throw new Error("Failed to create PayPal order");
  }

  const order = await orderRes.json();
  const approvalUrl = order.links?.find((l: any) => l.rel === "approve")?.href;

  if (!approvalUrl) throw new Error("PayPal did not return an approval URL");

  // Send notification
  try {
    await sendNotificationEmails(
      supabaseAdmin,
      tournament.organization_id,
      "notify_registration",
      `New Registration — ${tournament.title}`,
      buildNotificationHtml("New Player Registration", [
        `<strong>${playerNames}</strong> registered for <strong>${tournament.title}</strong>.`,
        `📧 ${email}`,
        `💳 PayPal payment pending: $${totalChargeUsd}`,
      ]),
    );
  } catch (e) {
    console.error("Notification error:", e);
  }

  return new Response(
    JSON.stringify({
      success: true,
      paid: false,
      checkout_url: approvalUrl,
      order_id: order.id,
      registration_ids: registrationIds,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
}
