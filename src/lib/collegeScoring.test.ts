import { describe, it, expect } from "vitest";
import {
  fastEntryAdvance,
  filterPlayers,
  indexScores,
  playerTotal,
  sanitizeCell,
  teamStandings,
  type PlayerRow,
} from "./collegeScoring";

function player(id: string, name: string, status: PlayerRow["status"] = "active"): PlayerRow {
  return {
    registration_id: id,
    first_name: name,
    last_name: "T",
    status,
    team_id: "team1",
    team_name: "FAMU",
    division_id: "m1",
  };
}

const cells = (regId: string, round: number, per: number) =>
  Array.from({ length: 18 }, (_, i) => ({
    registration_id: regId,
    round_number: round,
    hole_number: i + 1,
    strokes: per,
  }));

describe("college scoring", () => {
  it("totals a player across rounds and skips WD/DQ", () => {
    const idx = indexScores([...cells("a", 1, 4), ...cells("a", 2, 4), ...cells("b", 1, 4)]);
    expect(playerTotal(idx, player("a", "A"), 2)).toBe(144);
    expect(playerTotal(idx, player("b", "B", "wd"), 2)).toBeNull();
  });

  it("uses the best 4 of 5 player totals", () => {
    const rows = [
      ...cells("p1", 1, 4), // 72
      ...cells("p2", 1, 4), // 72
      ...cells("p3", 1, 5), // 90
      ...cells("p4", 1, 4), // 72
      ...cells("p5", 1, 6), // 108 (dropped)
    ];
    const idx = indexScores(rows);
    const players = ["p1", "p2", "p3", "p4", "p5"].map((id) => player(id, id));
    const [team] = teamStandings(players, idx, 1);
    expect(team.total).toBe(72 + 72 + 72 + 90);
    expect(team.counted).toHaveLength(4);
  });

  it("excludes DQ players from the team total", () => {
    const idx = indexScores([...cells("p1", 1, 4), ...cells("p2", 1, 4)]);
    const [team] = teamStandings([player("p1", "A"), player("p2", "B", "dq")], idx, 1);
    expect(team.total).toBe(72);
  });

  it("filters by team, player and division", () => {
    const list = [player("p1", "John"), { ...player("p2", "Sarah"), division_id: "w1" }];
    expect(filterPlayers(list, { player: "john" })).toHaveLength(1);
    expect(filterPlayers(list, { divisionId: "w1" })).toHaveLength(1);
    expect(filterPlayers(list, { team: "famu" })).toHaveLength(2);
  });

  it("auto-tabs on single digits but waits after a leading 1", () => {
    expect(fastEntryAdvance("4")).toBe(true);
    expect(fastEntryAdvance("1")).toBe(false);
    expect(fastEntryAdvance("12")).toBe(true);
    expect(sanitizeCell("4x")).toBe("4");
    expect(sanitizeCell("99")).toBe("9");
  });
});
