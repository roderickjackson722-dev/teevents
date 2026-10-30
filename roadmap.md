## Partner requests and event finances
- [ ] Add an opt-in partner-request holding list for team-of-2/3/4 registration, player questions, organizer email notification and dashboard reminder; no payment or roster entry for a request.
- [ ] Scope finance totals and breakdowns to the selected tournament for organizer and Enterprise accounts, retaining a separate all-event overview.
- [ ] Verify rules, access controls and selected-event switching without charging or emailing real golfers; preview only.

## Admin Enterprise accounts
- [x] Add admin-only account listing, verified-owner email approval, and linked platform tournaments without changing billing or existing events; 22 approval/navigation tests passed and build OK.
- [x] Approved info@hbcu.golf for HBCU Golf Foundation through the signed-in admin UI; confirmed reload persistence, linked standard tournament and correct Enterprise workspace loading. Existing event classification, 5% fee and organization pricing unchanged; no sends or publication. Organizer entry link and team-login approval path added; separate owner-session browser check not performed.

## Enterprise Communications and Operations send previews
- [x] Read-only audit completed; stopped under the supplied conflict rule before application changes or sends.
- [ ] Blocked: exact personalized email/text previews need shared recipient/rendering support currently absent from sending endpoints; scheduled jobs resolve recipients and saved templates at delivery, not scheduling. Needs authorization for narrow preview API/rendering support and clarification of scheduled-preview expectations. Automations page only saves toggles, with no connected manual send to wrap. No previews added or browser checks claimed; no emails/texts/invoices sent, records changed or publication.

## Enterprise Home rep setup request
- [x] Replace only the Home rep banner with the approved card and an in-Enterprise request form. User approved a narrow request-handling exception: authenticated, client/server-validated support ticket and conversation writes; no schema, route or existing API changes.
- [x] Signed-in preview passed card, exact confirmation after real QA ticket persistence/readback, Admin support inbox visibility, optional date and invalid-input handling, phone form framing, unchanged Home stats/Recent Events/View Reports, and unchanged tournament readback. Fourteen tests passed, build OK and no page errors; one clearly labeled QA support request retained, no emails, event/settings/payment writes or publication.

## Enterprise My Courses home course
- [x] Show search-only initial state, deduplicate course/tee results, and persist explicit home-course selection in existing Enterprise account settings, preserving other settings with a concurrency guard.
- [x] Signed-in QA preview passed empty initial list, course search, five identical course/tee rows shown once, actual home-course save/readback/reload, direct Create default and home-card new-event link, blank no-home default, Review course name with intercepted tournament writes, unchanged existing-event course and mobile overflow check; 15 tests passed, build OK, no page errors. Temporary QA home preference restored, all QA tournament/library rows read back unchanged, nothing sent or published.

## True Skins carryover calculation
- [x] Implement shared ordered carryover and recorded all-hole result summaries without automatic saved-result changes or schema changes; existing controls and Enterprise navigation retained.
- [x] All four supplied scenarios passed signed-in preview with in-memory test data and intercepted Calculate writes, including table, summary, reset/unclaimed note, reload without recalculation and Enterprise-only content links; no page errors or real settings/winner changes, payouts, sends or publishing. Read-only audit: 2 saved game results (14 winning-hole amounts) would change on explicit recalculation; existing rows verified unchanged.

## Enterprise Skins and Payouts
- [x] Added one Enterprise Skins and Payouts screen wrapping the existing ScoringPayouts/DivisionSkinsManager/FlightsManager tools; Scores and the existing Skins/Deuces/Putts tool's Purse & winners link target it with event/workspace context. Organizer default rendering, saves, API calls and calculations unchanged. Flights remains collapsed and is mounted only on expansion in Enterprise to avoid initial auto-sync.
- [x] Signed-in Scores entry, Purse & winners, both back links, sidebar, event/workspace, unsaved toggle/type/fee/pot/search, carryover copy and collapsed Flights checked; 14 navigation tests passed and build OK. No page errors, saves/calculations/payouts/sends or publication; write requests blocked and selected event/player skins read back unchanged.
- [ ] Real save persistence, Add/Remove everyone and individual NOT IN POT writes remain untested because testing must not change existing records. Calculate math/persistence payload now tested with isolated fixtures under the approved carryover request above. Round controls depend on event round count; actual saved scoring format is never forced. Shared organizer panel has no Deuces/Putts fields; existing Enterprise Deuces controls remain untouched.

