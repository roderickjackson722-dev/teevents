import { describe, it, expect } from "vitest";
import { buildTeams, splitTeamsForScorecards, pairingLabel } from "./teamGrouping";

const reg = (id: string, first: string, last: string, group_id: string | null) =>
  ({ id, first_name: first, last_name: last, email: "", group_number: 8, group_position: null, group_id }) as any;

const players = [
  reg("1", "Ken", "Williams", "a"),
  reg("2", "Corrie", "Bukle", "a"),
  reg("3", "Fred", "Ndhlovu", "b"),
  reg("4", "Shamar", "Willson", "b"),
];
const groups = [
  { id: "a", group_number: null, team_name: "Team Black" },
  { id: "b", group_number: null, team_name: null, group_name: "Fred Ndhlovu" },
] as any;

describe("2-person team scorecards", () => {
  it("prints one scorecard per 2-person team, named like the leaderboard", () => {
    const cards = splitTeamsForScorecards(buildTeams(players, groups), groups);
    expect(cards.map((c) => c.teamName)).toEqual(["Team Black", "Team Ndhlovu/Willson"]);
    expect(cards.map((c) => c.players.length)).toEqual([2, 2]);
  });

  it("never labels a pairing with a group number", () => {
    expect(pairingLabel(players, groups)).toBe("Team Black & Team Ndhlovu/Willson");
    expect(buildTeams(players, groups)[0].teamName).not.toMatch(/Group/);
  });
});
