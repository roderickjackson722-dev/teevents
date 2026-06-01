
# Live Leaderboard & Scoring Enhancement Plan

This is a large, multi-surface feature. I'll implement it in cohesive phases. All other platform functionality remains untouched.

## Scope Summary

1. Scoring code login page (`/score/{slug}`)
2. Mobile-first hole-by-hole score entry with net scoring + edit
3. Improved player-facing Live Leaderboard (`/live/{slug}`) with Gross/Net toggle + sponsor footer
4. Organizer Live Leaderboard Settings panel
5. Scoring code generation & display (on Day-of page + printable scorecards)

---

## Part 1 — Database Changes (single migration)

Add columns to `tournaments` for leaderboard settings:
- `live_leaderboard_enabled` (bool, default true)
- `live_scoring_require_code` (bool, default true)
- `live_show_gross` (bool, default true)
- `live_show_net` (bool, default true)
- `live_default_view` ('gross' | 'net', default 'gross')
- `live_show_sponsors` (bool, default true)
- `live_sponsor_placement` ('footer' | 'banner' | 'sidebar', default 'footer')
- `live_allow_edit_past_holes` (bool, default true)
- `live_require_confirm_save` (bool, default false)

Add group-level scoring code (shared by foursome):
- `tournament_registrations.group_scoring_code` (TEXT, nullable)
- Backfill: for each group, generate one shared 6-char unambiguous code (exclude O, 0, I, 1) and copy to all members of that group
- Add index on `group_scoring_code`

RLS: anon can SELECT registrations by `group_scoring_code` when tournament is published (already partially in place via day-of policy — extend or reuse).

No changes to existing per-player `scoring_code` (it stays for QR/day-of).

## Part 2 — New Page: `/score/:slug`  (`src/pages/ScoreLogin.tsx`)

- Single large 6-char code input (auto-uppercase, monospace)
- Continue button → looks up registrations by `group_scoring_code` for that tournament
- On success → navigate to `/score/:slug/:code`

## Part 3 — New Page: `/score/:slug/:code`  (`src/pages/GroupScoring.tsx`)

Mobile-first scorecard:
- Header: tournament title + menu
- Current hole indicator + Prev/Next + jump-to-hole dropdown
- Hole info card: Par, Stroke Index, yardage
- Player rows: name, gross input (number stepper), net (computed), stroke indicator dots
- "Save & Next Hole" CTA
- Below scorecard: compact 18-hole summary list with "Edit" links
- Net = gross − strokes-on-hole, using existing `handicapUtils` (`allocateStrokes`)
- Saves to `tournament_scores` (existing table)
- Realtime: refresh via channel when scores update

Honors organizer settings:
- `live_allow_edit_past_holes`
- `live_require_confirm_save` (confirm dialog before save)

## Part 4 — Refactored Live Leaderboard (`src/pages/LiveLeaderboard.tsx`)

Keep current TV/display mode, add player-friendly mode:
- Show Gross/Net columns based on settings; toggle pill if both enabled
- Position, Player/Team, Gross, Net, Thru
- Mobile-stacked table
- Sponsor footer (existing logic preserved); honor `live_sponsor_placement`
- Respect `live_leaderboard_enabled` gate (replaces `live_display_enabled` for player view; keep existing for TV)

## Part 5 — Organizer Settings Panel

New component `src/components/dashboard/LiveLeaderboardSettings.tsx` mounted on the existing **Scoring** dashboard page (`src/pages/dashboard/Scoring.tsx`) as a new card section "Live Leaderboard Settings" — does not disturb existing scoring config.

Renders the 9 toggles/selects above, saves to `tournaments`.

## Part 6 — Scoring Code Display

- **Day-of Event Page** (`src/pages/DayOf.tsx`): show the group's shared `group_scoring_code` prominently with copy button + link to `/score/:slug/:code`
- **Printable Scorecards** (`src/components/printables/ScorecardsTab.tsx`): add the text code beneath the existing QR

## Part 7 — Routing (`src/App.tsx`)

Add:
- `/score/:slug` → ScoreLogin
- `/score/:slug/:code` → GroupScoring

## Technical Notes

- Reuse `src/lib/handicapUtils.ts` for stroke allocation
- Reuse `src/lib/scoringFormats.ts` and existing `tournament_scores` table — no schema change for scores
- Code generation utility: `src/lib/scoringCode.ts` with `generateGroupCode()` using unambiguous alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
- For backfill we'll do it inline in the migration with a PL/pgSQL block grouping by `(tournament_id, group_number)`
- All UI uses design system tokens (Gold CTA / Forest Green text per project memory)

## Out of Scope (explicitly preserved)

- Existing `/day-of`, QR routing, email functions — untouched
- Existing per-player `scoring_code` — untouched
- TV/Live Display mode — preserved
- Admin invoices, Day-of editor — untouched

Once approved I'll start with the migration, then build pages/components in parallel where possible.
