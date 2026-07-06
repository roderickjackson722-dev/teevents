# TeeVents Platform Repositioning & New Add-On Pricing Model

This is a large, multi-surface change. I'll break it into 8 phases and ship them in order. Please confirm before I start — once approved I'll execute all phases.

## Phase 1 — Database schema (migration, needs approval)
Add to `tournaments` table:
- `paid_features JSONB` (custom_domain, unlimited_manual_entries, auction_raffle, sms_email_blasts, priority_support, bundle — all default false)
- `manual_entries_used INTEGER DEFAULT 0`
- `manual_entries_free_limit INTEGER DEFAULT 10`
- `manual_entries_admin_override INTEGER DEFAULT 0`

Add `manual_entry_grants` audit table (tournament_id, granted_by, additional_entries, reason, created_at) with RLS + GRANTs for admin-only access.

## Phase 2 — Feature-gating logic
- New hook `useTournamentAddon(tournamentId, addonKey)` reading `paid_features`.
- New hook `useManualEntryQuota(tournamentId)` returning `{ used, limit, remaining, unlimited }` where `limit = free_limit + admin_override`, `unlimited = paid_features.unlimited_manual_entries || bundle`.
- Update `usePlanFeatures.ts`: retire org-level Pro gating for features now sold as add-ons (custom-domain, auction, sms-messaging, priority-support). Move them to per-tournament add-on checks. Live leaderboard, live scoring, volunteers, printables, flyer studio, surveys, gallery, donations, store move to **free**.

## Phase 3 — Homepage & marketing pages
- `src/pages/Index.tsx` hero → new headline + subheadline.
- `src/pages/Features.tsx` → regroup into 6 phases (Plan & Set Up, Promote & Sell, Register & Manage, Tournament Day, Finance & Payouts, Post-Event).
- `src/pages/Compare.tsx` → add "vs Fundraising-Only Platforms" section (GiveButter/Zeffy style comparison table).

## Phase 4 — Pricing page overhaul
- `src/pages/Plans.tsx` → new hero, single Free tier card, add-ons grid (5 items + Bundle $399), fee reference table ($50–$250 rows), remove old Pro tier copy.

## Phase 5 — Organizer dashboard "Upgrade Features"
- Replace `src/pages/dashboard/UpgradePlan.tsx` with new "Upgrade Features" page: manual entry usage bar, 5 add-on checkboxes with prices, Bundle option, "Purchase Selected Features" button.
- Update sidebar label from "Upgrade to Pro" → "Upgrade Features".

## Phase 6 — Stripe checkout for add-ons
- New edge function `purchase-addons` — accepts `{ tournament_id, addons: string[] }`, computes line items (or single Bundle line item), creates Checkout session.
- Update `verify-pro-upgrade` → generalize to `verify-addon-purchase` that flips the correct `paid_features.*` keys based on session metadata. Keep old function as thin alias for back-compat.
- Success URL returns to `/dashboard/upgrade` with confirmation toast.

## Phase 7 — Manual entry enforcement
- Wherever manual entries are created (Players, Sponsors, Side Events, etc. — I'll grep for the insertion sites), before insert:
  - If `unlimited` → allow, don't increment counter.
  - Else if `used < limit` → allow, increment `manual_entries_used`.
  - Else → block with modal: *"You have used your 10 free manual entries. Additional manual entries will incur a 5% platform fee."* + [Continue with fee] / [Upgrade to Unlimited $149] buttons.
- "Continue with fee" records a `platform_transactions` row with 5% fee against the entry amount.

## Phase 8 — Admin override UI
- New admin page `src/pages/admin/ManualEntryGrants.tsx`: search tournament, input additional free entries, optional reason, submit → increments `manual_entries_admin_override` and logs to `manual_entry_grants`.
- Link from admin dashboard sidebar.

## Scope notes
- I will NOT touch: any features not explicitly named, existing tournament data, existing Stripe Connect payout flow, the 5% platform fee logic on regular checkout, the org-level plan concept (I'll just stop using it for gating add-on features).
- I will keep legacy `tournaments.is_pro` column intact for back-compat but stop reading it for feature gates.

## Technical details (skip if not relevant)
- Migration order: table alters → new audit table → GRANTs → RLS → policies.
- Bundle logic: purchasing Bundle flips all 5 add-on flags + `bundle=true`.
- Idempotency: `verify-addon-purchase` keyed on Stripe session id (won't double-apply).
- All add-ons unlock per-tournament, not per-org.

**Reply "go" to execute all 8 phases. This will consume significant credits — estimated a lot of tool calls given the scope. If you'd rather ship in smaller batches, tell me which phase(s) first.**