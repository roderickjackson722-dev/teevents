# Enterprise Golf Course Expansion

## Goal
Complete the requested Enterprise package as one coordinated release while leaving all non-Enterprise features and every existing/grandfathered event unchanged. Reuse working Enterprise tools instead of rebuilding them.

## What will change

### 1. GHIN readiness and roster sync
- Replace the pending raw GHIN request layer with the `@spicygolf/ghin` server-side client while preserving the current roster, event, league, manual-entry, history, and error-log interfaces.
- Read `GHIN_USERNAME` and `GHIN_PASSWORD` only on the server; until credentials are supplied, retain the current safe pending/manual-entry behavior.
- Batch roster lookups, distinguish missing golfers and golfers without an established index, and show the requested sync summary and Pending Sync state.
- Connect the existing protected daily-sync endpoint to a scheduled daily job and retain per-event, per-league, and admin sync controls.

### 2. Enterprise payments and onboarding
- Keep the platform’s existing Stripe Connect direct-charge architecture and fallback safeguards; do not introduce a separate payment pipeline.
- Add an Enterprise onboarding checklist for assigning the TeeVents representative, connecting Stripe, uploading the roster, choosing fee handling, and completing the club page.
- Show Stripe connection and payout readiness in Enterprise.
- For new Enterprise events and leagues only, apply a 0% TeeVents transaction fee. Preserve all existing and grandfathered transaction behavior.
- Add a club setting to absorb Stripe processing fees or pass the correctly grossed-up fee to the player.

### 3. Optional net-30 invoices
- Add an Enterprise-only “Accept Invoice Payments” setting, default off.
- When enabled, offer card or invoice at eligible Enterprise checkout points.
- Collect billing contact and address, create a numbered net-30 invoice, generate a printable PDF, email it, and show Pending/Paid/Overdue status.
- Allow authorized club staff to mark an invoice paid with an audit entry. Card payments continue through the existing checkout.

### 4. Roster import, printables, and POS reconciliation
- Preserve and refine the existing CSV/Excel import, column mapping, five-row preview, and club-roster storage.
- Complete the Enterprise print area with scorecards, cart signs, alpha list, name badges, pairings sheet, sponsor signs, and QR mobile-scoring access, each printable/downloadable as PDF.
- Add an Enterprise POS reconciliation CSV containing player, paid amount, payment date, Stripe transaction reference, and payment method, scoped to the selected event.

### 5. Club operations
- Add a whole-club email action using the reusable Enterprise roster, with recipient preview, send status, and safeguards against duplicate/invalid addresses.
- Add Enterprise annual GM/board reporting for events, players, revenue, and payouts, with year selection and printable/exportable output.
- Surface renewal date, subscription status, reminder state, failed-payment state, and cancellation/downgrade status using the existing Enterprise billing flow.
- Extend the existing branded-page editor for club-level page details without replacing tournament site settings.

### 6. Formats and automations
- Finish Enterprise support for Ryder Cup, Match Play Bracket, and Round Robin on the shared tournament records and scoring plumbing.
- Extend existing Enterprise automations for pre-event, day-of, and post-event messages, retaining current confirmation, tee-time, result, waitlist, and receipt settings.

## Technical details
- New application tables/columns will be scoped by organization, use explicit grants and row-level access policies, and protect staff-only actions by role.
- Existing Enterprise navigation remains owned by the shared Enterprise layout.
- Existing tournaments remain ordinary tournament rows with `is_enterprise=true`; no duplicate event or payment system will be introduced.
- New server-side application operations use authenticated TanStack server functions; scheduled/public callbacks use verified public server routes.
- GHIN and Stripe secrets remain server-only. Manual handicaps remain available when GHIN is unavailable.
- No existing row will be migrated into the new fee model. Only explicit new Enterprise creation paths receive the new settings.

## Verification
- Test roster import and GHIN pending/manual/success/error paths.
- Test connected and fallback payment paths, fee-absorb/pass-through math, and 0% Enterprise fee without changing legacy rows.
- Test invoice creation, email, PDF, status updates, permissions, and card checkout regression.
- Test every printable, POS export, whole-club email, annual report, renewal state, formats, automations, and onboarding on desktop and mobile.
- Confirm the current build, protected access, and public-site behavior remain clean.
