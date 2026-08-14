import type { GuideContent } from "./types";

export const liveScoring: GuideContent = {
  slug: "live-scoring-golf-tournaments",
  title: "Live Scoring for Golf Tournaments",
  metaTitle: "Live Scoring for Golf Tournaments | QR Codes & Leaderboards",
  metaDescription:
    "How live scoring works at a golf tournament: scoring codes, QR codes, hole-by-hole entry, and real-time leaderboards players follow on their phones.",
  heroSubtitle:
    "Real-time leaderboards, QR-code score entry, and no app to download — for scrambles, best ball, stroke play, and league events.",
  intro:
    "Live scoring changed what a golf tournament feels like. Instead of a volunteer collecting paper scorecards at the turn and a spreadsheet being tallied while everyone waits for lunch, scores post as they happen and every player, spectator, and sponsor can watch the board move. This page explains how live scoring actually works, what to prepare before event day, and how TeeVents runs it without requiring anyone to install an app.",
  sections: [
    {
      heading: "How live scoring works",
      paragraphs: [
        "Each group receives a short scoring code. One player opens the scoring link, enters the code, and is taken straight to their group's scorecard. They enter the score for each hole as they finish it, confirm, and the app advances to the next hole automatically. The leaderboard updates in real time for everyone watching.",
        "For team formats such as a scramble, the whole group shares a single code and records one score per hole — there is no confusing individual entry to sort out later. For individual stroke play, each player gets their own code and enters their own scores.",
      ],
    },
    {
      heading: "Scoring codes and QR codes",
      mockup: "scoring",
      bullets: [
        "Codes are generated after pairings are assigned, so every code maps to a real group and starting hole.",
        "Groups of three still get a code — a full foursome is not required.",
        "Codes are printed on cart signs and scorecards, and included in the confirmation and day-before reminder emails.",
        "A QR code on the printed scorecard takes a player directly to the score entry screen.",
        "Login persists on the device, so a player does not have to re-enter the code after the turn.",
      ],
    },
    {
      heading: "What players see",
      paragraphs: [
        "The score entry screen shows the group's members, the starting hole, and the current hole. Entering a score confirms it and moves to the next hole with no separate save step, which matters when someone is standing on a tee box in the sun with one hand on a cart. An All Holes view lets a group review and correct anything before they finish.",
        "A View Leaderboard link opens the live board in a new tab so a group can check where they stand without losing their place in score entry.",
      ],
    },
    {
      heading: "What the leaderboard shows",
      mockup: "leaderboard",
      bullets: [
        "Team or player names as registered — not Group 1, Group 2.",
        "Score to par, thru holes, and position, updating live.",
        "Gross and net views where handicaps are collected.",
        "Flight and division filters for events with multiple divisions.",
        "A rotating sponsor banner and a scrolling sponsor ticker.",
        "Hole-by-hole detail for organizers who need to verify a card.",
      ],
    },
    {
      heading: "Organizer controls",
      paragraphs: [
        "Organizers can edit any score from the dashboard, view an edit history, recompute standings, reset a leaderboard if a practice round polluted the data, and lock scoring before the awards ceremony so nothing changes after winners are announced.",
        "Because scoring, pairings, and the roster all share the same data, the leaderboard only ever shows players who are actually in your Players and Pairings section. Deleted or duplicate entries do not linger on the board.",
      ],
    },
    {
      heading: "Why it beats paper",
      bullets: [
        "Awards start on time because scoring is already finished when the last group walks off 18.",
        "Fewer disputes — there is a timestamped record of every entry and edit.",
        "Sponsors get all-day digital impressions on a screen players keep refreshing.",
        "Family, colleagues, and donors follow along remotely from the shared link.",
        "Results are archived automatically for your post-event report and next year's marketing.",
      ],
    },
    {
      heading: "Preparing for event day",
      bullets: [
        "Finalize pairings, then generate scoring codes so each code matches a real group.",
        "Print scorecards and cart signs with codes and QR codes already on them.",
        "Include the scoring link and leaderboard button in the day-before reminder email.",
        "Brief one scorekeeper per group at check-in.",
        "Display the leaderboard on a clubhouse screen during lunch and the reception.",
        "Verify scores and lock the board before announcing winners.",
      ],
    },
    {
      heading: "Live scoring for leagues",
      paragraphs: [
        "League play adds a season layer on top of event scoring. TeeVents supports nine-hole and eighteen-hole league events, two-person scramble and team formats, weekly leaderboards, season standings with configurable points, wins tracking, prize money and skins, and a leaderboard link league managers can email to members with the event and league details attached.",
        "League members sign in with an email and a short member code rather than a password, which removes the single biggest source of support requests in recreational leagues.",
      ],
    },
  ],
  faqs: [
    {
      q: "Do golfers need to download an app for live scoring?",
      a: "No. Score entry and the leaderboard both run in any mobile web browser. Players use a link or scan a QR code.",
    },
    {
      q: "How do scoring codes work in a scramble?",
      a: "The entire group shares one code and records a single team score per hole, which is exactly how a scramble is played.",
    },
    {
      q: "Can I fix a wrong score?",
      a: "Yes. Organizers can edit scores from the dashboard, and every change is recorded in an edit history.",
    },
    {
      q: "Can spectators watch the leaderboard from home?",
      a: "Yes. Share the public leaderboard link and anyone can follow along in real time.",
    },
  ],
  related: [
    { to: "/what-is-a-scramble", label: "What is a scramble in golf?" },
    { to: "/golf-tournament-formats", label: "Golf tournament format types explained" },
    { to: "/what-is-a-shotgun-start", label: "What is a shotgun start?" },
    { to: "/custom-golf-tournament-website", label: "Custom golf tournament website builder" },
  ],
  ctaHeading: "Put a live leaderboard on every phone",
  ctaText: "QR-code scoring, real-time results, and sponsor visibility all day long.",
};

