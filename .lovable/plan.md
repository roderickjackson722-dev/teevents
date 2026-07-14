## Goal
When someone opens the Bolton Invitational sample link, they should see the **actual organizer dashboard** — same sidebar, same tabs, same pages a real organizer sees after signup — but every Save/Delete/Publish button is disabled until you turn Sample Mode off from the admin dashboard.

## What the current `/sample/dashboard/:token` page does (wrong)
It renders a custom simplified page with a handful of tabs. That's not what you want.

## What it should do
Reuse `DashboardLayout` + `DashboardSidebar` + the real dashboard page components (Tournaments, Registration, Sponsors, Leaderboard, Scoring, Finances, etc.), pointed at the sample tournament's organization, with saves blocked.

## Approach

### 1. Sample auth without exposing data
Create a dedicated shared **"Sample Viewer" auth user** that is added as a `viewer`-role member to the organization that owns the Bolton Invitational (and any other sample). RLS already respects org membership, so this user can *read* the org's dashboard data but has no write permissions.

- Edge function `sample-session-mint`: verifies the `:token` maps to a tournament with `is_sample = true`, then returns a short-lived Supabase session for the shared viewer account (`sample-viewer@teevents.internal`).
- The sample dashboard page calls this function on mount, calls `supabase.auth.setSession(...)`, then redirects the browser to `/dashboard?sample=1&admin_org=<orgId>`.

### 2. Sample mode context
- New hook `useSampleMode()` reads `?sample=1` from the URL and persists a `sessionStorage` flag so it survives sidebar navigation.
- `DashboardLayout` shows a persistent yellow "SAMPLE MODE — no changes will be saved" banner + "Upgrade Now" button (opens existing lead-capture modal) when sample mode is active.

### 3. Save-blocking
A single utility `guardSampleWrite()` used by shared save helpers:
- Wrap the Supabase client in a `sampleSafeClient` proxy: when sample mode is active, `.insert() / .update() / .delete() / .upsert() / .rpc()` intercept and show a toast "Sample mode — saves are disabled. Ask the admin to convert to a live tournament." instead of hitting the DB.
- Read operations (`.select()`) pass through untouched so the dashboard still shows real data.
- File uploads and storage writes are similarly blocked.

This means we do NOT have to touch every dashboard page — the interception happens at the client layer, and the shared viewer account's RLS prevents writes as a second line of defense.

### 4. Admin toggle stays as-is
Your existing `SampleModePanel` in `PlatformTournaments.tsx` continues to toggle `is_sample` on the tournament. When you turn it off, `sample-session-mint` refuses to issue sessions and the link stops working. Existing browsers hitting `/dashboard?sample=1` are logged out on next navigation.

## Files

**New**
- `supabase/functions/sample-session-mint/index.ts` — validates token, returns session tokens for shared viewer account
- `src/lib/sampleSafeClient.ts` — proxy that intercepts writes when sample mode active
- `src/hooks/useSampleMode.ts` — reads `?sample=1` / sessionStorage
- `src/pages/sample/SampleSessionBootstrap.tsx` — replaces current `SampleTournamentDashboard.tsx`; mints session, redirects to `/dashboard?sample=1`

**Edit**
- `src/integrations/supabase/client.ts` is auto-gen and off-limits — instead we export a wrapped client from `@/integrations/supabase/safe` and update the shared save utility hooks. If a page imports `supabase` directly (most do), we swap them at build time via a small codemod pass, OR simpler: expose the guard through a `useSupabase()` hook and update the ~10 heaviest write pages to use it. Reads via the raw `supabase` client stay fine.
- `src/components/DashboardLayout.tsx` — add sample banner + skip the "no memberships → onboarding" redirect when in sample mode (viewer account is a member so this should just work)
- `src/App.tsx` — swap `/sample/dashboard/:token` to `SampleSessionBootstrap`

**Migration**
- Create shared `sample-viewer@teevents.internal` auth user, add as `viewer` (read-only permissions array) member of the Bolton Invitational org.

## Trade-offs / things to confirm
1. **Shared viewer account approach**: every sample visitor shares one Supabase session in their browser. Session tokens are short-lived (5 min) and scoped to viewer role. Alternative is a much bigger snapshot-based approach that reimplements every dashboard page in read-only — 10x the code and drift risk.
2. **Save interception at client**: it's a UX guard, not the security guard. RLS + viewer role is the real guard. A determined visitor can't write regardless.
3. **This is a sizable change** touching auth, layout, and shared client wiring. Estimated 4–6 files created + 2–3 edited. If you want, I can scope it to Bolton only first and expand later.

Approve and I'll build it.
