# Finish the custom web address renewal flow

## The problem (confirmed)
The renewal emails link to a "Renew Web Address ($99)" option that doesn't exist yet, and the second email says the address now opens the TeeVents event page, which isn't true because nothing redirects it. Older events would also get the "has moved" email right away. No emails have gone out so far: the daily job isn't scheduled, and no tournament has a custom web address right now.

## What to build
1. **Renew button in the Site Builder.** When an event has a custom web address in its renewal window, show a "Renew web address ($99)" card. It starts the existing $99 renewal checkout. When the organizer comes back from payment, the existing verification adds one year.
2. **Day-60 redirect.** When an address is past its expiry, the custom-domain router sends visitors to the event's regular TeeVents page instead of the custom site.
3. **No back-dated "moved" emails.** Only send the archived email once the 30-day notice has already gone out, so older events never skip straight to "has moved."
4. **Safety switch.** Until steps 1 and 2 are live, the daily job sends no emails.

## Not changed
Prices, other add-ons, current events, payouts, and Cloudflare hostname release (day 90 stays a manual step).

## Technical notes
- Site Builder reads `?renew_domain=1` and calls `purchase-addons` with `custom_domain_renewal`. The return path goes to `verify-addon-purchase`.
- `CustomDomainRouter` checks `domainStage()`. If the stage is `archived`, it navigates to `/t/:slug`.
- In `process-domain-renewals.ts`, the archived stage requires `custom_domain_notice1_sent_at`. Add a test for this.
