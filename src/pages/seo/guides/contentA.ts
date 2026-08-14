import type { GuideContent } from "./types";

export const scramble: GuideContent = {
  slug: "what-is-a-scramble",
  title: "What Is a Scramble in Golf?",
  metaTitle: "What Is a Scramble in Golf? Format Rules Explained",
  metaDescription:
    "A scramble is the most popular golf tournament format. Learn how a scramble works, the rules, team sizes, handicaps, and how to run one online with TeeVents.",
  heroSubtitle:
    "The friendliest, fastest, and most fundraising-friendly format in golf — explained in plain English for tournament organizers.",
  intro:
    "If you have ever played in a charity golf outing, a corporate client day, or a member-guest event, chances are you played a scramble. It is far and away the most common format used in tournament golf in the United States, and for good reason: it is fast, it is social, it hides weak shots, and it keeps every player in the event from the first tee to the last putt. This guide explains exactly what a scramble is, how the rules work, the variations organizers use most often, and how to set one up online in a few minutes.",
  sections: [
    {
      heading: "The scramble format in one sentence",
      paragraphs: [
        "In a scramble, every player on a team hits a tee shot, the team picks the single best result, and then all players play their next shot from that spot — repeating until the ball is holed. The team records one score per hole instead of four individual scores.",
        "Because the team always plays from its best available position, scores are low, pace of play is quick, and a beginner never has to worry about holding up the group or embarrassing themselves. A player who tops a drive simply picks up the ball and plays from the team's chosen spot. That single rule is why the scramble has become the default format for charity and corporate golf tournaments: you can put a scratch golfer, a weekend hacker, and someone who has never held a club in the same cart and everyone still has a good time.",
      ],
    },
    {
      heading: "Step-by-step: how a hole is played",
      bullets: [
        "All four players tee off on the hole.",
        "The team walks or drives to each ball, evaluates the lies, and chooses the one best position.",
        "The other players pick up their balls and place them within one club length of the selected spot, no closer to the hole (on the green, the ball is usually placed within a putter head or scorecard length).",
        "Every player hits again from that spot. The team again picks the best result.",
        "The process repeats until a player holes out. The team writes down that one number as the team score for the hole.",
        "Move to the next tee. Most events also require a minimum number of drives from each player — more on that below.",
      ],
    },
    {
      heading: "Team sizes: four-man, three-man, and two-person scrambles",
      paragraphs: [
        "The classic tournament setup is the four-man (or four-person) scramble, which fills a full group and is the easiest to sell as a sponsorship package: a company buys a foursome for its executives or clients. With 18 holes and roughly 36 groups you can host 144 players comfortably in a single shotgun start morning.",
        "A three-man scramble is used when registrations do not divide evenly by four, or when a course wants to move play along even faster. Scores run slightly higher because there is one fewer shot to choose from on each stroke, so many organizers flight three-person teams separately or apply a small handicap adjustment.",
        "The two-person scramble — sometimes called a Texas scramble for two — is popular in leagues and weekly events. With only two options per shot, the format still rewards strategy but plays much closer to a golfer's real ability. Leagues love it because two-person teams are simple to schedule week after week.",
      ],
    },
    {
      heading: "Common scramble variations",
      bullets: [
        "Texas Scramble: a standard scramble with a rule that each player's drive must be used a minimum number of times, usually three or four per round.",
        "Florida Scramble (or Step Aside): the player whose shot is selected sits out the following shot, so the other three play the next stroke.",
        "Ambrose: a scramble with a team handicap applied, common in club and corporate events where competitive fairness matters.",
        "Shamble: everyone tees off, the team picks the best drive, and then each player plays their own ball into the hole from there — a hybrid between scramble and best ball.",
        "Bramble: a shamble where the best individual score on the hole counts as the team score.",
      ],
    },
    {
      heading: "Handicaps in a scramble",
      paragraphs: [
        "Because a scramble already suppresses scoring, most casual charity events skip handicaps entirely and simply hand out prizes for gross low team, along with fun contests such as closest to the pin, longest drive, and a putting contest. That keeps scoring simple and avoids arguments at the awards ceremony.",
        "If you want a competitive scramble, the most widely used method is to take a percentage of each player's course handicap and add them together: commonly 25/20/15/10 percent of the first, second, third, and fourth handicaps respectively for a four-person team, or 35/15 percent for two-person teams. The resulting team handicap is subtracted from the gross team score. TeeVents supports handicap capture at registration and can display both gross and net leaderboards side by side so you do not have to run the math on a clipboard.",
      ],
    },
    {
      heading: "Why organizers choose the scramble for charity events",
      bullets: [
        "Inclusive: beginners, executives, and low handicaps all contribute without pressure.",
        "Fast: a full field of 144 players can finish in roughly four and a half hours with a shotgun start.",
        "Sponsor friendly: teams are sold as foursomes, which maps perfectly to corporate sponsorship tiers.",
        "Fun scoring: birdies and eagles are common, so the leaderboard is exciting to watch.",
        "Simple scoring: one score per group means live scoring is easy to run from a single phone.",
      ],
    },
    {
      heading: "Running a scramble on TeeVents",
      mockup: "leaderboard",
      paragraphs: [
        "TeeVents was built for exactly this kind of event. When you create a tournament you select Scramble as the format, choose your team size, and the platform handles the rest: registration collects teams or individual players, pairings assign each team to a starting hole or tee time, and scoring generates one shared scoring code per group so a single person enters the team score hole by hole from their phone.",
        "The live leaderboard updates in real time in any web browser, so players, spectators, and sponsors can follow along without downloading an app. You can display it on a screen in the clubhouse during the awards reception, and rotate sponsor logos across the top of the board while people watch. Cart signs, printed scorecards with a scan-to-score QR code, and pairing sheets all generate automatically from the same pairings you already set up.",
        "Payments run through Stripe, so registrations and sponsorships are collected online before event day, and funds settle directly to the organizer's account. There is no monthly software subscription to sign up for: the Base plan is free, and you can unlock advanced features for a single tournament when you need them.",
      ],
    },
    {
      heading: "Scramble day-of checklist",
      bullets: [
        "Confirm team rosters and print cart signs the day before.",
        "Post pairings and starting holes at check-in and email them to players.",
        "Brief players on scramble rules and the minimum-drive requirement at the shotgun horn.",
        "Share the live leaderboard link or QR code with every group.",
        "Verify all scores before the awards ceremony and lock the leaderboard.",
        "Announce winners, run the raffle, and thank your sponsors on the board.",
      ],
    },
  ],
  faqs: [
    {
      q: "How many players are on a scramble team?",
      a: "Most tournaments use four-person teams, but three-person and two-person scrambles are common when registration numbers do not divide evenly or when the event is part of a league.",
    },
    {
      q: "Do all players have to use their drive in a scramble?",
      a: "Many organizers add a minimum-drive rule, typically requiring each player's tee shot to be used at least three or four times over 18 holes. It keeps every golfer engaged and prevents one long hitter from carrying the round.",
    },
    {
      q: "What is a good score in a scramble?",
      a: "Winning four-person scramble teams in charity events usually shoot somewhere between 10 and 16 under par, though it depends heavily on the course setup and the strength of the field.",
    },
    {
      q: "Can TeeVents score a scramble automatically?",
      a: "Yes. Select the scramble format when you create your tournament and each group receives one shared scoring code. Scores post to the live leaderboard instantly, with gross and net views available.",
    },
  ],
  related: [
    { to: "/golf-tournament-formats", label: "Golf tournament format types explained" },
    { to: "/what-is-a-shotgun-start", label: "What is a shotgun start?" },
    { to: "/live-scoring-golf-tournaments", label: "Live scoring for golf tournaments" },
    { to: "/charity-golf-tournament-guide", label: "How to run a charity golf tournament" },
  ],
  ctaHeading: "Run your scramble without the spreadsheets",
  ctaText:
    "Set up registration, pairings, cart signs, and a live scramble leaderboard in one afternoon.",
};

