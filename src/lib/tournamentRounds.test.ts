import { describe, it, expect } from "vitest";
import { closedRoundSet, nextOpenRound, resolveStartingHole } from "./tournamentRounds";

describe("closedRoundSet", () => {
  it("collects only closed rounds", () => {
    const set = closedRoundSet([
      { round_number: 1, status: "closed" },
      { round_number: 2, status: "active" },
      { round_number: 3, status: null },
    ]);
    expect([...set]).toEqual([1]);
  });

  it("handles empty input", () => {
    expect(closedRoundSet(null).size).toBe(0);
  });
});

describe("nextOpenRound", () => {
  it("stays on the active round when it is open", () => {
    expect(nextOpenRound(1, new Set(), 2)).toBe(1);
  });

  it("advances past a closed Round 1 to Round 2", () => {
    expect(nextOpenRound(1, new Set([1]), 2)).toBe(2);
  });

  it("never advances beyond the last configured round", () => {
    expect(nextOpenRound(1, new Set([1, 2]), 2)).toBe(2);
  });

  it("normalizes bad input", () => {
    expect(nextOpenRound(0, new Set(), 0)).toBe(1);
  });
});

describe("resolveStartingHole", () => {
  it("prefers the player's assigned hole", () => {
    expect(resolveStartingHole([11, 4])).toBe(11);
  });

  it("skips missing/invalid candidates", () => {
    expect(resolveStartingHole([null, undefined, NaN, 0, 19, 7])).toBe(7);
  });

  it("accepts numeric strings (split-tee labels resolved upstream)", () => {
    expect(resolveStartingHole(["10"])).toBe(10);
  });

  it("falls back to Hole 1 when nothing is assigned", () => {
    expect(resolveStartingHole([])).toBe(1);
    expect(resolveStartingHole([null, 99], 50)).toBe(1);
  });
});
