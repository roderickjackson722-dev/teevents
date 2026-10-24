export interface RefundAmounts {
  registrationAmountCents: number;
  refundableCents: number;
  refundAmountCents: number;
  platformFeeKeptCents: number;
  processingFeeKeptCents: number;
  organizerCostCents: number;
}

export function allocatePaymentAmount(total: number, count: number, index: number): number {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(count) || count < 1 || index < 0 || index >= count) throw new Error("Payment amounts could not be verified.");
  return Math.floor(total / count) + (index < total % count ? 1 : 0);
}

export function refundAmounts(registrationAmountCents: number, alreadyRefundedCents: number, platformFeeKeptCents: number, processingFeeKeptCents: number, amount?: number): RefundAmounts {
  for (const value of [registrationAmountCents, alreadyRefundedCents, platformFeeKeptCents, processingFeeKeptCents]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("Payment amounts could not be verified.");
  }
  const refundableCents = Math.max(0, registrationAmountCents - alreadyRefundedCents);
  const refundAmountCents = amount ?? refundableCents;
  if (!Number.isSafeInteger(refundAmountCents) || refundAmountCents <= 0 || refundAmountCents > refundableCents) throw new Error("Enter an amount within the remaining registration balance.");
  return { registrationAmountCents, refundableCents, refundAmountCents, platformFeeKeptCents, processingFeeKeptCents, organizerCostCents: platformFeeKeptCents + processingFeeKeptCents };
}

export const registrationRefundOptions = { refund_application_fee: false } as const;