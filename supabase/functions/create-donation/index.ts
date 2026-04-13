import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml } from "../_shared/notify.ts";

const PLATFORM_FEE_RATE = 0.05; // 5% platform fee

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
    const { amount_cents, tournament_title, tournament_slug, tournament_id, donor_email } =
      await req.json();

    if (!amount_cents || amount_cents < 100) {
      throw new Error("Minimum donation is $1.00");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get organization_id and fee toggle for the transaction record
    let organizationId: string | null = null;
    let passFeesToParticipants = true;
    if (tournament_id) {
      const { data: tournament } = await supabaseAdmin
        .from("tournaments")
        .select("organization_id, pass_fees_to_participants")
        .eq("id", tournament_id)
        .single();
      organizationId = tournament?.organization_id || null;
      passFeesToParticipants = (tournament as any)?.pass_fees_to_participants !== false;
    }

    // Check for existing Stripe customer
    let customerId: string | undefined;
    if (donor_email) {
      const customers = await stripe.customers.list({ email: donor_email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const origin = req.headers.get("origin") || "https://teevents.lovable.app";

    const lineItems: any[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Donation — ${tournament_title || "Golf Tournament"}`,
          },
          unit_amount: amount_cents,
        },
        quantity: 1,
      },
    ];

    // If passing fees to participants, add platform fee + Stripe processing fee
    if (passFeesToParticipants) {
      const platformFeeCents = Math.round(amount_cents * PLATFORM_FEE_RATE);
      const preStripeTotal = amount_cents + platformFeeCents;
      const stripeFee = Math.round((preStripeTotal + 30) / (1 - 0.029)) - preStripeTotal;
      const combinedFees = platformFeeCents + stripeFee;
      if (combinedFees > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Fees",
            },
            unit_amount: combinedFees,
          },
          quantity: 1,
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : donor_email || undefined,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/t/${tournament_slug}?donated=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/t/${tournament_slug}#donation`,
      metadata: {
        type: "donation",
        tournament_slug: tournament_slug || "",
        tournament_id: tournament_id || "",
        organization_id: organizationId || "",
      },
    });

    // Record donation as pending
    if (tournament_id) {
      await supabaseAdmin.from("tournament_donations").insert({
        tournament_id,
        amount_cents,
        donor_email: donor_email || null,
        stripe_session_id: session.id,
        status: "pending",
      });

      // Send notification emails
      try {
        const { data: tournamentData } = await supabaseAdmin
          .from("tournaments")
          .select("organization_id, title")
          .eq("id", tournament_id)
          .single();

        if (tournamentData) {
          await sendNotificationEmails(
            supabaseAdmin,
            tournamentData.organization_id,
            "notify_donation",
            `New Donation — ${tournamentData.title}`,
            buildNotificationHtml("New Donation Received", [
              `A donation of <strong>$${(amount_cents / 100).toFixed(2)}</strong> was made for <strong>${tournamentData.title}</strong>.`,
              donor_email ? `📧 Donor: ${donor_email}` : "👤 Anonymous donor",
            ]),
          );
        }
      } catch (e) {
        console.error("Notification error:", e);
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
