/**
 * Shared fee math for league payments so the Payments tab, the Finances tab and the
 * TeeVents admin transaction ledger all agree on gross / fees / net.
 *
 * gross = total charged to the player's card (what Stripe shows)
 * fees  = 5% TeeVents platform fee + Stripe card processing fee
 * net   = what the league organizer keeps
 */
export const PLATFORM_FEE_RATE = 0.05;

export function estimateStripeFeeCents(preStripeTotalCents: number) {
  if (preStripeTotalCents <= 0) return 0;
  return Math.max(
    0,
    Math.round((preStripeTotalCents + 30) / (1 - 0.029)) - preStripeTotalCents,
  );
}

export type FeeBreakdown = {
  gross_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  fees_cents: number;
  net_cents: number;
};

/**
 * @param baseCents        the organizer's listed price (fee amount before add-on fees)
 * @param platformFeeCents recorded 5% platform fee (falls back to 5% of base)
 * @param stripeFeeCents   recorded Stripe fee, when known
 * @param grossCents       recorded Stripe charge total, when known
 * @param passFees         true when registrants cover the fees on top of the price
 */
export function computeFeeBreakdown(opts: {
  baseCents: number;
  platformFeeCents?: number | null;
  stripeFeeCents?: number | null;
  grossCents?: number | null;
  passFees: boolean;
}): FeeBreakdown {
  const base = Math.max(0, Math.round(opts.baseCents || 0));
  const platform =
    opts.platformFeeCents != null && opts.platformFeeCents > 0
      ? opts.platformFeeCents
      : Math.round(base * PLATFORM_FEE_RATE);
  const stripe =
    opts.stripeFeeCents != null && opts.stripeFeeCents > 0
      ? opts.stripeFeeCents
      : estimateStripeFeeCents(base + platform);

  const gross =
    opts.grossCents != null && opts.grossCents > 0
      ? opts.grossCents
      : opts.passFees
        ? base + platform + stripe
        : base;

  const fees = platform + stripe;
  const net = Math.max(0, gross - fees);

  return {
    gross_cents: gross,
    platform_fee_cents: platform,
    stripe_fee_cents: stripe,
    fees_cents: fees,
    net_cents: net,
  };
}

/** Manual / offline entries never carry platform or card fees. */
export function manualBreakdown(amountCents: number): FeeBreakdown {
  const amount = Math.max(0, Math.round(amountCents || 0));
  return {
    gross_cents: amount,
    platform_fee_cents: 0,
    stripe_fee_cents: 0,
    fees_cents: 0,
    net_cents: amount,
  };
}