## Enterprise Manage League, step 5
- [x] Wrap existing league management tools in one Enterprise page; Home menu, Home league title and Leagues Manage use the same league-ID/context-preserving destination. Enterprise back and payout links remain inside Enterprise; regular routes unchanged.
- [x] Signed-in real-league Home/Leagues links, Players/Events tabs, All Leagues, reload, sidebar and regular league route passed; 14 navigation/workspace tests passed, build OK, no page errors or write attempts. No saves, sends, publication or data changes. View Reports remains Operations Reports/POS; Purse and winners awaits next instruction. Season Standings auto-sync was not opened to avoid its existing write-on-mount behavior.

## Enterprise Admin settings, step 4
- [x] Add Enterprise Organization details and Web address & branding using existing organization-info/site-builder tools; keep Payments canonical. Operations has no separate branding tool to duplicate.
- [x] Highlight Operations on Enterprise Payments; signed-in Admin Settings links, Branding/Domain tabs, selected workspace/event and Payments rendering checked; 10 navigation tests passed, no page errors, no settings saves, sends or payment/event writes. Preview only.

## October 24 login, check payments and refunds
- [x] Add organizer-login-only unconnected Stripe modal; linked accounts excluded, admin override excluded, existing banner and consent retained
- [x] Remove check from Players manual-entry options and received tracking, Registration setting copy, league manual-entry offer, Finance description, registration guide and manual player/sponsor email copy; preserve historical check labels, manual entry, cash, Stripe and payout settings. Six payment-rule/refund tests passed; signed-in offline-enabled event selector verified Online/Cash only, no data saved. Email function source edits await deployment.
- [x] Remove Relive the Highlights and Photo Gallery/Media Clips links from the existing post-event organizer thank-you email; rendered output checked, timing and delivery unchanged, preview only
- [x] Add exact public Refund Policy page and Company footer link; desktop/phone verified
- [x] Add confirmed actual refund-cost breakdown, retain platform fees and record new refund breakdowns; scoped exception authorized, historical records untouched
- [x] Verify real paid-registration refund preview ($75 returned, $3.75 platform and $2.43 processing kept), admin exclusion and policy without issuing a live refund or publishing; actual fresh organizer-login and real refund settlement remain unverified to avoid account/payment changes

## Homepage/event search approval and Sample footer
- [x] Add Platform → Sample linking to /sample-event and verify navigation; preview only
- [x] Research search terms and inspect existing Google Business listing without changing it
- [x] Apply approved homepage/event search copy, metadata and site icon in preview only; crawler and browser checks passed on homepage and four real event URLs, four formatter tests passed; existing Bolton fixture integration test remains failing because fixture is unavailable
- [ ] Update existing Google listing: waiting for confirmation of intended profile and real-world business name

## October 24 scoped copy and Stripe invites
- [x] Rebalance Compare copy and add exact leaderboard qualifiers on four public pages
- [x] Add new-connection Stripe acknowledgments without re-prompting connected accounts
- [x] Add admin single-organizer invite/status and unconnected portal banner using existing email audit records
- [x] Verify protected accounts, recipient isolation, and requested screens without publishing; test invite accepted for requesting user's unpublished QA event, saved sent status read back, nine tests passed


