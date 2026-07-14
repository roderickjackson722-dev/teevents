## Sample Dashboard Mode — Implementation Plan

Build a read-only preview mode for tournaments so admins can share a no-login dashboard link with prospects, then convert to a live tournament and hand off to an organizer.

### 1. Database migration
Add to `tournaments`:
- `is_sample boolean default false`
- `sample_token uuid default gen_random_uuid() unique`
- `sample_view_count integer default 0`
- `sample_last_viewed timestamptz`
- `sample_created_by uuid references auth.users(id)`
- `sample_converted_at timestamptz`
- `sample_converted_to uuid references auth.users(id)`
- `is_converted_from_sample boolean default false`

RLS: add a policy `Anyone can view sample tournaments` — `for select using (is_sample = true)`. Add a `bump_sample_view(_token uuid)` security-definer RPC that increments count + updates `sample_last_viewed` and returns the tournament id. Add `notify_sample_upgrade_interest(_token uuid, _email text, _name text, _message text)` that inserts into `admin_notifications`.

### 2. Admin UI — Sample Mode panel
In `src/pages/admin/PlatformTournaments.tsx`, add a "Sample Mode" section per tournament row (drawer/dialog):
- Toggle **Enable Sample Mode** (updates `is_sample`, ensures `sample_token` exists, sets `sample_created_by`)
- Copyable link: `https://teevents.golf/sample/{token}` + Copy button
- Stats: views + last viewed
- **Convert to Live**: email input → calls new edge function `admin-convert-sample-tournament` which:
  1. Sets `is_sample=false`, `is_converted_from_sample=true`, `sample_converted_at=now()`, `sample_converted_to=<user_id>`
  2. Creates the auth user (if missing) with a temp password, invites as owner on the tournament's organization (reuses existing `admin-attach-organizer` logic — but must NOT touch the platform admin password guard already in place)
  3. Sends login email via existing invite email flow

### 3. Public sample route
- New route `/sample/:token` → `src/pages/sample/SampleTournamentDashboard.tsx`
- Loads tournament by token via anon select (RLS allows), calls `bump_sample_view` RPC
- Wraps children in a `SampleModeContext` (`{ isSample: true, tournamentId, orgId }`)
- Renders the existing dashboard layout/sidebar/pages inside a read-only shell with:
  - Top banner: "🔍 SAMPLE MODE — This is a preview…" + **Upgrade Now** button (opens modal → calls `notify_sample_upgrade_interest`)
  - CSS class on `<main>` that disables pointer events on form inputs/buttons flagged as mutating (`[data-mutating]` or a global overlay approach)
- Sub-routes for tabs: `/sample/:token/players`, `/leaderboard`, `/sponsors`, `/finances`, `/checkin`, `/scoring`, `/day-of`, etc. Reuse the existing dashboard tab components, passing `orgId`/`tournamentId` from context instead of from `useOrgContext`.

### 4. Read-only enforcement
Add a lightweight `useIsSampleMode()` hook. In existing dashboard pages that support sample viewing, gate save/submit handlers:
```ts
if (isSample) { toast("This is a sample dashboard. Upgrade to a live tournament to make changes."); return; }
```
Only touch the handful of top-level tab pages listed in the request (Overview, Players, Leaderboard, Sponsors, Finances, PayoutSettings, CheckIn, Scoring, DayOf). No changes to unrelated dashboard pages.

### 5. Enable for the Bolton Invitational
After the migration is approved, run an insert to set `is_sample=true` on the Bolton Invitational tournament and return its `sample_token` so the admin can share the link immediately.

### 6. Files to create
- `supabase/migrations/<new>.sql`
- `supabase/functions/admin-convert-sample-tournament/index.ts`
- `src/pages/sample/SampleTournamentDashboard.tsx`
- `src/context/SampleModeContext.tsx`
- `src/hooks/useIsSampleMode.ts`
- `src/components/admin/SampleModePanel.tsx`

### 7. Files to edit
- `src/App.tsx` — register `/sample/:token/*` route (public)
- `src/pages/admin/PlatformTournaments.tsx` — add "Sample Mode" button per row opening the panel
- Selected dashboard tab pages — guard mutating actions with `useIsSampleMode()`

### Notes
- Reuses existing `admin-attach-organizer` and invite/email plumbing — no changes to platform-admin password guard.
- Anon read policy is scoped only to rows where `is_sample=true`; other tournaments remain protected.
- No changes to organizer login, existing tournaments, or unrelated dashboard pages.

Confirm and I'll implement. Want me to also expose the sample link on the tournament card in the admin list (quick copy) or keep it only inside the panel?
