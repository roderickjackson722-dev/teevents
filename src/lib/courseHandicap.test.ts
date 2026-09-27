import { describe, expect, it } from "vitest";
import { computeHandicaps, courseHandicap, playingHandicap, projectedIndex, usgaRound } from "./courseHandicap";

describe("USGA course handicap", () => {
  it("matches the spec example (12.4 / 125 / 71.2 / 72 → 13)", () => {
    expect(courseHandicap(12.4, { slopeRating: 125, courseRating: 71.2, par: 72 })).toBe(13);
  });
  it("halves for 9 holes", () => {
    expect(courseHandicap(12.4, { slopeRating: 125, courseRating: 71.2, par: 72, holes: 9 })).toBe(7);
  });
  it("applies allowance", () => {
    expect(playingHandicap(13, 95)).toBe(12);
    expect(computeHandicaps(12.4, { slopeRating: 125, courseRating: 71.2, par: 72, allowancePercentage: 95 })).toEqual({ courseHandicap: 13, playingHandicap: 12 });
  });
  it("rounds .5 away from zero", () => {
    expect(usgaRound(12.5)).toBe(13);
    expect(usgaRound(12.49)).toBe(12);
    expect(usgaRound(-1.5)).toBe(-2);
  });
  it("projects an index from differentials", () => {
    expect(projectedIndex([10, 12])).toBeNull();
    expect(projectedIndex([10, 12, 14])).toBe(8);
  });
});
