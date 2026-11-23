import { describe, it, expect } from "vitest";
import { shootoutStandings } from "./shootout";

describe("shootout", () => {
  it("eliminates the single worst score each hole, in order", () => {
    const r = shootoutStandings([
      { id: "a", holes: { 1: 4, 2: 4 } },
      { id: "b", holes: { 1: 6, 2: 0 } },
      { id: "c", holes: { 1: 5, 2: 5 } },
    ]);
    expect(r.eliminated).toEqual([{ id: "b", hole: 1 }, { id: "c", hole: 2 }]);
    expect(r.survivors).toEqual(["a"]);
  });
  it("never eliminates two players on a tie for worst", () => {
    const r = shootoutStandings([
      { id: "a", holes: { 1: 4 } },
      { id: "b", holes: { 1: 6 } },
      { id: "c", holes: { 1: 6 } },
    ]);
    expect(r.eliminated).toEqual([]);
    expect(r.tieHole).toBe(1);
    expect(r.tiedIds.sort()).toEqual(["b", "c"]);
  });
});
