# TeeVents Platform Enhancements

Large scope (4 parts). I'll implement in this order, each as an independent shippable chunk.

## Part 1 — Dashboard Menu Reorganization (smallest, no DB)

Edit `src/components/DashboardSidebar.tsx`:
- Reorder categories: Organizer Setup → Course Setup → Tournament Setup → **Operations** → Promotion & Marketing → Finance → Post-Event → Settings.
- **Tournament Setup**: add Live Leaderboard (already there), Event Day Contest (moved from Operations, below Sponsorship Management), Side Events (moved, below Day of Event Page).
- **Operations**: rename "Players" → "Players & Pairings"; remove "Test Simulator" and "Tee Sheet"; add "Live Leaderboard (view only)" pointing to `/dashboard/leaderboard?view=1`; move Team Performance directly below Messages; add new "CRM" item at end.
- **Course Setup**: keep Handicap Settings link; remove any "Live Settings" sub-link if present (already only handicap tab).
- No item duplicated, no item lost (except Test Simulator + Tee Sheet per spec).

## Part 2 — Course Database with Search

Migration: create `public.course_database` table with columns from spec + RLS.
- SELECT: authenticated users can read all verified rows + their own unverified.
- INSERT: authenticated users (auto-set created_by).
- UPDATE/DELETE: only created_by or admin.
- Seed: skip third-party API. Provide manual entry + "Save to my library" toggle. (No 500-course pre-load — would require external data; instead enable crowdsource pattern.)

UI: Update `src/pages/dashboard/CourseDetails.tsx` — add a search box at top that queries `course_database` by `course_name ilike`, shows result cards with [Select] to populate hole pars/SI/distances/rating/slope into the current tournament. "Manual Entry" toggle keeps existing form. Checkbox "Save this course to my library" on save.

## Part 3 — Invoice Management

Migration on `public.invoices`: add `status TEXT DEFAULT 'draft'`, `last_edited_by UUID`, `edit_history JSONB DEFAULT '[]'`.

Admin UI in `src/components/admin/AdminInvoices.tsx`:
- List view with Status column + filters (Draft / Sent / Paid).
- Actions: Edit (opens modal for any field), Save as Draft, Send (sets status='sent'), Clone (duplicates row with status='draft', new id), View history.
- Version history: on each update, append `{user_id, at, changes}` to `edit_history` (done client-side; also stamp `last_edited_by`).

## Part 4 — CRM

Migration: create `crm_contacts`, `crm_communications`, `crm_tasks`, `crm_audit_log` tables with org-scoped RLS via tournament → organization_id.
- RLS: org members read; editors insert/update their own; owners full; audit log read-only for non-owners.
- Trigger: `crm_contacts` AFTER UPDATE → insert per-field rows into `crm_audit_log`.

UI: New route `/dashboard/crm` (`src/pages/dashboard/CRM.tsx`):
- Tournament-scoped contact list with search/filter (type, status).
- Add/Edit contact dialog.
- Contact detail drawer with: info, notes, Communication History (log activity), Tasks (add/complete), Audit Log.
- CSV import/export (client-side parse).
- "Send Email Batch" defers to existing Messages flow (link out) — full bulk email is out of scope for this pass.

Register route in `src/App.tsx`; add sidebar entry (done in Part 1).

## Technical notes
- All migrations include GRANTs (anon excluded; authenticated + service_role).
- CRM permissions piggyback on existing `org_members.role` / `permissions` — new permission key `manage_crm` for editors; owners always allowed.
- Course DB shared across all orgs (acts as a public registry) with `created_by` for moderation.
- No changes to payments, Stripe, registration, email infra, or any non-listed feature.

## Out of scope explicitly skipped
- Pre-loading 500+ US courses (no licensed data source available in-sandbox).
- Bulk email send from CRM (uses existing Messages page).
- "Live Leaderboard (view only)" is a link to the existing leaderboard page — not a new component.

Total: ~3 migrations, ~6 new files, ~5 edited files.