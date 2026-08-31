# Tournament setup, selection, and paid upgrades

## 1. Create a new tournament from General Settings
- Add a "Start a new tournament" card at the top of Dashboard → Settings that creates a draft tournament and sends the organizer into the existing guided flow (Event details → Course → Registration → Publish) rather than dropping them on a blank page.
- After creation, the 30-step Planning Guide checklist is seeded for the new event so the organizer is walked through the whole process again, same as their first tournament.

## 2. Tournament selection at login, past events last
- After sign-in, organizers land on a tournament picker (reusing the existing workspace/tournament list) instead of an arbitrary default event.
- Sort order: upcoming events first by soonest date, then undated drafts, then completed/past events in a separate "Past events" group. A past tournament is never pre-selected.

## 3. Digital sponsorship pricing clarity on the live leaderboard
- On the live leaderboard branding card (organizer view), state the current prices plainly: Digital Sponsor package $799 per event, Branding Removal $500 per event, Flat-Rate Pro $299 per event, with a short line on what each removes or adds and a link to the purchase page.

## 4. Wire all four purchases to Stripe with revenue tracking
- Pay as You Grow ($0): keep the 5% platform fee path; surface it as the active plan when nothing else is bought.
- Flat-Rate Pro ($299), Branding Removal ($500), Digital Sponsor ($799): all three already have Stripe Checkout server functions; finish the loop so every completed payment writes a `platform_transactions` row (type `flat_rate_pro`, `branding_removal`, `digital_sponsor`) with amount and status.
- Revenue Dashboard: add columns/cards for Flat-Rate Pro and Digital Sponsor revenue alongside the existing branding and sponsor totals, included in the total, per-tournament rows, and the CSV export.

## 5. Real digital assets for sponsors
- Sponsorship Tools gains a working asset kit for purchased events: a sponsor-branded leaderboard banner (1200x300), a square logo/badge tile, and a QR code that points at the public tournament site — all generated in-browser and downloadable as PNG, plus a one-click ZIP-free "download all".
- The sponsor outreach email template stays, with the asset links included.

## 6. Tournament payment page for the $299 flat rate
- New page: Dashboard → Payments (per tournament) where the organizer can pay the $299 flat-rate fee directly, see paid/unpaid state, the receipt date, and the other available upgrades.
- Each payment shows on the Revenue Dashboard as its own line.

## 7. Friends of FAM purchases
Buying the three upgrades on Friends of FAM requires a real card in Stripe Checkout, which I cannot enter for you. Two options:
- You click through the three checkouts (I will hand you the exact links), then I confirm the Revenue Dashboard and tournament row update; or
- I record them as admin-granted (no charge) so you can see the dashboard behaviour without moving money.
Tell me which you prefer; otherwise I will build everything else and leave the three checkout links ready.

## Technical notes
- Stripe: existing `createFlatRateCheckout`, `createBrandingRemovalCheckout`, `createDigitalSponsorCheckout` server functions are reused; verification handlers get a shared helper that inserts the `platform_transactions` revenue row idempotently by Stripe session id.
- `src/lib/adminRevenue.functions.ts` is extended to aggregate the new transaction types; `AdminRevenue.tsx` renders the new columns.
- QR/asset generation uses a small client-side QR library plus canvas; no server work needed.
- No changes to scoring, registration, leagues, or public pages beyond the leaderboard pricing copy.
