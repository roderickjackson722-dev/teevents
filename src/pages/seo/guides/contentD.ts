import type { GuideContent } from "./types";

const CTA_HEADING = "Start your tournament on TeeVents";
const CTA_TEXT =
  "Build a branded event site, open registration, and collect payments directly to your own bank account. Base is $0 — Pro is a one-time $399 per tournament, with no annual contract.";

export const pairingsManagement: GuideContent = {
  slug: "golf-tournament-pairings-management",
  title: "How to Manage Golf Tournament Pairings",
  metaTitle: "How to Manage Golf Tournament Pairings (Step by Step)",
  metaDescription:
    "A practical guide to golf tournament pairings: shotgun vs tee times, intervals, flighting, conflict checks, last-minute changes, and printing the tee sheet.",
  heroSubtitle:
    "Pairings are the single most error-prone part of running a tournament. Here is a repeatable process.",
  intro:
    "Pairings decide whether your event starts on time, whether sponsors sit with the guests they paid to host, and whether the awards ceremony happens before people leave. Done in a spreadsheet, pairings are also where the most embarrassing mistakes live: a group of five, a hole with nobody on it, a sponsor's foursome split across the course, or cart signs printed from a version that is two days stale. This guide walks through the full pairings workflow — from deciding your start format to publishing a locked tee sheet — and shows how to remove the manual steps.",
  sections: [
    {
      heading: "Step 1: choose your start format",
      paragraphs: [
        "A shotgun start puts every group on a different hole at the same time, so all 144 players finish within minutes of each other. It is the standard for charity outings because the lunch, awards, and auction can be scheduled precisely. It requires a full field — roughly 18 groups minimum for 18 holes, or a double shotgun with A and B tees for a larger field.",
        "A tee-time start sends groups off in intervals, usually 8 to 10 minutes apart, typically from hole 1, or from holes 1 and 10 simultaneously to halve the window. Use it for smaller fields, for stroke-play competitions, or when the course cannot close for a shotgun.",
      ],
    },
    {
      heading: "Step 2: set the interval and the start window",
      bullets: [
        "8 minutes is tight and works with experienced fields; 9 to 10 minutes is safer for mixed-ability charity fields.",
        "Split starts (holes 1 and 10) cut the start window roughly in half — the same tee time on two different holes is normal and should never be blocked.",
        "Leave a gap for a ceremonial or sponsor group at the front if you have one.",
        "For multi-day events, set the format and interval per round; day two often reverses the order or re-pairs by score.",
      ],
      paragraphs: [
        "Do the arithmetic before you build: 36 groups at 9-minute intervals across two starting holes is an 81-minute start window. If the course gave you a 90-minute window, you are fine. At a single tee it is 162 minutes and you have a problem.",
      ],
    },
    {
      heading: "Step 3: seed the groups intentionally",
      bullets: [
        "Keep purchased foursomes intact — those are the teams a sponsor paid for.",
        "Place your title sponsor and VIPs where they will be visible and finish near the clubhouse.",
        "Distribute singles into the groups with open seats, matching by division or handicap when you can.",
        "If you are flighting, group each flight together so scoring and payouts are easy to compute.",
        "Spread known slow groups so they do not stack behind each other.",
      ],
      mockup: "site",
    },
    {
      heading: "Step 4: validate before you publish",
      paragraphs: [
        "Run a conflict check that flags two groups on the same hole at the same time, a group with more players than the format allows, an empty starting hole in a shotgun, and any player assigned twice. What the check must not do is block legitimate setups — like every group starting on hole 1 for a tee-time event, or the same 8:00 a.m. time on holes 1 and 10.",
        "On TeeVents the validation warns rather than blocks in those cases, with an override so you can confirm the arrangement you intended. You can also reset all assignments in one action if you want to rebuild the sheet from scratch without touching the roster.",
      ],
    },
    {
      heading: "Step 5: lock, publish, and print",
      bullets: [
        "Lock the pairings so a well-meaning volunteer cannot drag a group at 6 a.m. on event day.",
        "Generate scoring codes only after pairings exist — a scramble group shares one code so the team enters one score per hole.",
        "Print cart signs (8 by 36 inches), landscape 18-hole scorecards, pairing sheets, and the check-in list from the same live data.",
        "Send the day-before reminder email with each player's group, starting hole, and tee time, plus the scoring and leaderboard links.",
      ],
      mockup: "scoring",
    },
    {
      heading: "Step 6: handle the inevitable last-minute changes",
      paragraphs: [
        "Somebody always drops out in the final 48 hours. The right response is to change the roster once and let every downstream artifact follow: the tee sheet, the cart sign for that hole, the scorecard, the check-in list, and the email recipient list.",
        "Reprint only what changed. If a group falls to three players, a three-person group is still valid — scoring codes should issue for it, and the flight adjustment (if any) is a scoring setting, not a pairings problem.",
      ],
    },
    {
      heading: "Common pairing mistakes to avoid",
      bullets: [
        "Building the tee sheet before registration closes, then re-doing it twice.",
        "Splitting a sponsored foursome to fill a gap — the sponsor will notice.",
        "Printing signage from an exported spreadsheet instead of live data.",
        "Assigning starting holes without checking the course's cart path or hole closures.",
        "Forgetting to tell players their starting hole until they arrive at check-in.",
      ],
    },
  ],
  faqs: [
    {
      q: "How many minutes should there be between tee times?",
      a: "Eight to ten minutes. Use 9 or 10 for mixed-ability charity fields, and consider starting from holes 1 and 10 at the same time to halve the start window.",
    },
    {
      q: "Can two groups have the same tee time?",
      a: "Yes, if they start on different holes. That is standard for split starts, and the system should allow it without a duplicate warning.",
    },
    {
      q: "When should scoring codes be generated?",
      a: "After pairings are assigned, so each group gets a code. In scramble formats the whole group shares one code and submits one team score per hole.",
    },
    {
      q: "Can I reset all pairings and start over?",
      a: "Yes. A reset clears hole and time assignments while keeping the roster and tee sheet structure intact.",
    },
  ],
  related: [
    { to: "/what-is-a-shotgun-start", label: "What Is a Shotgun Start?" },
    { to: "/golf-tournament-handicap-system", label: "Golf Tournament Handicap System" },
    { to: "/golf-tournament-live-scoring", label: "Golf Tournament Live Scoring" },
    { to: "/golf-tournament-formats", label: "Golf Tournament Formats Explained" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const handicapSystem: GuideContent = {
  slug: "golf-tournament-handicap-system",
  title: "Golf Tournament Handicap Systems Explained",
  metaTitle: "Golf Tournament Handicap System: Net Scoring & Flights",
  metaDescription:
    "How handicaps work in tournament golf: course handicap, scramble allowances, flighting, net scoring, and how to collect and apply them without a spreadsheet.",
  heroSubtitle:
    "Fair competition across a mixed-ability field, without a math degree or an argument at the awards table.",
  intro:
    "The fastest way to lose a charity golf field is to let one scratch-heavy foursome win by nine shots every year. Handicaps exist to prevent that, and applied well they turn a lopsided outing into a real competition where the accounting department has a genuine chance against the sales team. Applied badly, they create disputes at the awards ceremony. This guide explains the handicap concepts organizers actually need, the allowances used in the common tournament formats, when to flight instead, and how to collect and apply the numbers cleanly.",
  sections: [
    {
      heading: "Handicap index versus course handicap",
      paragraphs: [
        "A player's handicap index is a portable number that represents their demonstrated ability. It is not the number of strokes they receive. The course handicap converts the index for the specific course and tees being played, using the slope rating, and that is the number you apply to scoring.",
        "For most charity events you will collect the index (or a self-reported estimate) at registration and convert once for your course and tee set. Publish the conversion you used — transparency prevents most disputes.",
      ],
    },
    {
      heading: "Allowances by format",
      bullets: [
        "Individual stroke play: full course handicap, subtracted from gross for net score.",
        "Four-person scramble: a common approach is a percentage blend of the four course handicaps — for example 25/20/15/10 percent from low to high — producing a single team handicap.",
        "Two-person scramble: typically 35 percent of the low handicap plus 15 percent of the high.",
        "Best ball: a percentage of each player's course handicap, commonly 85 to 90 percent.",
        "Stableford: full or near-full handicap, with points awarded relative to net score per hole.",
      ],
      paragraphs: [
        "These are conventions, not laws. What matters far more than the exact percentage is announcing the method before the round and applying it identically to every team.",
      ],
    },
    {
      heading: "Flighting: the simpler alternative",
      paragraphs: [
        "Flighting splits the field into groups of similar ability and pays prizes within each flight, using gross scores. It sidesteps handicap math entirely and is often the better choice for charity events where half the field has no established index.",
        "Practical approach: collect an estimated average score or index at registration, sort the field, and cut it into two or three flights of roughly equal size. Pay first through third in each flight. Nobody argues about a percentage allowance they never had to understand.",
      ],
      mockup: "leaderboard",
    },
    {
      heading: "Collecting handicaps without chasing people",
      bullets: [
        "Ask for it at registration as an optional numeric field, labeled 'Handicap index or average 18-hole score'.",
        "For team checkouts, ask the captain for each teammate's number — most captains know them.",
        "Send a single follow-up email to registrants who left it blank, with a one-click update link.",
        "Default anyone who never answers to a stated maximum (for example 24 for men, 32 for women) and publish that default.",
        "Store the number on the player record so it feeds flighting, net scoring, and payouts automatically.",
      ],
    },
    {
      heading: "Applying handicaps to scoring and payouts",
      paragraphs: [
        "Once handicaps are on the player records, net scoring should be a display toggle rather than a second spreadsheet: gross for the leaderboard, net computed for prize determination, and both visible to the organizer.",
        "Payouts follow the same data. A flight payout planner distributes your prize pool across flights and finishing positions, handles ties by splitting evenly, and gives you a printable sheet for the awards table.",
      ],
      mockup: "pricing",
    },
    {
      heading: "Avoiding the classic disputes",
      bullets: [
        "Publish the allowance formula and the maximum handicap on the event page before the round.",
        "Announce whether prizes are gross, net, or both, and whether a team can win in more than one category.",
        "Define the tiebreak in advance — a matching card on holes 10 through 18 is the usual convention.",
        "Keep sandbagging in check by capping team handicaps and by paying gross prizes in the top flight.",
        "Record the handicaps you used with the final results so the numbers can be audited afterwards.",
      ],
    },
  ],
  faqs: [
    {
      q: "Do charity golf tournaments need handicaps?",
      a: "Not necessarily. Flighting by ability with gross scoring achieves similar fairness with far less complexity, and it works when much of the field has no official index.",
    },
    {
      q: "What handicap allowance is used for a four-person scramble?",
      a: "A common convention is 25/20/15/10 percent of each player's course handicap from low to high, combined into one team handicap. Announce your method in advance.",
    },
    {
      q: "What if players do not know their handicap?",
      a: "Ask for their typical 18-hole score instead and apply a published default maximum for anyone who leaves it blank.",
    },
    {
      q: "Can TeeVents calculate net scores automatically?",
      a: "Yes. Handicaps captured at registration feed flighting, net scoring, and the flight payout planner.",
    },
  ],
  related: [
    { to: "/golf-tournament-formats", label: "Golf Tournament Formats Explained" },
    { to: "/golf-tournament-pairings-management", label: "Managing Golf Tournament Pairings" },
    { to: "/what-is-a-scramble", label: "What Is a Scramble in Golf?" },
    { to: "/golf-tournament-live-scoring", label: "Golf Tournament Live Scoring" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const sponsorPackages: GuideContent = {
  slug: "golf-tournament-sponsor-packages",
  title: "Golf Tournament Sponsor Packages That Actually Sell",
  metaTitle: "Golf Tournament Sponsor Packages: Tiers, Pricing, Templates",
  metaDescription:
    "Build golf tournament sponsor packages that sell: tier structure, realistic pricing, deliverables, the ask, and how to fulfill every promise automatically.",
  heroSubtitle:
    "Sponsorship is where a charity golf tournament makes its money. Here is how to structure, price, and deliver it.",
  intro:
    "Player fees usually cover the course. Sponsorships are the profit. Yet most tournaments sell sponsorships with a one-page PDF built from last year's file, price the tiers by instinct, and then scramble the week of the event to actually deliver what was promised. This guide gives you a tier structure that works, realistic price ranges, the deliverables sponsors genuinely value, and a fulfillment process that does not depend on someone's memory.",
  sections: [
    {
      heading: "The standard tier ladder",
      bullets: [
        "Title or presenting sponsor — one available, event named for them, logo everywhere, remarks at the awards, usually a foursome or two included.",
        "Gold or major sponsor — a small number available, prominent logo placement, foursome included, signage at a premium location.",
        "Beverage cart, lunch, or dinner sponsor — high visibility because every player interacts with it.",
        "Contest sponsor — closest to the pin, long drive, hole in one. Sponsor gets the hole and the announcement.",
        "Hole sponsor — eighteen available, sign at the tee, logo on the event page. The volume tier.",
        "In-kind sponsor — donates prizes, gift bag items, or auction lots in exchange for recognition.",
      ],
      paragraphs: [
        "Keep the ladder to five or six rungs. Too many tiers makes the decision hard and pushes buyers down, not up.",
      ],
    },
    {
      heading: "Pricing the tiers",
      paragraphs: [
        "Anchor on your local market and the size of your field. For a 144-player community event, common ranges are $5,000 to $15,000 for title, $2,500 to $5,000 for gold, $1,000 to $2,500 for cart or meal sponsorships, and $250 to $750 for a hole. A larger corporate or alumni event supports two to three times those numbers.",
        "Include a foursome in every tier above the hole level. It converts a donation into an outing for the sponsor's clients, which is the reason most companies say yes at all.",
      ],
      mockup: "pricing",
    },
    {
      heading: "Deliverables sponsors actually value",
      bullets: [
        "Face time with their target customers — the included foursome, plus the beverage cart or dinner remarks.",
        "Logo on the public event website, which lives online long after the round.",
        "Logo on the live leaderboard rotation and the clubhouse screen.",
        "A physical sign at their hole and on the cart signs.",
        "A mention in the confirmation and day-before emails that reach every registrant.",
        "A post-event thank-you with photos and the amount raised.",
      ],
      mockup: "sponsor",
    },
    {
      heading: "Making the ask",
      paragraphs: [
        "Start three to six months out. Sponsorship budgets are set early, and the best prospects are companies with an existing relationship to your cause, your board members' employers, and vendors who already sell to your organization.",
        "Lead with the audience, not the cause: field size, who those 144 people are professionally, and how many impressions the logo placements produce. Attach the tier sheet as a link to your event page rather than a PDF, so the sponsor sees the real site their logo will appear on.",
      ],
    },
    {
      heading: "Fulfilling every promise without a checklist marathon",
      paragraphs: [
        "The fulfillment failure mode is always the same: a sponsor pays in week two and the logo gets added in week nine, or not at all. Fix it structurally by selling sponsorships as inventory inside the platform rather than by email invoice.",
        "On TeeVents each tier has a set quantity, a price, a logo upload at checkout, and custom fields for the artwork contact. When payment clears, the logo can appear on the public page sponsor wall, in the leaderboard rotation and scrolling ticker, and on the printed cart sign for their assigned hole. Nobody has to remember.",
      ],
      mockup: "site",
    },
    {
      heading: "After the event: renewal starts immediately",
      bullets: [
        "Send a thank-you within one week with photos, the field size, and the amount raised for the mission.",
        "Include a screenshot of their logo on the site and their sign on course.",
        "Ask for next year's commitment while the goodwill is fresh — a right-of-first-refusal on the same tier converts well.",
        "Keep the sponsor list and contacts in one place so next year's ask is not rebuilt from scratch.",
      ],
    },
  ],
  faqs: [
    {
      q: "How much should a hole sponsorship cost?",
      a: "Commonly $250 to $750 for a community event of about 144 players, and more for corporate or alumni fields. Price it so eighteen holes together cover a meaningful share of your course cost.",
    },
    {
      q: "Should sponsorships include golfers?",
      a: "Yes, at every tier above hole sponsor. The included foursome is usually why a company approves the spend.",
    },
    {
      q: "When should I start selling sponsorships?",
      a: "Three to six months before the event, ahead of player registration, because corporate budgets are decided early.",
    },
    {
      q: "How do sponsor logos get onto signage and the leaderboard?",
      a: "Logos uploaded at checkout attach to the sponsor record and flow to the public page, the leaderboard rotation, and printed cart signs automatically.",
    },
  ],
  related: [
    { to: "/golf-tournament-sponsor-management", label: "Golf Tournament Sponsor Management" },
    { to: "/charity-golf-tournament-guide", label: "How to Run a Charity Golf Tournament" },
    { to: "/branded-golf-event-page", label: "Branded Golf Event Page" },
    { to: "/golf-tournament-registration-platform", label: "Golf Tournament Registration Platform" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const liveScoringGuide: GuideContent = {
  slug: "golf-tournament-live-scoring",
  title: "Golf Tournament Live Scoring: A Practical Setup Guide",
  metaTitle: "Golf Tournament Live Scoring: Setup, Codes, Leaderboards",
  metaDescription:
    "Set up live scoring for a golf tournament: group scoring codes, mobile entry, scramble team scores, leaderboard display, and what to do when service drops.",
  heroSubtitle:
    "Awards handed out fifteen minutes after the last putt, not an hour — here is the operational setup.",
  intro:
    "Live scoring is the difference between a tournament that ends crisply and one where 144 people stand around a clubhouse while three volunteers add paper scorecards. It is also the feature most likely to fail on the day, because golf courses have terrible cell service and half your field has never used your app. This guide covers the setup decisions that make live scoring work in practice: how codes are issued, who enters scores, what happens on a scramble, how the leaderboard should display, and how to run a fallback.",
  sections: [
    {
      heading: "How scoring access should work",
      paragraphs: [
        "Do not make players create accounts. The proven pattern is a short code tied to a group: the player opens a link, enters a six-character code, and lands on their group's score entry screen with their teammates listed. No password, no app store download, no forgotten login on the first tee.",
        "Codes should be generated only after pairings are assigned, because a code is a property of a group. Before pairings exist, the roster should honestly show 'Not assigned' rather than issuing codes that will change.",
      ],
      mockup: "scoring",
    },
    {
      heading: "One score per team in scramble formats",
      bullets: [
        "In a scramble the team records a single number per hole, so the whole group shares one code and one entry screen.",
        "Individual entry should be hidden for team formats — four people entering the same number creates conflicts, not redundancy.",
        "Best ball and stroke play need per-player entry, so the format setting must drive the entry screen.",
        "Confirm-and-advance: tapping confirm should save the hole and move to the next one, with no separate save step.",
      ],
    },
    {
      heading: "Designing for bad course reception",
      paragraphs: [
        "Assume one bar of service in the trees on the back nine. Score entry should queue offline and sync when signal returns, and the screen should stay logged in for the whole round rather than timing out between holes.",
        "Keep the entry screen light: the current hole, the team name, a number pad, and a confirm button. Anything heavier will not load on the course.",
      ],
    },
    {
      heading: "The leaderboard everyone will look at",
      bullets: [
        "Show registered team names, never 'Group 7'.",
        "Show thru-hole counts so spectators understand partial rounds.",
        "Support gross and net views if you are using handicaps, and flight views if you are flighting.",
        "Rotate sponsor logos and run a scrolling ticker for the clubhouse screen.",
        "Update in real time so players finishing 18 can watch the last groups come in.",
        "Give organizers inline editing to fix an obvious mis-entry without opening a spreadsheet.",
      ],
      mockup: "leaderboard",
    },
    {
      heading: "Getting players to actually use it",
      paragraphs: [
        "Put the scoring link and code in three places: the day-before reminder email, the printed cart sign or scorecard as a QR code, and a sign at the first tee or check-in table. Mention it in the pre-round announcement in one sentence: 'Scan the QR code on your cart sign, enter your code, tap your score after each hole.'",
        "Include the live leaderboard link too, as a button rather than a raw URL. Spouses and sponsors following from the clubhouse are a surprisingly large share of leaderboard traffic.",
      ],
    },
    {
      heading: "Your fallback plan",
      bullets: [
        "Print paper scorecards anyway — they cost nothing and cover the group whose phone dies.",
        "Give the organizer the ability to enter or correct any group's scores from the dashboard.",
        "Designate one volunteer at the turn to check for groups with no scores posted and nudge them.",
        "Keep a reset-and-restore option in case a test round leaves junk data on the leaderboard.",
        "Decide in advance that paper is the official record if there is a dispute.",
      ],
    },
    {
      heading: "After the last putt",
      paragraphs: [
        "Freeze the leaderboard, verify the top three in each flight against their cards, and run the payout sheet. With live scoring done properly, awards can begin within fifteen minutes of the final group finishing.",
        "Then share the final leaderboard link. It is one of the most-clicked links you will send all year, and it is a natural place to thank sponsors and preview next year's date.",
      ],
    },
  ],
  faqs: [
    {
      q: "Do players need to download an app for live scoring?",
      a: "No. Players open a link and enter a short group code — no account, no password, no app store.",
    },
    {
      q: "How does scoring work for a scramble?",
      a: "The group shares one code and submits one team score per hole. Individual entry is hidden for team formats.",
    },
    {
      q: "What if there is no cell service on the course?",
      a: "Entries queue on the device and sync when signal returns. Paper scorecards remain a sensible backup and the organizer can enter scores from the dashboard.",
    },
    {
      q: "Can we display the leaderboard in the clubhouse?",
      a: "Yes. The public leaderboard includes a sponsor rotation and a scrolling ticker designed for a large screen.",
    },
  ],
  related: [
    { to: "/live-scoring-golf-tournaments", label: "Live Scoring for Golf Tournaments" },
    { to: "/golf-tournament-pairings-management", label: "Managing Golf Tournament Pairings" },
    { to: "/golf-tournament-handicap-system", label: "Golf Tournament Handicap System" },
    { to: "/what-is-a-shotgun-start", label: "What Is a Shotgun Start?" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const websiteBuilderPage: GuideContent = {
  slug: "golf-tournament-website-builder",
  title: "Golf Tournament Website Builder",
  metaTitle: "Golf Tournament Website Builder: Launch in Minutes",
  metaDescription:
    "Build a golf tournament website with registration, sponsor wall, schedule, gallery, and live leaderboard — on your own custom domain, in under an hour.",
  heroSubtitle:
    "Your event deserves a real website, not a ticket listing with somebody else's logo on it.",
  intro:
    "Every link you share for your tournament — in a group text, a LinkedIn post, a sponsor proposal, a printed flyer's QR code — lands on one page. That page is your entire first impression, and for most organizers it is either a generic ticketing listing or a volunteer's weekend attempt in a website builder that knows nothing about golf. A purpose-built golf tournament website builder gives you both: a genuinely designed site, and one that is wired to your registration, sponsors, pairings, and leaderboard. This page explains what such a builder should include and how to launch one quickly.",
  sections: [
    {
      heading: "The problem with the two usual options",
      paragraphs: [
        "Option one is a ticketing page. It is fast, but the layout is fixed, the branding is the vendor's, and there is nowhere to put a sponsor wall, a course photo gallery, a schedule, or the story of your cause.",
        "Option two is a general website builder. You get design freedom and no golf: registration lives on a different platform, sponsor logos are pasted in by hand, and the leaderboard on event day is a link to somewhere else. Two systems, two sources of truth, and a volunteer maintaining both.",
      ],
    },
    {
      heading: "What a golf-specific builder gives you",
      bullets: [
        "Professional templates designed for tournaments, so you start from something good rather than a blank page.",
        "Sections you can reorder and toggle: hero, about the cause, schedule, register, sponsors, course details, gallery, FAQ, contact.",
        "Registration built into the page — not a link to a third-party checkout.",
        "A sponsor wall that fills itself as sponsorships are purchased.",
        "A live leaderboard tab that activates on event day.",
        "Custom tabs for anything unique to your event, such as a memorial page or a raffle preview.",
        "Your own custom domain, so the URL reads as your organization's.",
      ],
      mockup: "site",
    },
    {
      heading: "Launching in under an hour",
      bullets: [
        "Create the event with name, date, course, and format — the site scaffolds itself immediately.",
        "Pick a template and apply your colors and logo.",
        "Upload a hero image; a photo of the course at the right time of day does more than any graphic.",
        "Write three short paragraphs: what the event is, who it benefits, what a registration includes.",
        "Turn on the sections you need and hide the rest.",
        "Configure ticket types, add-ons, and sponsor tiers.",
        "Publish, then text yourself the link and check the preview card and the mobile layout.",
      ],
    },
    {
      heading: "Mobile is the real design target",
      paragraphs: [
        "The overwhelming majority of golf registration traffic is a phone opened from a text message. Design for that: a hero that reads at a glance, a register button visible without scrolling, short paragraphs, tap-sized buttons, and sponsor logos that stay legible at small sizes.",
        "Test the actual flow on your phone before you announce — hero, register, checkout, confirmation email. If any step feels awkward with one thumb, fix it before you share the link.",
      ],
    },
    {
      heading: "Content that converts a visitor into a registration",
      bullets: [
        "A specific headline: the event name, date, and course, not 'Annual Golf Outing'.",
        "What is included: green fees, cart, range, lunch, dinner, gift bag, two drink tickets.",
        "The format and start time in plain language.",
        "A clear price for individual and foursome, with any early-bird deadline stated.",
        "Proof: last year's photos, amount raised, and the sponsors who returned.",
        "One primary button repeated down the page, and a secondary sponsor inquiry path.",
      ],
    },
    {
      heading: "The site keeps working after registration closes",
      paragraphs: [
        "On event week the same site carries the schedule, the pairings, the scoring link, and the live leaderboard. Afterwards it becomes the recap page: final results, photo gallery, total raised, and thanks to sponsors — which is exactly the page you want to send when you ask those sponsors to renew.",
        "Because everything is generated from your event data, none of this requires a rebuild. You toggle sections as the event moves through its phases.",
      ],
      mockup: "leaderboard",
    },
  ],
  faqs: [
    {
      q: "Do I need technical skills to build a golf tournament website?",
      a: "No. You choose a template, upload a logo and photo, edit text, and toggle sections. Most organizers publish in under an hour.",
    },
    {
      q: "Can I use my own domain name?",
      a: "Yes. Custom domains are supported, so your event can live at your organization's own address rather than a shared subdomain.",
    },
    {
      q: "Is registration part of the website?",
      a: "Yes. Registration, add-ons, sponsorships, and donations all run on the same page, and the data feeds pairings, printables, and scoring.",
    },
    {
      q: "What does the website cost?",
      a: "The site is part of the platform. Base is $0 and Pro unlocks for a one-time $399 per tournament, with a 5 percent platform fee on paid transactions.",
    },
  ],
  related: [
    { to: "/golf-tournament-website-design", label: "Golf Tournament Website Design" },
    { to: "/branded-golf-event-page", label: "Branded Golf Event Page" },
    { to: "/golf-tournament-page-customization", label: "Golf Tournament Page Customization" },
    { to: "/custom-golf-tournament-website", label: "Custom Golf Tournament Websites" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const websiteDesign: GuideContent = {
  slug: "golf-tournament-website-design",
  title: "Golf Tournament Website Design That Fills the Field",
  metaTitle: "Golf Tournament Website Design: Layout & Conversion Tips",
  metaDescription:
    "Design a golf tournament website that converts: hero, structure, imagery, sponsor placement, mobile layout, and the copy that turns visitors into registrations.",
  heroSubtitle:
    "Design decisions, in the order a visitor experiences them, with the reasoning behind each one.",
  intro:
    "A tournament website has one job: turn a person who received a text message into a registered golfer or a sponsor inquiry. Everything else — the gallery, the history, the board member quotes — is supporting material. This guide walks the page from top to bottom, explains what each section has to accomplish, and points out the design decisions that quietly cost organizers registrations every year.",
  sections: [
    {
      heading: "The hero: five seconds to answer four questions",
      paragraphs: [
        "A visitor arrives wanting to know what the event is, when it is, where it is, and how much. Put all four above the fold with the register button, over a real photograph of the course rather than a stock image or an abstract gradient.",
        "Use the full event name as the headline. 'Bolton Invitational — Friday, May 15 at Pinehurst Meadows' outperforms 'Annual Charity Golf Classic' because it is specific enough to feel real.",
      ],
      mockup: "site",
    },
    {
      heading: "Section order that matches how people decide",
      bullets: [
        "Hero with date, course, price, and the register button.",
        "What's included — the single most-read block on any tournament site.",
        "The cause or the reason the event exists, in two short paragraphs.",
        "Schedule for the day, with arrival time made obvious.",
        "Sponsorship opportunities, with a clear path to inquire or buy.",
        "Sponsor wall of companies already committed — social proof for both players and prospective sponsors.",
        "Gallery from last year.",
        "FAQ covering rain policy, refunds, dress code, and what to bring.",
        "Contact and a final register button.",
      ],
    },
    {
      heading: "Typography, color, and imagery",
      paragraphs: [
        "Use your organization's colors, not the platform's defaults, and keep to two — one for the page and one for buttons. Golf photography carries a lot of green already, so a warm accent for calls to action reads better than another green.",
        "Photography beats illustration every time here. Course shots at golden hour, players laughing at the awards table, and a photo of last year's check presentation do more to sell a $150 registration than any amount of copy.",
      ],
    },
    {
      heading: "Designing for the thumb",
      bullets: [
        "Most traffic is a phone opened from a text message — design mobile first, then check desktop.",
        "Keep the register button visible or sticky as the visitor scrolls.",
        "Paragraphs of two to three sentences; long blocks are skipped on a phone.",
        "Buttons at least 44 pixels tall with generous spacing.",
        "Sponsor logos in a grid that stays legible at small sizes rather than a single crowded row.",
        "Compress hero images so the page loads on course-adjacent cell service.",
      ],
    },
    {
      heading: "Copy that sells a registration",
      paragraphs: [
        "Lead with the experience, not the logistics: a shotgun start, lunch at the turn, a gift bag, contests on four holes, and dinner with awards. Then state the price and what it covers. Vagueness about inclusions is the most common reason a visitor leaves to 'ask someone'.",
        "For sponsors, write about audience rather than charity: field size, who those people are professionally, how many touchpoints a logo receives across the site, leaderboard, signage, and emails.",
      ],
      mockup: "sponsor",
    },
    {
      heading: "The details that separate professional from homemade",
      bullets: [
        "A custom domain instead of a shared subdomain.",
        "A share preview card that shows your event's own title, description, and image when the link is texted.",
        "A favicon and page title that read as your event, not the platform's.",
        "Consistent capitalization and one voice throughout — assign one editor.",
        "A schedule formatted exactly as the day will run, including registration open, shotgun, lunch, and awards.",
        "Working links: register, sponsor, donate, directions, and contact, all tested on a phone.",
      ],
    },
  ],
  faqs: [
    {
      q: "What should be at the top of a golf tournament website?",
      a: "Event name, date, course, price, and the register button, over a real course photo. A visitor should be able to decide without scrolling.",
    },
    {
      q: "How long should the page be?",
      a: "One scrollable page with clear sections is ideal. Add separate tabs only for content that would bury the registration path, such as a full gallery or a raffle catalog.",
    },
    {
      q: "Where should sponsor logos go?",
      a: "A dedicated sponsor wall after the sponsorship section, plus the leaderboard rotation on event day. Keep the hero focused on the registration decision.",
    },
    {
      q: "Can I change the layout or only the colors?",
      a: "On TeeVents you can change the template, reorder and hide sections, add custom tabs, and apply your own imagery and colors, not just swap a palette.",
    },
  ],
  related: [
    { to: "/golf-tournament-website-builder", label: "Golf Tournament Website Builder" },
    { to: "/golf-tournament-page-customization", label: "Golf Tournament Page Customization" },
    { to: "/branded-golf-event-page", label: "Branded Golf Event Page" },
    { to: "/golf-tournament-sponsor-packages", label: "Golf Tournament Sponsor Packages" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const brandedEventPage: GuideContent = {
  slug: "branded-golf-event-page",
  title: "Branded Golf Event Pages: Why They Raise More",
  metaTitle: "Branded Golf Event Page: Custom Domain & Sponsor Value",
  metaDescription:
    "A branded golf event page raises sponsor value and registration conversion. What branding means in practice: domain, logo, colors, share previews, and emails.",
  heroSubtitle:
    "The difference between 'our tournament' and 'a listing on somebody else's site' is measured in dollars.",
  intro:
    "Branding is not decoration at a fundraising event — it is the product you sell to sponsors. A title sponsor paying five figures is buying association with something that looks legitimate and permanent. When your event lives on a generic listing page with another company's logo in the header and their name in the URL, you are quietly discounting every tier on your sponsorship sheet. This page explains what a genuinely branded golf event page consists of, and the specific places branding either holds up or falls apart.",
  sections: [
    {
      heading: "What 'branded' actually means",
      bullets: [
        "The URL: your own domain or subdomain, not a shared platform address with a random slug.",
        "The header: your logo and your colors, with no vendor branding competing for attention.",
        "The imagery: your course, your players, your check presentation.",
        "The voice: your organization's language for the cause and the ask.",
        "The share card: when someone texts the link, the preview shows your event's title, description, and image.",
        "The emails: confirmations and reminders that carry your name and logo, not a generic template.",
      ],
      mockup: "site",
    },
    {
      heading: "Why it changes what sponsors will pay",
      paragraphs: [
        "Sponsorship pricing is anchored on perceived reach and professionalism. When you send a tier sheet linking to a polished event site with a sponsor wall already showing returning companies, the ask lands differently than a PDF and a ticketing link. You are showing the placement rather than describing it.",
        "It also makes fulfillment visible. A sponsor who can open the page and see their logo, then see it again on the leaderboard on event day and on the cart sign at their hole, renews without being chased.",
      ],
      mockup: "sponsor",
    },
    {
      heading: "The custom domain question",
      paragraphs: [
        "A custom domain — for example golf.yourorganization.org or yourtournament.com — is the single highest-impact branding step. It makes the link safe to print on a flyer, credible in a corporate email, and durable across years.",
        "Setup is a DNS record pointed at the platform. On TeeVents this is a CNAME in most cases, with A records where the provider requires them, and a note worth remembering: default records left in place at some registrars will block the connection until removed.",
      ],
    },
    {
      heading: "Where branding usually breaks",
      bullets: [
        "The share preview: a link texted to 200 people shows a generic platform image instead of your event. This is server-side and has to be handled by the platform, not by a meta tag added after load.",
        "Confirmation emails: beautiful site, then a plain email from a no-reply address nobody recognizes.",
        "Printables: cart signs and scorecards that carry the platform's mark instead of your logo and your sponsors'.",
        "The leaderboard: a page that looks nothing like the event site players just registered on.",
        "Checkout: a redirect to a third-party page that breaks the visual thread at the exact moment of payment.",
      ],
    },
    {
      heading: "Brand consistency across the whole event",
      paragraphs: [
        "Make a short list before you launch and check each item: site, registration checkout, confirmation email, day-before reminder, scoring page, leaderboard, cart signs, scorecards, and the post-event recap. Your logo and colors should appear on all of them.",
        "On TeeVents these all draw from the same event record, so uploading your logo and setting your colors once carries through the public page, the emails, the printables, and the leaderboard.",
      ],
      mockup: "leaderboard",
    },
    {
      heading: "A ninety-minute branding pass",
      bullets: [
        "Upload a high-resolution logo with a transparent background.",
        "Set your primary and accent colors.",
        "Replace the default hero with a real course photograph.",
        "Rewrite the event description in your organization's voice.",
        "Connect your custom domain and verify the padlock.",
        "Text the link to yourself and confirm the preview card.",
        "Send yourself a test confirmation and a test day-before reminder.",
        "Print one cart sign and one scorecard and check the logo placement.",
      ],
    },
  ],
  faqs: [
    {
      q: "Does a branded event page really increase registrations?",
      a: "It removes friction and doubt. Visitors arriving from a text message decide in seconds, and a page that clearly belongs to a known organization converts better than a generic listing.",
    },
    {
      q: "Can I use my nonprofit's existing domain?",
      a: "Yes, typically as a subdomain such as golf.yourorganization.org, connected with a DNS record.",
    },
    {
      q: "Will my logo appear on printed materials too?",
      a: "Yes. Cart signs and scorecards pull your event branding along with sponsor logos.",
    },
    {
      q: "What about the preview image when the link is shared?",
      a: "Share previews are generated server-side per page, so a texted link shows that event's own title, description, and image.",
    },
  ],
  related: [
    { to: "/golf-tournament-website-builder", label: "Golf Tournament Website Builder" },
    { to: "/golf-tournament-website-design", label: "Golf Tournament Website Design" },
    { to: "/golf-tournament-page-customization", label: "Golf Tournament Page Customization" },
    { to: "/golf-tournament-sponsor-packages", label: "Golf Tournament Sponsor Packages" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};

export const pageCustomization: GuideContent = {
  slug: "golf-tournament-page-customization",
  title: "Golf Tournament Page Customization: What You Can Change",
  metaTitle: "Golf Tournament Page Customization Options Explained",
  metaDescription:
    "Every customization option for a golf tournament page: templates, section order, custom tabs, sponsor display toggles, colors, domains, and event-day views.",
  heroSubtitle:
    "A complete inventory of what you can change on your public event page — and when to change it.",
  intro:
    "Most tournament platforms answer 'can I customize it?' with a color picker. That is not customization; it is a theme. Real customization means changing what appears, in what order, under what labels, with your own content in between — and turning things off when they do not apply to your event. This page inventories the customization options available for a TeeVents public tournament page, grouped by what they affect, with guidance on which ones matter most for each type of event.",
  sections: [
    {
      heading: "Layer 1: templates",
      paragraphs: [
        "Start with one of six professional templates. They differ in structure, not just color: some lead with a full-bleed photo, others with a compact information card and immediate registration, others with a schedule-forward layout suited to multi-day events.",
        "Choosing the right starting structure saves more time than any individual setting. Pick the template whose default emphasis matches your event: photography-led for a scenic resort course, information-led for a corporate outing, cause-led for a charity fundraiser.",
      ],
      mockup: "site",
    },
    {
      heading: "Layer 2: sections and order",
      bullets: [
        "Show, hide, and reorder the hero, about, schedule, registration, sponsors, course details, gallery, FAQ, and contact sections.",
        "Toggle the sponsorship opportunities block so it disappears once packages sell out or if you sell sponsorships privately.",
        "Toggle the spots-filled counter — useful pressure when the field is filling, counterproductive when it is not.",
        "Add custom tabs with your own headings and rich text for anything the standard sections do not cover.",
        "Turn the leaderboard tab on for event week and leave it up afterwards as the results page.",
      ],
    },
    {
      heading: "Layer 3: content and media",
      bullets: [
        "Hero image, logo, and a photo gallery with captions.",
        "Rich-text event description with headings, lists, and links.",
        "Schedule entries formatted exactly as your day runs.",
        "Course details, address, and directions.",
        "Sponsor wall populated automatically from purchased sponsorships.",
        "FAQ entries covering rain policy, refunds, dress code, and arrival time.",
      ],
    },
    {
      heading: "Layer 4: brand and address",
      paragraphs: [
        "Apply your primary and accent colors, upload your logo, and connect a custom domain so the event lives at your own address. Branding carries beyond the page into confirmation emails, day-before reminders, the scoring page, the leaderboard, and printed cart signs and scorecards.",
        "Share previews are generated per page server-side, so texting the link shows your event's own title, description, and image rather than a generic platform card.",
      ],
    },
    {
      heading: "Layer 5: registration and commerce customization",
      bullets: [
        "Ticket types for individuals, foursomes, sponsors, dinner-only guests, and volunteers.",
        "Custom questions with text, dropdown (multiple options), checkbox, and date fields, each required or optional.",
        "Captain-versus-teammate field rules so team checkout stays short.",
        "Add-ons for mulligans, skins, raffle packs, merchandise, and donations, with standalone add-on pages you can post as a QR code.",
        "Fee handling: absorb the platform and processing fees or pass them to the registrant as visible line items.",
      ],
      mockup: "pricing",
    },
    {
      heading: "Layer 6: event-day views",
      paragraphs: [
        "The leaderboard has its own customization: team names rather than group numbers, gross and net views, flight filters, a rotating sponsor banner, a scrolling ticker for the clubhouse screen, and organizer inline editing.",
        "Printables customize too — cart signs at 8 by 36 inches with two player names per side, landscape 18-hole scorecards with a QR code to the scoring page, and inline content overrides so you can adjust wording without leaving the dashboard.",
      ],
      mockup: "leaderboard",
    },
    {
      heading: "What to customize first",
      bullets: [
        "Before announcing: template, logo, colors, hero image, description, ticket types, and custom domain.",
        "As sponsors commit: sponsor wall, sponsorship section toggle, leaderboard rotation.",
        "Two weeks out: schedule, FAQ, spots-filled toggle, day-before email content.",
        "Event week: leaderboard tab, scoring links on printables, sponsor ticker.",
        "After: results, gallery, total raised, and a thank-you block for sponsors.",
      ],
    },
  ],
  faqs: [
    {
      q: "Can I reorder sections on my tournament page?",
      a: "Yes. Sections can be shown, hidden, and reordered, and you can add custom tabs with your own rich-text content.",
    },
    {
      q: "Can I hide the sponsorship section?",
      a: "Yes, there is a toggle that controls whether sponsorship opportunities appear on the public page.",
    },
    {
      q: "Does customization carry into emails and printables?",
      a: "Yes. Your logo and colors flow into confirmation and reminder emails, the scoring page, the leaderboard, cart signs, and scorecards.",
    },
    {
      q: "Do I need Pro for customization?",
      a: "Core page customization is available on Base. Pro unlocks the broader feature set for a specific tournament for a one-time $399.",
    },
  ],
  related: [
    { to: "/golf-tournament-website-builder", label: "Golf Tournament Website Builder" },
    { to: "/branded-golf-event-page", label: "Branded Golf Event Page" },
    { to: "/golf-tournament-website-design", label: "Golf Tournament Website Design" },
    { to: "/custom-golf-tournament-website", label: "Custom Golf Tournament Websites" },
  ],
  ctaHeading: CTA_HEADING,
  ctaText: CTA_TEXT,
};
