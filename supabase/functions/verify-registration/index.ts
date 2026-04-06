import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendRegistrantConfirmationEmail, sendNotificationEmails, buildNotificationHtml } from "../_shared/notify.ts";

const PLATFORM_FEE_PERCENT = 5;
const HOLD_PERCENT = 15;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents";

async function sendTaxExemptReceipt(
  recipientEmail: string, firstName: string, lastName: string,
  tournamentTitle: string, tournamentDate: string | null,
  amountCents: number, nonprofitName: string, ein: string,
) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return;
  const dateStr = tournamentDate
    ? new Date(tournamentDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const amount = (amountCents / 100).toFixed(2);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr><td style="background:#1a5c38;padding:28px 32px;text-align:center;">
        <p style="margin:0 0 8px;font-size:32px;">🧾</p>
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Tax-Deductible Donation Receipt</h1>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">Dear <strong>${firstName} ${lastName}</strong>,</p>
        <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">Thank you for your generous contribution to <strong>${nonprofitName}</strong> through your registration for <strong>${tournamentTitle}</strong>.</p>
        <table width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:20px 0;"><tr><td style="padding:20px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Receipt Details</p>
          <table width="100%">
            <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Organization:</strong></td><td style="text-align:right;color:#374151;font-size:14px;">${nonprofitName}</td></tr>
            <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>EIN:</strong></td><td style="text-align:right;color:#374151;font-size:14px;">${ein}</td></tr>
            <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Amount:</strong></td><td style="text-align:right;color:#374151;font-size:14px;font-weight:700;">$${amount}</td></tr>
            <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Date:</strong></td><td style="text-align:right;color:#374151;font-size:14px;">${today}</td></tr>
            <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Event:</strong></td><td style="text-align:right;color:#374151;font-size:14px;">${tournamentTitle}</td></tr>
          </table>
        </td></tr></table>
        <p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:16px;">
          <strong>${nonprofitName}</strong> is a tax-exempt organization under Section 501(c)(3) of the Internal Revenue Code (EIN: ${ein}).
          No goods or services were provided in exchange for this contribution.
        </p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: `${SENDER_NAME} <${SENDER_EMAIL}>`, to: [recipientEmail], subject: `Tax-Deductible Receipt — ${tournamentTitle}`, html }),
  });
}

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
      const registrationIds = session.metadata?.registration_ids
        ? session.metadata.registration_ids.split(",")
        : session.metadata?.registration_id
          ? [session.metadata.registration_id]
          : [];

      if (registrationIds.length === 0) throw new Error("Missing registration IDs in session metadata");

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      await supabaseAdmin
        .from("tournament_registrations")
        .update({ payment_status: "paid" })
        .in("id", registrationIds);

      // Determine fee model from metadata
      const passFeesToGolfer = session.metadata?.pass_fees_to_golfer === "true";
      const grossRegistrationCents = session.metadata?.gross_registration_cents
        ? parseInt(session.metadata.gross_registration_cents)
        : 0;

      // Use gross registration amount (what the organizer set) as the basis
      // If metadata is missing (legacy), fall back to session.amount_total
      const grossAmount = grossRegistrationCents > 0 ? grossRegistrationCents : (session.amount_total || 0);

      const organizationId = session.metadata?.organization_id;
      const tournamentId = session.metadata?.tournament_id;

      if (organizationId && grossAmount > 0) {
        // Platform fee is always 4% of the registration amount
        const platformFeeCents = Math.round(grossAmount * (PLATFORM_FEE_PERCENT / 100));

        // Net for organizer depends on fee model:
        // Model A (pass to golfer): Organizer gets full registration amount (fee paid by golfer separately)
        // Model B (absorb): Organizer gets registration minus 5% fee
        const netAmountCents = passFeesToGolfer
          ? grossAmount
          : grossAmount - platformFeeCents;

        // 15% hold on the net amount
        const holdAmountCents = Math.round(netAmountCents * (HOLD_PERCENT / 100));

        // Calculate hold_release_date: event end_date + 15 days
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
          amount_cents: grossAmount,
          platform_fee_cents: platformFeeCents,
          net_amount_cents: netAmountCents,
          hold_amount_cents: holdAmountCents,
          hold_release_date: holdReleaseDate,
          hold_status: "active",
          type: "registration",
          status: "held",
          stripe_session_id: session_id,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          description: `Registration payment — ${registrationIds.length} player(s)${passFeesToGolfer ? " (fees passed to golfer)" : " (fees absorbed by organizer)"}`,
        });
      }

      // Send confirmation + tax receipt
      try {
        const { data: regs } = await supabaseAdmin
          .from("tournament_registrations")
          .select("first_name, last_name, email, tournament_id")
          .in("id", registrationIds);

        const reg = regs?.[0];
        if (reg) {
          const { data: tournament } = await supabaseAdmin
            .from("tournaments")
            .select("title, date, location, organization_id")
            .eq("id", reg.tournament_id)
            .single();

          if (tournament) {
            for (const r of regs || []) {
              await sendRegistrantConfirmationEmail(
                r.first_name, r.last_name, r.email,
                tournament.title, tournament.date, tournament.location,
              );
            }

            const playerNames = (regs || []).map((r: any) => `${r.first_name} ${r.last_name}`).join(", ");
            const amountDisplay = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : "N/A";
            await sendNotificationEmails(
              supabaseAdmin,
              tournament.organization_id,
              "notify_registration",
              `Payment Confirmed — ${tournament.title}`,
              buildNotificationHtml("Registration Payment Confirmed", [
                `<strong>${playerNames}</strong> completed payment for <strong>${tournament.title}</strong>.`,
                `💳 Amount charged: <strong>${amountDisplay}</strong>`,
                passFeesToGolfer
                  ? `📊 Fees passed to golfer — you receive the full registration amount minus 15% hold`
                  : `📊 5% platform fee absorbed — net amount after fee and 15% hold applied`,
                `📧 ${reg.email}`,
                regs && regs.length > 1 ? `👥 Group registration (${regs.length} players)` : "",
              ].filter(Boolean)),
            );

            // Nonprofit tax receipt
            const { data: orgData } = await supabaseAdmin
              .from("organizations")
              .select("is_nonprofit, ein, nonprofit_name, nonprofit_verified")
              .eq("id", tournament.organization_id)
              .single();

            if (orgData?.is_nonprofit && orgData.ein && orgData.nonprofit_verified) {
              await sendTaxExemptReceipt(
                reg.email, reg.first_name, reg.last_name,
                tournament.title, tournament.date,
                grossAmount, orgData.nonprofit_name || orgData.ein, orgData.ein,
              );
            }
          }
        }
      } catch (e) {
        console.error("Confirmation/receipt error:", e);
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
