import { describe, expect, it } from "vitest";
import { calculateEqualWinningHolePayouts, type CarryoverRow } from "./skinsCarryover";

const winningHoles = [1, 3, 4, 11, 14, 15, 16, 17];
const rows: CarryoverRow[] = Array.from({ length: 18 }, (_, i) => ({
  hole_number: i + 1,
  registration_id: winningHoles.includes(i + 1) ? (i === 2 || i === 3 || i === 13 ? "mcghee-smith" : `team-${i}`) : null,
  score: 3, skins: 0, amount_cents: 0,
}));

describe("equal combined-division payouts", () => {
  it("divides the $880 purse among eight outright hole wins at $110 each regardless of intervening ties", () => {
    const result = calculateEqualWinningHolePayouts(88000, rows);
    expect(result.filter((r) => r.registration_id).map((r) => r.amount_cents)).toEqual(Array(8).fill(11000));
    expect(result.reduce((sum, r) => sum + r.amount_cents, 0)).toBe(88000);
    expect(result.filter((r) => !r.registration_id).every((r) => r.amount_cents === 0)).toBe(true);
  });
  it("pays a repeat winning team once per winning hole, not once per unique team", () => {
    const result = calculateEqualWinningHolePayouts(88000, rows);
    expect(result.filter((r) => r.registration_id === "mcghee-smith").reduce((sum, r) => sum + r.amount_cents, 0)).toBe(33000);
  });
  it("leaves the purse unpaid when no hole has an outright winner", () => {
    expect(calculateEqualWinningHolePayouts(88000, rows.map((r) => ({ ...r, registration_id: null }))).reduce((sum, r) => sum + r.amount_cents, 0)).toBe(0);
  });
  it("reconciles fractional cents without paying tied holes", () => {
    const result = calculateEqualWinningHolePayouts(88001, rows);
    expect(result.filter((r) => r.registration_id).map((r) => r.amount_cents)).toEqual([11001, ...Array(7).fill(11000)]);
    expect(result.reduce((sum, r) => sum + r.amount_cents, 0)).toBe(88001);
  });
});