export const charityGuide: GuideContent = {
  slug: "charity-golf-tournament-guide",
  title: "How to Run a Charity Golf Tournament",
  metaTitle: "How to Run a Charity Golf Tournament: Step-by-Step Guide",
  metaDescription:
    "A complete step-by-step guide to planning a charity golf tournament: budget, course contract, sponsors, registration, day-of execution, and follow-up.",
  heroSubtitle:
    "Everything from the first course call to the thank-you email — a practical playbook used by nonprofit and corporate organizers.",
  intro:
    "A charity golf tournament can be one of the most profitable events on a nonprofit calendar, but only if it is planned like a business rather than a golf outing. The organizations that clear five and six figures treat sponsorship as the primary revenue line, keep costs predictable, and use software to eliminate the manual work that eats volunteer hours. This guide walks through the entire lifecycle of a charity golf tournament, in order, with the specific decisions you need to make at each stage.",
  sections: [
    {
      heading: "Step 1: Set the goal and build the budget backwards",
      paragraphs: [
        "Start with a net fundraising target, not a player count. If your board wants to raise $50,000, work backwards: sponsorship typically produces 55 to 70 percent of net revenue at a well-run charity outing, player registrations 20 to 30 percent, and on-course games, raffles, auctions, and donations the remainder.",
        "Then list every cost: course fee per player, carts, food and beverage, awards, signage, printing, insurance, and payment processing. A common mistake is pricing registration to cover only the course cost. Price it to cover the course cost plus a margin, and let sponsorship carry the profit.",
      ],
      bullets: [
        "Target net revenue and work backwards to gross.",
        "Confirm per-player course cost in writing before you set the registration price.",
        "Budget for payment processing and platform fees as a line item.",
        "Leave 10 percent contingency for weather, extra food, and last-minute printing.",
      ],
    },
    {
      heading: "Step 2: Pick the date, course, and format",
      paragraphs: [
        "Book the course four to nine months out. Monday is the traditional charity outing day because most private clubs are closed to members. Ask the course for a shotgun start if you have 72 or more players — it gets everyone finished at the same time, which is essential for an awards reception and a sponsor program.",
        "Choose a scramble unless you have a specific reason not to. It welcomes beginners, keeps pace of play under control, and produces the fun, low scores that make an awards ceremony enjoyable. Negotiate what is included: carts, range balls, bag drop, scoring, beverage carts, and the food and beverage minimum.",
      ],
    },
    {
      heading: "Step 3: Build sponsorship packages that actually sell",
      paragraphs: [
        "Sponsorship is where charity tournaments are won or lost. Build a simple tier ladder and give each tier a clear, tangible list of benefits. Businesses buy visibility and access, so put logos where people take photos and where they wait: the first tee, the beverage cart, the awards reception, and the leaderboard.",
      ],
      bullets: [
        "Title/Presenting sponsor: naming rights, logo on the event website and all emails, banner at registration, four foursomes.",
        "Beverage cart, lunch, dinner, and awards sponsors: high-traffic exposure at a mid price point.",
        "Hole sponsors: the volume tier — inexpensive, easy to sell in quantity, and easy to fulfill with a printed sign.",
        "Contest sponsors: longest drive, closest to the pin, hole-in-one, and putting contest.",
        "In-kind sponsors: raffle prizes, gift bags, printing, and photography.",
      ],
    },
    {
      heading: "Step 4: Open registration early and online",
      mockup: "site",
      paragraphs: [
        "Every week your registration is not open is a week you are not collecting money. Launch a branded event website as soon as the date is locked, even if the sponsorship deck is not finished. The site should let a visitor register a foursome, buy a sponsorship, or donate in under two minutes on a phone.",
        "On TeeVents, your event site is generated with your logo, colors, and a custom domain if you want one. Registration collects the fields you choose — shirt size, handicap, dietary needs, company name, custom questions with dropdown options — and sends a branded confirmation email with the schedule and payment receipt. Sponsorship packages are sold from the same page, with inventory limits so you never oversell the beverage cart.",
      ],
    },
    {
      heading: "Step 5: Add revenue layers beyond registration",
      bullets: [
        "Mulligan packages and string sold as add-ons during checkout and on event day.",
        "Silent auction and raffle run online so people can bid from the course or from their office.",
        "Donation button on the event site for supporters who cannot play.",
        "Skins games and side contests with a small buy-in.",
        "Corporate matching gifts — remind sponsors in your confirmation email.",
      ],
      paragraphs: [
        "These layers routinely add 20 to 40 percent to the net of a charity outing, and they cost almost nothing to run when they are digital. An online auction that opens a week early gives you seven extra days of bidding rather than three hours in a clubhouse.",
      ],
    },
    {
      heading: "Step 6: Communicate in the two weeks before the event",
      paragraphs: [
        "Send a day-before reminder email with the schedule, the course address, the starting hole or tee time for each group, parking instructions, and the live leaderboard link. This one email cuts check-in chaos dramatically and reduces no-shows.",
        "TeeVents lets you customize that reminder, reorder its sections, insert your own rich text, and schedule the exact send date and time. Because pairings are already in the system, each player receives their own tee time and starting hole automatically.",
      ],
    },
    {
      heading: "Step 7: Execute on event day",
      bullets: [
        "Set up check-in 90 minutes before the shotgun horn with printed pairing sheets and cart signs already placed.",
        "Assign volunteers to registration, contest holes, the raffle table, and the beverage cart.",
        "Distribute the live scoring link or QR code to one player per group.",
        "Display the leaderboard on a screen in the clubhouse during lunch or the reception.",
        "Verify scores before you announce winners, then lock the leaderboard.",
      ],
    },
    {
      heading: "Step 8: Follow up while goodwill is high",
      paragraphs: [
        "Within 72 hours, send a thank-you email with the final leaderboard, photos, the amount raised, and a sponsor logo wall. Send tax-compliant receipts to donors and sponsors — TeeVents generates 501(c)(3) receipting with the deductible portion calculated for you.",
        "Then debrief while it is fresh. Note what sold out, which sponsor tier underperformed, where the schedule slipped, and what you would change. Lock next year's date with the course before you leave. Repeat organizers who secure the date immediately typically grow their event 20 to 30 percent in year two.",
      ],
    },
  ],
  faqs: [
    {
      q: "How far in advance should I plan a charity golf tournament?",
      a: "Book the course four to nine months out and open registration and sponsorship sales at least three months before event day.",
    },
    {
      q: "How much should I charge per player?",
      a: "Price registration to cover the per-player course cost plus food, gifts, and processing, with a margin. Most charity scrambles in the United States price between $125 and $350 per player depending on the market and the course.",
    },
    {
      q: "Where does most of the money come from?",
      a: "Sponsorship. At well-run events, sponsorships produce the majority of net revenue, with registrations, raffles, auctions, and donations filling out the rest.",
    },
    {
      q: "Do I need golf tournament software for a charity event?",
      a: "You can run a small outing on spreadsheets, but online registration, automated confirmations, sponsor management, and live scoring save dozens of volunteer hours and typically increase revenue by making it easier to say yes.",
    },
  ],
  related: [
    { to: "/golf-tournament-sponsor-management", label: "Golf tournament sponsor management" },
    { to: "/what-is-a-scramble", label: "What is a scramble in golf?" },
    { to: "/custom-golf-tournament-website", label: "Custom golf tournament website builder" },
    { to: "/golf-tournament-software-pricing", label: "Golf tournament software pricing" },
  ],
  ctaHeading: "Start your charity tournament today",
  ctaText: "Branded event site, online registration, sponsor packages, and receipting in one place.",
};

