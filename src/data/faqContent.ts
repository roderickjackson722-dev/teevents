export type FaqCategory = { name: string; items: { q: string; a: string }[] };
export const FAQ_CATEGORIES: FaqCategory[] = [
 {
  "name": "Getting Started",
  "items": [
   {
    "q": "What is TeeVents?",
    "a": "TeeVents is an all-in-one golf tournament and league management platform. It handles registration, payments, live scoring, leaderboards, pairings, sponsor tools, and reporting. Every event includes a dedicated TeeVents rep who builds it for you."
   },
   {
    "q": "Who is TeeVents for?",
    "a": "TeeVents is built for nonprofits, charities, corporations, golf courses and clubs, schools, churches, community groups, and leagues. If you are running a golf event, TeeVents is for you."
   },
   {
    "q": "How do I get started?",
    "a": "Sign up for free, tell us about your event, and upload your assets to the Organizer Toolbox. Your dedicated rep contacts you within 1 business day to start building your event."
   },
   {
    "q": "Do I need to be technical to use TeeVents?",
    "a": "No. You do not learn software, watch tutorials, or build anything. You tell us what you want and your rep builds it for you."
   },
   {
    "q": "How long does setup take?",
    "a": "Most events are live within a few days of signup. Complex events may take longer, and your rep will give you a timeline during your first call."
   },
   {
    "q": "Do I get a dedicated rep even on the free plan?",
    "a": "Yes. Every event on TeeVents, free or paid, includes a dedicated rep who builds your event for you."
   }
  ]
 },
 {
  "name": "Pricing and Plans",
  "items": [
   {
    "q": "How much does TeeVents cost?",
    "a": "There are four options: No Cost to Start ($0 upfront, with a 5% platform fee paid by players at checkout), Per-Event ($399 per tournament), Per-League ($599 per league), and Enterprise ($2,999 per year for unlimited events)."
   },
   {
    "q": "What is the 5% platform fee?",
    "a": "On the No Cost to Start plan, a 5% platform fee is added to each player's registration total at checkout. You keep 100% of your event revenue. Your players cover the fee."
   },
   {
    "q": "Can I pass the fee to my players?",
    "a": "Yes. On the No Cost to Start plan, the 5% fee is automatically added to each registration at checkout. Players see it as a service fee, similar to other ticketing platforms."
   },
   {
    "q": "What is Per-Event pricing?",
    "a": "$399 per tournament. Includes Live Leaderboard, Mobile Scoring, and 0% platform transaction fees. You keep 100% of your registration revenue. Standard Stripe processing fees still apply."
   },
   {
    "q": "What is Per-League pricing?",
    "a": "$599 per league. Includes everything in Per-Event plus season-long standings and reporting."
   },
   {
    "q": "Is Live Leaderboard included in Per-Event?",
    "a": "Yes. Live Leaderboard and Mobile Scoring are included in Per-Event, Per-League, and Enterprise plans. On the No Cost to Start plan, it is available as a $99 add-on."
   },
   {
    "q": "What is Enterprise pricing?",
    "a": "$2,999 per year for unlimited tournaments and leagues. Best for courses and clubs running 10 or more events a year. Includes 0% transaction fees, live leaderboard and mobile scoring on every event, and custom branding."
   },
   {
    "q": "Can I switch plans later?",
    "a": "Yes. You can upgrade from No Cost to Start to Per-Event, Per-League, or Enterprise at any time."
   },
   {
    "q": "Are there any hidden fees?",
    "a": "No. Standard Stripe processing fees (2.9% + $0.30) apply on every transaction and are paid to Stripe, not to TeeVents."
   },
   {
    "q": "Do add-ons cost extra?",
    "a": "Yes. Optional add-ons are $99 each and include Live Leaderboard and Mobile Scoring, Unlimited Manual Entries, Auction Dashboard, Branding Removal and Digital Sponsor, and Custom Domain."
   }
  ]
 },
 {
  "name": "Payments and Payouts",
  "items": [
   {
    "q": "How do payments work?",
    "a": "Players pay at checkout through Stripe, our payment processor. Funds go directly to your connected Stripe account. TeeVents never holds your money."
   },
   {
    "q": "When do I get paid?",
    "a": "Funds land in your Stripe account as registrations come in. New Stripe accounts typically see funds available within 2 to 7 business days."
   },
   {
    "q": "Do I need a Stripe account?",
    "a": "Yes, but setup takes 5 to 10 minutes. Your TeeVents rep will help you connect it during onboarding."
   },
   {
    "q": "Does TeeVents hold my money at any point?",
    "a": "No. TeeVents never holds your money. Payments split automatically at checkout using Stripe Connect. Funds go directly to your Stripe account."
   },
   {
    "q": "What payment methods can players use?",
    "a": "Credit cards, Apple Pay, and Google Pay."
   },
   {
    "q": "Can I offer discounts or promo codes?",
    "a": "Yes. TeeVents supports promo codes and discount codes."
   },
   {
    "q": "Can I issue refunds?",
    "a": "Yes. Full and partial refunds are issued from your administrative dashboard."
   },
   {
    "q": "Can I collect donations during registration?",
    "a": "Yes. TeeVents supports optional add-on purchases and donations during checkout."
   },
   {
    "q": "Do you support 501(c)(3) receipting?",
    "a": "Yes. TeeVents provides tax-exempt receipting support for qualifying organizations."
   }
  ]
 },
 {
  "name": "Registration",
  "items": [
   {
    "q": "Can players register as individuals or teams?",
    "a": "Yes. TeeVents supports individual, team, and foursome registration with configurable capacity limits."
   },
   {
    "q": "Can I customize my registration form?",
    "a": "Yes. Your rep configures registration form fields including roster details, apparel sizing, and custom questions."
   },
   {
    "q": "Can I collect waivers and consents?",
    "a": "Yes. Electronic waivers and consent acknowledgements are captured at registration."
   },
   {
    "q": "Can I set registration open and close dates?",
    "a": "Yes. You can schedule open and close dates with automatic cutoffs."
   },
   {
    "q": "Do you support waitlists?",
    "a": "Yes. TeeVents includes an automated waitlist with queued offers and a timed claim window."
   },
   {
    "q": "Can I manually enter registrations for phone or mail signups?",
    "a": "Yes. Administrators can enter offline registrations for phone, mail, and walk-in signups."
   },
   {
    "q": "Can I import my existing player list?",
    "a": "Yes. TeeVents supports CSV import so you can bring in players from a spreadsheet or another platform."
   },
   {
    "q": "Do players get confirmation emails?",
    "a": "Yes. Automated confirmation emails are sent to the registrant and all listed group members."
   }
  ]
 },
 {
  "name": "Live Scoring and Leaderboards",
  "items": [
   {
    "q": "Do players need to download an app to score?",
    "a": "No. TeeVents mobile scoring works in any phone browser. No app download required."
   },
   {
    "q": "How do players access scoring?",
    "a": "Your rep sends them a scoring link via text or email, or they use a QR code on their scorecard."
   },
   {
    "q": "Do players need an account to score?",
    "a": "No. Players use a short numeric access code or QR code that lets them score without creating an account."
   },
   {
    "q": "Can I customize the leaderboard colors?",
    "a": "Yes. Your rep matches every leaderboard to your event colors and logo."
   },
   {
    "q": "How fast does the leaderboard update?",
    "a": "Scores update in real time as soon as they are entered."
   },
   {
    "q": "Can spectators follow the leaderboard?",
    "a": "Yes. The leaderboard link is public. No login required."
   },
   {
    "q": "Can I display the leaderboard on a TV?",
    "a": "Yes. TeeVents includes a large-format TV display mode for on-site monitors."
   },
   {
    "q": "What scoring formats are supported?",
    "a": "Scramble, Stroke Play, Stableford, Best Ball, Alternate Shot, Match Play, and more."
   },
   {
    "q": "Do you support multi-round events?",
    "a": "Yes. TeeVents supports 9, 18, 27, 36, and 54-hole competitions."
   },
   {
    "q": "Do you support skins and deuces?",
    "a": "Yes. Gross and net skins with automatic winner calculation, plus deuces tracking."
   }
  ]
 },
 {
  "name": "Pairings and Scheduling",
  "items": [
   {
    "q": "Can I create pairings manually?",
    "a": "Yes. TeeVents includes drag-and-drop pairings so you can assign players to groups, times, and locations."
   },
   {
    "q": "Can pairings be auto-generated?",
    "a": "Yes. TeeVents can auto-assign groups based on handicap or random."
   },
   {
    "q": "Can I set up tee times or shotgun starts?",
    "a": "Yes. TeeVents supports both start-time and mass-start scheduling."
   },
   {
    "q": "Can I print pairing sheets and scorecards?",
    "a": "Yes. TeeVents generates printable pairing sheets, scorecards, cart signs, and rosters."
   },
   {
    "q": "Can I make last-minute changes on event day?",
    "a": "Yes. Drag-and-drop pairings update instantly, and you can move players between groups at any time."
   },
   {
    "q": "Can I create pairings that mix teams?",
    "a": "Yes. TeeVents supports multiple pairing modes, including options that balance competition and keep team players in nearby groups for coach convenience."
   }
  ]
 },
 {
  "name": "Handicaps",
  "items": [
   {
    "q": "Does TeeVents support GHIN handicaps?",
    "a": "Yes. TeeVents integrates with GHIN. Your rep can sync official GHIN handicaps for players before the event."
   },
   {
    "q": "Can I enter handicaps manually if a player does not have a GHIN?",
    "a": "Yes. You can manually enter a handicap index for any player."
   },
   {
    "q": "How does Course Handicap get calculated?",
    "a": "TeeVents calculates Course Handicap using the USGA formula: Handicap Index multiplied by (Slope Rating divided by 113) plus (Course Rating minus Par)."
   },
   {
    "q": "Can I apply handicap allowances?",
    "a": "Yes. You can set handicap allowance percentages (for example, 95% for four-ball) per event."
   },
   {
    "q": "Does the leaderboard show net and gross scores?",
    "a": "Yes. Players and spectators can toggle between net and gross scores."
   }
  ]
 },
 {
  "name": "Sponsors and Fundraising",
  "items": [
   {
    "q": "Can I add sponsors to my event?",
    "a": "Yes. TeeVents supports tiered sponsor packages and dedicated sponsor pages."
   },
   {
    "q": "Where do sponsor logos appear?",
    "a": "On your event page, your live leaderboard, and your mobile scoring pages."
   },
   {
    "q": "Are sponsor logos clickable?",
    "a": "Yes. Sponsor logos link to sponsor websites or offers."
   },
   {
    "q": "Can I run a silent auction?",
    "a": "Yes. TeeVents includes a mobile bidding dashboard with auto-draw at close."
   },
   {
    "q": "Can I run a 50/50 raffle?",
    "a": "Yes. TeeVents supports digital raffle sales with automatic winner selection."
   },
   {
    "q": "Can I collect donations online?",
    "a": "Yes. Donation widgets can be added to your event page and checkout."
   },
   {
    "q": "Do you provide tax-exempt receipts?",
    "a": "Yes. TeeVents provides 501(c)(3) receipting support."
   }
  ]
 },
 {
  "name": "Leagues",
  "items": [
   {
    "q": "Does TeeVents support season-long leagues?",
    "a": "Yes. TeeVents has a dedicated league management system with season-long standings, leaderboards, and reporting."
   },
   {
    "q": "Can I track player standings across the season?",
    "a": "Yes. Season-long standings and statistics are tracked automatically."
   },
   {
    "q": "Can I schedule recurring weekly events?",
    "a": "Yes. Recurring schedules are built into the league management system."
   },
   {
    "q": "How is league pricing different from tournament pricing?",
    "a": "Per-League pricing is $599 per league, covering the entire season. Enterprise includes unlimited leagues."
   },
   {
    "q": "Do players have separate logins for leagues?",
    "a": "Yes. League players can access standings and results from the same Player Hub."
   }
  ]
 },
 {
  "name": "Enterprise",
  "items": [
   {
    "q": "Who is Enterprise for?",
    "a": "Enterprise is built for golf courses, clubs, and organizations running 10 or more events a year."
   },
   {
    "q": "What does Enterprise include?",
    "a": "Unlimited tournaments and leagues, 0% TeeVents transaction fees, live leaderboard and mobile scoring on every event, custom branding, staff accounts with role-based permissions, and priority support."
   },
   {
    "q": "Does Enterprise include a dedicated rep?",
    "a": "Yes. Enterprise includes a dedicated rep who builds every event, every league, and every leaderboard for you."
   },
   {
    "q": "Can multiple staff members use one Enterprise account?",
    "a": "Yes. Enterprise includes staff accounts with role-based permissions."
   },
   {
    "q": "Does Enterprise include a club page?",
    "a": "Yes. Enterprise includes a club page listing all upcoming events."
   },
   {
    "q": "Can Enterprise be invoiced instead of paid by card?",
    "a": "Yes. Enterprise customers can request to be billed by invoice."
   }
  ]
 },
 {
  "name": "Account and Security",
  "items": [
   {
    "q": "Is TeeVents secure?",
    "a": "Yes. TeeVents uses Stripe for payments (PCI Level 1 Certified), 256-bit SSL encryption, and Stripe Radar fraud protection."
   },
   {
    "q": "Does TeeVents store card data?",
    "a": "No. Card data never touches TeeVents systems. All payments are processed by Stripe."
   },
   {
    "q": "Can I control who on my team sees what?",
    "a": "Yes. TeeVents includes role-based access control with granular per-permission assignment."
   },
   {
    "q": "Do you offer multi-factor authentication?",
    "a": "Yes. Multi-factor authentication is available for administrative accounts."
   },
   {
    "q": "Where is my data stored?",
    "a": "TeeVents runs on managed cloud infrastructure in the United States."
   }
  ]
 },
 {
  "name": "Support",
  "items": [
   {
    "q": "How do I contact support?",
    "a": "You can reach support through the in-platform support messaging, by email at info@teevents.golf, or by phone during business hours."
   },
   {
    "q": "What are support hours?",
    "a": "Standard support hours are Monday through Friday, 9:00 a.m. to 6:00 p.m. Eastern Time. Extended support is available during active events."
   },
   {
    "q": "How fast do you respond?",
    "a": "New inquiries are responded to within 1 business day. Active customer questions are responded to within 4 business hours. Event day support is monitored in real time."
   },
   {
    "q": "Do I have a named support contact?",
    "a": "Yes. Every event includes a dedicated rep who knows your event."
   }
  ]
 },
 {
  "name": "For Golfers",
  "items": [
   {
    "q": "Do I need to download an app to play in a TeeVents tournament?",
    "a": "No. Everything works in any phone browser."
   },
   {
    "q": "Do I need an account to follow a leaderboard?",
    "a": "No. Leaderboard links are public. No login required."
   },
   {
    "q": "How do I register for a tournament?",
    "a": "Your organizer shares a registration link, or you can browse the Find Your Event directory."
   },
   {
    "q": "How do I check in on event day?",
    "a": "Scan your personal QR code at the course. No printed tickets needed."
   },
   {
    "q": "How do I score from my phone?",
    "a": "Your organizer sends a scoring link or numeric code. Open it, enter your score hole by hole, and submit."
   },
   {
    "q": "Can my family follow along?",
    "a": "Yes. Share the leaderboard link with them. No login required."
   },
   {
    "q": "Do I need a GHIN handicap?",
    "a": "No. If you do not have one, your organizer can enter a manual handicap."
   }
  ]
 }
];
