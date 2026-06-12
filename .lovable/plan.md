# Demo-to-Production Conversion System

Build an admin tool that creates fully-populated demo tournaments to show prospects, then converts them into live tournaments the prospect claims via signup.

## Scope

- Admin-only page at `/admin/demo-converter` (linked from AdminDashboard).
- Public demo pages under `/demo/:token`, `/demo/:token/dashboard`, `/demo/:token/live`, `/demo/:token/day-of`.
- Public signup/claim page at `/claim/:token`.
- Conversion email sent via existing transactional email infrastructure.

## Part 1 — Database

New tables (with RLS + GRANTs):

- `demo_tournaments` — admin_id, tournament_name, event_date, location, course_name, registration_fee_cents, scoring_format, status (`active|converted|archived`), prospect_email, prospect_name, public_token (uuid, unique), conversion_token (uuid, unique), converted_at, live_tournament_id, created_at.
- `demo_players` — demo_tournament_id, name, email, handicap, shirt_size, group_name, tee_time.
- `demo_sponsors` — demo_tournament_id, name, level, logo_url, website_url.
- `demo_scores` — demo_tournament_id, player_name, hole_number, gross_score.

RLS:
- Admins (`has_role(auth.uid(),'admin')`): full access on all four tables.
- Anonymous/public: SELECT on all four tables (needed so `/demo/:token` pages render without auth) — safe because data is mock and read-only.
- `service_role`: ALL (used by edge functions).

## Part 2 — Admin UI (`/admin/demo-converter`)

A single React page with four step cards:

1. **Tournament details form** — name, date, location, course, fee, scoring format.
2. **Mock data toggles** — checkboxes for players/sponsors/scores/check-ins, then "Create Demo Tournament" button. Calls edge function `create-demo-tournament` which inserts demo row + generates mock data (12 players, 6 sponsors, leaderboard scores).
3. **Share demo** — shows 4 demo URLs with copy buttons + "Send to Prospect" button.
4. **Convert to live** — prospect email/name inputs, warning list, "Convert" button calls `convert-demo-to-live` edge function.

Plus a **Demo list table** at the bottom showing all demos with status badges (active/converted) and quick actions (View, Convert, Archive). Each row expandable to show mock-data toggle buttons (Add/Remove Players, Sponsors, Scores, Reset).

## Part 3 — Mock data generator

Hardcoded arrays in `supabase/functions/_shared/demoMockData.ts` matching the spec (12 players, 6 sponsors, 10 leaderboard teams). Scores generated as 18 holes per top team to populate live leaderboard.

## Part 4 — Public demo pages

New routes in `App.tsx`:
- `/demo/:token` → `DemoTournamentSite` — renders a public tournament-style page using demo data.
- `/demo/:token/dashboard` → `DemoDashboardPreview` — reuses existing sample dashboard components but pulled from demo tables.
- `/demo/:token/live` → `DemoLiveLeaderboard` — TV leaderboard from `demo_scores`.
- `/demo/:token/day-of` → `DemoDayOfPage` — player day-of page with mock check-ins/groups.

All fetch by `public_token` with anon read access.

## Part 5 — Convert to live

Edge function `convert-demo-to-live`:
1. Insert real row into `tournaments` (title, date, location, course_name, registration_fee_cents, scoring_format) with `site_published=false`, `organization_id=null` until claimed.
2. Set `demo_tournaments.status='converted'`, `live_tournament_id`, `conversion_token=gen_random_uuid()`, `converted_at=now()`.
3. Invoke `send-transactional-email` with new template `demo-conversion-claim` (subject "Claim your tournament – {name}", body per spec, CTA link `https://teevents.golf/claim/{conversion_token}`).
4. Do NOT delete demo rows — they remain visible at the demo URLs for record-keeping but `status=converted` hides them from the active list.

## Part 6 — Claim/signup page (`/claim/:token`)

Public route. Loads demo by `conversion_token`. Shows the form from the spec (email, password, three required checkboxes). On submit:
1. `supabase.auth.signUp` with email/password.
2. Edge function `claim-converted-tournament` (verify_jwt=true): looks up demo by token, creates an `organizations` row for the new user, inserts `org_members` (role=owner), updates the real `tournaments` row to set `organization_id`, marks demo `status='archived'`.
3. Redirect user to `/dashboard/tournaments`.

## Part 7 — Edge functions

- `create-demo-tournament` (admin JWT required) — creates demo + seeds mock data.
- `demo-mock-data-toggle` (admin JWT) — add/remove subsets of mock data.
- `convert-demo-to-live` (admin JWT) — conversion logic + send email.
- `claim-converted-tournament` (user JWT) — completes claim.

All use service_role client, validate admin via `has_role`, and include CORS headers.

## Part 8 — Email template

New transactional template `demo-conversion-claim.tsx` in `supabase/functions/_shared/transactional-email-templates/` with TeeVents branding (Gold CTA, Forest Green text), registered in `registry.ts`.

## Technical notes

- Reuse existing `AdminInvoices` pattern for admin-only page wiring (route already in AdminDashboard tabs — add a new tab "Demo Converter").
- Tokens: use `gen_random_uuid()` for both `public_token` and `conversion_token`.
- No payment changes (demos don't touch Stripe).
- Mock data is hardcoded — no AI generation.
- Demo pages render with `noindex` meta to keep them out of search.

## Open question

Should the new admin page be a **standalone route** at `/admin/demo-converter` (as written in your spec) **or a tab inside the existing `/admin` dashboard** next to other admin tools? I'll default to a standalone route but also surface a link/tab from `AdminDashboard` so you can find it easily — let me know if you'd rather have it tab-only.
