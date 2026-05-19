export interface HelpArticle {
  key: string;
  title: string;
  description: string;
  steps: string[];
  tips?: string[];
  commonIssues?: { issue: string; solution: string }[];
}

export interface HelpSection {
  label: string;
  articles: HelpArticle[];
}

export const STEP_BY_STEP_HELP: HelpSection[] = [
  {
    label: "Organizer Setup",
    articles: [
      {
        key: "planning-guide",
        title: "Planning Guide",
        description:
          "A 30-step interactive checklist that walks you through every milestone of organizing a successful tournament, from 12 months out through post-event wrap-up.",
        steps: [
          "Go to Organizer Setup → Planning Guide in your dashboard.",
          "Review the timeline of tasks grouped by 12 Months, 6 Months, 3 Months, 1 Month, Week Of, and Post Event.",
          "Click any task to expand the description and recommended action.",
          "Check off tasks as you complete them — progress saves automatically.",
          "Use the due dates (auto-calculated from your tournament date) to stay on schedule.",
        ],
        tips: [
          "Set your tournament date early so due dates calculate correctly.",
          "Assign tasks to team members in the Team Management section.",
        ],
        commonIssues: [
          {
            issue: "Due dates aren't showing.",
            solution: "Make sure your tournament has a date set in Tournament Details.",
          },
        ],
      },
      {
        key: "setup-checklist",
        title: "Setup Checklist",
        description:
          "The quick-start checklist of the essential platform tasks (payouts, course, registration, site, sponsors) you must complete before launching your tournament.",
        steps: [
          "Go to Organizer Setup → Setup Checklist.",
          "Work top-to-bottom through each task — most link directly to the relevant settings page.",
          "Items auto-complete as you finish their underlying task (e.g., publishing your site).",
          "Use 'View Tournament' to preview your live page once enough items are checked.",
        ],
        tips: ["Aim for 100% completion before opening registration to the public."],
      },
    ],
  },
  {
    label: "Course Setup",
    articles: [
      {
        key: "course-details",
        title: "Course Details",
        description:
          "Enter information about the golf course — par, course rating, slope rating, and hole-by-hole data. Used for handicap calculations and scorecards.",
        steps: [
          "Go to Course Setup → Course Details.",
          "Enter the course name and select the tee set (Blue, White, Red, etc.).",
          "Enter total par for 18 holes (e.g., 72).",
          "Enter the Course Rating and Slope Rating from the course scorecard.",
          "For each hole 1–18, enter Par, Stroke Index, and Distance.",
          "Click Save Course Details.",
        ],
        tips: [
          "Course Rating and Slope are usually on the course's scorecard or website.",
          "Stroke Indexes must be unique — each number 1–18 used exactly once.",
        ],
        commonIssues: [
          { issue: "Par total doesn't match sum of holes.", solution: "Double-check your hole-by-hole entries." },
          { issue: "Slope rating seems off.", solution: "Typical range is 55–155; most courses are 113–135." },
        ],
      },
      {
        key: "pin-sheets",
        title: "Pin Sheets",
        description: "Generate printable pin placement sheets for each hole, useful for tournament day caddies and players.",
        steps: [
          "Go to Course Setup → Pin Sheets.",
          "Select the round or day you want to generate sheets for.",
          "Enter pin position (front/middle/back) and distance for each hole.",
          "Click Generate PDF to download a printable pin sheet.",
        ],
        tips: ["Print on waterproof paper for outdoor durability."],
      },
      {
        key: "handicap-settings",
        title: "Handicap Settings",
        description: "Configure how handicaps are calculated and applied for net scoring in your tournament.",
        steps: [
          "Go to Course Setup → Handicap Settings.",
          "Choose your handicap source (USGA, WHS, or manual).",
          "Set the handicap allowance percentage (e.g., 95% for stroke play).",
          "Enable or disable maximum handicap caps.",
          "Save your settings.",
        ],
        tips: ["95% allowance is standard for most stroke-play events."],
      },
    ],
  },
  {
    label: "Tournament Setup",
    articles: [
      {
        key: "tournament-details",
        title: "Tournament Details",
        description: "Set the core information about your tournament: title, date, location, format, and description.",
        steps: [
          "Go to Tournament Setup → Tournament Details.",
          "Enter the title, date, start time, and course name.",
          "Choose the scoring format (Scramble, Best Ball, Stroke Play, etc.).",
          "Add a description that will appear on your public tournament page.",
          "Save your changes.",
        ],
      },
      {
        key: "registration-form",
        title: "Registration Form",
        description: "Configure registration options including fees, custom questions, team sizes, and what golfers see when signing up.",
        steps: [
          "Go to Tournament Setup → Registration Form.",
          "Set your registration fee (per player or per team).",
          "Choose team size (1, 2, or 4 players).",
          "Add custom questions (shirt size, dietary restrictions, etc.).",
          "Toggle Open Registration when ready to accept signups.",
        ],
        tips: ["Test the public registration page yourself before sharing it."],
        commonIssues: [
          {
            issue: "Players can't register.",
            solution: "Confirm Open Registration is toggled on and your payout method is connected.",
          },
        ],
      },
      {
        key: "sponsorship-tiers",
        title: "Sponsorship Management",
        description: "Create sponsorship packages (Title, Hole, Cart, etc.) with custom benefits and pricing for sponsors to purchase online.",
        steps: [
          "Go to Tournament Setup → Sponsorship Management.",
          "Click Add Tier and enter the name (e.g., Title Sponsor, Hole Sponsor).",
          "Set the price and number of spots available.",
          "List benefits included (logo placement, signage, etc.).",
          "Save and share the public sponsor registration link.",
        ],
        tips: ["Limit Title sponsorship to 1 spot for exclusivity."],
      },
      {
        key: "lodging",
        title: "Lodging",
        description: "Add hotel and lodging recommendations for out-of-town players, with booking links and group rate codes.",
        steps: [
          "Go to Tournament Setup → Lodging.",
          "Click Add Hotel and enter name, address, and booking URL.",
          "Add a group rate code if you've negotiated one.",
          "Mark recommended hotels to highlight them on the public page.",
        ],
      },
      {
        key: "team-management",
        title: "Team Management",
        description: "Invite teammates and assign granular permissions (registration, finances, scoring, etc.) for collaboration on tournament operations.",
        steps: [
          "Go to Tournament Setup → Team Management.",
          "Click Invite Member and enter their email address.",
          "Select which permissions they should have.",
          "Send the invitation — they'll receive an email to accept.",
        ],
        tips: ["Use least-privilege: only grant the permissions each person needs."],
      },
      {
        key: "organization-info",
        title: "Organization Info",
        description: "Manage your organization's profile — name, logo, contact info, and 501(c)(3) status for tax-exempt receipts.",
        steps: [
          "Go to Tournament Setup → Organization Info.",
          "Upload your logo and enter contact details.",
          "If you're a nonprofit, enter your EIN and 501(c)(3) status.",
          "Save your changes.",
        ],
      },
    ],
  },
  {
    label: "Promotion & Marketing",
    articles: [
      {
        key: "share-promote",
        title: "Share & Promote",
        description: "Get shareable links, QR codes, and social media graphics to promote your tournament.",
        steps: [
          "Go to Promotion & Marketing → Share & Promote.",
          "Copy the public tournament URL or download the QR code.",
          "Use the tracked ?ref links for email and social campaigns.",
          "Download pre-sized social graphics for Instagram, Facebook, and LinkedIn.",
        ],
      },
      {
        key: "flyer-studio",
        title: "Flyer Studio",
        description: "Design custom event flyers using Canva templates pre-filled with your tournament details.",
        steps: [
          "Go to Promotion & Marketing → Flyer Studio.",
          "Choose a template style.",
          "Click Open in Canva to customize colors, photos, and copy.",
          "Download as PDF or PNG to print or share.",
        ],
      },
      {
        key: "printables",
        title: "Printables",
        description: "Generate print-ready PDFs for scorecards, cart signs, hole assignments, name badges, sponsor signs, and alpha lists.",
        steps: [
          "Go to Promotion & Marketing → Printables.",
          "Select the tab for the document you need (Scorecards, Cart Signs, etc.).",
          "Customize any inline content overrides.",
          "Click Generate PDF and print.",
        ],
        tips: ["Print scorecards on cardstock so they survive a round of golf."],
      },
      {
        key: "email-templates",
        title: "Email Templates",
        description: "Customize the wording of transactional emails (registration confirmation, reminders, refunds) sent to players.",
        steps: [
          "Go to Promotion & Marketing → Email Templates.",
          "Select a template to edit.",
          "Update subject line and body — use merge fields like {{first_name}}.",
          "Send yourself a test email, then save.",
        ],
      },
      {
        key: "public-search",
        title: "Public Search",
        description: "Control whether your tournament appears in the public TeeVents tournament search directory.",
        steps: [
          "Go to Promotion & Marketing → Public Search.",
          "Toggle Show in Public Search on or off.",
          "Add tags (charity, scramble, etc.) to improve discoverability.",
        ],
      },
    ],
  },
  {
    label: "Operations",
    articles: [
      {
        key: "players",
        title: "Players",
        description: "View, edit, import, and manage all registered players. Assign handicaps, group numbers, and tee times.",
        steps: [
          "Go to Operations → Players.",
          "Click a player to edit details or assign a group/tee time.",
          "Use Import Players to upload a CSV of pre-registered golfers.",
          "Export the roster anytime for printing or backup.",
        ],
      },
      {
        key: "waitlist",
        title: "Waitlist",
        description: "Manage an automated waitlist when registration is full. Players are offered spots in order with a 24-hour claim window.",
        steps: [
          "Go to Operations → Waitlist.",
          "When a spot opens, click Offer Spot next to the next person.",
          "They receive an email with a 24-hour claim link.",
          "If they don't claim, the offer rolls to the next person automatically.",
        ],
      },
      {
        key: "check-in",
        title: "Check-In",
        description: "Check players in on event day. Use QR code scanning or manual lookup for a fast registration table.",
        steps: [
          "Go to Operations → Check-In.",
          "Search for a player or scan their QR code.",
          "Mark them as checked in.",
          "Print or hand them their name badge and scorecard.",
        ],
      },
      {
        key: "tee-sheet",
        title: "Tee Sheet",
        description: "Build and manage the tee sheet — assign players to groups, holes, and tee times for shotgun or staggered starts.",
        steps: [
          "Go to Operations → Tee Sheet.",
          "Choose start format (Shotgun or Tee Times).",
          "Drag and drop players into groups.",
          "Assign each group to a starting hole or tee time.",
          "Print or share the finalized sheet.",
        ],
      },
      {
        key: "live-leaderboard",
        title: "Live Leaderboard",
        description: "Real-time leaderboard that updates as scores come in. Shareable with players and spectators via public URL.",
        steps: [
          "Go to Operations → Live Leaderboard.",
          "Configure display options (gross/net, sponsor banner, ticker).",
          "Copy the public leaderboard link to share.",
          "Cast on a screen at the clubhouse for live viewing.",
        ],
      },
      {
        key: "scoring",
        title: "Scoring",
        description: "Manage live scoring — enter scores manually or let players self-score via their personal hub link.",
        steps: [
          "Go to Operations → Scoring.",
          "Select a group to enter scores hole-by-hole.",
          "Save each hole — leaderboard updates instantly.",
          "Verify and lock scorecards when the round ends.",
        ],
      },
      {
        key: "test-simulator",
        title: "Test Simulator",
        description: "Practice scoring with sample data before event day so you and your team are comfortable with the workflow.",
        steps: [
          "Go to Operations → Test Simulator.",
          "Click Generate Sample Round.",
          "Practice entering scores, viewing the leaderboard, and locking cards.",
          "Reset anytime to start over.",
        ],
      },
      {
        key: "sponsor-management",
        title: "Sponsor Management",
        description: "Manage confirmed sponsors — upload logos, assign hole numbers, and track sponsorship payments.",
        steps: [
          "Go to Operations → Sponsor Management.",
          "Review confirmed sponsors and their tier.",
          "Upload logos and assign hole/sign numbers.",
          "Mark sponsors as paid if collected offline.",
        ],
      },
      {
        key: "volunteers",
        title: "Volunteers",
        description: "Recruit and assign volunteers to stations like registration, contests, beverage cart, and scoring.",
        steps: [
          "Go to Operations → Volunteers.",
          "Click Add Volunteer or share the public signup link.",
          "Assign each volunteer to a role and time slot.",
          "Email assignments and the event timeline before event day.",
        ],
      },
      {
        key: "vendors",
        title: "Vendors",
        description: "Manage vendor booths — accept registrations, collect documents, and assign hole locations.",
        steps: [
          "Go to Operations → Vendors.",
          "Create vendor tiers with pricing and benefits.",
          "Share the public vendor signup URL.",
          "Review applications and approve vendors.",
        ],
      },
      {
        key: "side-events",
        title: "Side Events",
        description: "Sell tickets for add-on events like dinners, putting contests, or skill challenges alongside the main tournament.",
        steps: [
          "Go to Operations → Side Events.",
          "Click Add Side Event — enter name, price, and capacity.",
          "Players can add tickets during registration or via a direct link.",
          "Track tickets sold in real time.",
        ],
      },
      {
        key: "team-performance",
        title: "Team Performance",
        description: "Track how your team and promoters are performing — registrations driven, revenue generated, and engagement.",
        steps: [
          "Go to Operations → Team Performance.",
          "Review per-promoter referral counts and revenue.",
          "Share unique ref codes with team members for tracking.",
        ],
      },
      {
        key: "contests",
        title: "Event Day Contests",
        description: "Configure on-course contests — closest to pin, longest drive, hole-in-one — and track winners.",
        steps: [
          "Go to Operations → Event Day Contests.",
          "Click Add Contest and pick the type and hole.",
          "Assign a volunteer to officiate.",
          "Enter the winner during or after the round.",
        ],
      },
      {
        key: "messages",
        title: "Messages",
        description: "Two-way messaging with players and a direct inbox to TeeVents support.",
        steps: [
          "Go to Operations → Messages.",
          "Compose a message to all players or a specific group.",
          "View replies in the threaded inbox.",
        ],
      },
    ],
  },
  {
    label: "Finance",
    articles: [
      {
        key: "finances",
        title: "Finances",
        description: "Dashboard of all transactions — registrations, sponsorships, store sales, donations — with revenue tracking.",
        steps: [
          "Go to Finance → Finances.",
          "Review revenue by category and date range.",
          "Export transactions to CSV for accounting.",
        ],
      },
      {
        key: "payout-settings",
        title: "Payout Settings",
        description: "Connect your Stripe Connect account and choose how you'd like to receive funds (Stripe auto, PayPal, or check).",
        steps: [
          "Go to Finance → Payout Settings.",
          "Click Connect Stripe and complete Stripe onboarding.",
          "Choose your preferred payout method.",
          "Verify your bank account once connected.",
        ],
        commonIssues: [
          {
            issue: "Checkout is blocked.",
            solution: "Your Stripe account must show charges_enabled. Finish all required Stripe verification steps.",
          },
        ],
      },
      {
        key: "budget",
        title: "Budget",
        description: "Build a tournament budget — project revenue and expenses, compare to actuals, and see your net.",
        steps: [
          "Go to Finance → Budget.",
          "Enter projected revenue line items (registration, sponsorships, donations).",
          "Enter projected expenses (course, food, prizes).",
          "Actual amounts auto-update from real transactions.",
        ],
      },
      {
        key: "add-on-store",
        title: "Add On Store",
        description: "Sell branded merchandise and add-ons (shirts, mulligans, drink tickets) to players from your tournament page.",
        steps: [
          "Go to Finance → Add On Store.",
          "Click Add Product and enter name, price, and image.",
          "Set inventory limits if needed.",
          "Products appear in the public store on your tournament page.",
        ],
      },
      {
        key: "director-shop",
        title: "Director Shop",
        description: "Shop the TeeVents-curated catalog of platform merchandise — signage, banners, and tournament supplies.",
        steps: [
          "Go to Finance → Director Shop.",
          "Browse products and add to cart.",
          "Check out — items ship directly to you.",
        ],
      },
    ],
  },
  {
    label: "Post-Event",
    articles: [
      {
        key: "surveys",
        title: "Surveys & Feedback",
        description: "Send a post-event survey to players and sponsors to gather feedback for next year.",
        steps: [
          "Go to Post-Event → Surveys & Feedback.",
          "Choose a template or build custom questions.",
          "Send to all registered players automatically.",
          "Review responses in the dashboard.",
        ],
      },
      {
        key: "gallery",
        title: "Photo Gallery",
        description: "Upload event photos to a public gallery on your tournament page.",
        steps: [
          "Go to Post-Event → Photo Gallery.",
          "Drag and drop photos to upload.",
          "Reorder and caption photos as needed.",
          "Toggle the gallery visible on your public site.",
        ],
      },
      {
        key: "donations",
        title: "Donations",
        description: "Accept tax-deductible donations alongside your tournament — great for 501(c)(3) fundraisers.",
        steps: [
          "Go to Post-Event → Donations.",
          "Set suggested donation amounts.",
          "Enable the donation button on your public page.",
          "Donors receive tax-exempt receipts automatically (if your org is verified 501(c)(3)).",
        ],
      },
      {
        key: "auctions",
        title: "Auctions",
        description: "Run silent or live auctions for fundraising items with real-time bidding.",
        steps: [
          "Go to Post-Event → Auctions.",
          "Click Add Item — upload photos, starting bid, and description.",
          "Set auction start and end times.",
          "Share the auction link with attendees.",
        ],
      },
      {
        key: "raffles",
        title: "Raffles",
        description: "Sell raffle tickets online or at the event with automated draw and winner notification.",
        steps: [
          "Go to Post-Event → Raffles.",
          "Add raffle prizes with images and ticket prices.",
          "Share the ticket purchase link.",
          "Draw winners through the dashboard when ready.",
        ],
      },
      {
        key: "media-clips",
        title: "Media Clips",
        description: "Upload short video clips and highlights to share on your tournament page and socials.",
        steps: [
          "Go to Post-Event → Media Clips.",
          "Upload videos (MP4 recommended).",
          "Add titles and captions.",
          "Toggle clips visible on the public site.",
        ],
      },
      {
        key: "day-of",
        title: "Day-Of Page",
        description: "A mobile-friendly event-day page for players with the schedule, hole assignments, scoring link, and announcements.",
        steps: [
          "Go to Post-Event → Day-Of Page.",
          "Configure what sections appear (timeline, contests, announcements).",
          "Share the day-of URL with players via email or QR code.",
        ],
      },
    ],
  },
  {
    label: "Settings",
    articles: [
      {
        key: "general-settings",
        title: "General Settings",
        description: "Manage account-level preferences, notifications, refund policies, and integrations.",
        steps: [
          "Go to Settings → General Settings.",
          "Update notification preferences for emails and SMS.",
          "Configure refund policy text shown in confirmation emails.",
          "Save changes.",
        ],
      },
      {
        key: "help-center",
        title: "Help Center",
        description: "Browse help articles, step-by-step guides, and contact TeeVents support.",
        steps: [
          "Go to Settings → Help Center.",
          "Search articles or browse by topic.",
          "Use Step-by-Step Instructions for detailed walkthroughs of every menu item.",
          "Contact support if you can't find an answer.",
        ],
      },
    ],
  },
];
