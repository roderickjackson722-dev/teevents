import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  partitionScoreBatch,
  pruneSavedEdits,
  mergeConfirmedScores,
  validateStrokes,
} from "@/lib/scoreBatch";

// ---------------------------------------------------------------------------
// Fake Data API that enforces the real 1000-row response cap so the pagination
// helper is exercised the same way it is against a 1500+ score event.
// ---------------------------------------------------------------------------
const HARD_CAP = 1000;
const allRows: any[] = [];
for (let round = 1; round <= 2; round++) {
  for (let player = 0; player < 46; player++) {
    for (let hole = 1; hole <= 18; hole++) {
      allRows.push({
        registration_id: `reg-${player}`,
        hole_number: hole,
        strokes: 3 + ((player + hole) % 4),
        round_number: round,
      });
    }
  }
}

let rpcCalls = 0;
function makeQuery(rows: any[]) {
  const state = { rows };
  const api: any = {
    select: () => api,
    eq: (col: string, val: any) => {
      state.rows = state.rows.filter((r) => r[col] === val || col === "tournament_id");
      return api;
    },
    order: () => api,
    range: (from: number, to: number) => {
      const size = Math.min(to - from + 1, HARD_CAP);
      return Promise.resolve({ data: state.rows.slice(from, from + size), error: null });
    },
  };
  return api;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => makeQuery([...allRows]),
    rpc: () => {
      rpcCalls++;
      return makeQuery([...allRows]);
    },
  },
}));

import {
  fetchAllTournamentScores,
  fetchAllPublicLeaderboardScores,
} from "@/lib/fetchLeaderboardScores";

describe("1500+ score event loads every hole and round", () => {
  beforeEach(() => {
    rpcCalls = 0;
  });

  it("pages past the 1000-row cap for the whole event", async () => {
    const rows = await fetchAllTournamentScores("t1");
    expect(allRows.length).toBe(1656); // 2 rounds x 46 players x 18 holes
    expect(rows.length).toBe(allRows.length);
  });

  it("returns all 18 holes for both rounds (no truncation of late holes)", async () => {
    const rows = await fetchAllTournamentScores("t1");
    for (const round of [1, 2]) {
      const forRound = rows.filter((r) => r.round_number === round);
      expect(forRound.length).toBe(46 * 18);
      const holes = new Set(forRound.map((r) => r.hole_number));
      expect([...holes].sort((a, b) => a - b)).toEqual(
        Array.from({ length: 18 }, (_, i) => i + 1),
      );
    }
  });

  it("filters to a single round when asked and still pages", async () => {
    const rows = await fetchAllTournamentScores("t1", { roundNumber: 2 });
    expect(rows.length).toBe(46 * 18);
    expect(rows.every((r) => r.round_number === 2)).toBe(true);
  });

  it("public leaderboard RPC also pages beyond 1000 rows", async () => {
    const rows = await fetchAllPublicLeaderboardScores("t1");
    expect(rows.length).toBe(allRows.length);
    expect(rpcCalls).toBeGreaterThan(1);
  });
});

describe("background refresh never clears unsaved edits", () => {
  it("keeps edits typed while a save was in flight", () => {
    const inFlight = { p1: { 1: 4, 2: 5 } };
    // Scorekeeper kept typing: hole 2 changed, hole 3 is brand new.
    const current = { p1: { 1: 4, 2: 6, 3: 3 }, p2: { 1: 5 } };
    expect(pruneSavedEdits(current, inFlight)).toEqual({
      p1: { 2: 6, 3: 3 },
      p2: { 1: 5 },
    });
  });

  it("clears only the exact cells the database confirmed", () => {
    expect(pruneSavedEdits({ p1: { 1: 4 } }, { p1: { 1: 4 } })).toEqual({});
  });

  it("a refresh that returns stale rows cannot overwrite confirmed values", () => {
    const stale = [{ registration_id: "p1", hole_number: 1, strokes: 7, round_number: 1 }];
    const confirmed = [{ registration_id: "p1", hole_number: 1, strokes: 4, round_number: 1 }];
    expect(mergeConfirmedScores(stale, confirmed)).toEqual(confirmed);
  });

  it("merging keeps untouched cached holes intact", () => {
    const cached = [
      { registration_id: "p1", hole_number: 1, strokes: 4, round_number: 1 },
      { registration_id: "p1", hole_number: 2, strokes: 5, round_number: 1 },
    ];
    const merged = mergeConfirmedScores(cached, [
      { registration_id: "p1", hole_number: 2, strokes: 3, round_number: 1 },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.hole_number === 1)!.strokes).toBe(4);
    expect(merged.find((r) => r.hole_number === 2)!.strokes).toBe(3);
  });
});

describe("batch save with invalid zero cells", () => {
  it("saves every valid score and reports only the invalid ones", () => {
    const snapshot = {
      p1: { 1: 4, 2: 0, 3: 5 },   // hole 2 invalid (zero)
      p2: { 1: 0, 2: 4 },          // hole 1 invalid (zero)
      p3: { 1: 3, 2: 4, 3: 5 },
    };
    const { upserts, errors, invalidCount } = partitionScoreBatch(snapshot, {
      tournamentId: "t1",
      roundNumber: 2,
    });
    expect(invalidCount).toBe(2);
    expect(errors.p1[2]).toBe("Min 1");
    expect(errors.p2[1]).toBe("Min 1");
    expect(upserts).toHaveLength(6);
    expect(upserts.every((u) => u.round_number === 2 && u.tournament_id === "t1")).toBe(true);
    expect(upserts.some((u) => u.registration_id === "p1" && u.hole_number === 2)).toBe(false);
    expect(upserts.filter((u) => u.registration_id === "p1")).toHaveLength(2);
  });

  it("rejects out-of-range and non-integer strokes but keeps the rest", () => {
    const { upserts, invalidCount } = partitionScoreBatch(
      { p1: { 1: 21, 2: 4.5, 3: 4, 4: NaN as any } },
      { tournamentId: "t1", roundNumber: 1 },
    );
    expect(invalidCount).toBe(3);
    expect(upserts).toEqual([
      { tournament_id: "t1", registration_id: "p1", hole_number: 3, round_number: 1, strokes: 4 },
    ]);
  });

  it("validateStrokes flags zero, over-max and fractional entries", () => {
    expect(validateStrokes(0)).toBe("Min 1");
    expect(validateStrokes(25)).toBe("Max 20");
    expect(validateStrokes(3.5)).toBe("Whole strokes only");
    expect(validateStrokes(4)).toBeNull();
  });

  it("only throws when there is nothing valid left to save", () => {
    const allBad = partitionScoreBatch({ p1: { 1: 0 } }, { tournamentId: "t1", roundNumber: 1 });
    expect(allBad.upserts).toHaveLength(0);
    expect(allBad.invalidCount).toBe(1);
  });
});