## Seven-day promise and page-build sale removal
- [x] Remove safe page-build sale presentation from Pricing/Plans, FAQ, bundle bullet and unowned Upgrades options; retain purchased-status display and all checkout/pricing logic
- [x] Add exact promise copy to homepage hero, named-rep differentiator, homepage setup step and both requested pricing plans; skip footer because no CTA band exists
- [x] Verify public pages and signed-in Upgrades on desktop/phone; seven visibility-rule tests passed; prices, fees and remaining add-ons unchanged; nothing published
- [ ] Remove direct /checkout/custom-event-page sale: stopped because disabling it changes checkout behavior explicitly forbidden by this request; requires separate authorization

## One Week Out event preparation
- [ ] Configure a verified TeeVents sender domain; required before app email scaffolding
- [ ] Add the supplied single-organizer preparation email, scheduling seven days before at 9 a.m. organizer time and immediate delivery for newly created events less than seven days away
- [ ] Add the four-item persisted dashboard checklist, completion/dismissal state, and dedicated-rep messaging link
- [ ] Add Event Prep Status, preview/test and manual resend in the admin organizer profile, with communication-history logging
- [ ] Verify timing, recipient isolation, deep links and signed-in desktop/phone flows without publishing or altering existing tournament behavior

## Prompt 6 Money presentation completion
- [x] Style existing Money saves with one gold main save and outlined alternatives, preserving all handlers; Budget retains its existing autosave
- [x] Stack Money tables and wrap names on phones without altering event or payment data
- [x] Verify all signed-in Money views at phone/desktop widths without saving, purchasing, or publishing; populated payout logs and budget summaries checked, transaction views were empty

## Contact page rebuild
- [x] Rebuild requested Contact sections, omitting mailing address and references as instructed
- [x] Connect validated inquiries to real email delivery with server-verified CAPTCHA only
- [x] Verify desktop/mobile form states, protections, and navigation without changing other pages
- [ ] Confirm live email receipt after the user completes CAPTCHA on the public Contact page; CAPTCHA rejects localhost, and safeguards were not bypassed

## Eight-section pricing page rebuild
- [x] Rebuild pricing with four plans, all-plan service, six add-ons, payments, comparison, FAQ, and final CTA
- [x] Preserve purchase flows and grandfathered events; verify desktop/mobile and purchase links

## Requested sales pages, onboarding verification, and direct support
- [x] Remove Sales Sheet label, clarify Enterprise audience, and use one final homepage CTA
- [x] Add persisted two-way admin/organizer support replies
- [x] Verify an unpublished test event, Welcome, logo upload/restoration, and admin review/restoration with the requesting user's account
- [ ] Complete fresh-account signup and automatic Welcome verification: requires a real email verification and CAPTCHA completed by the user; safeguards were not bypassed
- [x] Verify direct replies in both directions, reload restoration, and the requested public pages

## Five-section homepage restructure
- [x] Replace homepage with the five approved sections and one grayscale logo row
- [x] Clean header/footer and relocate league search; preserve removed content on dedicated public pages
- [x] Verify desktop/mobile layout, navigation, and unchanged event/payment implementation

## All-plan dedicated rep website positioning
- [x] Update homepage hero, service sections and credibility stat
- [x] Update pricing, About, Features, Enterprise and organizer welcome messaging
- [x] Update public service comparisons and remove paid-only rep claims
- [x] Add shareable TeeVents Sales Sheet page
- [x] Verify requested pages and unchanged event/payment implementation

## HeyCatch website audit
- [x] Read all findings and the prioritized action plan
- [x] Apply supported website copy, navigation, pricing emphasis, and structured-data fixes without platform changes
- [x] Verify homepage, features navigation, plans, pricing redirect, FAQ schema, and 375px layouts; document exact original scores
- [ ] Complete client-proof items after supplied approved screenshots, third testimonial/headshots, verified usage counts, founder social URLs, and dated external reviews
- [ ] Consider crawl-rendering work separately; broad rendering changes are outside this presentation-only pass

