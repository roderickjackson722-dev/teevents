
# Migrate TeeVents to Stripe Direct Charges

Goal: Organizers become merchant of record on every paid transaction. TeeVents keeps its 5% via `application_fee_amount`. Money never touches the platform account except as the application fee.

## Scope

All 6 checkout edge functions + refunds + webhooks + UI fee toggle + admin email + help article + project memory.

---

## 1. Pre-flight — enforce Connect readiness

Every checkout will now **require** a fully onboarded Standard Connect account. Today some functions fall back to "platform escrow" when the organizer isn't ready. With Direct Charges that fallback is impossible — there is no platform-account checkout for an organizer's product.

Behavior when `stripe_account_id` is missing or `charges_enabled === false`:
- Edge function returns a structured 409 with `code: "organizer_not_ready"`.
- Frontend checkout buttons show: "This organizer hasn't finished payment setup yet. Please check back soon."
- Organizer dashboard surfaces the same warning on the tournament header.
- `payment_method_override` in tournaments table becomes a no-op for new charges; we'll leave the column but stop reading it. (No data migration.)

## 2. Edge functions to convert

For each function below, the change is mechanical:

```ts
// before (destination charge)
checkoutParams.payment_intent_data = {
  application_fee_amount,
  transfer_data: { destination: organizerStripeAccountId },
  on_behalf_of: organizerStripeAccountId,
};
await stripe.checkout.sessions.create(checkoutParams);

// after (direct charge)
checkoutParams.payment_intent_data = { application_fee_amount };
await stripe.checkout.sessions.create(
  checkoutParams,
  { stripeAccount: organizerStripeAccountId }   // header, not body
);
```

Also drop `on_behalf_of`, drop `transfer_data`, drop the platform-escrow branch, and stop calling `logRoutingDecision` with `routing: "platform_escrow"`.

Functions to update:
- `create-registration-checkout`
- `create-side-event-checkout`
- `create-sponsorship-checkout`
- `create-auction-payment`
- `create-donation-checkout`
- `create-store-checkout`

`process-trip-payment` is a different code path (trips, not Connect). Leave untouched unless the user asks.

## 3. Webhooks

`stripe-webhook` currently listens to platform-account events. Direct-charge events fire on the **connected account** with the `account` field populated. Two options:

- **Chosen**: enable "Listen to events on Connected accounts" on the existing webhook endpoint in Stripe. No URL change. The handler must:
  - Continue to honor platform-account events (subscription billing, platform store).
  - For events with `event.account` set: look up `organization_id` by `stripe_account_id`, then dispatch to the existing `checkout.session.completed` / `charge.refunded` handlers, passing the connected account id when retrieving expanded objects (`stripe.checkouts.sessions.retrieve(id, {...}, { stripeAccount })`).

Update `supabase/functions/stripe-webhook/index.ts` accordingly. Add tests/log entries when an event arrives without a matching org so we notice silent drops.

## 4. Refunds

`process-refund` (and any admin refund path) must call `stripe.refunds.create({...}, { stripeAccount })` using the organizer's account. Application fee is refunded automatically pro-rata when `refund_application_fee: true` is set — we will set that so the platform's 5% is also refunded proportionally. Update `RefundManagement.tsx` copy: "Refunds are issued from the organizer's Stripe balance."

## 5. Frontend — Fee Model card

In `src/pages/dashboard/Registration.tsx` (where `pass_fees_to_golfer` lives), replace the existing toggle with a radio-card group matching the spec:

- "Pass fees to golfers (Recommended)" — shows $100 + $5 + $3.20 = $108.20 example.
- "Absorb fees" — shows $100 → $91.80 example.

Numbers come from a small helper `calcFeeExample(amountCents)` reusing the existing `calculateGrossedUpStripeFee` constants (PLATFORM_FEE_RATE = 0.05, Stripe 2.9% + 30¢). No DB change — same boolean column.

Apply the same card pattern (or a compact summary) to other purchase types that expose a "pass fees" setting (sponsorships, side events, store, donations) — only if a setting already exists in the dashboard for them; otherwise leave alone.

## 6. Admin notification email

Update the admin email body in `send-admin-notifications` (or wherever the registration confirmation email is sent) to add:

> "Funds went directly to the organizer's Stripe account. TeeVents' 5% platform fee ($X.XX) was deducted automatically as the application fee."

## 7. Help article

Update `src/pages/help/UnderstandingPayoutTiming.tsx`:
- New first paragraph: "TeeVents uses Stripe Direct Charges. Every registration is paid straight into your Stripe account — TeeVents never holds the money."
- Replace the "Balances → Transfers" guidance with "Balances → Overview → Payments". Transfers are no longer used.
- Keep the 2–7 day first-charge hold explanation.
- Update `FindingStripePayouts.tsx` the same way.

## 8. Memory updates

Update `mem://index.md` Core block:
- "Payments: 5% platform fee … via Stripe Connect **Direct Charges** (organizer is merchant of record). Application fee = 5%."
- "Funds custody: TeeVents never receives organizer funds. Payments settle directly on the organizer's connected account; only the 5% application fee lands in the TeeVents balance."

Update `mem://architecture/payment-processing-model` with the new flow and add a `mem://constraints/direct-charges-readiness` note: "Checkout is blocked until the organizer's Connect account has `charges_enabled = true`."

## 9. Security findings (separate from migration)

Fix both supabase_lov findings in the same turn:
- `site_visits`: drop the public ALL policy; add a SECURITY DEFINER `record_site_visit(...)` function for inserts, and a service-role-only SELECT policy.
- `tournament_refund_requests`: drop `USING (true)` SELECT; add a `claim_token` column issued on insert and a `get_refund_request_by_token(_token)` SECURITY DEFINER function used by the public refund-status page.

## 10. Out of scope (will NOT change in this turn)

- `process-trip-payment` (different product line).
- Direct charges to **Express** Connect accounts — assumes all organizers are on Standard. We'll add a guard that throws on Express until you decide.
- Backfilling Stripe customer objects to the connected accounts (Direct Charges create new customer objects per connected account; one-time inconvenience but no action needed).
- Historical Destination-Charge data already in `platform_transactions`. Left as-is for audit.

## Technical details

- Stripe SDK: `Stripe.checkout.sessions.create(params, { stripeAccount })`. The header MUST be passed as second arg; passing `stripe_account` in the body is silently ignored.
- Webhook signature verification uses the **platform** signing secret regardless of whether the event came from a connected account.
- `application_fee_amount` is in the *charge currency* and must be ≤ total minus Stripe fee.
- For refunds: `stripe.refunds.create({ charge, refund_application_fee: true }, { stripeAccount })`.
- For Apple/Google Pay: still works on Direct Charges via Stripe Checkout — no extra config.

## Rollout

This will be deployed in a single commit. After deploy, recommend you:
1. Run a $1 test registration on the live-mode test tournament (memory: `mem://testing/live-mode-verification`).
2. Confirm the charge appears in the organizer's Stripe dashboard, and the 5% application fee appears in TeeVents' platform balance under "Collected fees".
3. Refund the $1 and confirm the application fee refunds proportionally.

Ready to build when you approve.
