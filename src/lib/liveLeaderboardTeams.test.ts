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
