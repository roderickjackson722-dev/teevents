/**
 * Pure keyboard/auto-advance rules for the organizer hole-by-hole score grid.
 * Kept free of React/DOM so the exact rules can be unit-tested.
 *
 * Rules (from the organizer scoring spec):
 * - Number keys 0–9 only; anything else is rejected.
 * - An unambiguous score typed into an empty hole saves and advances.
 * - A leading 1 or 2 stays focused for scores 10–20, regardless of typing
 *   speed. For a score of 1 or 2, Tab/click moves to the next hole.
 * - When returning to a hole that already has a score, there is NO
 *   auto-advance — the user presses Tab or clicks to move on.
 * - Backspace (empty string) clears the hole and never advances.
 * - Scores are whole numbers 1–20.
 */

export const MIN_HOLE_SCORE = 1;
export const MAX_HOLE_SCORE = 20;

export type HoleInputResult =
  | { kind: "set"; value: number; advance: boolean }
  | { kind: "clear" }
  | { kind: "invalid" };

/**
 * Decide what a raw input string does to a hole cell.
 * @param raw the input's new string value
 * @param hadValueOnFocus whether the hole already had a score when it gained focus
 */
export function applyHoleInput(raw: string, hadValueOnFocus: boolean): HoleInputResult {
  if (raw === "") return { kind: "clear" };
  if (!/^\d+$/.test(raw)) return { kind: "invalid" };
  const num = parseInt(raw, 10);
  if (isNaN(num) || num < MIN_HOLE_SCORE || num > MAX_HOLE_SCORE) return { kind: "invalid" };
  // Returning to a filled hole: retype freely, but never auto-advance.
  if (hadValueOnFocus) return { kind: "set", value: num, advance: false };
  // Do not move focus while another digit could make a valid score.
  const canExtend = raw.length === 1 && num * 10 <= MAX_HOLE_SCORE;
  return { kind: "set", value: num, advance: !canExtend };
}

/** True when a keydown should be allowed into a score cell (digits + editing keys). */
export function isAllowedScoreKey(key: string): boolean {
  if (key.length === 1) return /[0-9]/.test(key);
  // Multi-char keys: Tab, Shift+Tab (key === "Tab"), Enter, Backspace, arrows, etc.
  return true;
}
