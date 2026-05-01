import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml } from "../_shared/notify.ts";

const PLATFORM_FEE_RATE = 0.05;
const HOLD_PERCENT = 15;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

const parseCents = (value?: string | null) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      const sponsorRegistrationId = session.metadata?.sponsor_registration_id;
      if (!sponsorRegistrationId) throw new Error("Missing sponsor registration ID in session metadata");

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // IDEMPOTENCY GUARD: if this sponsor registration is already marked paid,
      // skip all side effects (DB inserts, emails) to avoid duplicate notifications
      // when the success URL is reloaded or revisited.
      const { data: existingReg } = await supabaseAdmin
        .from("sponsor_registrations")
        .select("payment_status")
        .eq("id", sponsorRegistrationId)
        .single();

      if (existingReg?.payment_status === "paid") {
        return new Response(
          JSON.stringify({ verified: true, status: "paid", already_processed: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      }

      // Update sponsor registration to paid
      await supabaseAdmin
        .from("sponsor_registrations")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        })
        .eq("id", sponsorRegistrationId);

      // Record platform transaction
      const grossAmountCents = parseCents(session.metadata?.gross_amount_cents);
      const platformFeeCents = parseCents(session.metadata?.platform_fee_cents) || Math.round(grossAmountCents * PLATFORM_FEE_RATE);
      const stripeFeeCents = parseCents(session.metadata?.stripe_fee_cents);
      const applicationFeeCents = parseCents(session.metadata?.application_fee_cents) || (platformFeeCents + stripeFeeCents);
      const chargeTotalCents = parseCents(session.metadata?.charge_total_cents) || (session.amount_total ?? (grossAmountCents + applicationFeeCents));
      // Sponsor pays all fees on top of gross. Net to organizer = total charged − application fee
      // (which equals the gross sponsorship amount). Previously this incorrectly subtracted
      // fees from the gross, under-reporting the organizer's net.
      const netAmountCents = Math.max(chargeTotalCents - applicationFeeCents, 0);
      const organizationId = session.metadata?.organization_id;
      const tournamentId = session.metadata?.tournament_id;

      if (organizationId && grossAmountCents > 0) {
        const holdAmountCents = Math.round(netAmountCents * (HOLD_PERCENT / 100));

        let holdReleaseDate: string | null = null;
        if (tournamentId) {
          const { data: tData } = await supabaseAdmin
            .from("tournaments")
            .select("end_date, date")
            .eq("id", tournamentId)
            .single();
          const eventEnd = tData?.end_date || tData?.date;
          if (eventEnd) {
            const d = new Date(eventEnd);
            d.setDate(d.getDate() + 15);
            holdReleaseDate = d.toISOString().split("T")[0];
          }
        }

        await supabaseAdmin.from("platform_transactions").insert({
          organization_id: organizationId,
          tournament_id: tournamentId || null,
          amount_cents: grossAmountCents,
          platform_fee_cents: platformFeeCents,
          net_amount_cents: netAmountCents,
          hold_amount_cents: holdAmountCents,
          hold_release_date: holdReleaseDate,
          hold_status: "active",
          type: "sponsorship",
          status: "held",
          stripe_session_id: session_id,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          description: `Sponsorship payment — ${session.metadata?.company_name || "Unknown"} (${session.metadata?.tier_id ? "tier" : "custom"})`,
          metadata: {
            sponsor_registration_id: sponsorRegistrationId,
            company_name: session.metadata?.company_name,
            charge_total_cents: parseCents(session.metadata?.charge_total_cents),
            application_fee_cents: applicationFeeCents,
            stripe_fee_cents: stripeFeeCents,
          },
        });
      }

      // Also add to tournament_sponsors for display
      const { data: reg } = await supabaseAdmin
        .from("sponsor_registrations")
        .select("*, sponsorship_tiers(name)")
        .eq("id", sponsorRegistrationId)
        .single();

      if (reg) {
        // Map tier name to existing tier system
        const tierMapping: Record<string, string> = {
          "Title Sponsor": "title",
          "Platinum Sponsor": "platinum",
          "Gold Sponsor": "gold",
          "Silver Sponsor": "silver",
          "Bronze Sponsor": "bronze",
          "Hole Sponsor": "hole",
        };
        const tierName = (reg as any).sponsorship_tiers?.name || "silver";
        const mappedTier = Object.entries(tierMapping).find(([k]) =>
          tierName.toLowerCase().includes(k.toLowerCase().replace(" sponsor", ""))
        )?.[1] || "silver";

        await supabaseAdmin.from("tournament_sponsors").insert({
          tournament_id: tournamentId,
          name: reg.company_name,
          tier: mappedTier,
          logo_url: reg.logo_url,
          website_url: reg.website_url,
          description: reg.description,
          amount: reg.amount_cents / 100,
          is_paid: true,
          show_on_leaderboard: true,
        });

        // Send notification to organizer
        try {
          if (organizationId) {
            const { data: tournament } = await supabaseAdmin
              .from("tournaments")
              .select("title")
              .eq("id", tournamentId)
              .single();

            await sendNotificationEmails(
              supabaseAdmin,
              organizationId,
              "notify_registration",
              `New Sponsor — ${tournament?.title || "Tournament"}`,
              buildNotificationHtml("New Sponsor Registration", [
                `🏢 <strong>${reg.company_name}</strong> registered as a <strong>${tierName}</strong> sponsor.`,
                `📧 ${reg.contact_email}${reg.contact_phone ? ` • 📱 ${reg.contact_phone}` : ""}`,
                `💰 Sponsorship amount: <strong>$${(grossAmountCents / 100).toFixed(2)}</strong>`,
                `🏷️ Platform fee: <strong>$${(platformFeeCents / 100).toFixed(2)}</strong>`,
                `💵 Net to organizer: <strong>$${(netAmountCents / 100).toFixed(2)}</strong>`,
              ]),
              tournamentId,
            );
          }
        } catch (e) {
          console.error("Sponsor notification error:", e);
        }

        // Admin notification
        try {
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          if (RESEND_API_KEY) {
            const { data: tournament } = await supabaseAdmin
              .from("tournaments")
              .select("title, slug, contact_email")
              .eq("id", tournamentId)
              .single();

            const adminHtml = buildNotificationHtml("New Sponsorship Transaction", [
              `🏢 <strong>${reg.company_name}</strong> — ${tierName}`,
              `🏌️ Tournament: <strong>${tournament?.title || "Unknown"}</strong>`,
              `💰 Gross: $${(grossAmountCents / 100).toFixed(2)}`,
              `🏷️ Platform Fee (5%): $${(platformFeeCents / 100).toFixed(2)}`,
              `💵 Net to Organizer: $${(netAmountCents / 100).toFixed(2)}`,
              `📧 ${reg.contact_email}`,
            ]);

            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({
                from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
                to: ["info@teevents.golf"],
                subject: `New Sponsor — ${reg.company_name} — ${tournament?.title || "Tournament"}`,
                html: adminHtml,
              }),
            });

            // Send confirmation email to sponsor
            const tournamentPageUrl = tournament?.slug
              ? `https://www.teevents.golf/t/${tournament.slug}`
              : null;

            const sponsorConfirmHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1a5c38;padding:28px 32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:32px;">⛳</p>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Sponsorship Confirmed!</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">Dear <strong>${reg.contact_name}</strong>,</p>
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">Thank you for becoming a <strong>${tierName}</strong> sponsor for <strong>${tournament?.title || "the tournament"}</strong>!</p>
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">💰 <strong>Amount:</strong> $${(grossAmountCents / 100).toFixed(2)}</p>
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">Your logo and company information will appear on the tournament website within 24 hours.</p>
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;"><strong>Next steps:</strong></p>
          <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.7;">• The tournament organizer will reach out with any additional asset requests.</p>
          <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.7;">• Your sponsorship benefits will be delivered as described on the tournament website.</p>
          ${tournament?.contact_email ? `<p style="margin:14px 0;color:#374151;font-size:15px;line-height:1.7;">If you have any questions, please contact the organizer at <a href="mailto:${tournament.contact_email}" style="color:#1a5c38;">${tournament.contact_email}</a>.</p>` : ""}
          <p style="margin:14px 0 0;color:#374151;font-size:15px;line-height:1.7;">Thank you for your support! ⛳</p>
        </td></tr>${tournamentPageUrl ? `
        <tr><td style="padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <a href="${tournamentPageUrl}" style="display:inline-block;padding:12px 28px;background-color:#1a5c38;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">View Tournament Page</a>
        </td></tr>` : ""}
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a> | <a href="mailto:info@teevents.golf" style="color:#9ca3af;text-decoration:underline;">Need help? Contact support</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({
                from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
                to: [reg.contact_email],
                subject: `Sponsorship Confirmed — ${tournament?.title || "Tournament"}`,
                html: sponsorConfirmHtml,
              }),
            });
            console.log(`[Confirmation] Sponsor confirmation sent to ${reg.contact_email}`);
          }
        } catch (e) {
          console.error("Admin/sponsor notification error:", e);
        }
      }

      return new Response(
        JSON.stringify({ verified: true, status: "paid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ verified: false, status: session.payment_status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
