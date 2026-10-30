import { describe, it, expect } from "vitest";
import { isAllowedRegistrationGroupSize } from "../../supabase/functions/_shared/groupSize";

const twosOnly = { max_group_size: 2, foursome_registration: true, allowed_group_sizes: [2] };

describe("registration group size rule", () => {
  it("rejects a single golfer when the event requires teams of 2", () => {
    expect(isAllowedRegistrationGroupSize(twosOnly, 1)).toBe(false);
  });
  it("accepts a team of 2 when the event requires teams of 2", () => {
    expect(isAllowedRegistrationGroupSize(twosOnly, 2)).toBe(true);
  });
  it("rejects more players than the event allows", () => {
    expect(isAllowedRegistrationGroupSize(twosOnly, 3)).toBe(false);
  });
  it("individual-only events accept 1 and reject 2", () => {
    const solo = { max_group_size: null, foursome_registration: false, allowed_group_sizes: null };
    expect(isAllowedRegistrationGroupSize(solo, 1)).toBe(true);
    expect(isAllowedRegistrationGroupSize(solo, 2)).toBe(false);
  });
});
