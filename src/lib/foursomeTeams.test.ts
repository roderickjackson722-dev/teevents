import { describe, it, expect } from "vitest";
import { splitFoursomeTeams } from "./foursomeTeams";
import { buildLeaderboard } from "./liveLeaderboardRows";

const row = (id: string, team: string | null, group: number, hole: number, strokes: number, last: string) => ({
  registration_id: id, group_id: team, group_number: group, hole_number: hole, strokes,
  round_number: 1, first_name: "P", last_name: last, team_name: null,
});

describe("two 2-person teams in one foursome", () => {
  it("splits the foursome into two team lines", () => {
    const parts = splitFoursomeTeams([
      { id: "a", group_id: "t1" }, { id: "b", group_id: "t1" },
      { id: "c", group_id: "t2" }, { id: "d", group_id: "t2" },
    ]);
    expect(parts.map((p) => p.members.map((m) => m.id))).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("keeps a group as one team when players have no registered team", () => {
    expect(splitFoursomeTeams([{ id: "a" }, { id: "b" }, { id: "c" }])).toHaveLength(1);
  });

  it("ranks each team separately on the leaderboard by team total", () => {
    const scores = [
      row("a", "t1", 4, 1, 4, "Martin"), row("b", "t1", 4, 1, 4, "Williamson"),
      row("c", "t2", 4, 1, 3, "Adams"), row("d", "t2", 4, 1, 3, "Jackson"),
      row("e", "t3", 5, 1, 5, "Joyce"), row("f", "t3", 5, 1, 5, "Evans"),
    ];
    const lb = buildLeaderboard(scores, { scoring_format: "shamble", course_par: 72 }, [4]);
    expect(lb.map((r) => [r.name, r.total])).toEqual([
      ["Adams / Jackson", 3],
      ["Martin / Williamson", 4],
      ["Team 5", 5],
    ]);
  });
});