export const eventbrite: GuideContent = {
  slug: "eventbrite-vs-golf-tournament-software",
  title: "Eventbrite vs Golf Tournament Software",
  metaTitle: "Eventbrite vs Golf Tournament Software: Which Is Better?",
  metaDescription:
    "Eventbrite sells tickets. Golf tournament software runs the event. Compare registration, pairings, scoring, sponsors, and fees before you choose.",
  heroSubtitle:
    "Eventbrite is excellent at selling tickets. A golf tournament needs pairings, scoring, sponsors, and cart signs too.",
  intro:
    "Plenty of organizers start on Eventbrite because they already know it. It is a capable ticketing platform, and for a gala or a 5K it may be all you need. A golf tournament is a different animal: you are not just selling admission, you are assembling teams, assigning starting holes, collecting handicaps and shirt sizes, selling sponsorships with inventory limits, printing cart signs, and scoring 18 holes across 36 groups. This page compares what each tool actually does so you can pick deliberately rather than by default.",
  sections: [
    {
      heading: "What Eventbrite does well",
      bullets: [
        "Fast ticket setup for a general-admission event.",
        "A discovery marketplace that can surface public events.",
        "Familiar checkout that attendees recognize.",
        "Solid basic reporting on ticket sales.",
      ],
      paragraphs: [
        "If your event is one price, one ticket type, and no operational complexity, general-purpose ticketing is fine. The trouble starts the moment golf-specific requirements appear.",
      ],
    },
    {
      heading: "Where general ticketing breaks down for golf",
      bullets: [
        "No team or foursome structure — you get four unrelated tickets and rebuild teams in a spreadsheet.",
        "No pairings, tee times, or starting-hole assignment.",
        "No scoring, no leaderboard, no scoring codes.",
        "No sponsorship packages with exclusive inventory, logo collection, or fulfillment tracking.",
        "No cart signs, scorecards, or pairing sheets.",
        "No golf-specific fields like handicap index, shirt size, or division without hacking custom questions.",
        "Branding limited to a logo and a header image on someone else's page.",
      ],
    },
    {
      heading: "The hidden cost: volunteer hours",
      paragraphs: [
        "The real expense of using a ticketing tool for a golf tournament is not the fee, it is the manual work. Organizers routinely spend 20 to 40 hours rebuilding rosters, chasing team assignments, formatting cart signs in a word processor, and tallying paper scorecards. That work happens in the two weeks before the event when you have the least time and the most at stake.",
        "Purpose-built software collapses those hours because registration, pairings, printing, scoring, and email all read from the same data.",
      ],
    },
    {
      heading: "Feature comparison",
      mockup: "site",
      bullets: [
        "Team and foursome registration: TeeVents yes, with captain-only required fields. Eventbrite no.",
        "Pairings, tee times, shotgun assignments: TeeVents yes. Eventbrite no.",
        "Live scoring and leaderboard: TeeVents yes, QR-code based. Eventbrite no.",
        "Sponsorship packages with inventory and logo collection: TeeVents yes. Eventbrite workaround only.",
        "Printables — cart signs, scorecards, pairing sheets: TeeVents yes. Eventbrite no.",
        "Fully branded event site with custom domain: TeeVents yes. Eventbrite limited.",
        "Automated confirmation and day-before reminder emails with tee times: TeeVents yes. Eventbrite basic.",
        "501(c)(3) receipting and donation tools: TeeVents yes. Eventbrite limited.",
      ],
    },
    {
      heading: "Customization is the differentiator",
      paragraphs: [
        "On a general ticketing platform your event lives inside their brand. On TeeVents the site is yours: colors, fonts, layout theme, hero imagery, section order, custom pages, and your own domain. Sponsors see their logos on your site, on the leaderboard, on printed materials, and in your emails — not next to a marketplace ad for someone else's event.",
        "That matters commercially. Sponsorship is the largest revenue line at most charity tournaments, and sponsors renew based on how visible and professional the presentation was.",
      ],
    },
    {
      heading: "Fees and how money moves",
      mockup: "pricing",
      paragraphs: [
        "TeeVents charges a 5 percent platform fee on paid transactions plus standard card processing, and you can choose to pass those fees to registrants at checkout so your net is unaffected. There is no required monthly subscription — the Base plan is $0, and any single tournament can be upgraded to Pro for a one-time $399 unlock when you want the advanced feature set.",
        "Funds settle directly to your own connected Stripe account as the merchant of record, so you are not waiting on a platform payout cycle to access your event revenue.",
      ],
    },
    {
      heading: "When Eventbrite is still the right call",
      paragraphs: [
        "If you are running a small nine-hole social outing with 24 players, no sponsors, no scoring, and no printed materials, a ticketing link is genuinely simpler. The switch pays off the moment you add teams, sponsorship tiers, or a leaderboard — which for most charity and corporate events is immediately.",
      ],
    },
  ],
  faqs: [
    {
      q: "Can I run a golf tournament on Eventbrite?",
      a: "You can sell tickets on it, but you will still need separate tools or spreadsheets for teams, pairings, scoring, sponsors, and printed materials.",
    },
    {
      q: "What does TeeVents cost compared to Eventbrite?",
      a: "TeeVents charges a 5 percent platform fee plus card processing, with no required subscription. Fees can be passed to registrants at checkout.",
    },
    {
      q: "Can I move an event that already started selling on Eventbrite?",
      a: "Yes. Import your existing registrations into the roster as manual entries, then open TeeVents registration for the remaining spots.",
    },
    {
      q: "Does TeeVents handle sponsorships?",
      a: "Yes — tiered packages with inventory limits, online payment, logo collection, and placement on the site, leaderboard, printables, and emails.",
    },
  ],
  related: [
    { to: "/golfstatus-vs-golf-genius", label: "GolfStatus vs Golf Genius" },
    { to: "/golf-tournament-software-pricing", label: "Golf tournament software pricing" },
    { to: "/custom-golf-tournament-website", label: "Custom golf tournament website builder" },
    { to: "/charity-golf-tournament-guide", label: "How to run a charity golf tournament" },
  ],
  ctaHeading: "Built for golf, not for tickets",
  ctaText: "Teams, pairings, scoring, sponsors, and printables in one platform.",
};

