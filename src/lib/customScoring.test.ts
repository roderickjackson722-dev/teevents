import { describe, expect, it } from "vitest";
import { SCORING_FORMATS } from "./scoringFormats";
import {
  DEFAULT_CUSTOM_SCORING, birdieBashPoints, scoreTeamRound, sortChampionship, sortRoundBoard, validateCustomScoring,
  type CustomScoring, type TeamHoleInput,
} from "./customScoring";

const pars = new Array(18).fill(4);
const rules: CustomScoring = {
  ...DEFAULT_CUSTOM_SCORING, enabled: true, championship: "combined",
  rounds: [
    { round: 1, segments: [{ from: 1, to: 18, format: "birdie_bash" }], hidden: null },
    { round: 2, segments: [
      { from: 1, to: 6, format: "best_ball_2" },
      { from: 7, to: 12, format: "modified_alternate_shot" },
      { from: 13, to: 18, format: "stroke_play" },
    ], hidden: { from: 13, to: 18 } },
  ],
};
const players = (m: Record<number, [number, number]>) =>
  Object.fromEntries(Object.entries(m).map(([h, v]) => [Number(h), { players: v } as TeamHoleInput]));

describe("formats", () => {
  it("keeps the 12 formats in order and appends the two new ones", () => {
    expect(SCORING_FORMATS.map((f) => f.name)).toEqual([
      "Individual Stroke Play", "4-Person Scramble", "2-Person Scramble", "3-Person Scramble", "Shootout",
      "2-Man Best Ball", "4-Man Best Ball", "Stableford", "Alternate Shot (Foursomes)", "2-Person Shamble",
      "3-Person Shamble", "4-Person Shamble", "Birdie Bash", "Modified Alternate Shot",
    ]);
  });
});

describe("validation", () => {
  it("accepts the two-day test setup", () => expect(validateCustomScoring(rules)).toBeNull());
  it("rejects a gap", () => {
    const r = { ...rules, rounds: [{ round: 1, segments: [{ from: 1, to: 10, format: "best_ball_2" }], hidden: null }] };
    expect(validateCustomScoring(r)).toMatch(/not covered/);
  });
  it("rejects an overlap", () => {
    const r = { ...rules, rounds: [{ round: 1, segments: [{ from: 1, to: 10, format: "best_ball_2" }, { from: 9, to: 18, format: "stroke_play" }], hidden: null }] };
    expect(validateCustomScoring(r)).toMatch(/more than one segment/);
  });
  it("rejects mixing points and strokes in one round", () => {
    const r = { ...rules, rounds: [{ round: 1, segments: [{ from: 1, to: 9, format: "birdie_bash" }, { from: 10, to: 18, format: "stroke_play" }], hidden: null }] };
    expect(validateCustomScoring(r)).toMatch(/cannot mix/);
  });
});

describe("Birdie Bash", () => {
  it("birdie then par is 1 point after two holes", () => {
    const r = scoreTeamRound(rules, 1, players({ 1: [3, 5], 2: [4, 4] }), pars, "stroke_play", false);
    expect(r.points).toBe(1);
    expect(r.thru).toBe(2);
  });
  it("an eagle adds 2 points", () => expect(birdieBashPoints(2, 4)).toBe(2));
  it("custom point values recalculate from gross", () => {
    const r = scoreTeamRound({ ...rules, birdie_points: 2, eagle_points: 3 }, 1, players({ 1: [3, 5], 2: [2, 5] }), pars, "stroke_play", false);
    expect(r.points).toBe(5);
  });
});

describe("hidden holes and championship", () => {
  const shotgun = players({ 13: [4, 5], 14: [4, 4], 15: [4, 4], 16: [4, 4], 17: [4, 4], 18: [4, 4] });
  it("a team that only played hidden holes shows Thru 6 and no visible score", () => {
    const r = scoreTeamRound(rules, 2, shotgun, pars, "stroke_play", false);
    expect(r.thru).toBe(6);
    expect(r.visiblePlayed).toBe(0);
    expect(r.strokes).toBe(0);
  });
  it("sorts it below a team with a visible score", () => {
    const a = { id: "a", r: scoreTeamRound(rules, 2, shotgun, pars, "stroke_play", false) };
    const b = { id: "b", r: scoreTeamRound(rules, 2, players({ 1: [6, 7] }), pars, "stroke_play", false) };
    expect(sortRoundBoard([a, b], false).map((x) => x.id)).toEqual(["b", "a"]);
  });
  it("publishing reveals hidden holes", () => {
    expect(scoreTeamRound(rules, 2, shotgun, pars, "stroke_play", true).strokes).toBe(24);
  });
  it("modified alternate shot uses the one team score", () => {
    const r = scoreTeamRound(rules, 2, { 7: { team: 5, players: [] } }, pars, "stroke_play", false);
    expect(r.strokes).toBe(5);
  });
  it("championship: lowest total, then most Birdie Bash points", () => {
    const d1a = scoreTeamRound(rules, 1, players({ 1: [3, 5] }), pars, "x", true); // 3 strokes, 1 pt
    const d1b = scoreTeamRound(rules, 1, players({ 1: [4, 5] }), pars, "x", true); // 4 strokes, 0 pt
    const d2a = scoreTeamRound(rules, 2, players({ 1: [5, 6] }), pars, "x", true);
    const d2b = scoreTeamRound(rules, 2, players({ 1: [4, 6] }), pars, "x", true);
    const out = sortChampionship([{ item: "b", byRound: { 1: d1b, 2: d2b } }, { item: "a", byRound: { 1: d1a, 2: d2a } }], rules);
    expect(out.map((x) => x.item)).toEqual(["a", "b"]); // both total 8; a has more points
  });
});
