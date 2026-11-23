import { describe, it, expect } from "vitest";
import { buildLeaderboard } from "./liveLeaderboardRows";

const row = (id: string, first: string, last: string, gid: string, strokes: number) => ({
  registration_id: id, hole_number: 1, strokes, round_number: 1,
  first_name: first, last_name: last, group_number: 4, group_id: gid, team_name: "Bob Adams",
});

describe("2-person shamble live leaderboard", () => {
  it("shows one team row when only one team in the pairing has scores", () => {
    const rows = buildLeaderboard(
      [row("a", "Bob", "Adams", "t1", 5), row("b", "Aubrey", "Jackson", "t1", 5)],
      { scoring_format: "shamble_2", course_par: 72 } as any,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Team Adams/Jackson");
    expect(rows[0].total).toBe(5);
    expect(rows[0].players).toEqual(["Bob Adams", "Aubrey Jackson"]);
  });
});

describe("format-matched team leaderboards", () => {
  const r = (id: string, hole: number, strokes: number, gn = 1) => ({
    registration_id: id, hole_number: hole, strokes, round_number: 1,
    first_name: id, last_name: "X", group_number: gn, group_id: null, team_name: "Team A",
  });
  it("4-person scramble: one row per team, team score not added together", () => {
    const rows = buildLeaderboard(
      ["a", "b", "c", "d"].map((id) => r(id, 1, 4)),
      { scoring_format: "scramble_4", course_par: 72 } as any,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.total).toBe(4);
    expect(rows[0]!.players).toHaveLength(4);
  });
  it("alternate shot: one row for the pair", () => {
    const rows = buildLeaderboard([r("a", 1, 5), r("b", 1, 5)], { scoring_format: "alternate_shot", course_par: 72 } as any);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.total).toBe(5);
  });
  it("4-man best ball best 2: counts the two lowest scores", () => {
    const rows = buildLeaderboard(
      [r("a", 1, 3), r("b", 1, 4), r("c", 1, 5), r("d", 1, 6)],
      { scoring_format: "best_ball_4", course_par: 72, best_ball_counting_scores: 2 } as any,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.total).toBe(7);
  });
  it("4-man best ball default: counts the lowest score", () => {
    const rows = buildLeaderboard(
      [r("a", 1, 3), r("b", 1, 4), r("c", 1, 5), r("d", 1, 6)],
      { scoring_format: "best_ball_4", course_par: 72 } as any,
    );
    expect(rows[0]!.total).toBe(3);
  });
  it("shootout: survivors on top, eliminated players below in elimination order", () => {
    const rows = buildLeaderboard(
      [r("a", 1, 4), r("b", 1, 6), r("c", 1, 5), r("a", 2, 4), r("c", 2, 6)],
      { scoring_format: "shootout", course_par: 72 } as any,
    );
    expect(rows.map((x) => x.key)).toEqual(["a", "b", "c"]);
    expect(rows[1]!.dnfHole).toBe(1);
    expect(rows[2]!.dnfHole).toBe(2);
  });
});
