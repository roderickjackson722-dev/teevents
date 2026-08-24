import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Worst-case tournament stress test: 50,400 score rows
 * (2 rounds x 1400 players x 18 holes).
 *
 * Validates the three things that break first at that size:
 *   1. pagination (every row/hole/round comes back, round filters page too)
 *   2. retention (unsaved edits + confirmed merges survive at scale)
 *   3. export (streaming CSV produces every row in bounded chunks)
 */

const HARD_CAP = 1000; // real Data API response cap
const ROUNDS = 2;
const PLAYERS = 1400;
const HOLES = 18;
const TOTAL = ROUNDS * PLAYERS * HOLES; // 50,400

const allRows: any[] = [];
for (let round = 1; round <= ROUNDS; round++) {
  for (let player = 0; player < PLAYERS; player++) {
    for (let hole = 1; hole <= HOLES; hole++) {
      allRows.push({
        registration_id: `reg-${player}`,
        hole_number: hole,
        strokes: 3 + ((player + hole) % 4),
        round_number: round,
      });
    }
  }
}

let rangeCalls = 0;
let failNextRange = 0;

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
      rangeCalls++;
      if (failNextRange > 0) {
        failNextRange--;
        return Promise.reject(new Error("network timeout"));
      }
      const size = Math.min(to - from + 1, HARD_CAP);
      return Promise.resolve({ data: state.rows.slice(from, from + size), error: null });
    },
  };
  return api;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => makeQuery([...allRows]),
    rpc: () => makeQuery([...allRows]),
  },
}));

import {
  fetchAllTournamentScores,
  fetchAllPublicLeaderboardScores,
  fetchAllPages,
  chunkRows,
} from "@/lib/fetchLeaderboardScores";
import { pruneSavedEdits, mergeConfirmedScores } from "@/lib/scoreBatch";
import { csvChunks, csvToBlob, CSV_CHUNK_LINES } from "@/lib/streamCsv";
import { newPerfStats } from "@/lib/leaderboardMetrics";

describe("50,000-row event: pagination", () => {
  beforeEach(() => {
    rangeCalls = 0;
    failNextRange = 0;
  });

  it("loads all 50,400 rows without truncation", async () => {
    expect(allRows.length).toBe(50_400);
    const rows = await fetchAllTournamentScores("t1");
    expect(rows.length).toBe(TOTAL);
    expect(rangeCalls).toBeGreaterThanOrEqual(TOTAL / HARD_CAP);
  });

  it("keeps every hole for every round", async () => {
    const rows = await fetchAllTournamentScores("t1");
    for (const round of [1, 2]) {
      const forRound = rows.filter((r) => r.round_number === round);
      expect(forRound.length).toBe(PLAYERS * HOLES);
      expect(new Set(forRound.map((r) => r.hole_number)).size).toBe(HOLES);
      expect(new Set(forRound.map((r) => r.registration_id)).size).toBe(PLAYERS);
    }
  });

  it("round-filtered reads page through 25,200 rows", async () => {
    const rows = await fetchAllTournamentScores("t1", { roundNumber: 2 });
    expect(rows.length).toBe(PLAYERS * HOLES);
    expect(rows.every((r) => r.round_number === 2)).toBe(true);
  });

  it("public leaderboard RPC pages to the full result set", async () => {
    const rows = await fetchAllPublicLeaderboardScores("t1");
    expect(rows.length).toBe(TOTAL);
  });

  it("records page count and retries in the perf stats", async () => {
    const stats = newPerfStats();
    failNextRange = 1; // one transient failure must be retried, not dropped
    const rows = await fetchAllPages(() => makeQuery([...allRows]), { stats });
    expect(rows.length).toBe(TOTAL);
    expect(stats.rowCount).toBe(TOTAL);
    expect(stats.pageCount).toBeGreaterThanOrEqual(TOTAL / HARD_CAP);
    expect(stats.retryCount).toBe(1);
  });

  it("chunks a 50,400-row write into 500-row batches", () => {
    const batches = chunkRows(allRows, 500);
    expect(batches.length).toBe(Math.ceil(TOTAL / 500));
    expect(batches.every((b) => b.length <= 500)).toBe(true);
    expect(batches.reduce((n, b) => n + b.length, 0)).toBe(TOTAL);
  });
});

describe("50,000-row event: retention", () => {
  it("preserves in-progress edits across a large in-flight save", () => {
    const inFlight: Record<string, Record<number, number>> = {};
    const current: Record<string, Record<number, number>> = {};
    for (let p = 0; p < 1400; p++) {
      inFlight[`reg-${p}`] = { 1: 4, 2: 5 };
      // Scorekeeper kept typing hole 3 while the save was in flight.
      current[`reg-${p}`] = { 1: 4, 2: 5, 3: 6 };
    }
    const remaining = pruneSavedEdits(current, inFlight);
    expect(Object.keys(remaining).length).toBe(1400);
    expect(remaining["reg-0"]).toEqual({ 3: 6 });
  });

  it("merging 50,400 cached rows with confirmed rows keeps newer values", () => {
    const confirmed = allRows.slice(0, 5000).map((r) => ({ ...r, strokes: 9 }));
    const merged = mergeConfirmedScores(allRows, confirmed);
    expect(merged.length).toBe(TOTAL);
    const confirmedKeys = new Set(
      confirmed.map((r) => `${r.registration_id}:${r.round_number}:${r.hole_number}`),
    );
    for (const row of merged) {
      const key = `${row.registration_id}:${row.round_number}:${row.hole_number}`;
      if (confirmedKeys.has(key)) expect(row.strokes).toBe(9);
    }
  });
});

describe("50,000-row event: streaming export", () => {
  it("streams every row in bounded chunks", async () => {
    const header = ["registration_id", "round", "hole", "strokes"];
    function* rows() {
      for (const r of allRows) yield [r.registration_id, r.round_number, r.hole_number, r.strokes];
    }
    let lines = 0;
    let chunks = 0;
    for await (const chunk of csvChunks(header, rows())) {
      chunks++;
      lines += chunk.trimEnd().split("\n").length;
      // Chunks stay small regardless of export size.
      expect(chunk.split("\n").length).toBeLessThanOrEqual(CSV_CHUNK_LINES + 1);
    }
    expect(lines).toBe(TOTAL + 1); // + header
    expect(chunks).toBeGreaterThanOrEqual(TOTAL / CSV_CHUNK_LINES);
  });

  it("produces a complete blob for a 50,400-row export", async () => {
    function* rows() {
      for (const r of allRows) yield [r.registration_id, r.round_number, r.hole_number, r.strokes];
    }
    const { blob, chunkCount, byteLength } = await csvToBlob(
      ["registration_id", "round", "hole", "strokes"],
      rows(),
    );
    expect(chunkCount).toBeGreaterThan(100);
    expect(byteLength).toBeGreaterThan(0);
    expect(blob.size).toBe(byteLength);
    let lines = 0;
    for await (const chunk of csvChunks(["registration_id", "round", "hole", "strokes"], rows())) {
      lines += chunk.trimEnd().split("\n").length;
    }
    expect(lines).toBe(TOTAL + 1);
  }, 30_000);

  it("escapes commas and quotes in team names", async () => {
    const out: string[] = [];
    for await (const c of csvChunks(null, [["Team \"A\", B", 1]])) out.push(c);
    expect(out.join("")).toContain('"Team ""A"", B"');
  });
});
