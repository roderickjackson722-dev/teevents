# Tee-Time Aware Printables, Tee Time Emails & Flight Sync

Four connected pieces, all scoped to tournament management (no league or unrelated changes).

## 1. Printables reflect the start format (shotgun vs tee times)

Cart signs and name badges currently only ever print "Starting Hole: N". They will
become format-aware, reading the same tee time data the pairings page writes
(`registration_groups.tee_time` / `tournament_registrations.tee_time`) and the
tournament's saved start format.

Cart signs
- Load each group's tee time alongside the group/team data on the Printables page.
- When the tournament uses tee-time starts, the sign prints the tee time as the
  primary start line (e.g. "Tee Time: 8:20 AM · Hole 1"); with shotgun starts it
  keeps today's "Starting Hole" line.
- New toggles in Customize Design: show tee time, show starting hole, show course
  name, plus an editable tee time field per sign so an organizer can override what
  prints without touching pairings. Overrides save with the existing cart sign
  name overrides on `registration_groups`.
- Logo, font, layout, scale and margin controls stay exactly as they are.

Name badges
- Badge template gains the start line (tee time when tee-time format, starting
  hole when shotgun) plus team name, and honors the same show/hide toggles and
  logo choice as cart signs.

## 2. Tee Time email to individual players (with pairings link)

- Add a "Tee Times & Pairings" template to the Email Templates page, using the
  existing editor, section ordering, preview and per-player recipient selection.
- Personalized variables per recipient: `{{tee_time}}`, `{{hole_number}}`,
  `{{team_name}}`, `{{group_members}}`, `{{scoring_code}}` — tee time is pulled
  from the pairings assignment, matching the existing single source of truth.
- Buttons in the email: "View Full Pairings & Tee Sheet" and "Live Leaderboard".
- New public, read-only pairings/tee sheet page at `/pairings/:slug` showing every
  group with team name, tee time or starting hole, and player names, grouped by
  flight when flights exist. Organizer can hide it; the email link points here.

## 3. Flights sync with Registration Management divisions/tiers

Root cause of "no players in tournament flights": registrations store the
division a player signed up under in `tier_id` (registration tiers), while the
flight leaderboards read `flight_id` (`tournament_tiers`). Nothing links them.

- Flights Manager gains a "Sync from registration divisions" action that reads the
  distinct registration tiers/divisions actually used by the roster, creates a
  matching flight for each one that does not exist yet, and assigns every player's
  `flight_id` from their registered division.
- Sync runs automatically when the Flights tab loads and finds unassigned players
  with a division, so the tab is never empty when the data exists.
- Players with no division are listed in an "Unassigned / Needs Division" pool with
  inline division and flight pickers, so organizers can place them from the same
  screen instead of hunting through the roster.
- Flight cards show live counts sourced from the roster, and the manual Custom
  Flight Editor keeps full override control.

## 4. Everything in sync for leaderboards

- The public live leaderboard already renders one tab per flight; it will now be
  populated because `flight_id` is filled by the sync above.
- Flight names, order and active/inactive state flow from Flights Manager to the
  public leaderboard tabs and to the flighted preview inside the dashboard.
- The pairings page division filter, printables, the tee time email and the public
  pairings page all read the same division/tee time values, so one edit updates
  every surface.

## Technical notes

- Data: reuse `registration_groups.tee_time` / `tee_times`, `tournaments.start_format`
  (already persisted from pairings), `tournament_registrations.tier_id` and
  `flight_id`, `tournament_tiers`. No schema change expected beyond storing the
  new printable toggles inside the existing `printable_options` JSON and the new
  email config column, plus a public SELECT policy check for the pairings page.
- New/changed files: `src/components/printables/CartSignsTab.tsx`,
  `NameBadgesTab.tsx`, `PrintableSettings.tsx`, `teamGrouping.ts`,
  `src/pages/dashboard/Printables.tsx`, `src/components/dashboard/FlightsManager.tsx`,
  `src/pages/dashboard/EmailTemplateEditor.tsx` (+ send path), new
  `src/pages/PublicPairings.tsx` with a route.
- Untouched: scoring engine, payouts, league mode, registration checkout.
