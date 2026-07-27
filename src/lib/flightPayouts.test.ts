import { describe, it, expect } from "vitest";
import {
  threeManScrambleHandicap,
  scrambleTeamHoleScore,
  scrambleTeamTotal,
  validateMinimumDrives,
  aggregateShootoutScore,
  splitField,
  assignFlights,
  placesPaidFor,
  buildPayoutPlan,
} from "./flightPayouts";

describe("3-Man Scramble team handicap (20% low / 15% middle / 10% high)", () => {
  it("weights the three handicaps correctly", () => {
    // 10*0.2 + 14*0.15 + 20*0.1 = 2 + 2.1 + 2 = 6.1
    expect(threeManScrambleHandicap([14, 20, 10])).toBe(6.1);
  });

  it("is order independent", () => {
    expect(threeManScrambleHandicap([20, 10, 14])).toBe(threeManScrambleHandicap([10, 14, 20]));
  });

  it("ignores missing handicaps and only uses the three lowest", () => {
    expect(threeManScrambleHandicap([8, null, 12])).toBeCloseTo(8 * 0.2 + 12 * 0.15, 5);
    // 4 supplied -> highest is dropped
    expect(threeManScrambleHandicap([5, 10, 15, 30])).toBeCloseTo(
      Math.round((5 * 0.2 + 10 * 0.15 + 15 * 0.1) * 10) / 10,
      5,
    );
  });

  it("returns null when nothing is supplied", () => {
    expect(threeManScrambleHandicap([])).toBeNull();
    expect(threeManScrambleHandicap([null, undefined])).toBeNull();
  });
});

describe("single team score per hole", () => {
  it("records one score per hole from the team's entries", () => {
    expect(scrambleTeamHoleScore([4, 4, 4])).toEqual({ score: 4, agreed: true });
  });

  it("flags disagreement and keeps the best ball", () => {
    expect(scrambleTeamHoleScore([5, 4, 5])).toEqual({ score: 4, agreed: false });
  });

  it("ignores blanks and returns null for an unplayed hole", () => {
    expect(scrambleTeamHoleScore([null, 3, undefined])).toEqual({ score: 3, agreed: true });
    expect(scrambleTeamHoleScore([null, null])).toEqual({ score: null, agreed: true });
  });

  it("totals one score per hole across the round", () => {
    const holes = [
      [4, 4, 4],
      [5, 5, 5],
      [3, 3, 3],
    ];
    expect(scrambleTeamTotal(holes)).toBe(12);
  });
});

describe("minimum drives requirement", () => {
  const players = [{ n: "A", d: 6 }, { n: "B", d: 8 }, { n: "C", d: 4 }];

  it("passes when every player meets the minimum", () => {
    const r = validateMinimumDrives(players, (p) => p.d, 4);
    expect(r.valid).toBe(true);
    expect(r.totalShort).toBe(0);
    expect(r.totalDrives).toBe(18);
  });

  it("reports which players are short", () => {
    const r = validateMinimumDrives([{ n: "A", d: 10 }, { n: "B", d: 6 }, { n: "C", d: 2 }], (p) => p.d, 4);
    expect(r.valid).toBe(false);
    expect(r.totalShort).toBe(2);
    expect(r.rows.filter((x) => !x.meetsRequirement).map((x) => x.player.n)).toEqual(["C"]);
  });

  it("detects when the requirement can no longer be met", () => {
    const r = validateMinimumDrives([{ n: "A", d: 16 }, { n: "B", d: 1 }, { n: "C", d: 1 }], (p) => p.d, 4);
    expect(r.drivesRemaining).toBe(0);
    expect(r.impossible).toBe(true);
  });
});

describe("shootout aggregate scoring", () => {
  it("adds every round's team score", () => {
    expect(aggregateShootoutScore([{ strokes: 68 }, { strokes: 74 }, { strokes: 71 }])).toBe(213);
  });
  it("treats unplayed rounds as zero", () => {
    expect(aggregateShootoutScore([{ strokes: 68 }, { strokes: null }])).toBe(68);
  });
});

describe("flighting and payouts", () => {
  it("splits the field as evenly as possible", () => {
    expect(splitField(10, 3)).toEqual([4, 3, 3]);
    expect(splitField(12, 4)).toEqual([3, 3, 3, 3]);
  });

  it("ranks by value and assigns flights", () => {
    const field = [{ s: 90 }, { s: 72 }, { s: 80 }, { s: 100 }];
    const out = assignFlights(field, (e) => e.s, 2);
    expect(out.map((o) => o.entry.s)).toEqual([72, 80, 90, 100]);
    expect(out.map((o) => o.flightIndex)).toEqual([0, 0, 1, 1]);
  });

  it("applies the places-paid rule", () => {
    expect(placesPaidFor(5)).toEqual([100]);
    expect(placesPaidFor(9)).toEqual([70, 30]);
    expect(placesPaidFor(24)).toEqual([65, 25, 10]);
  });

  it("splits the purse proportionally with no money lost", () => {
    const plan = buildPayoutPlan({ fieldSize: 30, purseCents: 300000, flights: 3 });
    expect(plan.flights.map((f) => f.players)).toEqual([10, 10, 10]);
    expect(plan.flights.reduce((s, f) => s + f.purseCents, 0)).toBe(300000);
    expect(plan.flights[0].places.map((p) => p.amountCents)).toEqual([70000, 30000]);
  });
});
