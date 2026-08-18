// Stripe webhook for league payments. Handles both platform-level (league access unlock)
// and connected-account (membership / event fee) checkout.session.completed events, plus
// account.updated (to flip organization_payout_methods.stripe_onboarding_complete for the
// real-time banner in the League Overview tab).
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildLeagueRegistrationAnswersHtml,
  notifyLeagueManagers,
  buildNotificationHtml,
  notifyPlatformAdmin,
} from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
};

async function sendConfirmationEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key || !opts.to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "TeeVents Golf Management <info@notifications.teevents.golf>",
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });
  } catch (e) {
    console.error("Email send error:", (e as Error).message);
  }
}

function confirmationHtml(opts: {
  headline: string;
  leagueName: string;
  eventName?: string;
  eventDate?: string;
  amountCents: number;
  reference: string;
  memberName?: string;
  continueUrl?: string;
}) {
  const dollars = (opts.amountCents / 100).toFixed(2);
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:20px">
      <h2 style="color:#1a5c38;margin:0 0 8px">${opts.headline}</h2>
      <p style="color:#555;margin:0 0 16px">Thanks${opts.memberName ? `, ${opts.memberName}` : ""} — your payment was received.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
        <tr><td style="padding:6px 0;color:#666">League</td><td style="padding:6px 0"><strong>${opts.leagueName}</strong></td></tr>
        ${opts.eventName ? `<tr><td style="padding:6px 0;color:#666">Event</td><td style="padding:6px 0"><strong>${opts.eventName}</strong></td></tr>` : ""}
        ${opts.eventDate ? `<tr><td style="padding:6px 0;color:#666">Date</td><td style="padding:6px 0">${opts.eventDate}</td></tr>` : ""}
        <tr><td style="padding:6px 0;color:#666">Amount paid</td><td style="padding:6px 0"><strong>$${dollars}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Status</td><td style="padding:6px 0"><span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-weight:600">PAID</span></td></tr>
        <tr><td style="padding:6px 0;color:#666">Reference</td><td style="padding:6px 0;font-family:monospace;font-size:12px">${opts.reference}</td></tr>
      </table>
      ${opts.continueUrl ? `<p style="margin:20px 0"><a href="${opts.continueUrl}" style="background:#F5A623;color:#1a5c38;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Continue to Event</a></p>` : ""}
      <p style="color:#888;font-size:12px;margin-top:24px">Keep this email as your receipt. Reply if you have any questions.</p>
    </div>
  `;
}

const actualStripeFeeCents = (grossCents: number) =>
  grossCents > 0 ? Math.round(grossCents * 0.029) + 30 : 0;

/**
 * Records a completed league payment's true gross/fee split and mirrors it into the
 * TeeVents admin transaction ledger so league money shows up alongside tournaments.
 */
async function finalizeLeaguePayment(
  supabaseAdmin: any,
  paymentId: string,
  session: any,
  description: string,
) {
  const gross = Number(session.amount_total || 0);
  const stripeFee = actualStripeFeeCents(gross);
  const { data: payment } = await supabaseAdmin
    .from("league_payments")
    .update({
      status: "paid",
      gross_amount_cents: gross || null,
      stripe_fee_cents: stripeFee,
      entry_source: "online",
      stripe_payment_intent: String(session.payment_intent || ""),
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .select("id, league_id, platform_fee_cents, payer_email, stripe_session_id")
    .maybeSingle();
  if (!payment) return null;

  try {
    const { data: league } = await supabaseAdmin
      .from("golf_leagues")
      .select("id, league_name, organization_id")
      .eq("id", payment.league_id)
      .maybeSingle();
    if (!league?.organization_id) return null;
    const platformFee = payment.platform_fee_cents || 0;
    const net = Math.max(gross - platformFee - stripeFee, 0);
    await supabaseAdmin.from("platform_transactions").insert({
      organization_id: league.organization_id,
      amount_cents: gross,
      platform_fee_cents: platformFee,
      stripe_fee_cents: stripeFee,
      net_amount_cents: net,
      type: "league",
      status: "completed",
      stripe_session_id: payment.stripe_session_id || String(session.id),
      stripe_payment_intent_id: String(session.payment_intent || ""),
      golfer_email: payment.payer_email || session.customer_details?.email || null,
      description: `${league.league_name} — ${description}`,
      metadata: { league_id: league.id, league_payment_id: payment.id, source: "league" },
    });
    return { payment, league, gross, platformFee, stripeFee, net };
  } catch (e) {
    console.error("platform_transactions mirror failed:", (e as Error).message);
    return null;
  }
}

async function notifyLeagueTransaction(
  supabaseAdmin: any,
  finalized: any,
  label: string,
  memberName: string | null,
  eventName?: string | null,
) {
  if (!finalized) return;
  const dollars = (cents: number) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
  await notifyPlatformAdmin({
    supabaseAdmin,
    type: "other",
    organizationId: finalized.league.organization_id,
    subject: `✅ League transaction — ${finalized.league.league_name}`,
    htmlBody: buildNotificationHtml("League Transaction Completed", [
      `🏌️ <strong>League:</strong> ${finalized.league.league_name}`,
      eventName ? `⛳ <strong>Event:</strong> ${eventName}` : `🧾 <strong>Type:</strong> ${label}`,
      memberName ? `👤 <strong>Member:</strong> ${memberName}` : "",
      `💳 <strong>Customer paid:</strong> ${dollars(finalized.gross)}`,
      `🏷️ <strong>Platform fee:</strong> ${dollars(finalized.platformFee)}`,
      `💰 <strong>Organizer payout:</strong> ${dollars(finalized.net)}`,
      `🔖 <strong>Reference:</strong> ${finalized.payment.stripe_session_id || finalized.payment.id}`,
    ].filter(Boolean)),
  });
}

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();
  const secret = Deno.env.get("STRIPE_LEAGUE_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET");
  let event: Stripe.Event;
  try {
    event = secret
      ? await stripe.webhooks.constructEventAsync(body, sig, secret)
      : (JSON.parse(body) as Stripe.Event);
  } catch (e: any) {
    return new Response(`Signature error: ${e.message}`, { status: 400 });
  }

  try {
    if (event.type === "account.updated") {
      const acct = event.data.object as Stripe.Account;
      const onboarded = !!acct.charges_enabled && !!acct.payouts_enabled && !!acct.details_submitted;
      await supabaseAdmin
        .from("organization_payout_methods")
        .update({
          stripe_onboarding_complete: onboarded,
          stripe_account_status: onboarded ? "active" : (acct.details_submitted ? "pending_verification" : "pending"),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", acct.id);
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = session.metadata?.kind;

      if (kind === "league_access") {
        const purchaseId = session.metadata!.purchase_id;
        const leagueId = session.metadata!.league_id;
        const promo = session.metadata?.promo_code || null;
        await supabaseAdmin
          .from("league_access_purchases")
          .update({
            status: "paid",
            stripe_payment_intent: String(session.payment_intent || ""),
          })
          .eq("id", purchaseId);
        await supabaseAdmin
          .from("golf_leagues")
          .update({
            access_status: "paid",
            access_paid_at: new Date().toISOString(),
            access_amount_cents: session.amount_total || null,
          })
          .eq("id", leagueId);
        if (promo) {
          const { data: p } = await supabaseAdmin
            .from("league_access_promo_codes")
            .select("times_used")
            .eq("code", promo)
            .single();
          await supabaseAdmin
            .from("league_access_promo_codes")
            .update({ times_used: (p?.times_used || 0) + 1 })
            .eq("code", promo);
        }
        const { data: accessLeague } = await supabaseAdmin
          .from("golf_leagues")
          .select("league_name, organization_id")
          .eq("id", leagueId)
          .maybeSingle();
        const accessGross = Number(session.amount_total || 0);
        const accessStripeFee = actualStripeFeeCents(accessGross);
        await notifyPlatformAdmin({
          supabaseAdmin,
          type: "other",
          organizationId: accessLeague?.organization_id || null,
          subject: `✅ League access transaction — ${accessLeague?.league_name || "Golf League"}`,
          htmlBody: buildNotificationHtml("League Access Transaction Completed", [
            `🏌️ <strong>League:</strong> ${accessLeague?.league_name || "Golf League"}`,
            `💳 <strong>Customer paid:</strong> $${(accessGross / 100).toFixed(2)}`,
            `💰 <strong>Estimated payout:</strong> $${(Math.max(accessGross - accessStripeFee, 0) / 100).toFixed(2)}`,
            `🔖 <strong>Reference:</strong> ${String(session.payment_intent || session.id)}`,
          ]),
        });
      } else if (kind === "league_registration") {
        const paymentId = session.metadata!.payment_id;
        const memberId = session.metadata!.member_id;
        const responseId = session.metadata!.response_id;
        const promo = session.metadata?.promo_code || "";
        const pi = String(session.payment_intent || "");

        const finalized = await finalizeLeaguePayment(supabaseAdmin, paymentId, session, "League Membership");

        await supabaseAdmin
          .from("league_registration_responses")
          .update({ payment_status: "paid", paid_at: new Date().toISOString() })
          .eq("id", responseId);
        await supabaseAdmin
          .from("league_members")
          .update({ membership_fee_paid: true, membership_status: "active" })
          .eq("id", memberId);

        if (promo) {
          const { data: p } = await supabaseAdmin
            .from("league_registration_promo_codes")
            .select("id, times_used")
            .eq("league_id", session.metadata!.league_id)
            .eq("code", promo)
            .maybeSingle();
          if (p) {
            await supabaseAdmin
              .from("league_registration_promo_codes")
              .update({ times_used: (p.times_used || 0) + 1 })
              .eq("id", p.id);
          }
        }

        const { data: member } = await supabaseAdmin
          .from("league_members")
          .select("member_name, email, scoring_code, league:golf_leagues(league_name, league_slug)")
          .eq("id", memberId)
          .maybeSingle();
        await notifyLeagueTransaction(
          supabaseAdmin,
          finalized,
          "League Membership",
          member?.member_name || null,
        );
        if (member?.email) {
          const slug = (member as any).league?.league_slug;
          await sendConfirmationEmail({
            to: member.email,
            subject: `You're in — ${(member as any).league?.league_name || "your league"}`,
            html: confirmationHtml({
              headline: "League Registration Confirmed",
              leagueName: (member as any).league?.league_name || "",
              amountCents: session.amount_total || 0,
              reference: pi || String(session.id),
              memberName: member.member_name,
              continueUrl: slug && member.scoring_code
                ? `https://teevents.golf/league/${slug}/me/${member.scoring_code}`
                : undefined,
            }) + `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:0 20px">
              <p style="color:#555;font-size:14px">Your member login code is
              <strong style="font-family:monospace;font-size:18px;letter-spacing:2px">${member.scoring_code || ""}</strong>.
              Use it at <a href="https://teevents.golf/league/${slug}/score">teevents.golf/league/${slug}/score</a>.</p>
            </div>`,
          });
        }

        // League manager + platform-admin copy with the FULL question & answer
        // submission so every paid transaction has a permanent email backup.
        try {
          const leagueId = session.metadata!.league_id;
          const answersHtml = await buildLeagueRegistrationAnswersHtml(supabaseAdmin, responseId);
          await notifyLeagueManagers({
            supabaseAdmin,
            leagueId,
            subject: `✅ New League Registration — ${(member as any)?.league?.league_name || "your league"}`,
            htmlBody: buildNotificationHtml("New League Registration 🎉", [
              `You have a new paid membership registration for <strong>${(member as any)?.league?.league_name || "your league"}</strong>.`,
              `🏌️ <strong>Member:</strong> ${member?.member_name || "Member"}`,
              `📧 <strong>Contact:</strong> ${member?.email || "n/a"}`,
              `💵 <strong>Amount paid:</strong> $${((session.amount_total || 0) / 100).toFixed(2)}`,
              `🧾 <strong>Reference:</strong> ${pi || String(session.id)}`,
            ], answersHtml),
          });
        } catch (e) {
          console.error("League manager notification failed:", (e as Error).message);
        }

      } else if (kind === "league_membership") {
        const paymentId = session.metadata!.payment_id;
        const memberId = session.metadata!.member_id;
        const pi = String(session.payment_intent || "");
        const finalized = await finalizeLeaguePayment(supabaseAdmin, paymentId, session, "League Membership");
        await supabaseAdmin
          .from("league_members")
          .update({ membership_fee_paid: true, membership_status: "active" })
          .eq("id", memberId);

        const { data: pay } = await supabaseAdmin
          .from("league_payments")
          .select("amount_cents, payer_email, league:golf_leagues(league_name, league_slug), member:league_members(member_name)")
          .eq("id", paymentId)
          .maybeSingle();
        await notifyLeagueTransaction(
          supabaseAdmin,
          finalized,
          "League Membership",
          (pay as any)?.member?.member_name || null,
        );
        if (pay?.payer_email) {
          await sendConfirmationEmail({
            to: pay.payer_email,
            subject: `Membership confirmed — ${(pay as any).league?.league_name || "your league"}`,
            html: confirmationHtml({
              headline: "Membership Confirmed",
              leagueName: (pay as any).league?.league_name || "",
              amountCents: pay.amount_cents,
              reference: pi || String(session.id),
              memberName: (pay as any).member?.member_name,
              continueUrl: (pay as any).league?.league_slug
                ? `https://teevents.golf/league/${(pay as any).league.league_slug}`
                : undefined,
            }),
          });
        }
      } else if (kind === "league_event") {
        const paymentId = session.metadata!.payment_id;
        const regId = session.metadata!.registration_id;
        const pi = String(session.payment_intent || "");
        const finalized = await finalizeLeaguePayment(supabaseAdmin, paymentId, session, "Event registration");
        await supabaseAdmin
          .from("league_event_registrations")
          .update({
            fee_paid: true,
            registration_fee_paid: true,
            paid_at: new Date().toISOString(),
            status: "confirmed",
            entry_type: "online",
            is_manual_entry: false,
          })
          .eq("id", regId);

        const { data: eventRegistration } = await supabaseAdmin
          .from("league_event_registrations")
          .select("member:league_members(member_name), event:league_events(event_name)")
          .eq("id", regId)
          .maybeSingle();
        await notifyLeagueTransaction(
          supabaseAdmin,
          finalized,
          "Event Registration",
          (eventRegistration as any)?.member?.member_name || null,
          (eventRegistration as any)?.event?.event_name || null,
        );


        // Player confirmation + league manager + TeeVents admin copy (single
        // source of truth so the template stays editable in the dashboard).
        try {
          const res = await fetch("https://www.teevents.golf/api/public/league-event-confirmation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registration_id: regId, force: true }),
          });
          if (!res.ok) console.error("League event confirmation email failed:", res.status, await res.text());
        } catch (e) {
          console.error("League event confirmation email error:", (e as Error).message);
        }



      }
    }
  } catch (e: any) {
    console.error("Webhook handler error:", e?.message);
    return new Response(`Handler error: ${e.message}`, { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
