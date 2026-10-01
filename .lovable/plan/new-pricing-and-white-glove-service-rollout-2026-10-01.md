# New pricing and white-glove service rollout

## Public website
- Update the homepage hero with the dedicated-representative tagline and add the “We Build It For You” three-step section immediately below the hero.
- Add a prominent “Your Dedicated TeeVents Representative” section to the pricing page with the full seven-item service list and differentiator copy.
- Replace pricing with No Cost to Start ($0 + 5%), Per-Event ($299), Per-League ($499), and Enterprise ($2,999/year), using the supplied features and calls to action.
- Update the add-on list to the five supplied $99 offers and clearly state that Full-Service Page Build Out is included in every paid plan.
- Update the Enterprise pricing page/demo and the Why TeeVents page with the new price and white-glove positioning.
- Scan public marketing, help, checkout, sales, and comparison content for retired $150/$399/$2,500 pricing or obsolete Pro wording, and update only pricing/service statements affected by this rollout.

## Comparisons
- Put the dedicated-representative row first in every comparison table and use the supplied “How We Compare” rows on the Why TeeVents page.
- Update comparison pricing references to the new $0/$299/$499/$2,999 structure without changing unrelated competitor claims or page layouts.

## Pricing and payments
- Centralize the new amounts: $299 per event, $499 per league, $2,999 annual Enterprise, and $99 add-ons.
- Keep No Cost to Start registrations on the existing direct-charge flow with a 5% TeeVents fee shown separately to the player; organizers retain their registration price.
- Make paid new events bypass the 5% fee while preserving normal Stripe processing fees.
- Change league checkout to a one-time $499 season payment and add an annual $2,999 Enterprise checkout/subscription path tied to the organization.
- Keep add-ons available to every plan; automatically grant the page-build entitlement on newly paid event, league, and Enterprise purchases.
- Use tracked Stripe products/prices rather than ad-hoc checkout pricing where the current integration supports it.

## Grandfathering and data safety
- Treat every tournament and league already in the database at migration time as legacy: do not change its fees, entitlements, checkout behavior, or current paid state.
- Add the requested pricing/payment/representative fields additively. Existing rows remain explicitly legacy; only records created after the rollout receive the new pricing model defaults.
- Store representative assignments as references to the existing staff/auth identity model without exposing private staff data publicly.
- Update event and league creation so only new records enter the new pricing system.

## Verification
- Test pricing, homepage, Why TeeVents, Enterprise, add-ons, and all comparison pages at desktop and mobile sizes.
- Test new free, event, league, and Enterprise fee decisions; confirm existing records still use their prior behavior.
- Verify checkout totals, 5% fee routing, paid-plan fee exemption, payment completion flags, and full-service entitlement.
- Run focused pricing/payment tests and confirm the preview builds without errors.