export const formats: GuideContent = {
  slug: "golf-tournament-formats",
  title: "Golf Tournament Format Types Explained",
  metaTitle: "Golf Tournament Formats Explained: Scramble, Best Ball & More",
  metaDescription:
    "Compare golf tournament formats — scramble, best ball, stroke play, match play, Stableford, and skins — and learn which format fits your event.",
  heroSubtitle:
    "Scramble, best ball, stroke play, match play, Stableford, and skins — what each format is, who it suits, and how to score it.",
  intro:
    "Choosing the format is the single most consequential decision an organizer makes. It determines pace of play, how welcome beginners feel, how competitive the leaderboard looks, and how complicated scoring will be. This guide breaks down the six formats used in almost every tournament, when to pick each one, and how TeeVents scores them.",
  sections: [
    {
      heading: "Scramble",
      paragraphs: [
        "Every player tees off, the team selects the best shot, and everyone plays their next stroke from that spot until the ball is holed. The team records one score per hole.",
        "Best for: charity and corporate events with mixed ability levels. Pace of play is fast, scores are low, and nobody feels exposed. It is the default format for a reason — roughly three out of four charity outings in the United States use it.",
      ],
    },
    {
      heading: "Best ball (four ball)",
      paragraphs: [
        "Each player plays their own ball for the entire hole. The team score is the best individual score on that hole. With four players and a two-count variation, you take the two lowest scores instead.",
        "Best for: events where players want to play their own game but still compete as a team. Rounds run longer than a scramble because every player holes out, so allow extra time or use a two-count rule and a maximum score per hole to keep pace under control.",
      ],
    },
    {
      heading: "Stroke play (medal play)",
      paragraphs: [
        "The purest format: every player counts every stroke over 18 holes, and the lowest total wins. Net stroke play subtracts each player's course handicap from the gross score so golfers of different abilities can compete fairly.",
        "Best for: club championships, competitive amateur fields, and divisional events where a real handicap index is on file. Stroke play produces clean, defensible results and is easy to flight — group players into Championship, Senior, and Amateur divisions and award prizes within each flight.",
      ],
    },
    {
      heading: "Match play",
      paragraphs: [
        "Players or teams compete hole by hole. Whoever scores lower on a hole wins that hole; the match ends when a player is up by more holes than remain. Scores are reported as 3&2 rather than a stroke total.",
        "Best for: brackets, club championships, and rivalry events. Match play is dramatic and forgiving of a single disaster hole, but it requires a bracket structure and takes multiple rounds to determine a winner, so it does not fit a one-day charity outing.",
      ],
    },
    {
      heading: "Stableford",
      paragraphs: [
        "Instead of counting strokes, players earn points based on their score relative to par on each hole. A typical scale awards 1 point for a bogey, 2 for par, 3 for a birdie, 4 for an eagle, and 0 for a double bogey or worse. The highest point total wins.",
        "Best for: keeping pace of play brisk and keeping slower players engaged. A player who blows up on a hole simply picks up and scores zero — no eight on the card, no waiting on the group behind. Modified Stableford, which penalizes bogeys with negative points, rewards aggressive play and is popular in professional and elite amateur events.",
      ],
    },
    {
      heading: "Skins",
      paragraphs: [
        "Each hole is worth a prize, or skin. The player or team with the outright lowest score on the hole wins it; if two players tie, the skin carries over to the next hole and the pot grows. Skins can be run as a side game alongside any primary format.",
        "Best for: adding excitement and a second revenue stream. Sell skins as an optional buy-in at registration and pay out the pot after the round. TeeVents calculates skins automatically, including carryovers, and now presents skins payouts under Prize Money in league mode.",
      ],
    },
    {
      heading: "Which format should you pick?",
      bullets: [
        "Mixed-ability charity or corporate outing: scramble, four-person teams.",
        "Golfers who want to play their own ball but compete as a team: best ball.",
        "Serious competitive field with handicaps on file: net stroke play with flights.",
        "Multi-round club championship or rivalry event: match play bracket.",
        "You need to protect pace of play: Stableford.",
        "You want a side game and extra revenue: skins alongside any format.",
      ],
    },
    {
      heading: "Formats TeeVents supports",
      mockup: "scoring",
      paragraphs: [
        "TeeVents supports eight scoring formats out of the box, including four-person scramble, three-man scramble, shootout, two-person scramble, best ball, individual stroke play, Stableford, and skins. You choose the format when you create the tournament, and the platform adapts everything downstream: scoring codes are issued per team for team formats and per player for individual formats, the score entry screen shows only the fields that make sense, and the live leaderboard sorts correctly for points-based or stroke-based scoring.",
        "Multi-round and multi-day events can use a different format per round, which is common for league seasons and championship weekends. Flighting and payout planning let you split a field into divisions and calculate prize distribution automatically, so the awards ceremony does not require a calculator and a volunteer with a clipboard.",
      ],
    },
  ],
  faqs: [
    {
      q: "What is the most popular golf tournament format?",
      a: "The four-person scramble. It is inclusive, fast, and produces low scores that make the event fun for players of every ability.",
    },
    {
      q: "What is the difference between a scramble and best ball?",
      a: "In a scramble the whole team plays from the best shot every stroke. In best ball each player plays their own ball all the way into the hole, and the team takes the lowest individual score on each hole.",
    },
    {
      q: "Is Stableford good for a charity outing?",
      a: "It can be, especially when pace of play is a concern, because players pick up once a hole is out of reach. Scramble is still simpler for beginners.",
    },
    {
      q: "Can one tournament use more than one format?",
      a: "Yes. Multi-round events on TeeVents can use a different format per round, and skins can run as a side game alongside any primary format.",
    },
  ],
  related: [
    { to: "/what-is-a-scramble", label: "What is a scramble in golf?" },
    { to: "/what-is-a-shotgun-start", label: "What is a shotgun start?" },
    { to: "/live-scoring-golf-tournaments", label: "Live scoring for golf tournaments" },
    { to: "/charity-golf-tournament-guide", label: "How to run a charity golf tournament" },
  ],
  ctaHeading: "Score any format automatically",
  ctaText: "Pick your format, publish pairings, and let the leaderboard do the math.",
};

