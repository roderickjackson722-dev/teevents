import { describe, expect, it } from "vitest";
import { displayCourseHandicap, playingFromRaw, unroundedCourseHandicap, validateIndex, validateTeeSet, validateAllowance } from "./eventHandicaps";

describe("event handicaps tab", () => {
  it("Index 12.0, Slope 130, CR 73.5, Par 72 gives Course Handicap 15", () => {
    expect(displayCourseHandicap(unroundedCourseHandicap(12, 130, 73.5, 72))).toBe("15");
  });
  it("shows a dash, not zero, without an index", () => {
    expect(displayCourseHandicap(unroundedCourseHandicap(null, 130, 73.5, 72))).toBe("—");
  });
  it("playing handicap uses the unrounded course handicap", () => {
    // raw 15.3053 × 0.9 = 13.77 → 14 (rounded CH 15 × 0.9 = 13.5 would also be 14; use 85%)
    const raw = unroundedCourseHandicap(12, 130, 73.5, 72)!;
    expect(playingFromRaw(raw, 85)).toBe(13); // 13.01; rounded-first would give 12.75 → 13 too
    expect(playingFromRaw(2.4, 100)).toBe(2);
    expect(playingFromRaw(16.45, 90)).toBe(15); // 14.805 → 15; rounded-first 16×0.9=14.4 → 14
  });
  it("validates tee ranges", () => {
    expect(validateTeeSet({ name: "Men", slope: 154, rating: 72, par: 72 })).toBeNull();
    expect(validateTeeSet({ name: "Men", slope: 156, rating: 72, par: 72 })).toMatch(/Slope Rating/);
    expect(validateTeeSet({ name: "Men", slope: 113, rating: 86, par: 72 })).toMatch(/Course Rating/);
    expect(validateTeeSet({ name: "Men", slope: 113, rating: 70, par: 26 })).toMatch(/Par/);
  });
  it("validates index and allowance", () => {
    expect(validateIndex("12.4")).toBeNull();
    expect(validateIndex("54.1")).not.toBeNull();
    expect(validateIndex("12.45")).not.toBeNull();
    expect(validateAllowance(101)).not.toBeNull();
    expect(validateAllowance(0)).toBeNull();
  });
});

import { allowanceFor } from "./eventHandicaps";
describe("team allowance", () => {
  const players = [
    { id: "a", teamId: "t1", raw: 4 }, { id: "b", teamId: "t1", raw: 18 },
    { id: "c", teamId: null, raw: 10 },
  ];
  it("defaults to the event allowance of 100%", () => {
    expect(allowanceFor(players, { mode: "event", eventPct: 100, betterPct: 35, worsePct: 15 }).get("a")).toBe(100);
  });
  it("gives the better player and worse player their own percentages", () => {
    const m = allowanceFor(players, { mode: "team", eventPct: 100, betterPct: 35, worsePct: 15 });
    expect(m.get("a")).toBe(35);
    expect(m.get("b")).toBe(15);
    expect(m.get("c")).toBe(100);
  });
});