## New pricing and dedicated representative rollout
- [x] Audit all public pricing, service, comparison, and homepage references
- [x] Add backward-compatible pricing fields and grandfather all existing events
- [x] Update new-event and league payment flows without changing existing events
- [x] Update pricing, homepage, comparisons, add-ons, enterprise, and Why TeeVents content
- [x] Verify payment logic, pages, and current-event grandfathering

## Survey response settings
- [x] Add editable public submit-button text
- [x] Add an optional email copied on new responses
- [x] Verify the admin editor and public survey

## Founder and trust signals
- [x] Add supplied founder photo and biography to homepage and About
- [x] Replace generic stats and add supplied organization logos with accurate relationship labels
- [x] Ensure homepage differentiators and footer founder credit
- [x] Correct key public pricing presentation without changing grandfathered events or payments
- [x] Verify pages and uploaded assets
- [ ] Replace text-only organization names with official logos when supplied (Troon, Cleveland, Golf Channel, PGA, Octagon)
## Enterprise enhancement request
- [x] Audit requested features against existing Enterprise capabilities
- [x] Preserve direct charges and apply the approved 0% fee only to newly created Enterprise events and leagues
- [x] Implement approved high-priority gaps without changing legacy or non-Enterprise workflows
- [x] Implement approved medium-priority gaps
- [x] Verify Enterprise operations, printables, messaging, handicap math, and protected access

## Organizer pricing, payments, referrals, and check-in
## Editable public tournament titles
- [x] Add per-tournament section title editing in both layout editors
- [x] Carry custom registration titles through public forms and checkout without changing payment behavior
- [x] Verify defaults, saved titles, and ticket wording

- [x] Clarify the Features page with Free OR Per-Event choices and replace its current CTAs
- [x] Add a pending-roster payment-link action that reuses the existing registration and supports recipient and amount edits
- [x] Add Team Performance registration drill-down with paid/pending amount clarity
- [x] Add an event setting to disable cash payments
- [x] Add roster check-in controls with a distinct checked-in state and include check-in status in printouts
- [x] Verify the affected public page and organizer workflows without changing other platform behavior

## October 12 navigation, add-ons, directory, and login
- [x] Reorder menu, restore organizer login, remove league search and footer founder credit
- [x] Remove five requested Reviews sections
- [x] Replace public add-on event list with event/contact details and admin fulfillment
- [x] Provide admin live leaderboard control and default new No Cost events off
- [x] Add admin controls for public featured/upcoming directory sections
- [x] Verify public pages, direct login, saved contact details, Stripe checkout opening, and authenticated admin leaderboard changes on the unpublished QA event; restore settings and remove unpaid QA request
- [ ] Verify paid add-on fulfillment after a real authorized payment; checkout was opened without charging a card

## Sample Event showcase page (done, preview only)
- Static public page at /sample-event mirroring the classic public tournament layout: badge, hero, About, Registration (3 tiers), Sponsors (4 tiers + 6 placeholder logos), Live Leaderboard (10 rows), Pairings (4 foursomes), Schedule, FAQ, bottom CTA band to /get-started, sample disclaimer note.
- Demo-only buttons scroll to the CTA band; no checkout, no database, no live data. Verified desktop + phone: no horizontal overflow, buttons scroll correctly.

## Sample Event visual polish
- [x] Add scoped sponsor wordmarks, generated golf photography, FCC emblem, card ribbons, and green/gold leaderboard without changing sample copy, prices, sections, or handlers
- [x] Verify desktop/phone rendering, all eight photo placements, four full foursomes, schedule alignment, no page overflow, and all demo button types scrolling only; original prices, data and section order confirmed unchanged; preview only

## Enterprise send previews (Part 2, approved items 2, 3, 4 read-only, 5, 7)
- [x] Personalized email preview per real player; text preview with exact text, characters, parts and plan count; read-only recipient lists; scheduled email/text previews with planned time and "may change" label; Send/Schedule only on Preview in Enterprise
- [ ] Items 1 (shared email layout) and 6 (exact scheduled send) not approved