export const websiteBuilder: GuideContent = {
  slug: "custom-golf-tournament-website",
  title: "Custom Golf Tournament Website Builder",
  metaTitle: "Custom Golf Tournament Website Builder | Branded Event Sites",
  metaDescription:
    "Build a fully branded golf tournament website with your logo, colors, layout, custom domain, registration, and sponsor placement — no developer required.",
  heroSubtitle:
    "Your event. Your brand. Your domain. Build a tournament site that looks like it was designed for you, because it was.",
  intro:
    "Most golf tournament platforms hand you a template with their logo in the corner and a URL nobody can remember. That is a problem when your sponsors are paying for visibility and your board expects the event to look like your organization. A tournament website is the first thing a prospective player, donor, or sponsor sees, and it is doing three jobs at once: selling registrations, selling sponsorships, and delivering information on event week. This page explains what a genuinely customizable tournament site should include and how TeeVents builds one.",
  sections: [
    {
      heading: "What a tournament website has to do",
      bullets: [
        "Sell foursomes and individual registrations in under two minutes on a phone.",
        "Sell sponsorship packages with clear tiers and limited inventory.",
        "Accept donations from supporters who cannot play.",
        "Publish the schedule, course details, format, and dress code.",
        "Display sponsor logos prominently and in a way sponsors will renew for.",
        "Link to live scoring and the leaderboard on event day.",
        "Look correct when the URL is shared by text message or in a group chat.",
      ],
    },
    {
      heading: "Branding controls that actually matter",
      mockup: "site",
      paragraphs: [
        "Real customization goes deeper than uploading a logo. In TeeVents you control your primary and accent colors, typography scale, hero image, logo placement, and section order. You can choose from six professionally designed layout themes and then override the details, so two tournaments on the same platform look nothing alike.",
        "You decide which sections appear at all. Sponsorship opportunities can be toggled off entirely if your packages are sold out. Public tabs let you add pages for the schedule, course information, auction, photo gallery, lodging, or anything else your event needs. Each section can be reordered so the content your audience cares about most sits above the fold.",
      ],
    },
    {
      heading: "Custom domains and shareable links",
      paragraphs: [
        "You can publish your event at a clean custom slug or connect your own domain, so the site lives at a URL your audience already trusts. That matters for email deliverability, for printed materials, and for the credibility of a sponsorship ask.",
        "Link previews are handled server side, which means when someone texts the URL or drops it into a group chat, the correct event image, title, and description appear rather than a generic placeholder. It sounds like a small detail until you watch a foursome get sold because the preview looked professional.",
      ],
    },
    {
      heading: "Registration built into the page",
      paragraphs: [
        "The registration form is part of the site, not a separate checkout on someone else's domain. You control the fields: shirt size, handicap index, dietary restrictions, company name, age and division, city and state, and unlimited custom questions with dropdown options you define.",
        "Group registration supports a team captain flow where only the captain provides full contact details and teammates supply names, which dramatically reduces abandonment. Payment status can be marked as paid or pending for players you are collecting from offline, and manual entries sit alongside online registrations in one roster.",
      ],
    },
    {
      heading: "Sponsor placement that sells renewals",
      mockup: "sponsor",
      paragraphs: [
        "Sponsor logos appear on the event site, on the live leaderboard as a rotating banner and scrolling ticker, on printed cart signs and scorecards, and in your confirmation and reminder emails. That is measurable, repeatable visibility you can point to when you ask a sponsor to renew next year.",
        "Sponsors get their own landing page and can be sent information packets directly from the dashboard, so asset collection and fulfillment stop living in your inbox.",
      ],
    },
    {
      heading: "Event-week and day-of content",
      bullets: [
        "Publish pairings and tee times to the site so players can look up their own group.",
        "Embed the live leaderboard so spectators can follow along from anywhere.",
        "Add a photo gallery that fills up during and after the round.",
        "Post the final results and sponsor thank-you wall after the event.",
        "Sell add-ons like mulligans from a dedicated page you can link in emails and on signage.",
      ],
    },
    {
      heading: "Mobile first, because your players are on phones",
      paragraphs: [
        "The overwhelming majority of tournament registrations happen on a mobile device, often in the parking lot after a sponsor conversation. Every TeeVents template is responsive by default, with tap targets sized for thumbs, fast image loading, and Apple Pay and Google Pay available at checkout so a registration can be completed in seconds.",
        "On event day the same site becomes the player hub: schedule, starting hole, tee time, scoring link, and leaderboard, all reachable from one bookmark or QR code.",
      ],
    },
    {
      heading: "No developer, no monthly platform fee",
      paragraphs: [
        "You do not need a web developer, a WordPress install, or a designer to launch. Most organizers publish a complete, branded event site in under an hour, then refine the details as sponsors come in. The Base plan is free to build on, and you only pay when money moves through the platform.",
      ],
    },
  ],
  faqs: [
    {
      q: "Can I use my own domain for a golf tournament website?",
      a: "Yes. You can connect a custom domain to your published event site, or use a clean custom slug on the TeeVents domain.",
    },
    {
      q: "Can I change colors, fonts, and layout?",
      a: "Yes. Choose from six layout themes and then customize colors, logo, hero image, typography, and section order. Sections can be toggled on or off individually.",
    },
    {
      q: "Do I need a developer to build the site?",
      a: "No. The builder is visual, and most organizers publish a complete event site in under an hour.",
    },
    {
      q: "Will sponsor logos appear on the site?",
      a: "Yes, and also on the live leaderboard, printed cart signs and scorecards, and your automated emails.",
    },
  ],
  related: [
    { to: "/golf-tournament-sponsor-management", label: "Golf tournament sponsor management" },
    { to: "/charity-golf-tournament-guide", label: "How to run a charity golf tournament" },
    { to: "/eventbrite-vs-golf-tournament-software", label: "Eventbrite vs golf tournament software" },
    { to: "/golf-tournament-software-pricing", label: "Golf tournament software pricing" },
  ],
  ctaHeading: "Build your branded event site",
  ctaText: "Your logo, your colors, your domain — published today, free to start.",
};

