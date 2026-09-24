# Enterprise sales package + remaining Enterprise build-out

Several of these items already exist. The plan builds only what's missing and checks the rest.

## 1. Sales description (a document, not part of the app)
A downloadable sales brief (PDF + Word) for golf courses and clubs, saved to Files:
- The problem: Golf Genius costs about $4,000 a year and is hard to use, so clubs only use part of it.
- What TeeVents Enterprise is: one place for events, leagues, roster, registration, pairings, scorecards, live scoring, TV leaderboard, skins, staff logins.
- Comparison table: TeeVents vs Golf Genius vs Live Tourney (ease of use, custom event pages, branding, sponsor revenue, payments, price).
- Pricing pitch: pay only 5% on paid sign-ups, with Enterprise pricing on request (no $4,000 a year up front).
- A "switch in one afternoon" story: import the roster spreadsheet, build the first event, publish.
- Talking points, common objections and answers, and a demo script.

## 2. Admin Portal: staff with their own logins
Already built: invite by email, roles, 6-character login codes.
To add:
- Staff who sign in land straight in the Enterprise section instead of the admin dashboard.
- Each person's role limits what they see. For example, "Scoring only" staff see only Scores and Printables.
- A "Pending invites" list with Resend and Cancel buttons.

## 3. Paid registration through Stripe
Enterprise events already use the standard TeeVents registration checkout. That checkout charges the organizer's own Stripe account and keeps the 5% fee.
To add:
- The Registration page shows a live "Stripe connected / not connected" status instead of a static button.
- A "Recent payments" box showing paid sign-ups and the organizer's Stripe balance.
- A $1 test run in live mode to confirm the money lands in the organizer's balance.

## 4. Redesign the organizer dashboard to match Enterprise
- Same look as Enterprise: menus across the top instead of the long side menu, elegant serif headings, gold underlines, and cards.
- This is a look-only change. Every page, button and feature stays where it works today.
- Rolled out in two steps: first the frame and the home page, then the other pages.

## 5. Publish-and-verify walkthrough
Create a test enterprise event and publish it. Then confirm it shows up in:
- the main dashboard
- live scoring from a phone
- the leaderboard and TV view
- printed scorecards

Then delete the test event.

## 6. Team Referral inside the tournament
The Team Referral Links page already exists under Marketing. To add:
- A "Team Referrals" summary card on each tournament's dashboard page: top members, sign-ups, and money raised, with a link to the full page.
- The same card on the Enterprise event view.

## Competitor details wanted (optional)
Screenshots or feature lists from Golf Genius and Live Tourney would help. I can use them to add features that win deals, such as a one-click Golf Genius import or handicap sync.

## Technical notes
- Role checks go through the existing org permissions in useOrgContext. Enterprise routes are guarded per permission.
- The Stripe status and balance come from the existing stripe-connect-status and stripe-connect-balance functions.
- The dashboard redesign happens only in DashboardLayout and DashboardSidebar (moved into a top nav). Page content is untouched.
