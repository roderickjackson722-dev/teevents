import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendRegistrantConfirmationEmail } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents";

async function sendTaxExemptReceipt(
  recipientEmail: string,
  firstName: string,
  lastName: string,
  tournamentTitle: string,
  tournamentDate: string | null,
  amountCents: number,
  nonprofitName: string,
  ein: string,
) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return;

  const dateStr = tournamentDate
    ? new Date(tournamentDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const amount = (amountCents / 100).toFixed(2);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1a5c38;padding:28px 32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:32px;">🧾</p>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Tax-Deductible Donation Receipt</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">
            Dear <strong>${firstName} ${lastName}</strong>,
          </p>
          <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">
            Thank you for your generous contribution to <strong>${nonprofitName}</strong> through your registration for <strong>${tournamentTitle}</strong>.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:20px 0;">
            <tr><td style="padding:20px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Receipt Details</p>
              <table width="100%">
                <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Organization:</strong></td><td style="text-align:right;color:#374151;font-size:14px;">${nonprofitName}</td></tr>
                <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>EIN:</strong></td><td style="text-align:right;color:#374151;font-size:14px;">${ein}</td></tr>
                <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Amount:</strong></td><td style="text-align:right;color:#374151;font-size:14px;font-weight:700;">$${amount}</td></tr>
                <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Date:</strong></td><td style="text-align:right;color:#374151;font-size:14px;">${today}</td></tr>
                <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Event:</strong></td><td style="text-align:right;color:#374151;font-size:14px;">${tournamentTitle}</td></tr>
                ${tournamentDate ? `<tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Event Date:</strong></td><td style="text-align:right;color:#374151;font-size:14px;">${dateStr}</td></tr>` : ""}
              </table>
            </td></tr>
          </table>

          <p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:16px;">
            <strong>${nonprofitName}</strong> is a tax-exempt organization under Section 501(c)(3) of the Internal Revenue Code (EIN: ${ein}).
            No goods or services were provided in exchange for this contribution.
            This letter serves as your official receipt for tax purposes. Please retain for your records.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:#1a5c38;">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [recipientEmail],
      subject: `Tax-Deductible Receipt — ${tournamentTitle}`,
      html,
    }),
  });

  console.log(`[Receipt] Tax-exempt receipt sent to ${recipientEmail}`);
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

      // Send confirmation + tax receipt
      try {
        const { data: reg } = await supabaseAdmin
          .from("tournament_registrations")
          .select("first_name, last_name, email, tournament_id")
          .eq("id", registrationIds[0])
          .single();

        if (reg) {
          const { data: tournament } = await supabaseAdmin
            .from("tournaments")
            .select("title, date, location, organization_id")
            .eq("id", reg.tournament_id)
            .single();

          if (tournament) {
            // Send standard confirmation
            await sendRegistrantConfirmationEmail(
              reg.first_name, reg.last_name, reg.email,
              tournament.title, tournament.date, tournament.location,
            );

            // If nonprofit, send tax-exempt receipt
            const isNonprofit = session.metadata?.is_nonprofit === "true";
            const ein = session.metadata?.ein || "";
            const nonprofitName = session.metadata?.nonprofit_name || "";

            if (isNonprofit && ein) {
              const amountCents = session.amount_total || 0;
              await sendTaxExemptReceipt(
                reg.email, reg.first_name, reg.last_name,
                tournament.title, tournament.date,
                amountCents, nonprofitName, ein,
              );
            }
          }
        }
      } catch (e) {
        console.error("Registrant confirmation/receipt error:", e);
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