export const competitors: GuideContent = {
  slug: "golfstatus-vs-golf-genius",
  title: "GolfStatus vs Golf Genius",
  metaTitle: "GolfStatus vs Golf Genius: Comparison & Simpler Alternative",
  metaDescription:
    "Compare GolfStatus and Golf Genius for charity and corporate golf tournaments, and see how TeeVents offers a simpler, more customizable alternative.",
  heroSubtitle:
    "Two well-known platforms, two very different audiences — and where a simpler, fully customizable alternative fits.",
  intro:
    "If you are shopping for golf tournament software, GolfStatus and Golf Genius are two names that come up in almost every search. They are both established products, but they were designed for different buyers, and the differences matter a lot depending on whether you run one charity tournament a year or a full club competition calendar. This comparison explains the positioning of each, the trade-offs organizers report, and what TeeVents does differently.",
  sections: [
    {
      heading: "Golf Genius: built for competition administration",
      paragraphs: [
        "Golf Genius grew out of tournament administration for clubs, associations, and professional operations. Its strength is depth of competition management: extensive format support, handicap integration, multi-round championships, team and league play, and the sort of rules-level configurability a golf professional or association administrator needs.",
        "The trade-off is complexity and orientation. It is a tool designed to be operated by golf staff, and the interface reflects that. Charity organizers who run one event a year often report a steep learning curve and features they never touch, plus a subscription structure that assumes ongoing seasonal use.",
      ],
    },
    {
      heading: "GolfStatus: built for nonprofit fundraising",
      paragraphs: [
        "GolfStatus is aimed squarely at the charity and nonprofit market, with event websites, online registration, sponsorship, and fundraising features, and a well-known program that provides no-cost access to qualifying 501(c)(3) organizations.",
        "The trade-offs organizers most often mention are around control: templated event pages with limited design flexibility, less depth on competition formats than Golf Genius, and processing fees or program requirements attached to the nonprofit offering. If your brand standards matter or your event needs to look distinctly yours, template limits can be frustrating.",
      ],
    },
    {
      heading: "Head-to-head at a glance",
      bullets: [
        "Competition depth: Golf Genius is strongest; GolfStatus covers common charity formats.",
        "Fundraising tools: GolfStatus is stronger; Golf Genius is competition-first.",
        "Design control: both are template-driven with limited customization.",
        "Learning curve: Golf Genius is the steeper of the two.",
        "Pricing model: Golf Genius is subscription-based; GolfStatus is transaction and program based.",
        "Best fit: Golf Genius for clubs and associations, GolfStatus for nonprofit fundraisers.",
      ],
    },
    {
      heading: "Where TeeVents fits",
      mockup: "site",
      paragraphs: [
        "TeeVents was built for the organizer who wants the fundraising and event tooling of a charity platform, the scoring capability needed for real competition, and design control that neither template-driven platform offers.",
        "You get a fully branded event site — colors, fonts, layout theme, section order, custom pages, and your own domain — plus registration, sponsorship packages with inventory, add-on sales, auctions and raffles, donations, printables, live QR-code scoring, and league mode with season standings. Everything reads from the same data, so pairings, cart signs, emails, and the leaderboard never fall out of sync.",
      ],
    },
    {
      heading: "Simplicity as a design goal",
      bullets: [
        "Create a tournament and publish a branded site in under an hour.",
        "A 30-step planning checklist guides first-time organizers through the whole event.",
        "Pairings, printables, scoring codes, and emails generate from data you already entered.",
        "Score entry is one tap per hole with automatic advance — no training required for players.",
        "Sample mode lets you explore a complete, realistic organizer dashboard before committing.",
      ],
    },
    {
      heading: "Pricing philosophy",
      mockup: "pricing",
      paragraphs: [
        "There is no required subscription. The Base plan is $0, a single tournament can be unlocked to Pro for a one-time $399 when you want the advanced feature set, and Enterprise pricing exists for large operators. A 5 percent platform fee applies to paid transactions plus standard card processing, and you can pass those fees to registrants so your net stays whole.",
        "Funds settle directly into your own connected Stripe account, so you are the merchant of record and you are not waiting on someone else's payout schedule.",
      ],
    },
    {
      heading: "How to choose",
      bullets: [
        "Run a club competition calendar with association handicapping: evaluate Golf Genius first.",
        "Run a nonprofit fundraiser and want a well-known charity program: evaluate GolfStatus.",
        "Want a distinctly branded site, straightforward pricing, live scoring, and fundraising tools together: evaluate TeeVents.",
        "Whatever you choose, test the mobile registration flow and the score entry screen yourself before you commit — those two screens are where your players form their opinion.",
      ],
    },
  ],
  faqs: [
    {
      q: "Is Golf Genius better than GolfStatus?",
      a: "They serve different buyers. Golf Genius is deeper for competition administration at clubs and associations; GolfStatus is oriented toward nonprofit fundraising events.",
    },
    {
      q: "What is a simpler alternative to both?",
      a: "TeeVents combines charity fundraising tools with real competition scoring and full design control, with no required subscription.",
    },
    {
      q: "Can I customize my event page more than a template allows?",
      a: "On TeeVents, yes — colors, typography, layout theme, section order, custom pages, and your own domain.",
    },
    {
      q: "How do payouts work on TeeVents?",
      a: "Payments settle directly to your connected Stripe account as merchant of record, with a 5 percent platform fee on paid transactions.",
    },
  ],
  related: [
    { to: "/eventbrite-vs-golf-tournament-software", label: "Eventbrite vs golf tournament software" },
    { to: "/golf-tournament-software-pricing", label: "Golf tournament software pricing" },
    { to: "/custom-golf-tournament-website", label: "Custom golf tournament website builder" },
    { to: "/live-scoring-golf-tournaments", label: "Live scoring for golf tournaments" },
  ],
  ctaHeading: "See the difference yourself",
  ctaText: "Explore a full organizer dashboard, then launch your own event when you are ready.",
};

