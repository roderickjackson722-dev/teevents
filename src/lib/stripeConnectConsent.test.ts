import { describe, expect, it } from "vitest";
import { hasStripeConnectionConsent } from "./stripeConnectConsent";

describe("Stripe connection consent", () => {
  it("requires all five acknowledgments before connection", () => {
    expect(hasStripeConnectionConsent([true, true, true, true, true])).toBe(true);
    for (let missing = 0; missing < 5; missing++) {
      expect(hasStripeConnectionConsent(Array.from({ length: 5 }, (_, index) => index !== missing))).toBe(false);
    }
    expect(hasStripeConnectionConsent([true, true, true, true])).toBe(false);
  });
});