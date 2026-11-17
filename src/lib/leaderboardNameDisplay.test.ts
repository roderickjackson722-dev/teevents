import { describe, it, expect } from "vitest";
import {
  nameCellForMode,
  nameColumnLabel,
  nameColumnShortLabel,
  parseNameDisplayMode,
} from "@/lib/leaderboardNameDisplay";

const team = { name: "Eagle Eyes", players: ["Bob Adams", "Aubrey Jackson"] };
const individual = { name: "Bob Adams", players: [] };

describe("leaderboard name display modes", () => {
  it("shows the team name with the player list when both is chosen", () => {
    expect(nameCellForMode("both", team)).toEqual({
      primary: "Eagle Eyes",
      secondary: "Bob Adams, Aubrey Jackson",
    });
  });

  it("drops the player list when only team names are shown", () => {
    expect(nameCellForMode("team", team)).toEqual({ primary: "Eagle Eyes", secondary: "" });
  });

  it("shows just the players when only player names are shown", () => {
    expect(nameCellForMode("player", team)).toEqual({
      primary: "Bob Adams, Aubrey Jackson",
      secondary: "",
    });
  });

  it("keeps an individual entry's own name in every mode", () => {
    for (const mode of ["both", "player", "team"] as const) {
      expect(nameCellForMode(mode, individual).primary).toBe("Bob Adams");
    }
  });

  it("accepts only the three real modes and ignores anything else", () => {
    expect(parseNameDisplayMode("player")).toBe("player");
    expect(parseNameDisplayMode("team")).toBe("team");
    expect(parseNameDisplayMode("both")).toBe("both");
    expect(parseNameDisplayMode(undefined)).toBeNull();
    expect(parseNameDisplayMode("gross")).toBeNull();
  });

  it("labels the name column for the chosen mode", () => {
    expect(nameColumnLabel("both")).toBe("Player / Team");
    expect(nameColumnLabel("player")).toBe("Player");
    expect(nameColumnLabel("team")).toBe("Team");
    expect(nameColumnShortLabel("both")).toBe("Name");
    expect(nameColumnShortLabel("player")).toBe("Player");
    expect(nameColumnShortLabel("team")).toBe("Team");
  });
});
