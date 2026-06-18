# Five New Organizer Features

## 1. Early Registration Discount
**DB (migration):** add to `tournaments`:
- `early_registration_enabled BOOLEAN DEFAULT FALSE`
- `early_registration_price_cents INTEGER`
- `early_registration_expires_at TIMESTAMPTZ`

**Dashboard:** New "Early Registration Discount" card in `src/pages/dashboard/Registration.tsx` with enable toggle, price input, and datetime picker.

**Public page:** In `PublicTournament.tsx` registration block — show early-bird price with regular price struck through, and a live countdown timer ("ends in Xd Xh Xm"). After expiration, fall back to regular price.

**Checkout logic:** In the registration checkout edge function(s), if `early_registration_enabled` and `now() < early_registration_expires_at`, charge `early_registration_price_cents`; otherwise charge `registration_fee_cents`.

## 2. Event Day Sales
**DB (migration):** create `event_day_sales_items` table (tournament_id, item_name, description, price_cents, category enum-ish text, max_quantity, sold_quantity, show_on_public, show_qr_code, is_active). RLS: organizers manage their tournament's rows; public can SELECT active rows for published tournaments. GRANTs for authenticated, anon (select), service_role. Also a `event_day_sales_purchases` table for orders.

**Dashboard:** New page `src/pages/dashboard/EventDaySales.tsx` (sidebar entry + route). Table with add/edit/delete, category dropdown, QR toggle, public toggle, "Print QR Sheet" button that opens a printable layout of all enabled QRs.

**Public:** New section on Day-Of page (and/or `/t/:slug/sales`) listing active items with Buy Now → Stripe Checkout (uses Connect routing like other checkouts, with 5% platform fee).

**Edge function:** `create-event-day-sale-checkout` mirroring `create-sponsor-checkout` pattern (direct charge + platform fallback).

## 3. Cash Payment Registration
**DB (migration):** 
- `tournaments.allow_cash_registration BOOLEAN DEFAULT FALSE`
- `tournament_registrations.payment_method TEXT DEFAULT 'online'` (online/cash/check)
- `tournament_registrations.cash_payment_received BOOLEAN DEFAULT FALSE`

**Dashboard:**
- Registration Management: toggle "Allow cash payment registrations".
- Players tab → "Add Player" modal gets a Payment Method select (Online/Cash/Check) when toggle is on. Cash regs created directly without Stripe, marked `payment_status='cash_pending'`.
- Players list: show payment method + a "Mark Received" action that flips to `cash_received`.

**Finances:** Add "Cash Registrations" row/category in `Finances.tsx` summary (frontend aggregation only, no schema changes to finances).

## 4. Sponsor Logo Optional + Notes
**DB (migration):**
- `sponsorship_tiers.require_logo BOOLEAN DEFAULT TRUE`
- `sponsorship_tiers.show_logo_upload BOOLEAN DEFAULT TRUE`
- `sponsorship_tiers.allow_additional_notes BOOLEAN DEFAULT FALSE`
- `sponsor_registrations.additional_notes TEXT`

**Dashboard:** Update `SponsorshipTiersManager.tsx` with three toggles per tier.

**Public:** Update `SponsorRegistration.tsx` to conditionally render logo field (required/optional/hidden) and notes textarea. Pass `additional_notes` into `create-sponsor-checkout` and store on `sponsor_registrations`.

## 5. Donations — Custom Text & Manual Goal
**DB (migration):** add to `tournaments`:
- `donations_header_text TEXT`
- `donations_footer_text TEXT`
- `fundraising_goal_custom BOOLEAN DEFAULT FALSE`
- (reuse existing `donation_goal_cents` as manual amount when custom=true)
- new table `tournament_offline_donations` (donor_name, amount_cents, received_date, notes)

**Dashboard:** Extend `src/pages/dashboard/Donations.tsx`:
- Header/footer text inputs
- Auto vs manual goal radio
- "Add Offline Donation" form + list, with delete

**Public:** Update donation block in `PublicTournament.tsx` to render header/footer text, and progress totals = platform donations + offline donations, vs custom or auto goal.

## Out of scope / not touched
- Other dashboard sections, theming, navigation, payouts, leaderboard, scoring, etc.
- The "Save button" issue from your previous message is not part of this prompt — say the word and I'll tackle it next.

## Order of implementation
1. One combined SQL migration with all schema changes + GRANTs + RLS.
2. Edge function for event-day-sales checkout + sponsor checkout update for notes.
3. Frontend: Registration page, EventDaySales page + route + sidebar, Players add-player updates, SponsorshipTiersManager, SponsorRegistration, Donations page, PublicTournament public displays.
