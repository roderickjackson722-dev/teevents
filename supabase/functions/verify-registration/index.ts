import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendRegistrantConfirmationEmail, sendNotificationEmails, buildNotificationHtml } from "../_shared/notify.ts";

const PLATFORM_FEE_RATE = 0.05; // 5% platform fee
const HOLD_PERCENT = 15;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents";
const parseCents = (value?: string | null) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};
const calculateProcessingFee = (chargeAmountCents: number) =>
  Math.max(0, Math.round(chargeAmountCents * 0.029 + 30));

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

      const passFeesToGolfer = session.metadata?.pass_fees_to_golfer === "true";
      const grossRegistrationCents = parseCents(session.metadata?.gross_registration_cents);
      const grossAmount = grossRegistrationCents > 0 ? grossRegistrationCents : (session.amount_total || 0);
      const platformFeeCents = parseCents(session.metadata?.platform_fee_cents) || Math.round(grossAmount * PLATFORM_FEE_RATE);
      const chargeTotalCents = parseCents(session.metadata?.charge_total_cents)
        || session.amount_total
        || (passFeesToGolfer ? grossAmount + platformFeeCents : grossAmount);
      const fallbackStripeFeeCents = passFeesToGolfer
        ? Math.max(chargeTotalCents - grossAmount - platformFeeCents, 0)
        : calculateProcessingFee(chargeTotalCents);
      const stripeFeeCents = parseCents(session.metadata?.stripe_fee_cents) || fallbackStripeFeeCents;
      const applicationFeeCents = parseCents(session.metadata?.application_fee_cents) || (platformFeeCents + stripeFeeCents);
      const netAmountCents = parseCents(session.metadata?.organizer_net_cents) || Math.max(chargeTotalCents - applicationFeeCents, 0);

      const organizationId = session.metadata?.organization_id;
      const tournamentId = session.metadata?.tournament_id;

      if (organizationId && grossAmount > 0) {
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

        // Fetch organizer payout method and primary registrant info
        const { data: orgPayout } = await supabaseAdmin
          .from("organizations")
          .select("payout_method")
          .eq("id", organizationId)
          .single();

        let golferName: string | null = null;
        let golferEmail: string | null = null;
        if (registrationIds.length > 0) {
          const { data: firstReg } = await supabaseAdmin
            .from("tournament_registrations")
            .select("first_name, last_name, email")
            .eq("id", registrationIds[0])
            .single();
          if (firstReg) {
            golferName = `${firstReg.first_name} ${firstReg.last_name}`.trim();
            golferEmail = firstReg.email;
          }
        }

        await supabaseAdmin.from("platform_transactions").insert({
          organization_id: organizationId,
          tournament_id: tournamentId || null,
          registration_id: registrationIds[0] || null,
          golfer_name: golferName,
          golfer_email: golferEmail,
          payout_method: orgPayout?.payout_method || "check",
          amount_cents: grossAmount,
          platform_fee_cents: platformFeeCents,
          stripe_fee_cents: stripeFeeCents,
          net_amount_cents: netAmountCents,
          hold_amount_cents: holdAmountCents,
          hold_release_date: holdReleaseDate,
          hold_status: "active",
          type: "registration",
          status: "held",
          stripe_session_id: session_id,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          description: `Registration payment — ${registrationIds.length} player(s)${passFeesToGolfer ? " (platform + Stripe fees paid by golfer)" : " (platform + Stripe fees absorbed by organizer)"}`,
          metadata: {
            pass_fees_to_golfer: passFeesToGolfer,
            charge_total_cents: chargeTotalCents,
            application_fee_cents: applicationFeeCents,
            stripe_fee_cents: stripeFeeCents,
            registration_ids: registrationIds,
          },
        });
      }

      try {
        const { data: regs } = await supabaseAdmin
          .from("tournament_registrations")
          .select("first_name, last_name, email, tournament_id")
          .in("id", registrationIds);

        const reg = regs?.[0];
        if (reg) {
          const { data: tournament } = await supabaseAdmin
            .from("tournaments")
            .select("title, date, location, organization_id, slug")
            .eq("id", reg.tournament_id)
            .single();

          if (tournament) {
            for (const r of regs || []) {
              await sendRegistrantConfirmationEmail(
                r.first_name, r.last_name, r.email,
                tournament.title, tournament.date, tournament.location,
                (tournament as any).slug, reg.tournament_id,
              );
            }

            const playerNames = (regs || []).map((r: any) => `${r.first_name} ${r.last_name}`).join(", ");
            const amountDisplay = chargeTotalCents ? `$${(chargeTotalCents / 100).toFixed(2)}` : "N/A";
            await sendNotificationEmails(
              supabaseAdmin,
              tournament.organization_id,
              "notify_registration",
              `Payment Confirmed — ${tournament.title}`,
              buildNotificationHtml("Registration Payment Confirmed", [
                `<strong>${playerNames}</strong> completed payment for <strong>${tournament.title}</strong>.`,
                `💳 Amount charged: <strong>${amountDisplay}</strong>`,
                `🏷️ Platform fee retained: <strong>$${(platformFeeCents / 100).toFixed(2)}</strong>`,
                `💳 Stripe processing fee: <strong>$${(stripeFeeCents / 100).toFixed(2)}</strong>`,
                `💵 Organizer net before hold: <strong>$${(netAmountCents / 100).toFixed(2)}</strong>`,
                passFeesToGolfer
                  ? `📊 Golfer covered platform + Stripe fees.`
                  : `📊 Organizer absorbed platform + Stripe fees.`,
                `📧 ${reg.email}`,
                regs && regs.length > 1 ? `👥 Group registration (${regs.length} players)` : "",
              ].filter(Boolean)),
            );

            const { data: orgData } = await supabaseAdmin
              .from("organizations")
              .select("is_nonprofit, ein, nonprofit_name, nonprofit_verified, name")
              .eq("id", tournament.organization_id)
              .single();

            if (orgData?.is_nonprofit && orgData.ein && orgData.nonprofit_verified) {
              await sendTaxExemptReceipt(
                reg.email, reg.first_name, reg.last_name,
                tournament.title, tournament.date,
                grossAmount, orgData.nonprofit_name || orgData.ein, orgData.ein,
              );
            }

            try {
              const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
              if (RESEND_API_KEY) {
                const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
                const orgName = orgData?.name || "Unknown Org";

                const adminHtml = buildNotificationHtml("New Registration Transaction", [
                  `🏌️ <strong>${playerNames}</strong> registered for <strong>${tournament.title}</strong>`,
                  `🏢 <strong>Organizer:</strong> ${orgName}`,
                  `💰 <strong>Gross Registration:</strong> $${(grossAmount / 100).toFixed(2)}`,
                  `🏷️ <strong>Platform Fee (5%):</strong> $${(platformFeeCents / 100).toFixed(2)}`,
                  `💳 <strong>Stripe Processing Fee:</strong> $${(stripeFeeCents / 100).toFixed(2)}`,
                  `💵 <strong>Net to Organizer:</strong> $${(netAmountCents / 100).toFixed(2)}`,
                  passFeesToGolfer ? `📋 Fee Model: Golfer covered platform + Stripe fees` : `📋 Fee Model: Organizer absorbed platform + Stripe fees`,
                  `📧 <strong>Golfer Email:</strong> ${reg.email}`,
                  `👥 <strong>Players:</strong> ${(regs || []).length}`,
                  `📅 ${dateStr}`,
                ]);

                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
                  body: JSON.stringify({
                    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
                    to: ["info@teevents.golf"],
                    subject: `New Registration – ${tournament.title} – ${playerNames}`,
                    html: adminHtml,
                  }),
                });
              }
            } catch (adminErr) {
              console.error("Admin notification error:", adminErr);
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

    // Handle non-paid status — log failure and notify
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const organizationId = session.metadata?.organization_id;
        const tournamentId = session.metadata?.tournament_id;
        const failureReason = `Stripe checkout status: ${session.payment_status}`;

        if (organizationId) {
          await supabaseAdmin.from("platform_transactions").insert({
            organization_id: organizationId,
            tournament_id: tournamentId || null,
            amount_cents: session.amount_total || 0,
            platform_fee_cents: 0,
            stripe_fee_cents: 0,
            net_amount_cents: 0,
            type: "registration",
            status: "failed",
            failure_reason: failureReason,
            stripe_session_id: session_id,
            stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
            description: `Failed registration payment — ${failureReason}`,
            metadata: { session_status: session.payment_status },
          });

          await supabaseAdmin.from("admin_notifications").insert({
            type: "transaction_failed",
            organization_id: organizationId,
            message: `Failed transaction for session ${session_id}: ${failureReason}`,
          });

          // Email organizer + admin
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          if (RESEND_API_KEY) {
            const { data: orgData } = await supabaseAdmin
              .from("organizations")
              .select("name")
              .eq("id", organizationId)
              .single();

            const { data: notifEmails } = await supabaseAdmin
              .from("notification_emails")
              .select("email")
              .eq("organization_id", organizationId)
              .eq("notify_registration", true);

            const recipients = (notifEmails || []).map((n: any) => n.email);
            const html = buildNotificationHtml("⚠️ Payment Issue", [
              `A recent registration payment could not be processed.`,
              `<strong>Reason:</strong> ${failureReason}`,
              `<strong>Session:</strong> ${session_id}`,
              `Please log in to your dashboard to review and retry.`,
            ]);

            if (recipients.length > 0) {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
                body: JSON.stringify({
                  from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
                  to: recipients,
                  subject: `Action Required: Payment issue`,
                  html,
                }),
              });
            }

            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({
                from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
                to: ["info@teevents.golf"],
                subject: `⚠️ Failed transaction – ${orgData?.name || "Unknown Org"}`,
                html: buildNotificationHtml("Failed Transaction", [
                  `Transaction <strong>${session_id}</strong> failed.`,
                  `<strong>Organizer:</strong> ${orgData?.name || "Unknown"}`,
                  `<strong>Reason:</strong> ${failureReason}`,
                  `Please investigate.`,
                ]),
              }),
            });
          }
        }
      } catch (failErr) {
        console.error("Failure logging error:", failErr);
      }
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
