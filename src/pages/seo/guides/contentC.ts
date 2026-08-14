import type { GuideContent } from "./types";

const CTA_HEADING = "Start your tournament on TeeVents";
const CTA_TEXT =
  "Build a branded event site, open registration, and collect payments directly to your own bank account. Base is $0 — Pro is a one-time $399 per tournament, with no annual contract.";

export const eventbriteForGolf: GuideContent = {
  slug: "eventbrite-for-golf-tournaments",
  title: "Using Eventbrite for Golf Tournaments (And What It Can't Do)",
  metaTitle: "Eventbrite for Golf Tournaments: What Works, What Breaks",
  metaDescription:
    "Eventbrite can sell golf tournament tickets, but it can't handle pairings, handicaps, sponsors, or live scoring. Here's what breaks and what to use instead.",
  heroSubtitle:
    "Eventbrite sells tickets beautifully. A golf tournament needs about nine more things — here is the honest breakdown.",
  intro:
    "Thousands of charity golf outings are still run on Eventbrite every year, and it is easy to understand why: organizers already know the tool, setting up a ticket type takes four minutes, and money starts arriving the same afternoon. But a golf tournament is not a concert or a conference. Once registrations start landing, you discover that ticketing was the easy 10 percent of the job. This guide walks through exactly what Eventbrite does well for a golf event, where it stops helping, and how a purpose-built golf tournament platform closes the gap without making you relearn everything.",
  sections: [
    {
      heading: "What Eventbrite genuinely does well",
      bullets: [
        "Fast setup: a ticket type, a price, a date, and you are selling within minutes.",
        "Recognizable checkout that players trust, including Apple Pay and Google Pay.",
        "Promo codes and simple discount rules for early-bird pricing.",
        "A basic attendee export you can drop into a spreadsheet.",
        "Email confirmations that go out automatically with a QR ticket.",
      ],
      paragraphs: [
        "If your event is a 40-player member outing with no sponsors, no handicaps, and paper scorecards, Eventbrite is honestly fine. The trouble starts at the point most charity events reach quickly: multiple ticket types, foursomes bought by companies, sponsor packages, hole assignments, and a scoring day that has to run on time.",
      ],
    },
    {
      heading: "Where Eventbrite breaks down for golf",
      bullets: [
        "Foursomes: a company buys a team of four, but Eventbrite only captures one buyer. You end up chasing three names by email for weeks.",
        "Pairings and tee sheets: there is no concept of groups, starting holes, tee time intervals, or a shotgun start. That work moves to a spreadsheet.",
        "Handicaps: no field for a GHIN or index, no flighting, no net scoring.",
        "Sponsorships: a sponsor package is not a ticket. Logo uploads, tier inventory, and hole assignments have nowhere to live.",
        "Live scoring: nothing. No leaderboard, no mobile score entry, no way for players to follow the event.",
        "Day-of logistics: no cart signs, no scorecards, no check-in list tied to pairings.",
        "Branding: your event lives on an Eventbrite page with Eventbrite's chrome, not on your own domain.",
      ],
      mockup: "site",
    },
    {
      heading: "The hidden cost: your spreadsheet becomes the real platform",
      paragraphs: [
        "Every organizer who runs golf on a general ticketing tool ends up with the same artifact — a master spreadsheet that is copy-pasted from the attendee export and then hand-edited for weeks. Team names go in one tab, sponsors in another, handicaps in a third, and pairings in a fourth. Nothing syncs. When someone drops out three days before the event you edit four tabs, reprint the cart signs, and hope you caught every reference.",
        "That spreadsheet is also where mistakes become expensive. A missed name on a cart sign is embarrassing. A sponsor whose logo never made it onto the banner is a refund conversation. A pairing conflict on the first tee costs you 20 minutes of daylight in front of 144 players.",
      ],
    },
    {
      heading: "What a golf-specific platform adds",
      bullets: [
        "Group registration: the captain checks out once and teammates are captured as real player records, each with their own email, handicap, shirt size, and division.",
        "A drag-and-drop tee sheet with shotgun or tee-time starts, interval control, and conflict warnings before you publish.",
        "Sponsor tiers with inventory counts, logo upload, and automatic placement on the public page, cart signs, and leaderboard.",
        "Mobile score entry with a per-group code, feeding a live leaderboard players and families can watch.",
        "Printables generated from live data: scorecards, cart signs, pairing sheets, and check-in lists that always match the current roster.",
        "A fully customizable public event website on your own domain — the differentiator Eventbrite structurally cannot offer.",
      ],
      mockup: "leaderboard",
    },
    {
      heading: "Fees: comparing apples to apples",
      paragraphs: [
        "Eventbrite charges a per-ticket service fee plus payment processing, and those fees scale with every golfer you register. For a 144-player event at $150 a seat that adds up fast, and the money routes through Eventbrite before it reaches you.",
        "TeeVents charges a flat 5 percent platform fee on paid transactions plus standard Stripe processing, and you can pass either or both to the player at checkout. Payments settle directly into your own Stripe account as the merchant of record — TeeVents never holds your funds. Pro features unlock for a one-time $399 per tournament, not an annual contract.",
      ],
      mockup: "pricing",
    },
    {
      heading: "Migrating mid-season without losing registrations",
      bullets: [
        "Export your Eventbrite attendee list to CSV.",
        "Import it into your TeeVents roster — names, emails, and payment status carry over, and anything already paid can be marked paid so nobody is charged twice.",
        "Publish your branded event site and point your existing Eventbrite listing at it, or simply stop selling there.",
        "Open sponsor packages and add-ons that never fit on a ticketing page.",
        "Build pairings from the imported roster and send scoring codes the week of the event.",
      ],
    },
  ],
  faqs: [
    {
      q: "Can I use Eventbrite for a golf tournament at all?",
      a: "Yes, for simple events. It handles ticket sales and payment well. It has no concept of foursomes, pairings, handicaps, sponsor tiers, or live scoring, so those tasks fall back to spreadsheets and manual email.",
    },
    {
      q: "What is the biggest single problem with Eventbrite for golf?",
      a: "Team registration. A company buys a foursome and you only capture the buyer. Collecting the other three names, emails, handicaps, and shirt sizes turns into weeks of follow-up.",
    },
    {
      q: "Is TeeVents more expensive than Eventbrite?",
      a: "Usually less, because there is no per-golfer platform ticket fee. TeeVents charges 5 percent on paid transactions plus Stripe processing, and both can be passed to the registrant.",
    },
    {
      q: "Can I move an event that is already selling?",
      a: "Yes. Export the attendee CSV, import it as your roster with paid status intact, and continue selling on your TeeVents page.",
    },
  ],
  related: [
    { to: "/eventbrite-vs-golf-tournament-software", label: "Eventbrite vs Golf Tournament Software" },
    { to: "/golf-tournament-registration-platform", label: "Golf Tournament Registration Platform" },
    { to: "/golf-tournament-website-builder", label: "Golf Tournament Website Builder" },
    { to: "/golf-tournament-live-scoring", label: "Golf Tournament Live Scoring" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const registrationPlatform: GuideContent = {
  slug: "golf-tournament-registration-platform",
  title: "Choosing a Golf Tournament Registration Platform",
  metaTitle: "Golf Tournament Registration Platform: What to Look For",
  metaDescription:
    "What a golf tournament registration platform must handle: foursomes, sponsors, handicaps, add-ons, payouts, and a branded event site. A buyer's checklist.",
  heroSubtitle:
    "Registration is where a tournament is won or lost. Here is the checklist to evaluate any platform against.",
  intro:
    "Registration looks like a solved problem until you run your first 144-player golf tournament. Then you learn that golf registration is really six problems wearing a trench coat: individual signups, company foursomes, sponsor packages, add-on sales, data collection for pairings, and money movement to the right bank account. This guide breaks down every requirement a real golf tournament registration platform has to meet, in the order you will hit them, so you can evaluate any tool — including TeeVents — against a concrete checklist instead of a feature grid.",
  sections: [
    {
      heading: "Requirement 1: register a team, not just a buyer",
      paragraphs: [
        "The most common golf transaction is one person paying for four people. A generic ticketing tool records one attendee and three anonymous seats. A golf platform must capture the captain with full contact details and then collect each teammate as a real player record — at minimum first and last name, ideally email, handicap, shirt size, and division.",
        "Look for the ability to make captain fields required while keeping teammate fields light. Nobody abandons a $600 checkout because they had to type three names, but plenty abandon it when asked for three full addresses.",
      ],
    },
    {
      heading: "Requirement 2: custom questions you actually control",
      bullets: [
        "Text, dropdown with multiple options, checkbox, and date field types.",
        "Per-field required or optional toggles.",
        "Questions that apply only to certain ticket types (players versus sponsors versus volunteers).",
        "Answers that export cleanly and appear on the roster, not buried in a PDF.",
      ],
    },
    {
      heading: "Requirement 3: sponsorships as first-class inventory",
      paragraphs: [
        "Sponsor sales usually outrun player fees as the primary revenue line at a charity event, yet most registration tools treat a sponsorship as just another ticket. You need tiered packages with limited inventory (one title sponsor, eighteen hole sponsors), logo upload at checkout, and a custom field set for the contact who will approve artwork.",
        "The payoff is automation: the moment a hole sponsor pays, their logo can appear on the public site, on the live leaderboard rotation, and on the printed cart sign for their assigned hole without anyone re-keying anything.",
      ],
      mockup: "sponsor",
    },
    {
      heading: "Requirement 4: add-ons and day-of sales",
      bullets: [
        "Mulligans, skins, closest-to-the-pin, and raffle packs sold at registration.",
        "Standalone add-on pages you can share by QR code on event day.",
        "Merchandise or player gift selection with size capture.",
        "Donation amounts, including a round-up option for nonprofits.",
      ],
    },
    {
      heading: "Requirement 5: money that lands in your account",
      paragraphs: [
        "Ask exactly one question of every vendor: who is the merchant of record? If the platform holds funds and pays you out weeks later, your cash flow depends on their schedule and their reserve policy.",
        "TeeVents uses Stripe Connect direct charges, so the organizer is the merchant of record and settlements arrive on the standard Stripe payout schedule. The 5 percent platform fee is taken as an application fee on each transaction, and processing fees are shown as separate line items at checkout so registrants can see exactly what they are paying. You choose whether to absorb those fees or pass them along.",
      ],
      mockup: "pricing",
    },
    {
      heading: "Requirement 6: the data has to flow downstream",
      paragraphs: [
        "Registration is not the destination — it is the source of every artifact you will produce. Pairings, cart signs, scorecards, check-in lists, name badges, scoring codes, and confirmation emails should all read from the same live roster. If your registration tool exports to CSV and nothing else, you have bought a form, not a platform.",
        "A practical test: delete a registration and see how many downstream documents update automatically. On TeeVents the roster, tee sheet, printables, and email recipient lists all follow.",
      ],
    },
    {
      heading: "Requirement 7: a public page you would be proud to text",
      paragraphs: [
        "Your registration link gets pasted into group texts, LinkedIn posts, and church bulletins. It should open a page with your logo, your colors, your course photos, your sponsor wall, and your schedule — on your own domain if you want one. A generic branded ticket page undercuts the professionalism sponsors are paying for.",
      ],
      mockup: "site",
    },
  ],
  faqs: [
    {
      q: "What is the difference between a ticketing tool and a golf registration platform?",
      a: "A ticketing tool sells seats. A golf registration platform captures team structure, handicaps, divisions, sponsor tiers, and add-ons, then feeds that data into pairings, printables, scoring, and email.",
    },
    {
      q: "Can players register as individuals and be paired later?",
      a: "Yes. Individual registrations sit on the roster unassigned until you build pairings, and singles can be grouped automatically into foursomes.",
    },
    {
      q: "How quickly can I open registration?",
      a: "On TeeVents most organizers publish a working event site with open registration in under an hour, and often in a few minutes using a template.",
    },
    {
      q: "Do I need my own Stripe account?",
      a: "Connecting Stripe is recommended so you are the merchant of record and funds settle directly to you. If Stripe is not connected yet, checkout still works and the team arranges a manual payout.",
    },
  ],
  related: [
    { to: "/online-golf-tournament-registration", label: "Online Golf Tournament Registration" },
    { to: "/best-golf-tournament-management-software", label: "Best Golf Tournament Management Software" },
    { to: "/golf-tournament-sponsor-packages", label: "Golf Tournament Sponsor Packages" },
    { to: "/eventbrite-for-golf-tournaments", label: "Eventbrite for Golf Tournaments" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const bestSoftware: GuideContent = {
  slug: "best-golf-tournament-management-software",
  title: "Best Golf Tournament Management Software (2026 Buyer's Guide)",
  metaTitle: "Best Golf Tournament Management Software in 2026",
  metaDescription:
    "An honest buyer's guide to golf tournament management software: what to compare, what pricing models hide, and which tool fits charity, corporate, and league events.",
  heroSubtitle:
    "Twelve criteria that actually separate golf tournament platforms — and how to score any vendor in an afternoon.",
  intro:
    "Search for golf tournament management software and every result claims to be all-in-one. They are not interchangeable. Some are built for golf course pro shops running member events, some for national charity fundraising programs, and some are general event tools with a golf skin. Picking the wrong category costs you either money or a weekend of manual work. This guide gives you a twelve-point scoring framework, explains what each pricing model really costs at 144 players, and shows which type of organizer each category serves best.",
  sections: [
    {
      heading: "First, identify which type of organizer you are",
      bullets: [
        "Charity or nonprofit: revenue mix is sponsorships and donations, volunteers run the day, budget is tight, and the board wants a professional-looking site.",
        "Corporate or client event: branding and guest experience matter most, budget is available, and registration is often comped or invoiced.",
        "Golf course or club: many events per year, existing pro shop systems, handicap accuracy is non-negotiable.",
        "League or recurring series: season standings, weekly scoring, member logins, and dues collection.",
      ],
      paragraphs: [
        "Most disappointment with tournament software comes from a category mismatch. A pro-shop tool feels heavy to a charity volunteer. A ticketing tool feels empty to a club professional. Name your category before you demo anything.",
      ],
    },
    {
      heading: "The twelve-point evaluation checklist",
      bullets: [
        "Team and foursome registration with per-player data capture.",
        "Sponsor tiers with inventory, logo upload, and automatic placement.",
        "Pairings: shotgun and tee-time starts, interval control, conflict warnings, drag-and-drop edits.",
        "Handicaps and flighting, including net scoring and payout planning.",
        "Live scoring on mobile with a public leaderboard.",
        "Printables: scorecards, cart signs, pairing sheets, check-in lists generated from live data.",
        "Branded public website, ideally on your own custom domain.",
        "Email: confirmations, day-before reminders, and targeted sends you can edit.",
        "Add-ons and on-course sales (mulligans, raffles, skins, merchandise).",
        "Payments: who is merchant of record, how fast payouts arrive, whether fees can be passed on.",
        "Total cost at your player count, including per-golfer fees.",
        "Contract terms: annual commitment versus per-event pricing.",
      ],
    },
    {
      heading: "What each pricing model really costs",
      paragraphs: [
        "Per-golfer pricing looks harmless at $5 to $12 a player until you multiply by 144 and add a second event. Annual subscriptions look predictable until you run only one tournament a year and pay for eleven idle months. Free platforms typically monetize with a donation prompt or a processing markup at checkout, which quietly moves the cost onto your donors.",
        "TeeVents keeps this simple on purpose: Base is $0, Pro is a one-time $399 unlock for a specific tournament, and there is a 5 percent platform fee on paid transactions that you can pass to registrants. No annual contract, no per-golfer fee, and funds settle directly to your Stripe account.",
      ],
      mockup: "pricing",
    },
    {
      heading: "The criterion most buyers forget: the public page",
      paragraphs: [
        "Sponsors write checks partly for visibility, and every visibility promise you make routes through your event page. If the platform gives you a fixed template with its own logo in the header, you are selling a weaker package than you think.",
        "Score vendors on how much of the public page you can genuinely change: templates, section order, hero imagery, color, custom tabs, gallery, sponsor wall, schedule formatting, and whether you can point a custom domain at it. This is where the biggest quality gap between tools shows up.",
      ],
      mockup: "site",
    },
    {
      heading: "Run a 60-minute bake-off",
      bullets: [
        "Create a real event with your actual name, date, and course in each tool.",
        "Register a foursome as a company buyer and see how much teammate data you captured.",
        "Sell yourself a hole sponsorship with a logo upload.",
        "Build pairings for 12 groups, then move one group's tee time and see what warns you.",
        "Print a cart sign and a scorecard and hold them next to each other.",
        "Enter three holes of scores on your phone and open the public leaderboard.",
        "Text yourself the event link and look at the preview card that appears.",
      ],
      mockup: "scoring",
    },
    {
      heading: "Where TeeVents fits",
      paragraphs: [
        "TeeVents is built for organizers, not pro shops: charity tournaments, corporate outings, alumni and fraternity events, and golf leagues. The strongest differentiators are the customizable public site with custom domain support, built-in pin sheets and printables, native auctions and raffles, and per-tournament pricing with no annual contract.",
        "It is less of a fit if you need deep pro-shop integrations, USGA tournament administration for championship-level competition, or point-of-sale tie-ins with a club management system.",
      ],
    },
  ],
  faqs: [
    {
      q: "What is the best golf tournament management software for a charity event?",
      a: "Prioritize sponsor tools, donation handling, a branded public page, and per-event pricing. TeeVents was designed around this profile; pro-shop tools tend to overshoot it.",
    },
    {
      q: "Is free golf tournament software actually free?",
      a: "Usually the cost moves to checkout as a higher processing markup or a default donation prompt shown to your registrants. Compare total cost at your real player count.",
    },
    {
      q: "How long does setup take?",
      a: "With a template, a published site with open registration takes under an hour. Pairings and printables come later, once registrations arrive.",
    },
    {
      q: "Can one platform handle both a tournament and a season-long league?",
      a: "TeeVents supports both, with league member logins, weekly event scoring, season standings, and prize money tracking alongside one-off tournaments.",
    },
  ],
  related: [
    { to: "/golf-tournament-registration-platform", label: "Golf Tournament Registration Platform" },
    { to: "/golfstatus-alternatives", label: "GolfStatus Alternatives" },
    { to: "/golf-genius-alternatives", label: "Golf Genius Alternatives" },
    { to: "/golf-tournament-software-pricing", label: "Golf Tournament Software Pricing" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const onlineRegistration: GuideContent = {
  slug: "online-golf-tournament-registration",
  title: "Online Golf Tournament Registration, Step by Step",
  metaTitle: "Online Golf Tournament Registration: Setup Guide",
  metaDescription:
    "How to set up online golf tournament registration: ticket types, foursomes, custom questions, add-ons, fees, and the emails that follow. A practical walkthrough.",
  heroSubtitle:
    "From blank page to a registration link you can text — the exact setup order that avoids rework.",
  intro:
    "Opening registration online is the moment your tournament becomes real. Do it in the wrong order and you will be editing ticket types after people have already paid, which is where refund headaches begin. This walkthrough covers the sequence experienced organizers use: pricing first, then ticket structure, then data capture, then add-ons, then fees, then the confirmation email — and finally the public page and the link you share everywhere.",
  sections: [
    {
      heading: "Step 1: set your pricing before you build anything",
      paragraphs: [
        "Work backwards from the course contract. Add up green fees, carts, food and beverage, gifts, prizes, and printing, then divide by your expected field. That is your break-even per player. Everything above it is fundraising, and sponsorships should carry most of that load.",
        "Decide now whether you will offer early-bird pricing, a foursome discount, and a comped ticket type for sponsors. These are structural choices — changing them after money arrives is painful.",
      ],
    },
    {
      heading: "Step 2: build ticket types that match how people actually buy",
      bullets: [
        "Individual player — for singles you will pair later.",
        "Foursome or team — one checkout, four player records.",
        "Sponsor packages — separate tiers with their own inventory limits.",
        "Dinner-only or guest ticket — non-golfers who attend the banquet.",
        "Volunteer or comp — zero-dollar registration that still collects contact data.",
      ],
    },
    {
      heading: "Step 3: decide exactly what you ask each registrant",
      paragraphs: [
        "Every extra field costs you completions. Ask only for what you will genuinely use: name, email, phone, handicap or index if you are flighting, shirt size if you are giving gifts, and division if you run age or skill categories. City and state help if you are reporting to a sponsor about reach.",
        "For teams, make the captain's fields required and keep teammate fields to first and last name, with email optional. You can collect the rest later through a follow-up email if you decide you need it.",
      ],
    },
    {
      heading: "Step 4: add revenue that costs you nothing to offer",
      bullets: [
        "Mulligans, usually sold in packs of two or three per player.",
        "Skins entry and closest-to-the-pin or long-drive contests.",
        "Raffle ticket bundles and a silent auction preview.",
        "A donation field for people who cannot play but want to give.",
        "Player gift upgrades or extra merchandise.",
      ],
      paragraphs: [
        "Add-ons routinely produce 15 to 30 percent of registration revenue at charity events, and they take about ten minutes to configure. Keep them available after checkout too, through a standalone add-on page you can post as a QR code on event day.",
      ],
    },
    {
      heading: "Step 5: choose how fees are handled",
      paragraphs: [
        "There are two honest ways to handle the 5 percent platform fee and Stripe processing: absorb them into your ticket price, or show them as separate line items and pass them to the registrant. Golf audiences are generally fine with pass-through when it is labeled clearly, especially at charity events where every dollar absorbed is a dollar off the mission.",
        "Whichever you choose, show the total before the payment step. Surprise fees at the final click are the single biggest cause of abandoned golf registrations.",
      ],
      mockup: "pricing",
    },
    {
      heading: "Step 6: write the confirmation email once, properly",
      bullets: [
        "Confirm what they bought and what it includes.",
        "State the date, course, address, and arrival time.",
        "Explain the format in one line (four-person scramble, shotgun start at 9:00 a.m.).",
        "List teammates captured at checkout so the captain can correct errors early.",
        "Include the event page link, and a scoring link once pairings are set.",
        "Tell nonprofit donors what portion is tax deductible.",
      ],
    },
    {
      heading: "Step 7: publish the page and share the link",
      paragraphs: [
        "Your registration link will live in text messages, LinkedIn posts, email newsletters, and printed flyers with a QR code. Test it in all four places. Text it to yourself first and confirm the preview card shows your event's own title, description, and image — a generic preview quietly costs you clicks.",
        "Then set a cadence: announce, remind at 30 days, remind at 10 days with an early-bird deadline, and send a last call in the final week. Most golf registrations arrive in the final two weeks no matter how early you open.",
      ],
      mockup: "site",
    },
  ],
  faqs: [
    {
      q: "How early should online registration open?",
      a: "Eight to twelve weeks before the event for a charity tournament. Sponsors need longer — start those conversations three to six months out.",
    },
    {
      q: "Should I require handicaps at registration?",
      a: "Only if you are flighting or running net scoring. If you are, ask for it as an optional number field and follow up with the players who skip it.",
    },
    {
      q: "Can I take payment offline for some teams?",
      a: "Yes. Add players manually with a payment status of pending or paid, so checks and invoices sit on the same roster as online registrations.",
    },
    {
      q: "What happens when the field sells out?",
      a: "Turn on the waitlist. Entries are queued automatically and get a claim window when a spot opens.",
    },
  ],
  related: [
    { to: "/golf-tournament-registration-platform", label: "Golf Tournament Registration Platform" },
    { to: "/golf-tournament-pairings-management", label: "Managing Golf Tournament Pairings" },
    { to: "/charity-golf-tournament-guide", label: "How to Run a Charity Golf Tournament" },
    { to: "/golf-tournament-sponsor-packages", label: "Golf Tournament Sponsor Packages" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const golfstatusAlternatives: GuideContent = {
  slug: "golfstatus-alternatives",
  title: "GolfStatus Alternatives for Tournament Organizers",
  metaTitle: "GolfStatus Alternatives: Compare Golf Event Platforms",
  metaDescription:
    "Looking for a GolfStatus alternative? Compare pricing models, website customization, payouts, and features, and see where TeeVents fits for charity golf events.",
  heroSubtitle:
    "What organizers look for when they shop past GolfStatus — and how to compare honestly.",
  intro:
    "GolfStatus is a well-known name in charity golf, particularly for nonprofits that qualify for its no-cost program through the Golf for Good model. It is a legitimate option and many events run happily on it. Organizers still shop for alternatives for specific reasons: they want more control over how the public event page looks, they want funds to settle into their own merchant account, they are not a 501(c)(3), or they want a predictable per-event cost rather than a program relationship. This page lays out the comparison criteria that matter and where TeeVents lands on each.",
  sections: [
    {
      heading: "Why organizers shop for an alternative",
      bullets: [
        "Website control: templates that cannot be restructured, or branding that still reads as the vendor's.",
        "Eligibility: no-cost programs are typically tied to nonprofit status, which leaves corporate, alumni, club, and community events out.",
        "Fee visibility: wanting the platform fee and processing fee shown as clear line items at checkout.",
        "Funds custody: preferring to be the merchant of record with direct settlement rather than a platform payout schedule.",
        "Feature gaps for specific events: leagues and season standings, multi-round tee times, pin sheets, or auctions.",
      ],
    },
    {
      heading: "The comparison criteria that actually matter",
      bullets: [
        "Total cost at your player count, including anything charged to the registrant at checkout.",
        "Whether you can use a custom domain and restructure the public page.",
        "Team registration depth: how much teammate data is captured at checkout.",
        "Pairings tooling: shotgun versus tee times, intervals, conflict detection, multi-round support.",
        "Live scoring and leaderboard quality on a phone with poor course reception.",
        "Printables generated from live data rather than a generic PDF.",
        "Sponsor inventory, logo handling, and automatic placement across site, leaderboard, and signage.",
        "Contract terms and what happens if you skip a year.",
      ],
    },
    {
      heading: "Where TeeVents is different",
      paragraphs: [
        "TeeVents is organizer-owned by design. Payments run through Stripe Connect direct charges, so you are the merchant of record and settlements land in your account on Stripe's normal schedule; the only money TeeVents keeps is the 5 percent application fee. Pricing is Base at $0 and Pro as a one-time $399 unlock per tournament, so a once-a-year event never pays for eleven idle months.",
        "The public site is the headline difference: six professional templates, reorderable sections, your own photos and colors, custom tabs, a sponsor wall, and a custom domain if you want the event to live at your organization's own address.",
      ],
      mockup: "site",
    },
    {
      heading: "Feature areas to test in a demo",
      bullets: [
        "Register a company foursome and count how many teammate fields you captured.",
        "Sell a hole sponsorship with a logo and see where that logo appears automatically.",
        "Build a tee-time start with 9-minute intervals across holes 1 and 10 at the same time.",
        "Print a cart sign at 8 by 36 inches and a landscape 18-hole scorecard.",
        "Run mobile score entry with a group code and watch the leaderboard update.",
        "Send yourself the day-before reminder email and check the scoring and leaderboard buttons.",
      ],
      mockup: "scoring",
    },
    {
      heading: "When GolfStatus is the right answer",
      paragraphs: [
        "If you are a 501(c)(3), your event is a straightforward one-day scramble, you are happy with a standard event page, and no-cost access matters more than customization or funds custody, GolfStatus is a reasonable fit and you should not switch for the sake of switching.",
        "Shop for an alternative when the public page is part of your sponsor pitch, when you are not a nonprofit, when you run leagues or multi-round events, or when you want the money in your own account from day one.",
      ],
    },
    {
      heading: "Switching without disruption",
      bullets: [
        "Export your existing registrant list and import it as your TeeVents roster, preserving paid status.",
        "Rebuild sponsor tiers with inventory counts, then upload existing logos once.",
        "Publish the new event site and redirect or update every link you have shared.",
        "Set up your Stripe connection before reopening registration so payments settle to you immediately.",
        "Send one short note to registrants explaining the new event page and what stays the same.",
      ],
    },
  ],
  faqs: [
    {
      q: "Is TeeVents free for nonprofits?",
      a: "The Base tier is $0 and there is no annual contract. Pro features unlock for a one-time $399 per tournament, and a 5 percent platform fee applies to paid transactions, which can be passed to registrants.",
    },
    {
      q: "Can I keep my existing registrations if I switch?",
      a: "Yes. Import your roster from CSV with payment status intact so nobody is charged twice.",
    },
    {
      q: "Who holds the money on TeeVents?",
      a: "You do. Stripe Connect direct charges make the organizer the merchant of record; TeeVents only receives the 5 percent application fee.",
    },
    {
      q: "Does TeeVents support golf leagues as well as tournaments?",
      a: "Yes, including member logins, weekly event scoring, season standings, points settings, and prize money tracking.",
    },
  ],
  related: [
    { to: "/golf-genius-alternatives", label: "Golf Genius Alternatives" },
    { to: "/golfstatus-vs-golf-genius", label: "GolfStatus vs Golf Genius" },
    { to: "/best-golf-tournament-management-software", label: "Best Golf Tournament Management Software" },
    { to: "/golf-tournament-website-design", label: "Golf Tournament Website Design" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const golfGeniusAlternatives: GuideContent = {
  slug: "golf-genius-alternatives",
  title: "Golf Genius Alternatives for Tournament Organizers",
  metaTitle: "Golf Genius Alternatives: Simpler Tournament Software",
  metaDescription:
    "Golf Genius alternatives compared: pricing, learning curve, website customization, and fundraising features. See where TeeVents fits for charity and corporate golf.",
  heroSubtitle:
    "Golf Genius is built for golf professionals. If you are a volunteer organizer, here is what else to look at.",
  intro:
    "Golf Genius is powerful software with deep tournament administration capability, and it earned its position in the pro shop. That heritage is also why volunteer organizers of charity outings sometimes look elsewhere: the tool assumes a golf professional is driving, pricing is generally an annual arrangement, and the fundraising side — sponsor packages, auctions, donations, a marketing-grade event website — is not the center of the product. This page covers the honest trade-offs and how to evaluate alternatives.",
  sections: [
    {
      heading: "What Golf Genius does very well",
      bullets: [
        "Deep competition formats and tournament administration for club and championship play.",
        "Handicap integration and league management inside a golf operation.",
        "Established workflows familiar to golf professionals and course staff.",
        "Live scoring with a mature mobile app.",
      ],
      paragraphs: [
        "If a PGA professional runs your event and it is primarily a competition rather than a fundraiser, staying with Golf Genius is often the right call.",
      ],
    },
    {
      heading: "Why charity and corporate organizers look elsewhere",
      bullets: [
        "Learning curve: the interface assumes tournament-operations vocabulary that volunteers do not have.",
        "Pricing: annual arrangements are hard to justify for one event a year.",
        "Fundraising: sponsor tiers, silent auctions, raffles, and donations are not the product's core.",
        "Website: the event page is functional rather than a marketing site you would put a custom domain on.",
        "Onboarding time: setup often involves a representative walkthrough rather than self-service in an afternoon.",
      ],
    },
    {
      heading: "Feature comparison at a glance",
      bullets: [
        "Pricing model — TeeVents: $399 one-time per tournament plus 5 percent platform fee. Golf Genius: annual arrangement, commonly with per-golfer components.",
        "Contract — TeeVents: none, pay per event. Golf Genius: annual.",
        "Event website — TeeVents: six templates, section reordering, custom domain. Golf Genius: standard event page.",
        "Pin sheets — TeeVents: built-in PDF generator. Golf Genius: not native.",
        "Auctions and raffles — TeeVents: native, with automatic raffle draw. Golf Genius: limited or add-on.",
        "Volunteer management and QR check-in — TeeVents: built in. Golf Genius: not native.",
        "Merchandise and player gift store — TeeVents: included in Pro. Golf Genius: typically a premium upgrade.",
      ],
      mockup: "sponsor",
    },
    {
      heading: "The customization gap",
      paragraphs: [
        "For a charity event, the public page is a fundraising asset. It carries the sponsor wall you sold, the story of the cause, the photo gallery from last year, the schedule, and the donate button. Tools built for competition administration treat that page as an information sheet.",
        "TeeVents lets you pick a template, reorder sections, add custom tabs, upload your own hero imagery, apply your colors, publish a gallery, and point your own domain at the result. Sponsors see their logos on the site, on the live leaderboard rotation, and on the printed cart signs without anyone assembling artwork by hand.",
      ],
      mockup: "site",
    },
    {
      heading: "How to run the comparison in one afternoon",
      bullets: [
        "Set up the same event in both tools with your real date, course, and field size.",
        "Time yourself from empty account to published registration page.",
        "Sell yourself a foursome and a hole sponsorship, then look at what data you have.",
        "Build 18 groups with a 9-minute tee-time interval across two starting holes.",
        "Generate cart signs and scorecards and print them.",
        "Enter scores on a phone and share the leaderboard link with a colleague.",
      ],
      mockup: "leaderboard",
    },
    {
      heading: "Making the switch",
      paragraphs: [
        "Migration is usually a one-hour job: export your player list, import it as a roster, rebuild sponsor tiers with inventory, upload logos, and publish the new site. Pairings can be rebuilt in minutes because the tee sheet is generated from your field size, format, and interval settings rather than typed by hand.",
        "Run the two systems in parallel for one event if you want a safety net. Keep scoring on whichever tool your volunteers rehearsed on, and move everything the following year once the workflow is familiar.",
      ],
    },
  ],
  faqs: [
    {
      q: "Is TeeVents a full Golf Genius replacement?",
      a: "For charity, corporate, alumni, and league events, yes. For championship-level competition administration inside a golf operation, Golf Genius remains deeper.",
    },
    {
      q: "What does TeeVents cost compared with Golf Genius?",
      a: "TeeVents is $0 on Base and a one-time $399 per tournament for Pro, plus a 5 percent platform fee that can be passed to registrants. Golf Genius is generally an annual arrangement.",
    },
    {
      q: "Does TeeVents handle handicaps and flighting?",
      a: "Yes — handicap capture at registration, net scoring, flighting, and a flight payout planner.",
    },
    {
      q: "How long does setup take for a volunteer organizer?",
      a: "Most organizers publish a working event site in under an hour with no training call.",
    },
  ],
  related: [
    { to: "/golfstatus-alternatives", label: "GolfStatus Alternatives" },
    { to: "/golfstatus-vs-golf-genius", label: "GolfStatus vs Golf Genius" },
    { to: "/golf-tournament-pairings-management", label: "Managing Golf Tournament Pairings" },
    { to: "/best-golf-tournament-management-software", label: "Best Golf Tournament Management Software" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const perfectGolfEventReviews: GuideContent = {
  slug: "perfect-golf-event-reviews",
  title: "Perfect Golf Event Reviews: What Organizers Should Compare",
  metaTitle: "Perfect Golf Event Reviews & Alternatives Compared",
  metaDescription:
    "Evaluating Perfect Golf Event? Here are the criteria organizers weigh — pricing, website customization, sponsors, scoring, printables — plus how TeeVents compares.",
  heroSubtitle:
    "A neutral framework for reviewing golf event software, applied to the questions organizers ask most.",
  intro:
    "Perfect Golf Event is one of several tools organizers evaluate when they outgrow spreadsheets. Rather than repeat marketing claims, this page gives you a review framework you can apply to it, to TeeVents, and to anything else on your shortlist. The criteria come from what organizers actually complain about after their first event: teammate data they never collected, sponsor logos assembled by hand at midnight, a leaderboard nobody could load on the course, and cart signs that printed across three pages.",
  sections: [
    {
      heading: "How to read golf software reviews critically",
      bullets: [
        "Check the reviewer's event size — a 40-player member outing and a 288-player charity event stress completely different features.",
        "Check the year. Pricing models and feature sets in this category change often.",
        "Separate 'setup was easy' from 'event day worked'. Those are different products in practice.",
        "Look for specifics: interval control, conflict warnings, logo placement, PDF page fit. Vague praise tells you nothing.",
      ],
    },
    {
      heading: "The five questions that predict satisfaction",
      bullets: [
        "How much teammate data does a single foursome checkout capture?",
        "When a hole sponsor pays, how many places does their logo appear without manual work?",
        "Can you print a cart sign and a scorecard that fit their pages on the first try?",
        "Does score entry work on a phone with one bar of service, and does the leaderboard update live?",
        "Whose bank account do the payments land in, and when?",
      ],
      paragraphs: [
        "If a platform answers these five well, the rest of the experience is usually fine. If it fumbles two of them, expect a spreadsheet to reappear.",
      ],
    },
    {
      heading: "Pricing models you will encounter",
      paragraphs: [
        "Expect three shapes: an annual license, per-golfer fees, or per-event pricing. Annual licenses reward organizations running many events. Per-golfer pricing punishes large fields. Per-event pricing suits the once-a-year charity outing.",
        "TeeVents uses per-event pricing: Base at $0, Pro at a one-time $399 for a specific tournament, plus a 5 percent platform fee on paid transactions that you may pass to registrants. There is no annual commitment and no per-golfer platform fee.",
      ],
      mockup: "pricing",
    },
    {
      heading: "Where the customizable event site changes the math",
      paragraphs: [
        "Most reviews under-weight the public page because it is not a feature you use — it is a feature your sponsors and players use. A branded, well-structured event site on your own domain raises the perceived value of every sponsorship tier you sell and makes your registration link worth clicking when it lands in a group text.",
        "When you review any tool, open the demo event page on a phone. Ask whether you would be comfortable putting that page in front of a title sponsor who is writing a five-figure check.",
      ],
      mockup: "site",
    },
    {
      heading: "Event-day criteria reviews usually skip",
      bullets: [
        "Scoring codes tied to groups, generated only after pairings exist.",
        "One shared score entry per team for scramble formats instead of four duplicate entries.",
        "A leaderboard that shows registered team names, not 'Group 7'.",
        "Sponsor rotation and a scrolling ticker on the leaderboard screen in the clubhouse.",
        "Check-in from a phone with QR scanning tied to the roster.",
        "Printables that regenerate the moment a player drops out.",
      ],
      mockup: "leaderboard",
    },
    {
      heading: "A fair way to compare TeeVents",
      paragraphs: [
        "TeeVents is strongest for organizer-run fundraising and community events: charity outings, corporate client days, alumni and fraternity tournaments, and recurring leagues. Standout areas are the customizable public site with custom domain support, built-in pin sheets and printables, native auctions and raffles, direct-to-organizer payments, and per-event pricing.",
        "It is a weaker fit for pro-shop operations that need club management integrations or championship-level competition administration. Being explicit about that is more useful than claiming to win every category.",
      ],
    },
  ],
  faqs: [
    {
      q: "What should I look for in golf event software reviews?",
      a: "Match the reviewer's event size to yours, check the date, and weight event-day outcomes over setup speed. Specific details about pairings, printing, and scoring are the reliable signals.",
    },
    {
      q: "How much should golf tournament software cost?",
      a: "For one annual charity event, a few hundred dollars per event plus transparent transaction fees is reasonable. Annual licenses make sense only if you run several events a year.",
    },
    {
      q: "Can I try TeeVents before committing?",
      a: "Yes. Base is $0, so you can build the event, publish a site, and open registration before deciding whether to unlock Pro for that tournament.",
    },
    {
      q: "Does TeeVents handle silent auctions and raffles?",
      a: "Yes, both are native, including automatic raffle draws and online bidding.",
    },
  ],
  related: [
    { to: "/best-golf-tournament-management-software", label: "Best Golf Tournament Management Software" },
    { to: "/golfstatus-alternatives", label: "GolfStatus Alternatives" },
    { to: "/rsvpify-for-golf-tournaments", label: "RSVPify for Golf Tournaments" },
    { to: "/golf-tournament-software-pricing", label: "Golf Tournament Software Pricing" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const rsvpifyForGolf: GuideContent = {
  slug: "rsvpify-for-golf-tournaments",
  title: "RSVPify for Golf Tournaments: Where It Helps and Where It Stops",
  metaTitle: "RSVPify for Golf Tournaments: Limits & Alternatives",
  metaDescription:
    "RSVPify handles guest lists and RSVPs well, but golf tournaments need pairings, handicaps, sponsors, and live scoring. Here's the gap and how to close it.",
  heroSubtitle:
    "A great RSVP tool is not a tournament platform. Here is exactly where the handoff has to happen.",
  intro:
    "RSVPify is a strong general event tool: guest lists, RSVPs, custom forms, seating, and ticketing for galas, weddings, and conferences. Organizers who already use it for their nonprofit's gala often reach for it again when the golf outing rolls around. It will get you through registration, and then it will hand you a spreadsheet. This page maps exactly which parts of a golf tournament RSVPify covers, which parts it cannot, and what that gap costs in volunteer hours.",
  sections: [
    {
      heading: "What RSVPify covers well",
      bullets: [
        "Custom registration forms with conditional questions.",
        "Guest lists, RSVP tracking, and reminder emails.",
        "Ticketing with multiple types and promo codes.",
        "Seating charts for the banquet portion of your event.",
        "Clean data export.",
      ],
      paragraphs: [
        "If your golf outing is really a dinner with nine holes attached, RSVPify may cover the majority of the work. The more the golf itself matters, the wider the gap gets.",
      ],
    },
    {
      heading: "The golf-specific gap",
      bullets: [
        "No tee sheet: no groups, starting holes, shotgun versus tee-time starts, or interval control.",
        "No handicap handling, flighting, or net scoring.",
        "No live scoring or public leaderboard.",
        "No sponsor tier inventory with logo placement on signage and the leaderboard.",
        "No golf printables: cart signs, scorecards, pin sheets, or pairing sheets.",
        "No on-course add-ons like mulligans and skins tied to a player record.",
      ],
      mockup: "scoring",
    },
    {
      heading: "What the gap costs in hours",
      paragraphs: [
        "Organizers who bridge the gap manually report the same pattern: roughly four to six hours building pairings in a spreadsheet, two to three hours laying out cart signs and scorecards in a design tool, an hour assembling sponsor artwork, and event-day scoring done on paper and typed into a spreadsheet afterwards, which delays awards by 30 to 45 minutes.",
        "None of that work is strategic. It is transcription, and it is exactly what a golf-specific platform removes by generating every artifact from the live roster.",
      ],
    },
    {
      heading: "Two ways to close it",
      bullets: [
        "Hybrid: keep RSVPify for the banquet guest list, run golf registration and operations on a golf platform. Workable, but you maintain two sources of truth.",
        "Consolidate: run everything on the golf platform, using ticket types for dinner-only guests and volunteers. One roster, one set of emails, one export.",
      ],
      paragraphs: [
        "Most organizers who try the hybrid approach consolidate the following year, because reconciling two lists the week of the event is the exact task they were trying to avoid.",
      ],
    },
    {
      heading: "What consolidation looks like on TeeVents",
      paragraphs: [
        "Registration captures players, foursomes, dinner-only guests, sponsors, and volunteers on one roster with custom questions per type. Sponsorship tiers carry inventory and logo upload. Add-ons cover mulligans, raffles, and donations.",
        "From there the roster drives everything: pairings with tee-time or shotgun starts, scoring codes issued per group after pairings exist, a live leaderboard with team names and sponsor rotation, printables that match the current field, and confirmation plus day-before reminder emails you can edit and target to specific players.",
      ],
      mockup: "leaderboard",
    },
    {
      heading: "Cost comparison",
      paragraphs: [
        "General event tools price by plan tier plus processing, and golf features are simply absent at every tier. TeeVents is $0 on Base with a one-time $399 Pro unlock per tournament and a 5 percent platform fee on paid transactions that can be passed to registrants, with funds settling directly to your own Stripe account as merchant of record.",
        "The more useful comparison is not the invoice — it is whether you spend the two weeks before your event building spreadsheets or selling sponsorships.",
      ],
      mockup: "pricing",
    },
  ],
  faqs: [
    {
      q: "Can RSVPify run a golf tournament?",
      a: "It can collect registrations and payments. It cannot build pairings, handle handicaps, manage sponsor inventory, print cart signs, or run live scoring.",
    },
    {
      q: "Should I use RSVPify for the dinner and a golf tool for the round?",
      a: "You can, but you will maintain two guest lists. Most organizers consolidate onto the golf platform using a dinner-only ticket type.",
    },
    {
      q: "Can I import my RSVPify list into TeeVents?",
      a: "Yes, via CSV import, with payment status preserved so nobody is charged twice.",
    },
    {
      q: "Does TeeVents handle non-golfer guests?",
      a: "Yes. Create a guest or dinner-only registration type with its own price and questions; those guests appear on the roster and check-in list but not the tee sheet.",
    },
  ],
  related: [
    { to: "/eventbrite-for-golf-tournaments", label: "Eventbrite for Golf Tournaments" },
    { to: "/eventbrite-vs-golf-tournament-software", label: "Eventbrite vs Golf Tournament Software" },
    { to: "/golf-tournament-registration-platform", label: "Golf Tournament Registration Platform" },
    { to: "/online-golf-tournament-registration", label: "Online Golf Tournament Registration" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};
