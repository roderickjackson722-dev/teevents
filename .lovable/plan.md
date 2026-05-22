# Mockup Outreach — Custom Sample Tournament Generator

A new admin section that lets you spin up a fully branded sample tournament site + dashboard for any prospect (Eventbrite, Facebook flyer, Zeffy, etc.), share a unique link, and email it with a pre-filled outreach template.

## 1. Database (one migration)

Four new tables in `public`:

- **sample_tournaments** — `id`, `admin_id`, `unique_slug` (unique), `tournament_name`, `event_date`, `location`, `description`, `logo_url`, `hero_image_url`, `scoring_format` (default 'Scramble'), `registration_fee_cents` (default 10000), `team_fee_cents` (default 40000), `view_count`, `last_accessed_at`, timestamps
- **sample_participants** — `sample_tournament_id` (FK cascade), `name`, `handicap`, `email`
- **sample_sponsors** — `sample_tournament_id` (FK cascade), `name`, `level` ('Title'|'Gold'|'Silver'|'Bronze'), `logo_color`, `website_url`
- **sample_leaderboard** — `sample_tournament_id` (FK cascade), `player_name`, `gross_score`, `net_score`, `thru`, `position`

RLS:
- All four tables: public `SELECT` (so prospects can view without auth)
- `INSERT/UPDATE/DELETE` restricted to admins via `has_role(auth.uid(), 'admin')`

## 2. Admin section — "Mockup Outreach"

Add a new tab/section in `AdminDashboard.tsx` called **Mockup Outreach** with two sub-views:

### a) Generator form (`/admin/sample-generator` route, also embedded in the tab)
- Inputs: Tournament Name, Date, Location, Description, Player Fee, Team Fee, Scoring Format dropdown
- Branding: Logo URL + Hero Image URL (paste URL; optional file upload to `tournament-assets` bucket)
- Toggles: generate participants / sponsors / leaderboard (all default on)
- **Generate Sample Tournament** button:
  - Auto-slugifies the tournament name (collision-safe)
  - Inserts the `sample_tournaments` row
  - Seeds 12 mock participants, 6 mock sponsors, 10 leaderboard entries (the exact lists from the spec)
- After generation: shows public link, **Copy Link**, **View Sample**, **Send to Prospect** (opens email modal), QR code

### b) Saved mockups list
- Table of all generated samples with: name, slug, created date, view count, last accessed
- Per-row actions: View, Copy Link, Edit, Regenerate Mock Data, Send to Prospect, Delete

### c) Send-to-Prospect modal
- Pre-filled Subject + Body using the new email template (with `[Tournament Name]` and sample link substituted)
- Editable name + email fields
- Sends via the existing transactional email pipeline (or `mailto:` fallback)

## 3. Public sample pages

Three new public routes (no auth):

- **`/sample/:slug`** — Public tournament site styled like a real PublicTournament page: hero image, name/date/location, description, Registration button (shows "This is a demo" toast), Leaderboard tab, Sponsors tab, Schedule, Course details placeholder
- **`/sample/:slug/dashboard`** — Read-only organizer dashboard preview: Overview stats, Players list, Leaderboard, Sponsors, Finances (mock $5 fee + Stripe payout), Payout Settings, Share & Promote
- **`/sample/:slug/live`** — TV-optimized dark live leaderboard with auto-refresh animation

Each public route page increments `view_count` and updates `last_accessed_at` on load (anon-allowed RPC).

## 4. Email template (outreach)

Updated transactional template `mockup-outreach`:

> Subject: Your [Tournament Name] — custom mockup
>
> Hey [Name], I hope your planning for [Tournament Name] is on track. We built TeeVents to handle registration, payments, live leaderboards, hole sponsors, volunteer check-in, and automatic payouts. Here's a custom mockup of what your event would look like on TeeVents: 👉 [link]. No pressure — just wanted to share. Best, Rod

Sent through the existing `send-transactional-email` infrastructure, BCC `info@teevents.golf`.

## 5. Files

**New:**
- `supabase/migrations/<ts>_sample_tournaments.sql`
- `src/pages/admin/SampleGenerator.tsx` (form + list, used by both the route and tab)
- `src/pages/sample/SampleTournament.tsx` (`/sample/:slug`)
- `src/pages/sample/SampleDashboardPreview.tsx` (`/sample/:slug/dashboard`)
- `src/pages/sample/SampleLive.tsx` (`/sample/:slug/live`)
- `src/components/admin/SendProspectModal.tsx`
- `src/lib/sampleMockData.ts` (the 12 participants, 6 sponsors, 10 leaderboard rows)
- `supabase/functions/_shared/transactional-email-templates/mockup-outreach.tsx`

**Edited:**
- `src/App.tsx` — add 4 new routes
- `src/pages/AdminDashboard.tsx` — add "Mockup Outreach" tab
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — register new template

## 6. Success criteria
- Admin can create a custom sample from any flyer in under 60 seconds
- `/sample/{slug}` renders a branded, realistic public site
- `/sample/{slug}/dashboard` shows all organizer features filled with mock data
- Prospect link is shareable without login
- Outreach email is editable and sends through existing email pipeline
- Samples can be edited, regenerated, and deleted from the admin tab