export const sponsorManagement: GuideContent = {
  slug: "golf-tournament-sponsor-management",
  title: "Golf Tournament Sponsor Management",
  metaTitle: "Golf Tournament Sponsor Management Software & Best Practices",
  metaDescription:
    "How to build sponsorship tiers, collect logos and assets, deliver visibility, and manage golf tournament sponsors online with TeeVents' sponsor portal.",
  heroSubtitle:
    "Build tiers that sell, collect assets without chasing, deliver visibility you can prove, and renew sponsors year after year.",
  intro:
    "Sponsorship is the profit engine of a golf tournament. Registration fees usually cover the course; sponsors fund the mission. Yet sponsorship is also the part organizers manage worst — a spreadsheet of commitments, a folder of logos emailed in the wrong format, a scramble to print signs the night before, and no evidence to show a sponsor what they actually got. This guide covers the practical system for managing golf tournament sponsors, and how TeeVents automates most of it.",
  sections: [
    {
      heading: "Design a tier ladder, not a price list",
      paragraphs: [
        "Sponsors buy outcomes: visibility with a specific audience, access to decision makers, and association with a cause. Structure tiers so each step up adds a category of benefit rather than just more logo placements.",
      ],
      bullets: [
        "Presenting: naming rights, top billing on the event site and all emails, speaking moment at the reception, two to four foursomes.",
        "Gold: prominent logo placement, one foursome, leaderboard rotation, signage at a high-traffic station.",
        "Beverage cart / lunch / awards: exclusive category exposure at a mid price point.",
        "Hole sponsor: your volume tier — inexpensive, easy to sell in quantity, fulfilled with a printed sign.",
        "Contest sponsor: longest drive, closest to the pin, putting contest, hole-in-one.",
        "In-kind: prizes, printing, photography, gift bags.",
      ],
    },
    {
      heading: "Sell sponsorships online, with inventory limits",
      paragraphs: [
        "The fastest way to lose a sponsorship is to make the buyer wait for an invoice. Put every tier on your event website with a buy button. TeeVents sells sponsorship packages directly from your site, tracks remaining inventory so you never double-sell an exclusive category, and collects payment through Stripe with the funds settling directly to the organizer's account.",
        "You can also toggle the entire sponsorship section off when packages are gone, so the public page always reflects reality.",
      ],
    },
    {
      heading: "Collect logos and assets without chasing",
      mockup: "sponsor",
      paragraphs: [
        "Asset collection is where sponsorship programs stall. Instead of emailing back and forth for a usable logo file, TeeVents gives each sponsor a place to submit their logo, website link, and company description at purchase. Anything still missing is visible in the dashboard, so you know exactly who to follow up with rather than digging through your inbox.",
        "Organizers can also send information packets and instructions to sponsors directly from the dashboard, which keeps every sponsor communication in one recorded place instead of scattered across personal email accounts.",
      ],
    },
    {
      heading: "Deliver visibility everywhere the audience looks",
      bullets: [
        "Event website: logo wall with links, tier grouping, and individual sponsor landing pages.",
        "Live leaderboard: rotating banner plus a scrolling ticker visible on every phone and clubhouse screen all day.",
        "Printed materials: cart signs, scorecards, and pairing sheets generated with sponsor branding.",
        "Email: logos in confirmation, day-before reminder, and post-event thank-you emails.",
        "On-course: contest hole signage tied to the sponsor who bought the contest.",
      ],
      paragraphs: [
        "Digital placement matters more than most organizers assume. A sponsor's logo on a leaderboard that players refresh a dozen times during a round delivers far more impressions than a sign on the fourteenth tee.",
      ],
    },
    {
      heading: "Prove the value so they renew",
      paragraphs: [
        "The highest-leverage thing you can do for next year's revenue is send a post-event sponsor report. Include the number of players and guests, the amount raised, leaderboard views, photos showing their signage, the sponsor logo wall, and a thank-you from the beneficiary.",
        "TeeVents generates the final leaderboard, visit analytics, and tax-compliant receipting for 501(c)(3) organizations, including the deductible portion of a sponsorship where applicable. Sending that package within a week, while goodwill is highest, is what converts a one-year sponsor into a five-year sponsor.",
      ],
    },
    {
      heading: "Track the money cleanly",
      paragraphs: [
        "Sponsorship revenue should be visible next to registration revenue, not in a separate spreadsheet. The finance section of the organizer dashboard shows gross collected, platform and processing fees, and net to the organizer for every transaction type, including sponsorships, registrations, add-ons, auctions, raffles, and donations.",
        "Because payments settle directly to your connected Stripe account, there is no waiting for a platform to cut you a check, and reconciliation against your accounting system is straightforward.",
      ],
    },
    {
      heading: "A simple sponsorship timeline",
      bullets: [
        "Six months out: finalize tiers and pricing, build the prospect list, publish packages on the event site.",
        "Five to three months out: make asks in person or by phone, follow up with the online purchase link.",
        "Two months out: close remaining inventory, collect logos and assets, confirm signage counts.",
        "Two weeks out: send fulfillment confirmation to each sponsor with exactly what they will see on event day.",
        "Event day: photograph every sign and activation.",
        "Within one week: send the report, receipts, and a renewal invitation for next year.",
      ],
    },
  ],
  faqs: [
    {
      q: "How much should a hole sponsorship cost?",
      a: "Most charity tournaments price hole sponsorships between $250 and $1,000 depending on market and event size. It is a volume tier, so price it to be an easy yes.",
    },
    {
      q: "How do I collect sponsor logos?",
      a: "Collect them at the point of purchase. TeeVents captures logo, link, and description when a sponsorship is bought and flags anything missing in the dashboard.",
    },
    {
      q: "Where do sponsor logos appear on TeeVents?",
      a: "On the event website, on the live leaderboard as a rotating banner and scrolling ticker, on printed cart signs and scorecards, and in automated emails.",
    },
    {
      q: "Can sponsors pay online?",
      a: "Yes. Sponsorship packages are sold directly from your event site through Stripe, with funds settling to the organizer's connected account.",
    },
  ],
  related: [
    { to: "/charity-golf-tournament-guide", label: "How to run a charity golf tournament" },
    { to: "/custom-golf-tournament-website", label: "Custom golf tournament website builder" },
    { to: "/live-scoring-golf-tournaments", label: "Live scoring for golf tournaments" },
    { to: "/golf-tournament-software-pricing", label: "Golf tournament software pricing" },
  ],
  ctaHeading: "Manage sponsors in one place",
  ctaText: "Sell packages online, collect assets automatically, and prove the value after the event.",
};
