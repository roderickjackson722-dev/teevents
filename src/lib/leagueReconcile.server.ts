/**
 * Automatic league payment reconciliation.
 *
 * Every pending league payment is verified directly against Stripe and, the moment
 * Stripe reports it paid, we:
 *   1. mark the payment paid with the real gross / platform fee / Stripe fee split
 *   2. mirror it into the TeeVents platform transaction ledger
 *   3. flip the registration / membership records to paid + confirmed
 *   4. send the player confirmation email and the league-manager notification
 *
 * This runs automatically: immediately when the payer returns from Stripe Checkout,
 * on a 5-minute background schedule, and whenever a manager opens the Payments tab.
 * The manual "Reconcile with Stripe" button just calls the same code path.
 */
import { actualStripeFeeCents } from "./leagueFees";

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";
const ADMIN_EMAIL = "info@teevents.golf";
const SITE = "https://www.teevents.golf";

type Admin = any;

async function stripeSession(sessionId: string, stripeAccountId: string | null) {
  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  if (!stripeKey) return null;
  const headers: Record<string, string> = { Authorization: `Bearer ${stripeKey}` };
  if (stripeAccountId) headers["Stripe-Account"] = stripeAccountId;
  const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, { headers });
  if (!resp.ok) return null;
  return (await resp.json()) as any;
}

async function sendEmail(to: string[], subject: string, html: string) {
  const key = process.env["RESEND_API_KEY"];
  const recipients = [...new Set(to.filter(Boolean).map((e) => e.trim().toLowerCase()))];
  if (!key || recipients.length === 0) return false;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: SENDER, to: recipients, subject, html }),
    });
    if (!resp.ok) {
      console.error("[leagueReconcile] email failed", resp.status, await resp.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[leagueReconcile] email error", (e as Error).message);
    return false;
  }
}

async function managerEmails(admin: Admin, organizationId: string | null) {
  const out: string[] = [];
  if (!organizationId) return out;
  const { data: members } = await admin
    .from("org_members")
    .select("user_id, role")
    .eq("organization_id", organizationId);
  for (const m of (members || []) as any[]) {
    if (!["owner", "admin"].includes(String(m.role || "").toLowerCase())) continue;
    try {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      if (u?.user?.email) out.push(String(u.user.email));
    } catch {
      /* ignore individual lookup failures */
    }
  }
  return out;
}

const money = (cents: number) =>
  `$${((cents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function receiptHtml(opts: {
  headline: string;
  intro: string;
  rows: [string, string][];
  buttonLabel?: string;
  buttonUrl?: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:20px">
      <h2 style="color:#1a5c38;margin:0 0 8px">${opts.headline}</h2>
      <p style="color:#555;margin:0 0 16px">${opts.intro}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
        ${opts.rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 0;color:#666">${k}</td><td style="padding:6px 0"><strong>${v}</strong></td></tr>`,
          )
          .join("")}
        <tr><td style="padding:6px 0;color:#666">Status</td><td style="padding:6px 0"><span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-weight:600">PAID</span></td></tr>
      </table>
      ${
        opts.buttonUrl
          ? `<p style="margin:20px 0"><a href="${opts.buttonUrl}" style="background:#F5A623;color:#1a5c38;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">${opts.buttonLabel || "View Details"}</a></p>`
          : ""
      }
      <p style="color:#888;font-size:12px;margin-top:24px">Keep this email as your receipt.</p>
    </div>`;
}

/** Mirrors a completed league payment into the platform transaction ledger (idempotent). */
async function mirrorTransaction(
  admin: Admin,
  payment: any,
  league: any,
  gross: number,
  stripeFee: number,
) {
  try {
    if (!league?.organization_id) return;
    const { data: existing } = await admin
      .from("platform_transactions")
      .select("id")
      .eq("stripe_session_id", payment.stripe_session_id || "")
      .maybeSingle();
    if (existing) return;
    const platformFee = payment.platform_fee_cents || 0;
    await admin.from("platform_transactions").insert({
      organization_id: league.organization_id,
      amount_cents: gross,
      platform_fee_cents: platformFee,
      stripe_fee_cents: stripeFee,
      net_amount_cents: Math.max(gross - platformFee - stripeFee, 0),
      type: "league",
      status: "completed",
      stripe_session_id: payment.stripe_session_id || null,
      stripe_payment_intent_id: payment.stripe_payment_intent || null,
      golfer_email: payment.payer_email || null,
      description: `${league.league_name} — ${payment.event_id ? "Event registration" : "League Membership"}`,
      metadata: { league_id: league.id, league_payment_id: payment.id, source: "league" },
    });
  } catch (e) {
    console.error("[leagueReconcile] ledger mirror failed", (e as Error).message);
  }
}

/** Player + manager confirmation emails for one newly-paid payment. Idempotent. */
async function sendConfirmations(admin: Admin, payment: any, league: any) {
  if (payment.confirmation_sent_at) return false;
  let sent = false;

  if (payment.registration_id) {
    // The editable league-event template owns the player + manager + admin copies.
    try {
      const resp = await fetch(`${SITE}/api/public/league-event-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: payment.registration_id, force: true }),
      });
      sent = resp.ok;
      if (!resp.ok) console.error("[leagueReconcile] event confirmation failed", resp.status);
    } catch (e) {
      console.error("[leagueReconcile] event confirmation error", (e as Error).message);
    }
  } else {
    const { data: member } = payment.member_id
      ? await admin
          .from("league_members")
          .select("member_name, email, scoring_code")
          .eq("id", payment.member_id)
          .maybeSingle()
      : { data: null };
    const to = member?.email || payment.payer_email;
    const gross = payment.gross_amount_cents || payment.amount_cents || 0;
    const portal = league?.league_slug ? `${SITE}/league/${league.league_slug}` : undefined;
    if (to) {
      sent = await sendEmail(
        [to],
        `Membership confirmed — ${league?.league_name || "your league"}`,
        receiptHtml({
          headline: "Membership Confirmed",
          intro: `Thanks${member?.member_name ? `, ${member.member_name}` : ""} — your payment was received and your league membership is active.`,
          rows: [
            ["League", league?.league_name || ""],
            ["Amount paid", money(gross)],
            ...(member?.scoring_code
              ? ([["Your member code", member.scoring_code]] as [string, string][])
              : []),
            ["Reference", payment.stripe_payment_intent || payment.stripe_session_id || payment.id],
          ],
          buttonLabel: "Go to My League",
          buttonUrl: portal,
        }),
      );
    }
    const managers = await managerEmails(admin, league?.organization_id || null);
    if (managers.length) {
      await sendEmail(
        [...managers, ADMIN_EMAIL],
        `✅ New paid membership — ${league?.league_name || "your league"}`,
        receiptHtml({
          headline: "New League Membership Payment",
          intro: "A member just completed payment for your league.",
          rows: [
            ["League", league?.league_name || ""],
            ["Member", member?.member_name || to || "Member"],
            ["Email", to || "n/a"],
            ["Amount paid", money(gross)],
          ],
        }),
      );
    }
  }

  if (sent) {
    await admin
      .from("league_payments")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", payment.id);
  }
  return sent;
}

