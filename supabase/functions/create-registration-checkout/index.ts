import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml, sendRegistrantConfirmationEmail } from "../_shared/notify.ts";

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tournament, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id, registration_open, site_published, registration_fee_cents, date, location, pass_fees_to_participants")
      .eq("id", tournament_id)
      .single();

    if (tErr || !tournament) throw new Error("Tournament not found");
    if (!tournament.registration_open || !tournament.site_published) {
      throw new Error("Registration is not open for this tournament");
    }

    const feeCents = tournament.registration_fee_cents || 0;
    const passFeesToParticipants = (tournament as any).pass_fees_to_participants !== false;
    const totalFeeCents = feeCents * players.length;

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
      payment_status: feeCents > 0 ? "pending" : "paid",
    }));

    const { data: registrations, error: regErr } = await supabaseAdmin
      .from("tournament_registrations")
      .insert(registrationInserts)
      .select("id");

    if (regErr) throw new Error(regErr.message);
    const registrationIds = (registrations || []).map((r: any) => r.id);

    // Send notification emails
    try {
      const playerNames = players.map((p: any) => `${p.first_name} ${p.last_name}`).join(", ");
      await sendNotificationEmails(
        supabaseAdmin,
        tournament.organization_id,
        "notify_registration",
        `New Registration — ${tournament.title}`,
        buildNotificationHtml("New Player Registration", [
          `<strong>${playerNames}</strong> registered for <strong>${tournament.title}</strong>.`,
          `📧 ${email}${players[0].phone ? ` • 📱 ${players[0].phone}` : ""}`,
          isFoursome ? `👥 Foursome registration (${players.length} players)` : "",
          feeCents > 0 ? `💳 Registration fee: $${(totalFeeCents / 100).toFixed(2)} (payment pending)` : "✅ No registration fee — confirmed.",
        ].filter(Boolean)),
      );
    } catch (e) {
      console.error("Notification error:", e);
    }

    // If no fee, registration is complete
    if (feeCents <= 0) {
      try {
        await sendRegistrantConfirmationEmail(
          first_name, last_name, email.trim(),
          tournament.title, tournament.date, tournament.location,
        );
      } catch (e) {
        console.error("Registrant confirmation error:", e);
      }

      return new Response(
        JSON.stringify({ success: true, paid: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Fee required — create Stripe checkout on PLATFORM account (no destination charges)
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: email.trim(), limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";
    const playerNames = players.map((p: any) => `${p.first_name} ${p.last_name}`).join(", ");

    const lineItems: any[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Registration — ${tournament.title}`,
            description: isFoursome ? `Foursome: ${playerNames}` : playerNames,
          },
          unit_amount: feeCents,
        },
        quantity: players.length,
      },
    ];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email.trim(),
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${tournament.slug}?registered=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/t/${tournament.slug}#register`,
      metadata: {
        type: "registration",
        tournament_id,
        organization_id: tournament.organization_id,
        registration_ids: registrationIds.join(","),
      },
    });

    return new Response(
      JSON.stringify({ success: true, paid: false, checkout_url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
