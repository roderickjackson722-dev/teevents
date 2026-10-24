import { describe, expect, it } from "vitest";
import { allocatePaymentAmount, refundAmounts, registrationRefundOptions } from "./refundAmounts";

describe("retained refund fees", () => {
  it("returns $150 with $7.50 platform and $4.65 processing kept, costing $12.15", () => {
    expect(refundAmounts(15000, 0, 750, 465)).toEqual({ registrationAmountCents: 15000, refundableCents: 15000, refundAmountCents: 15000, platformFeeKeptCents: 750, processingFeeKeptCents: 465, organizerCostCents: 1215 });
    expect(registrationRefundOptions.refund_application_fee).toBe(false);
  });
  it("allows a partial refund without returning either fee", () => {
    const result = refundAmounts(15000, 0, 750, 465, 5000);
    expect(result.refundAmountCents).toBe(5000);
    expect(result.organizerCostCents).toBe(1215);
    expect(result.platformFeeKeptCents).toBe(750);
  });
  it("does not exceed the remaining registration amount", () => {
    expect(() => refundAmounts(15000, 10000, 750, 465, 5001)).toThrow();
    expect(refundAmounts(15000, 10000, 750, 465).refundAmountCents).toBe(5000);
  });
  it("allocates group fees without duplicating them", () => {
    expect([0, 1, 2, 3].map(index => allocatePaymentAmount(465, 4, index))).toEqual([117, 116, 116, 116]);
  });
});