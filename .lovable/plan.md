# Interactive Demo Enhancements

A large multi-part change. I'll group it into 4 shippable phases so you can review/test as we go.

## Phase 1 — Tour fixes & analytics (no backend yet)

Files: `src/pages/InteractiveDemo.tsx`, `src/pages/SampleDashboard.tsx`

- **Start Tour button**: Always visible (currently only "Restart"). Rename to "Start Tour" with a clearer style; keep behavior (clears localStorage flag and runs).
- **Finances step copy**: Update to match the public site fee wording — "5% platform fee + Stripe processing fee (2.9% + $0.30) added at checkout. Organizer receives net proceeds directly via Stripe Connect — TeeVents never holds your funds."
- **Mobile target verification**: For each `data-tour` target, set `placement: "auto"` on small screens and add `disableScrolling: false`, `scrollOffset: 80`. Sidebar items collapse on mobile in `SampleDashboard` — add `data-tour` attributes to the mobile nav equivalents (or force sidebar open while tour runs).
- **Analytics events**: Fire `tour_started`, `tour_step_viewed` (with index), `tour_completed`, `tour_skipped`. Initially log to `console` + insert into `demo_events` table (created in Phase 2). For now just emit a `window.dispatchEvent` hook so wiring is ready.

## Phase 2 — Database & lead capture modal

Migration creates:

- `demo_leads` (id, email, role, demo_completed, demo_exited_at, demo_started_at, last_step_index, feedback_score, feedback_text, feedback_reasons text[], welcome_email_sent_at, followup_24h_sent_at, followup_7d_sent_at, signed_up_at, created_at, updated_at)
- `demo_events` (id, lead_id fk, event_name, step_index, metadata jsonb, created_at) — for analytics
- RLS: public **insert** allowed (no auth on demo page); **select/update** restricted to admins via `has_role(auth.uid(),'admin')`. Edge functions use service role.
- Unique partial index on `lower(email)` (latest lead) — but allow multiple rows; upsert on email so re-visits update the same lead.

UI:

- New `src/components/demo/DemoLeadCaptureModal.tsx` — email (required, validated), role radio group (organizer / sponsor / looking — optional), submit. On submit: upsert into `demo_leads`, store `demo_lead_id` in `localStorage`, fire `demo-welcome` email, then start tour.
- Modal shown on `/interactive-demo` if no `demo_lead_id` in localStorage; otherwise auto-start tour.
- Tour completion/exit handlers update `demo_leads` row + insert into `demo_events`.

## Phase 3 — Emails (Resend, existing infra)

This project uses **Resend** (secret `RESEND_API_KEY` already configured). I'll add three small edge functions reusing existing transactional patterns:

- `send-demo-welcome` — invoked from client right after lead capture.
- `send-demo-followup-24h` and `send-demo-followup-7d` — invoked from a single scheduled function `process-demo-followups` (pg_cron every 15 min) that finds eligible leads:
  - 24h: `demo_completed = true`, `welcome_email_sent_at < now()-24h`, `followup_24h_sent_at IS NULL`, no matching user in `auth.users`.
  - 7d: similar with 7 days; this email contains a link to the feedback survey at `/interactive-demo/feedback?lead=<id>`.
- All three use the same React-email-style HTML helper, signed-from `notify@teevents.golf` (existing sender). Idempotency via the `*_sent_at` columns.

"Signed up" detection: query `auth.users` by email (service role) and stamp `signed_up_at`.

## Phase 4 — Feedback survey + admin page

- `src/components/demo/DemoFeedbackModal.tsx`: shown on revisit if `demo_completed=true`, `signed_up_at IS NULL`, `feedback_text IS NULL`. Also reachable directly via `/interactive-demo/feedback?lead=<id>` from the 7-day email.
  - Checkboxes (multi): Still evaluating / Need a feature / Too expensive / Confusing / Other (+ text).
  - 1–5 NPS-style scale.
  - Free-text "Any questions?".
- New admin page `src/pages/admin/DemoLeads.tsx` mounted at `/admin/demo-leads`:
  - Table: email, role, started, completed, exited, NPS, feedback summary, signed-up flag.
  - Filters: completion status, has feedback, signed up.
  - CSV export (client-side).
  - "Send follow-up" action calls the appropriate edge function manually.
  - Linked from `AdminDashboard` sidebar.

## Technical notes

- All edge functions use `corsHeaders` from `npm:@supabase/supabase-js@2/cors`, validate input with `zod`, pull `RESEND_API_KEY` and use Resend REST API (no SDK needed).
- Cron job created via `supabase--insert` (per `schedule-jobs-supabase-edge-functions` rules), not migration.
- No PII beyond email + role is stored. Email is lower-cased on insert.
- Scoped change: I will **not** alter unrelated dashboard/site-builder code.

## Order of operations

1. Phase 1 (UI-only) — ship and verify.
2. Phase 2 migration — request your approval, then implement modal + tracking.
3. Phase 3 emails + cron.
4. Phase 4 survey + admin page.

Approve to proceed; I'll start with Phase 1 immediately and pause before the Phase 2 migration for your DB approval.