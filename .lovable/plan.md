# Manual Entry Enforcement & 5% Fee Recording

Completes Phase 7: blocks manual insertions at the 10-entry limit, shows a fee-confirmation modal, records the 5% fee, and gives admins a grant UI.

## 1. Database (migration)

Columns already exist on `tournaments` (`manual_entries_used/free_limit/admin_override`) and the `manual_entry_grants` audit table exists. Add:

- `public.manual_entry_fees` — one row per over-quota manual entry
  - `tournament_id`, `entity_type` (`player|sponsor|side_event|vendor|donation`), `entity_id uuid null`, `amount_cents`, `fee_cents`, `paid boolean default false`, `platform_transaction_id uuid null`, `created_by uuid`, `created_at`
  - Grants + RLS: org members can select/insert for their tournament; service_role full; admins full.
- RPC `public.record_manual_entry(_tournament_id uuid, _entity_type text, _entity_id uuid, _amount_cents int, _confirm_fee bool)` — SECURITY DEFINER
  - Increments `manual_entries_used` atomically
  - If over the effective limit (`free_limit + admin_override`) and `_confirm_fee=false` → raises
  - If over and confirmed → inserts `manual_entry_fees` row + a matching `platform_transactions` row (`type='manual_entry_fee'`, 5% of amount)
  - Returns `{ used, limit, fee_cents, over_quota }`
- RPC `public.admin_grant_manual_entries(_tournament_id uuid, _additional int, _reason text)` — admin-only, bumps `manual_entries_admin_override` and writes `manual_entry_grants` row.

## 2. Shared frontend

- `src/hooks/useManualEntryEnforcement.ts` — wraps `useTournamentAddons` + calls the RPC. Exposes `checkAndConfirm({ entityType, amountCents })` returning `{ proceed, feeCents }`.
- `src/components/ManualEntryLimitModal.tsx` — the "⚠️ Manual Entry Limit Reached" modal with editable amount + live 5% fee, Cancel / Confirm buttons. Skipped automatically when `unlimited_manual_entries` add-on is active.
- Copy notes the 5% fee is deducted from the organizer's next Stripe payout; if no Stripe connected, shows the "connect Stripe to add more" message.

## 3. Insertion sites to wire

For each, intercept the submit handler, call `checkAndConfirm` before writing, and only proceed on confirm:

| Site | File |
|------|------|
| Players (manual add) | `src/pages/dashboard/Players.tsx` (+ `RegistrationForm` when used as organizer manual add) |
| Sponsors (manual add) | `src/pages/dashboard/Sponsors.tsx` |
| Side Events (manual ticket) | `src/pages/dashboard/SideEvents.tsx` |
| Vendors (manual add) | `src/pages/dashboard/Vendors.tsx` |
| Donations (manual entry) | `src/pages/dashboard/Donations.tsx` |

Each site passes its transaction amount (registration fee, sponsor tier price, ticket price, vendor tier price, donation amount) to the modal.

## 4. Admin UI

Extend existing `src/pages/admin/ManualEntryGrants.tsx`:
- Tournament dropdown/search (already present)
- Show current `used / free_limit / admin_override / remaining`
- "Grant Additional Free Entries" form (count + reason) → calls `admin_grant_manual_entries` RPC
- Grant history table from `manual_entry_grants`

Also add a compact "Manual Entry Override" section in `src/components/admin/AdminTournamentEditModal.tsx` linking to the grants page and showing counts.

## 5. Fee collection

The `platform_transactions` row created by the RPC (type `manual_entry_fee`, `platform_fee_cents = fee_cents`) surfaces in the existing Finances dashboard and is netted from the organizer's next Stripe Connect payout via the existing payout job — no new Stripe checkout needed. Organizers without Stripe see the "connect Stripe" message in the modal and the entry is blocked.

## Out of scope
No changes to public-facing pricing copy, other dashboards, or any feature not listed above. Existing add-on `unlimited_manual_entries` continues to bypass the modal entirely.

## Verification
1. Create tournament → add 10 manual players → 11th triggers modal → confirm → `manual_entry_fees` + `platform_transactions` rows exist with correct 5% fee.
2. Repeat for sponsor, side event, vendor, donation paths.
3. Admin grants +5 entries → next manual add is free again; `manual_entry_grants` row logged.
4. Tournament with `unlimited_manual_entries` add-on → no modal ever appears.
