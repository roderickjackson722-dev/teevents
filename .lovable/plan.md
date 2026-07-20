# Golf League Management — Full Build

Builds on existing tables (`golf_leagues`, `league_members`, `league_events`, `league_event_scores`, `league_event_registrations`, `league_skins`, `league_standings`, `league_point_systems`, `league_seasons`, `league_payments`, `league_subscriptions`). No duplicate tables.

## Part 1 — Role Selector on Login

- New route `/select-workspace` shown after login when a user has BOTH tournament access and at least one league (or always, if user prefers).
- Two large cards: **Manage Tournaments** → `/dashboard`, **Manage Leagues** → `/leagues`.
- Add a persistent "Switch workspace" item in both sidebars (`DashboardSidebar`, league dashboard sidebar) that returns here.
- `Login.tsx` redirects here on success instead of straight to `/dashboard`.

## Part 2 — League Manager Dashboard

New route tree under `/leagues/:leagueId/manage/*` with a dedicated `LeagueDashboardLayout`:

### 2.1 Events & Matches (`LeagueEventsTab` enhancements)
- Create single-day / multi-day / recurring events (weekly cadence stored as `recurrence_rule` JSON on `league_events`).
- Format dropdown: stroke, match, 2-scramble, 2-shamble, 4-best-ball, stableford, quota, team_points, ryder_cup, round_robin.
- RSVP + waitlist via existing `league_event_registrations` (add `status: rsvp|waitlisted|confirmed`, `registration_deadline`).
- Substitutes + late pairings edits.
- **Skins toggle** per event (`skins_enabled boolean`, `skins_mode gross|net|both`, `skins_carryover boolean`, `skins_value_cents`).

### 2.2 Player Management (`LeagueMembersTab` enhancements)
- CSV import (reuse `PlayerImport` pattern).
- Handicap Index field per member (already present).
- Compute Course Handicap = `index × slope/113 + (rating − par)` using `handicapUtils`.
- Apply stroke pops per hole via `allocateStrokes` when net scores are computed.
- Net Double Bogey cap on hole entry for handicap-adjusted score.

### 2.3 Live Scoring & Public Leaderboard
- Public per-player scoring link: `/league/:slug/score/:code` (6-char code stored on `league_members.scoring_code`).
- Hole-by-hole mobile entry, no auth, no app.
- Realtime channel on `league_event_scores` → leaderboard updates instantly.
- Manager override editor in dashboard (full edit like tournament).
- Skins column highlighted yellow when `skins_enabled`; uses existing `computeEventSkins`.

### 2.4 Settings
- Points vs payout standings (extend `league_point_systems` with `standings_mode: points|payout`).
- Communication hub: reuse existing tournament messaging pattern → new `league_messages` sent as email to members.
- Print materials: scorecards, cart signs, standings PDF (reuse printables patterns).

## Part 3 — Public League Homepage

Enhance `PublicLeague.tsx`:
- Hero, schedule, live season standings, past results (per event), Register CTA per upcoming event.
- Reuse existing sponsor/branding blocks.

## Part 4 — Payments

- Reuse `create-league-subscription` pattern for **event registration** via new edge function `create-league-event-checkout`:
  - Direct charge on organizer's connected Stripe account.
  - `application_fee_amount = 5%`.
  - Toggle `pass_platform_fee_to_player` on `league_events`.
- Webhook already handled in `league-payment-webhook` for `kind: league_event`.

## Technical Details

**DB migration** (single migration):
- `league_events`: add `recurrence_rule jsonb`, `registration_deadline timestamptz`, `skins_enabled bool`, `skins_mode text`, `skins_carryover bool`, `skins_value_cents int`, `pass_platform_fee_to_player bool`, `entry_fee_cents int`.
- `league_event_registrations`: add `status text default 'confirmed'`, `waitlist_position int`.
- `league_members`: add `scoring_code text unique`, trigger to auto-generate 6-char code.
- `league_point_systems`: add `standings_mode text default 'points'`.
- New table `league_messages` (id, league_id, subject, body, sent_at, sent_by) + GRANTs + RLS.

**Files**:
- New: `src/pages/SelectWorkspace.tsx`, `src/pages/leagues/LeagueDashboard.tsx`, `src/pages/leagues/LeagueScore.tsx` (public), `src/components/leagues/LeagueDashboardLayout.tsx`, `src/components/leagues/LeagueSkinsToggle.tsx`, `src/components/leagues/LeagueCommunicationTab.tsx`, `src/components/leagues/LeaguePrintablesTab.tsx`.
- Edit: `src/App.tsx` (routes), `src/pages/Login.tsx` (redirect), `src/components/DashboardSidebar.tsx` (switch-workspace link), `src/components/leagues/LeagueEventsTab.tsx`, `LeagueMembersTab.tsx`, `LeagueScoringTab.tsx`, `LeagueSkinsTab.tsx`, `src/pages/PublicLeague.tsx`, `src/lib/leagueSkins.ts` (net mode uses computed net).
- New edge fn: `supabase/functions/create-league-event-checkout/index.ts`.

## Scope guard
No changes to tournament flows, admin dashboard, or any file outside the paths listed above.
