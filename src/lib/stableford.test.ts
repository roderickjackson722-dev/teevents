import { describe, it, expect } from "vitest";
import { stablefordPoints } from "./scoringFormats";

describe("stableford points", () => {
  it("follows the points table", () => {
    expect(stablefordPoints(6, 4)).toBe(0);
    expect(stablefordPoints(5, 4)).toBe(1);
    expect(stablefordPoints(4, 4)).toBe(2);
    expect(stablefordPoints(3, 4)).toBe(3);
    expect(stablefordPoints(2, 4)).toBe(4);
    expect(stablefordPoints(2, 5)).toBe(5);
    expect(stablefordPoints(1, 5)).toBe(6);
  });
  it("a picked-up or blank hole is worth 0", () => {
    expect(stablefordPoints(null, 4)).toBe(0);
  });
});
