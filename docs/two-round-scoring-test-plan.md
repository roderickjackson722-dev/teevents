# Two-Round Scoring — Test Plan

Covers Round 1 closure, score locking, scoring-code continuity and Round 2
starting-hole defaults.

## Automated checks

- `src/lib/tournamentRounds.test.ts` (vitest): closed-round detection, round
  roll-forward (`nextOpenRound`), and the starting-hole fallback
  (`resolveStartingHole`, always 1–18).
- Run with `npx vitest run src/lib/tournamentRounds.test.ts`.

## Manual end-to-end script

Setup: a tournament with `pairings_config.rounds = 2`, at least two groups with
pairings assigned (one shotgun hole such as 11, one group with no
`starting_hole`), and paid registrations holding scoring codes.

1. **Round 1 scoring** — open `/t/<slug>/scoring`, sign in with a group code.
   Expect the app to open on the group's assigned starting hole (Hole 11) and
   accept plus/minus edits that save.
2. **No starting hole** — sign in with the group that has no assignment. Expect
   the app to open on Hole 1 with no error.
3. **Close Round 1** — Dashboard → Scoring → Round Status → "Close Round 1".
   Expect a confirmation dialog; cancel leaves the round In Progress, confirming
   flips the badge to Closed and shows a success toast.
4. **Score locking** — reload the player scoring page for Round 1 scores. Expect
   the amber "Round 1 is locked" banner, disabled plus/minus/clear buttons, and
   no Save action. Direct DB writes to that round are rejected by
   `save_group_scores` / `clear_group_hole_scores`.
5. **Code continuity** — the same scoring code, re-entered, now opens Round 2
   (header shows "Round 2"); no new codes are issued.
6. **Round 2 starting hole** — expect the app to open on the Round 2 pairings
   hole for that group, and Hole 1 for groups without an assignment.
7. **Reopen** — "Reopen Round 1" restores editing; the banner disappears and
   plus/minus work again.

## Regression watch

- Leaderboard totals remain per-round (`tournament_scores.round_number`).
- Closing a round must not alter Round 1 pairings or tee times.