export const shotgun: GuideContent = {
  slug: "what-is-a-shotgun-start",
  title: "What Is a Shotgun Start?",
  metaTitle: "What Is a Shotgun Start in Golf? How It Works & When to Use It",
  metaDescription:
    "A shotgun start sends every group off at once from a different hole. Learn how shotgun starts work, how to assign holes, and when to use tee times instead.",
  heroSubtitle:
    "Every group tees off at the same moment from a different hole — the format that makes a full-field charity outing run on schedule.",
  intro:
    "If you have ever heard an organizer say the horn blows at 9:00 sharp, you have been to a shotgun start. It is the scheduling backbone of tournament golf: instead of sending groups off the first tee every ten minutes over three hours, every group starts simultaneously from a different hole. Everyone begins together and, crucially, everyone finishes together. This page explains how shotgun starts work, how to assign holes, the A/B variation, when tee times are the better choice, and how to set either one up in TeeVents.",
  sections: [
    {
      heading: "How a shotgun start works",
      paragraphs: [
        "Each group is assigned a starting hole. Groups drive to their assigned tee before the start time, wait for the signal — historically an actual shotgun blast, today usually an air horn or a radio call — and everyone tees off at once. A group starting on hole 7 plays 7 through 18, then 1 through 6, and finishes back where it started.",
        "Because all 18 holes are occupied from the first minute, an 18-group field completes a round in roughly the time it takes one group to play 18 holes, typically four to four and a half hours.",
      ],
    },
    {
      heading: "Why organizers use it",
      bullets: [
        "Everyone finishes at the same time, so lunch, the awards ceremony, and the raffle can be scheduled precisely.",
        "Sponsors get a captive audience at a single reception rather than a trickle of finishers.",
        "Players get a predictable schedule they can plan a workday around.",
        "The course is cleared in one block, which is why clubs prefer it for outings.",
        "The mass start creates energy — 144 people teeing off simultaneously feels like an event.",
      ],
    },
    {
      heading: "Field size and the A/B split",
      paragraphs: [
        "A standard shotgun accommodates one group per hole — 18 groups, or 72 players in foursomes. For larger fields, organizers use an A/B shotgun: two groups are assigned to each hole, with the A group starting at the tee and the B group starting at the fairway landing area or a second tee marker. That doubles capacity to 36 groups and 144 players.",
        "Par 5s and long par 4s absorb A/B splits best. Short par 3s usually stay single-group. Your course professional will tell you which holes can take two groups.",
      ],
    },
    {
      heading: "Assigning starting holes",
      bullets: [
        "Put your title sponsor and VIP groups on hole 1 or on a hole near the clubhouse.",
        "Place contest holes — longest drive, closest to the pin — where a volunteer can be stationed.",
        "Keep beverage cart routing in mind so the back nine is not underserved early.",
        "Print the starting hole on cart signs and include it in the day-before reminder email.",
        "Confirm hole assignments with the course the day before so beverage carts and marshals are positioned correctly.",
      ],
    },
    {
      heading: "Shotgun start vs tee times",
      paragraphs: [
        "Tee times send groups off one at a time, usually from hole 1 or split between holes 1 and 10, at fixed intervals of eight to ten minutes. They are the better choice when your field is small, when the course cannot close for a full shotgun, or when players prefer flexible arrival times.",
        "The trade-off is the schedule: with a split tee and ten-minute intervals, the last group may finish two hours after the first, which makes a single awards reception hard to run. If your event depends on a program, a meal, or a sponsor presentation, choose a shotgun.",
      ],
    },
    {
      heading: "Setting up either format in TeeVents",
      mockup: "scoring",
      paragraphs: [
        "In the Players and Pairings section you select the start format for each round: shotgun or tee time. For shotgun events you assign a starting hole to each group and can send everyone off hole 1 or hole 10, or use a custom arrangement. For tee time events you set the interval in minutes and the platform builds the schedule.",
        "The system allows the same tee time on different starting holes — an 8:00 group on hole 1 and an 8:00 group on hole 10 is a normal split-tee setup, not an error. Conflict validation still warns you if the same tee time and same starting hole are assigned twice. Multi-day and multi-round events can use a different start format per round.",
        "Once pairings are set, everything downstream generates automatically: cart signs with the starting hole, printed scorecards with scoring codes and a scan-to-score QR code, pairing sheets, and confirmation and reminder emails that include each player's own starting hole and tee time. You can also lock and publish pairings so nothing is edited by accident after you finalize them.",
      ],
    },
    {
      heading: "Shotgun start day-of timeline",
      bullets: [
        "Two hours before: registration and range open, cart signs placed, pairing sheets posted.",
        "45 minutes before: carts staged with signs, coolers loaded, contest holes staffed.",
        "20 minutes before: announcement asking groups to drive to their assigned holes.",
        "10 minutes before: rules and format briefing over the PA.",
        "Start time: horn sounds, all groups tee off.",
        "Four to four and a half hours later: groups return, scores verified, awards begin.",
      ],
    },
  ],
  faqs: [
    {
      q: "How many players can a shotgun start hold?",
      a: "A single shotgun holds 18 groups, or 72 players in foursomes. An A/B shotgun doubles that to 36 groups and 144 players.",
    },
    {
      q: "What does A/B mean on a shotgun start?",
      a: "Two groups share a hole. The A group starts at the tee and the B group starts farther up the hole, usually at the landing area or a second tee.",
    },
    {
      q: "Is a shotgun start better than tee times?",
      a: "For events with a meal, awards program, or sponsor presentation, yes — everyone finishes together. Tee times are better for small fields or when the course cannot close.",
    },
    {
      q: "Does TeeVents support both shotgun and tee time starts?",
      a: "Yes. Choose the start format per round, assign starting holes, set tee time intervals, and use the same tee time across different starting holes for split-tee setups.",
    },
  ],
  related: [
    { to: "/what-is-a-scramble", label: "What is a scramble in golf?" },
    { to: "/golf-tournament-formats", label: "Golf tournament format types explained" },
    { to: "/charity-golf-tournament-guide", label: "How to run a charity golf tournament" },
    { to: "/live-scoring-golf-tournaments", label: "Live scoring for golf tournaments" },
  ],
  ctaHeading: "Set your shotgun in minutes",
  ctaText: "Assign holes, print cart signs, and email every player their starting hole automatically.",
};

