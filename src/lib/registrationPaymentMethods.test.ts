import { describe, expect, it } from "vitest";
import { canMarkCashReceived, manualRegistrationPaymentMethods } from "./registrationPaymentMethods";

describe("check-payment retirement", () => {
  it("preserves online and cash manual entry without offering checks", () => {
    expect([...manualRegistrationPaymentMethods]).toEqual(["online", "cash"]);
  });
  it("does not offer check-received tracking for historical checks", () => {
    expect(canMarkCashReceived("check")).toBe(false);
    expect(canMarkCashReceived("cash")).toBe(true);
    expect(canMarkCashReceived("online")).toBe(false);
  });
});