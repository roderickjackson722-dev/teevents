# Project Architecture Rules

- Enterprise workspace navigation is owned by `EnterpriseLayout`; keep its sidebar groups and role filtering shared across every Enterprise page so navigation and permissions stay consistent.
- Enterprise tournaments remain ordinary `tournaments` rows with `is_enterprise=true`; keep scoring, registration, publishing, and payments on the existing shared tournament plumbing.
- Handicap math lives only in `src/lib/courseHandicap.ts` (USGA formula, 9-hole halving, allowance); GHIN calls live only in `src/lib/ghin.server.ts` behind `/api/ghin/*` routes — one source of truth so client display and server sync always agree.
- Pricing behavior is cohort-based: existing events and leagues remain `legacy`; only explicit post-cutover creation paths stamp the current pricing version, so edits never migrate grandfathered records.
- Per-Event price changed to $399 on Oct 12, 2026: events created on or after that date are stamped `flat_rate_amount_cents = 39900` at creation and check out with the tracked $399 Stripe price; every earlier event keeps the price it was quoted ($299 current cohort, $150 legacy). Same for leagues created from that date ($599 vs earlier $499), recorded from the actual paid session amount. Never re-point existing rows to the new price.
- College survey presentation and response-copy settings live on each `college_surveys` row so every survey can be configured independently.
- Dedicated-rep marketing badges, service sections, and comparison rows share `DedicatedRep` components; keep these presentation-only so service copy never mutates event pricing, entitlements, or rep assignments.
- New public sales pages use explicit TanStack leaf metadata while rendering through the existing App shell so shared navigation retains its required router context.
- Pricing and its historical plans URL render the same presentation-only Plans page through explicit leaf routes; purchase links reuse existing checkout targets so marketing cannot alter event billing.
- Founder biography and portrait live on About through `FounderSection`; partner imagery shares `founderPartnerLogos` CDN pointers so the compact homepage wall and detailed trust sections cannot diverge.
- Homepage and the dedicated How It Works page share `HomeHowItWorks`; scope optional homepage-only service copy through props so other pages remain unchanged. Public audience pages render through the existing App shell with explicit TanStack leaf metadata to preserve navigation context and isolate marketing from event logic.
- Page-build add-on retirement is presentation-only: retain checkout catalogs, price math and entitlement readers; hide the unowned option at render time while preserving purchased-status display to protect existing customers.
- Payment reminders create checkout for the existing pending registration ID; never insert a replacement roster row.
- Public tournament section titles are per-event display settings, resolved through publicTabs helpers and propagated to attendee checkout; preserve stable section anchors and all existing registration/payment behavior.
- Additional Notes uses the existing registration-field settings for both individual and group notes; missing settings retain visibility and are persisted only on an organizer's explicit toggle to preserve current events.
- Organizer Toolbox data lives in one organizer_toolboxes row per organization with files in the private organizer-toolbox bucket under <org_id>/; only admins set review fields, so rep status can't be self-reported.
- Human support replies share each organizer's existing help_chat_messages conversation; RLS validates sender identity and admin team replies, while AI navigation messages retain the existing model and transport.
- Public Contact inquiries share a client/server Zod schema and use a dedicated server function that verifies CAPTCHA before sending plain-text email to the fixed team recipient; never report success until the email provider accepts the message.

- Pricing-page feature add-ons collect event/contact details in private feature_addon_requests, use server-priced Stripe checkout, and are matched to events only by authenticated admins after payment verification; existing event-specific purchase flows stay intact.
- Public directory section visibility uses public platform_settings hide flags, leaving event-level publication and explicit searches unchanged; new No Cost events default leaderboard off at insertion without rewriting existing events.
- Money phone tables use the scoped money-layout styles and presentation-only cell labels; keep save, purchase, payout, and budget autosave handlers unchanged.