/** Applies a paid Stripe session to the league records and fires confirmations. */
async function finalizePayment(admin: Admin, payment: any, session: any) {
  const gross = Number(session?.amount_total || payment.gross_amount_cents || 0);
  const stripeFee = gross ? actualStripeFeeCents(gross) : 0;

  const { data: updated } = await admin
    .from("league_payments")
    .update({
      status: "paid",
      gross_amount_cents: gross || payment.gross_amount_cents || null,
      stripe_fee_cents: stripeFee,
      entry_source: "online",
      stripe_payment_intent:
        typeof session?.payment_intent === "string"
          ? session.payment_intent
          : payment.stripe_payment_intent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .select("*")
    .maybeSingle();

  const row = updated || payment;

  const { data: league } = await admin
    .from("golf_leagues")
    .select("id, league_name, league_slug, organization_id")
    .eq("id", row.league_id)
    .maybeSingle();

  if (row.registration_id) {
    await admin
      .from("league_event_registrations")
      .update({
        fee_paid: true,
        registration_fee_paid: true,
        status: "confirmed",
        entry_type: "online",
        is_manual_entry: false,
        paid_at: row.updated_at || new Date().toISOString(),
      })
      .eq("id", row.registration_id);
  }
  if (["membership", "registration"].includes(row.kind) && row.member_id) {
    await admin
      .from("league_members")
      .update({ membership_fee_paid: true, membership_status: "active" })
      .eq("id", row.member_id);
    await admin
      .from("league_registration_responses")
      .update({ payment_status: "paid", paid_at: row.updated_at || new Date().toISOString() })
      .eq("league_id", row.league_id)
      .eq("member_id", row.member_id);
  }

  await mirrorTransaction(admin, row, league, gross, stripeFee);
  const emailed = await sendConfirmations(admin, row, league);
  return { emailed };
}

/**
 * Reconciles pending payments. Scope it to one league, one Stripe session, or leave
 * both out to sweep every league (background schedule).
 */
export async function reconcileLeaguePayments(
  admin: Admin,
  opts: { leagueId?: string; sessionId?: string; sinceHours?: number } = {},
) {
  let query = admin
    .from("league_payments")
    .select("*")
    .eq("status", "pending")
    .not("stripe_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (opts.leagueId) query = query.eq("league_id", opts.leagueId);
  if (opts.sessionId) query = query.eq("stripe_session_id", opts.sessionId);
  if (!opts.leagueId && !opts.sessionId) {
    const since = new Date(Date.now() - (opts.sinceHours ?? 72) * 3600_000).toISOString();
    query = query.gte("created_at", since);
  }

  const { data: pending } = await query;
  let recovered = 0;
  let emails = 0;

  for (const payment of pending || []) {
    const session = await stripeSession(payment.stripe_session_id, payment.stripe_account_id);
    if (!session || session.payment_status !== "paid") continue;
    const res = await finalizePayment(admin, payment, session);
    recovered += 1;
    if (res.emailed) emails += 1;
  }

  // Backstop: any already-paid payment whose confirmation never went out (e.g. a
  // transient Resend outage) is retried here so nobody is left wondering.
  let missing = admin
    .from("league_payments")
    .select("*")
    .eq("status", "paid")
    .is("confirmation_sent_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (opts.leagueId) missing = missing.eq("league_id", opts.leagueId);
  if (opts.sessionId) missing = missing.eq("stripe_session_id", opts.sessionId);
  if (!opts.leagueId && !opts.sessionId) {
    const since = new Date(Date.now() - (opts.sinceHours ?? 72) * 3600_000).toISOString();
    missing = missing.gte("created_at", since);
  }
  const { data: unconfirmed } = await missing;
  for (const payment of unconfirmed || []) {
    const { data: league } = await admin
      .from("golf_leagues")
      .select("id, league_name, league_slug, organization_id")
      .eq("id", payment.league_id)
      .maybeSingle();
    if (await sendConfirmations(admin, payment, league)) emails += 1;
  }

  return { checked: (pending || []).length, recovered, emails };
}
