
This request spans four related but independent pieces. Each is scoped below so you can approve all, or tell me which to skip / reorder.

## 1. Edit History panel in the scoring UI

Add a collapsible "Edit History" panel to the scoring screen (`src/pages/dashboard/Leaderboard.tsx`, which is where `score_edits` are already written).

Panel contents, newest first, for the selected tournament:
- Player (from `tournament_registrations`)
- Hole number
- Old score → New score
- Editor name/email (from `edited_by` → `auth.users` via a lookup helper, since we can't join `auth.users` from RLS)
- Timestamp
- Notes (if present)

Filters at the top of the panel: hole number, player, editor. Default view shows last 50, "Load more" pagination.

New RPC `get_score_edit_history(_tournament_id uuid)` (SECURITY DEFINER, org-member gated) so we can safely return the editor email without exposing `auth.users` broadly.

## 2. Admin scoring URL confirmation

Today there is **no** `/admin/scoring/{tournament_id}` route. Scoring lives at the organizer route (`/dashboard/.../leaderboard`). Two options:

- **A (recommended):** Add `/admin/scoring/:tournamentId` that renders the existing scoring UI inside the admin shell, so admin nav stays intact. Impersonation continues to work through `useAdminLink`.
- **B:** Leave scoring only in the organizer dashboard and document the correct URL.

I'll go with **A** unless you say otherwise. I'll also audit the scoring page for any `navigate("/dashboard/...")` that would kick an admin back into the organizer shell and switch them to preserve `/admin/...` when the referrer is admin.

## 3. Admin Platform Tournaments filters

In `src/pages/admin/PlatformTournaments.tsx`:
- Text search: organizer name / tournament title.
- Date range: tournament `date` (from / to).
- Status pills: **Live** (`site_published = true AND date >= today`), **Draft** (`site_published = false`), **Ended** (`date < today`).
- Filters combine (AND), reset button, and preserve state in the URL query string so admins can share a filtered view.

## 4. Scoring-only role: enforced RLS verification

Add integration tests under `src/test/integration/rls-scoring-role.test.ts` that, using the Supabase JS client with a real JWT for a seeded `role = 'scorer'` org member, verify:
- CAN `select` / `insert` / `update` on `tournament_scores` and `score_edits` for their org's tournaments.
- CANNOT `select` `budget_estimates`, `budget_expenses`, `budget_income`, `platform_transactions`, `organization_payout_methods`, `tournament_invoices` (finances).
- CANNOT `update` `tournaments` (settings) or `tournament_registrations` fee/payment fields.

If any existing RLS policy is missing a "scorer excluded" clause, I'll patch it via migration to gate on a new `public.has_org_scope(user_id, org_id, scope)` helper (backed by `org_members.role`), so scoring stays green and finances/settings stay red.

Note: the test suite runs locally; it needs a Supabase URL + service key to seed users. I'll wire it into `vitest` behind an env flag so CI won't fail without those secrets.

---

## Technical details

- Migration: `get_score_edit_history` RPC + `has_org_scope` helper.
- New route: `<Route path="/admin/scoring/:tournamentId" element={<AdminScoring />} />` wrapping the existing scoring component with an admin layout.
- Filters: extend the existing `useMemo`/`filter` chain in `PlatformTournaments.tsx`; add `URLSearchParams` sync.
- Tests: `@supabase/supabase-js` service client seeds an org, a `scorer` member, a tournament; a second client uses the scorer's JWT for the assertions.

---

Please confirm:
1. Add the admin scoring route (option A)?
2. OK to add a `has_org_scope` helper and adjust any RLS gaps found during test authoring?
3. Any status labels other than **Live / Draft / Ended** you want on the admin table?