export const pricing: GuideContent = {
  slug: "golf-tournament-software-pricing",
  title: "Golf Tournament Software Pricing",
  metaTitle: "Golf Tournament Software Pricing: What It Really Costs",
  metaDescription:
    "Compare golf tournament software pricing models — subscriptions, per-player fees, and transaction fees — and see how the TeeVents 5% platform fee works.",
  heroSubtitle:
    "Subscriptions, per-player fees, and transaction fees compared — plus exactly how TeeVents charges.",
  intro:
    "Golf tournament software is priced in three fundamentally different ways, and the cheapest headline number is often the most expensive outcome. Before you sign anything, you need to know what you pay if the event sells out, what you pay if it does not, who holds the money, and how fast you get it. This page breaks down the pricing models in the market and explains the TeeVents model in full.",
  sections: [
    {
      heading: "The three pricing models",
      bullets: [
        "Annual or seasonal subscription: a fixed fee whether you run one event or twenty. Predictable, but you pay before you have raised a dollar, and a single-event organizer usually overpays.",
        "Per-player or per-event license: scales with size, but punishes growth and forces you to guess your field size in advance.",
        "Transaction fee: a percentage of money actually collected. Zero cost if nothing sells, and the cost scales with success — which also means it must be reasonable at scale.",
      ],
      paragraphs: [
        "There is also a fourth, hidden model: free software funded by mandatory processing markups. Read the processing rate carefully, because a 'free' platform charging well above standard card rates can cost more than a transparent percentage.",
      ],
    },
    {
      heading: "How TeeVents pricing works",
      mockup: "pricing",
      bullets: [
        "Base plan: $0. Create your tournament, build a branded event site, open registration, and manage your roster.",
        "Pro: a one-time $399 unlock for a single tournament, adding the advanced feature set. It is per tournament, not a recurring organization-wide subscription.",
        "Enterprise: custom pricing for large operators and multi-event programs.",
        "Platform fee: 5 percent on paid transactions — registrations, sponsorships, add-ons, auctions, raffles, store purchases, and donations.",
        "Card processing: standard Stripe rates, charged by Stripe.",
      ],
    },
    {
      heading: "You can pass the fees to registrants",
      paragraphs: [
        "Organizers can choose to add the platform fee and processing fee to the buyer's total at checkout, shown as a transparent line item. When you do, your net per registration is the price you set, and the fee is carried by the person registering — which is standard practice in event ticketing and rarely affects conversion at golf price points.",
        "If you prefer to absorb the fees instead, that is a toggle, and the finance dashboard shows gross collected, fees, and net for every transaction either way.",
      ],
    },
    {
      heading: "Who holds your money",
      paragraphs: [
        "This is the question most organizers forget to ask. On TeeVents, payments settle directly into your own connected Stripe account and you are the merchant of record. TeeVents never takes custody of organizer funds — only the 5 percent platform fee is collected from each transaction.",
        "Practically, that means you access your revenue on Stripe's normal payout schedule rather than waiting for a platform to reconcile and cut a check after the event. Payout options include automatic Stripe deposits, bi-weekly PayPal, or a check on request.",
      ],
    },
    {
      heading: "A realistic cost example",
      paragraphs: [
        "Take a 144-player charity scramble at $200 per player with $30,000 in sponsorships. Registration revenue is $28,800, sponsorships $30,000, and add-ons and raffle another $6,000 — roughly $64,800 collected. The 5 percent platform fee is about $3,240, plus standard card processing on the portion paid by card.",
        "If you pass fees to buyers, your net is essentially the full $64,800. Compare that to a seasonal subscription you pay whether or not the event sells, plus the 20 to 40 volunteer hours a spreadsheet workflow consumes, and the transaction model is usually the better economics for an annual event.",
      ],
    },
    {
      heading: "What is included at no extra charge",
      bullets: [
        "Branded event website with layout themes, custom colors, and custom slug.",
        "Online registration with custom questions and team or captain flows.",
        "Automated confirmation emails with schedule, tee time, and starting hole.",
        "Roster, pairings, and tee sheet management.",
        "Sponsor packages, donations, and finance reporting.",
        "Planning checklist and organizer support.",
      ],
    },
    {
      heading: "Questions to ask any vendor",
      bullets: [
        "What is the total cost if I collect $60,000 — subscription, platform fee, and processing combined?",
        "Can I pass fees to registrants?",
        "Who is the merchant of record, and when do I receive funds?",
        "Is live scoring included or an upgrade?",
        "How much can I customize the public event page?",
        "What happens to my data and my event site after the tournament?",
      ],
    },
  ],
  faqs: [
    {
      q: "How much does TeeVents cost?",
      a: "The Base plan is $0. A single tournament can be upgraded to Pro for a one-time $399. A 5 percent platform fee applies to paid transactions, plus standard card processing.",
    },
    {
      q: "Is there a monthly subscription?",
      a: "No. There is no required recurring subscription; Pro is a one-time per-tournament unlock.",
    },
    {
      q: "Can I pass the fees to players?",
      a: "Yes. Platform and processing fees can be added to the buyer's total at checkout as a transparent line item so your net is unaffected.",
    },
    {
      q: "When do I get my money?",
      a: "Funds settle directly to your connected Stripe account on Stripe's normal payout schedule. PayPal and check payouts are also available.",
    },
  ],
  related: [
    { to: "/eventbrite-vs-golf-tournament-software", label: "Eventbrite vs golf tournament software" },
    { to: "/golfstatus-vs-golf-genius", label: "GolfStatus vs Golf Genius" },
    { to: "/charity-golf-tournament-guide", label: "How to run a charity golf tournament" },
    { to: "/golf-tournament-sponsor-management", label: "Golf tournament sponsor management" },
  ],
  ctaHeading: "Start free, pay only when you collect",
  ctaText: "No subscription required. Launch your event site today and keep your fees transparent.",
};
