import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadHtmlAsPdf } from "@/components/printables/printUtils";

type Feature = {
  num: number;
  name: string;
  description: string;
};

type Phase = {
  phase: string;
  blurb: string;
  features: Feature[];
};

const phases: Phase[] = [
  {
    phase: "Phase 1 — Concept & Account Setup",
    blurb: "Everything an organizer does before the tournament exists publicly: account creation, organization profile, plan selection, and back-office setup.",
    features: [
      { num: 1, name: "Organizer Sign-Up & Authentication", description: "Secure email/password account creation with optional Google OAuth. Email verification, password reset, and session management included. Organizers can invite team members later through the Team Management module." },
      { num: 2, name: "Organization Profile", description: "Create an organization (golf club, charity, business, school) with logo, contact details, address, website, and tax-ID. The organization is the parent record for every tournament, sponsor, store, and payout." },
      { num: 3, name: "Subscription Plan Selection", description: "Choose Base (free), Starter ($299/event), or Premium ($999/event). Plan controls which modules are unlocked. Upgrade at any time from the dashboard with prorated Stripe billing." },
      { num: 4, name: "Nonprofit / 501(c)(3) Mode", description: "Toggle nonprofit status, store EIN, and enable tax-deductible language on receipts and donation pages. Confirmation emails automatically include IRS-compliant receipt language." },
      { num: 5, name: "Team Management & Roles (RBAC)", description: "Invite staff, board members, or volunteers via email with one of 14 granular permissions (registration, sponsors, finances, scoring, etc.). Members accept invites through a secure link and inherit only the access you assign." },
      { num: 6, name: "Payout Method Setup", description: "Connect Stripe Connect (1–3 day automatic payouts), enroll in PayPal bi-weekly transfers, or request paper checks. All registration and fundraising revenue routes here automatically — TeeVents never holds organizer funds." },
      { num: 7, name: "Notification Preferences", description: "Choose which events trigger emails (new registration, sponsor commitment, refund request, low-inventory alerts) and which addresses receive them. Per-user toggles for the entire team." },
    ],
  },
  {
    phase: "Phase 2 — Tournament Setup",
    blurb: "Building the tournament record itself: dates, format, course, pricing, branding, and the public website.",
    features: [
      { num: 8, name: "Tournament Creation Wizard", description: "Create a new tournament with title (auto-suggested from course name), date, format, course, and field size. The 30-step Planning Guide auto-loads the moment the tournament is created." },
      { num: 9, name: "Course Details & Slope/Rating", description: "Enter course name, address, par, slope, course rating, and stroke index per hole. These values feed the USGA handicap engine for accurate Net scoring." },
      { num: 10, name: "Scoring Format Configuration", description: "Pick from 8 formats: Stroke Play, Scramble, Best Ball, Modified Stableford, Skins, Match Play, Chapman, and Shamble. Stableford point values are fully customizable." },
      { num: 11, name: "Handicap Settings", description: "Enable USGA-compliant handicap calculations, set allowance percentages by format (e.g., 90% for Best Ball), and choose whether to display Gross, Net, or both on the leaderboard." },
      { num: 12, name: "Site Builder & Public Website", description: "Pick from six professional templates, customize colors/fonts/logo, drag-and-drop public sections (Leaderboard, Sponsors, Auction, Donations, Photos, etc.), and publish a branded tournament site at /tournament/your-slug." },
      { num: 13, name: "Custom Domain Connection", description: "Connect a custom domain (yourtournament.com) via Cloudflare for SaaS. CNAME or A-record DNS instructions provided. SSL certificates issued automatically." },
      { num: 14, name: "Pricing & Fee Pass-Through", description: "Set registration price (individual and team), add-ons, and decide whether the golfer pays the 5% platform fee + Stripe fees or the organizer absorbs them. Math is shown transparently on the public checkout." },
      { num: 15, name: "Refund & Rain Policy", description: "Define refund windows and rain-out policy text. The policy is delivered through registration confirmation emails (not displayed publicly) so guests know how to request a refund." },
      { num: 16, name: "Promo Codes", description: "Create percent-off or fixed-amount discount codes with usage limits and expiration dates. Codes can be restricted to specific tournaments or apply org-wide." },
    ],
  },
  {
    phase: "Phase 3 — Promotion & Marketing",
    blurb: "Driving registrations and sponsor commitments through built-in marketing tools.",
    features: [
      { num: 17, name: "Share & Promote Hub", description: "Generate trackable short links (with ?ref= parameters), QR codes, and pre-written templates for email, SMS, Facebook, LinkedIn, and Instagram. Every share is attributed in analytics." },
      { num: 18, name: "Flyer Studio (Premium)", description: "Canva-integrated template library for printable flyers, social posts, and sponsor decks. Branded with your tournament logo and colors automatically." },
      { num: 19, name: "Team Performance / Referral Tracking", description: "Add board members, volunteers, or staff and give each a unique referral link. Dashboard leaderboard shows registrations and revenue driven by each promoter for incentive programs." },
      { num: 20, name: "Email & SMS Messaging", description: "Send blasts to all players, specific groups, sponsors, or volunteers. Schedule sends, use templates, and track open/click rates. SMS available on Starter and Premium plans." },
      { num: 21, name: "Public Search Listing (Premium)", description: "Opt the tournament into the TeeVents public tournament search at teevents.golf/events. Filter by state, date, fundraiser status, and format." },
      { num: 22, name: "Visitor Analytics", description: "Real-time tracking of public-site visitors, traffic sources, share-link performance, and conversion to registration. Helps measure marketing ROI." },
    ],
  },
  {
    phase: "Phase 4 — Registration, Sponsorships & Fundraising",
    blurb: "Collecting money: golfer registrations, sponsor commitments, donations, auction bids, and merchandise sales.",
    features: [
      { num: 23, name: "Online Registration", description: "Single-player or team registration with custom fields (handicap, shirt size, dietary needs). Stripe Checkout supports cards, Apple Pay, and Google Pay. 5% platform fee + Stripe fees split automatically via destination charges." },
      { num: 24, name: "Group Confirmation Emails", description: "When a captain registers a team, every player on the team receives an individual confirmation with their tee time, hole assignment, and refund-request link." },
      { num: 25, name: "Waitlist Management", description: "Automatically queue golfers when registration is full. When a spot opens, send a one-click 'Offer Spot' email with a 24-hour claim window before rolling to the next person." },
      { num: 26, name: "Sponsor Portal & Tiered Packages", description: "Define sponsor tiers (Title, Eagle, Hole, etc.) with benefits and prices. Sponsors register through a public page, upload their logo, pay online, and receive tax-deductible receipts." },
      { num: 27, name: "Sponsorship Pages", description: "Standalone landing pages per sponsor tier or per hole, with photos, ROI metrics, and a 'Become a Sponsor' CTA. Shareable individually." },
      { num: 28, name: "Donation Page (Premium)", description: "Public donation page with a live progress bar against your fundraising goal. One-time and recurring options. Tax receipts emailed automatically for nonprofit organizations." },
      { num: 29, name: "Silent Auction & 50/50 Raffle (Premium)", description: "Mobile-friendly bidding portal — bidders register with phone number and place bids from their phone. Buy-Now option, automatic outbid notifications, winner emails, and Stripe checkout for collection." },
      { num: 30, name: "Add-On Store / Merchandise (Premium)", description: "Sell mulligans, skins entry, branded merchandise, dinner tickets, or anything else. Inventory tracking, photos, variants, and seamless add-on at registration checkout." },
      { num: 31, name: "Vendor Registration", description: "Public registration for vendors/exhibitors with booth fees, electricity/table requests, and W-9 collection. Pays online via Stripe." },
    ],
  },
  {
    phase: "Phase 5 — Pre-Tournament Planning",
    blurb: "The operational work in the days and weeks leading up to game day.",
    features: [
      { num: 32, name: "30-Step Planning Guide", description: "Interactive checklist that auto-loads with every tournament — phased from 12 months out to game day. Mark items complete, assign to team members, and track overall readiness percentage." },
      { num: 33, name: "Player Management", description: "Master list of all registered players with contact info, handicap, payment status, group assignment, hole, and tee time. Bulk import via CSV, export anytime." },
      { num: 34, name: "Pairings & Tee Sheet", description: "Drag-and-drop foursome builder, or auto-pair by handicap, team, or sponsor group. Assign tee times, holes (shotgun start), and carts. Print or push to scorecards." },
      { num: 35, name: "Volunteer Coordination", description: "Recruit volunteers through a public sign-up page, assign shifts, send shift-reminder emails/SMS, and check them in on game day." },
      { num: 36, name: "Contests Setup", description: "Configure on-course contests: Long Drive, Closest to the Pin, Hole-in-One. Assign sponsors per contest, generate signage, and capture winners through the live scoring app." },
      { num: 37, name: "Printables Studio", description: "One-click generation of scorecards (with QR codes for live scoring), cart signs, name badges, alpha-list, hole-assignment sheets, and sponsor signs. Customizable inline content overrides." },
      { num: 38, name: "Hole-in-One Insurance (Premium)", description: "Built-in workflow to purchase and document hole-in-one prize insurance through TeeVents partner providers." },
      { num: 39, name: "Organizer Support / Two-Way Messaging", description: "In-dashboard messaging that routes directly to TeeVents admin inbox. Get human help with setup, billing, or game-day issues." },
    ],
  },
  {
    phase: "Phase 6 — Tournament Day",
    blurb: "Live execution: check-in, scoring, leaderboard, and on-course fundraising.",
    features: [
      { num: 40, name: "QR Code Check-In", description: "Open the Scan Station on a phone or tablet, scan player QR codes from confirmation emails, and check golfers in instantly. Manual search fallback for walk-ups. Real-time check-in counter on the dashboard." },
      { num: 41, name: "Volunteer Check-In", description: "Same QR-based flow for volunteers. Each volunteer receives a digital badge with their assigned shift and station." },
      { num: 42, name: "Live Scoring (Player-Facing)", description: "Players scan a 6-character code on their group's scorecard — no app or login required. Enter scores hole-by-hole on a phone. Designated scorer per group, optional peer attestation." },
      { num: 43, name: "Live Leaderboard (Starter+)", description: "Real-time leaderboard updates as scores are entered. Gross and Net views, supports all 8 scoring formats. Sortable by player, team, division, or flight." },
      { num: 44, name: "Live Display Mode", description: "TV-optimized leaderboard at /live/{slug}: dark background, large fonts, auto-scroll, perfect for the clubhouse screen. Includes rotating sponsor banner and scrolling ticker." },
      { num: 45, name: "Sponsor Promotion on Leaderboard", description: "Configure rotating sponsor banner ads and a scrolling ticker on the live leaderboard for added sponsor ROI. Set rotation speed, image priority, and click-through URLs." },
      { num: 46, name: "Live Auction & Donations Tracking", description: "Real-time view of auction bids, donation totals, and 50/50 raffle pool. Run the entire fundraising operation from the dashboard during the round." },
    ],
  },
  {
    phase: "Phase 7 — Post-Tournament & Wrap-Up",
    blurb: "Finalizing scores, distributing prizes, paying out, and closing the books.",
    features: [
      { num: 47, name: "Final Results & Winner Determination", description: "Lock the leaderboard, apply tiebreakers (countback, scorecard playoff, etc.), and certify final standings. Winners exported for printing certificates or check distribution." },
      { num: 48, name: "Photo Gallery", description: "Upload event photos to the public tournament site. Sponsors and players can view and download. Organized by date or hole." },
      { num: 49, name: "Post-Event Surveys (Premium)", description: "Automated feedback survey emailed to all participants 24 hours after the event. Star ratings plus open-ended questions. Results aggregated in the dashboard." },
      { num: 50, name: "Finances Dashboard", description: "Full transaction history (registrations, sponsors, donations, auction, store), revenue by category, paid/unpaid breakdown, and budget vs. actual. CSV export for accounting." },
      { num: 51, name: "Budget Tracking", description: "Set planned expenses (course fee, food, prizes, gifts) and log actuals as bills come in. Side-by-side budget vs. actual report shows tournament profitability." },
      { num: 52, name: "Refund Management", description: "Players request refunds via the link in their confirmation email. Organizer reviews each request, approves/declines with one click, and Stripe processes the refund automatically." },
      { num: 53, name: "Stripe Payouts", description: "Net proceeds (registration + fundraising minus 5% TeeVents fee minus Stripe fees) deposited to the organizer's bank account in 1–3 business days via Stripe Connect destination charges." },
      { num: 54, name: "1099-K & Tax Reporting", description: "Stripe Connect handles 1099-K issuance directly to organizers meeting the IRS reporting thresholds. Tax-deductible donation receipts archived in the dashboard." },
      { num: 55, name: "Tax-Deductible Receipts (Nonprofits)", description: "Branded receipts emailed automatically for every donation, sponsorship, and registration where applicable. PDF copies stored for organizer download and re-send." },
      { num: 56, name: "Tournament Archive & Re-Use", description: "Past tournaments are archived in the dashboard with all data intact. Clone any past tournament to start next year's setup in one click — pricing, sponsors, tee sheet template all carried over." },
    ],
  },
];

function buildPdfHtml(): string {
  const phaseHtml = phases.map((p) => {
    const featureRows = p.features.map((f) => `
      <tr>
        <td class="num">${f.num}</td>
        <td class="name">${f.name}</td>
        <td class="desc">${f.description}</td>
      </tr>
    `).join("");
    return `
      <section class="phase">
        <h2>${p.phase}</h2>
        <p class="blurb">${p.blurb}</p>
        <table>
          <thead>
            <tr><th class="num">#</th><th class="name">Feature</th><th class="desc">Description</th></tr>
          </thead>
          <tbody>${featureRows}</tbody>
        </table>
      </section>
    `;
  }).join("");

  return `
    <style>
      body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1a1a1a; max-width: 880px; margin: 0 auto; }
      h1 { font-size: 26px; color: #1a5c38; border-bottom: 3px solid #1a5c38; padding-bottom: 8px; margin-bottom: 4px; }
      .subtitle { color: #555; font-size: 12px; margin-bottom: 18px; }
      h2 { font-size: 15px; color: #fff; background: #1a5c38; padding: 8px 12px; margin-top: 22px; border-radius: 4px; }
      .blurb { font-style: italic; color: #555; font-size: 11.5px; margin: 8px 4px 10px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 11px; }
      th, td { border: 1px solid #d4d4d4; padding: 7px 9px; text-align: left; vertical-align: top; }
      th { background: #f0f7f3; color: #1a5c38; font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; }
      td.num, th.num { width: 32px; text-align: center; font-weight: 700; color: #1a5c38; }
      td.name, th.name { width: 200px; font-weight: 600; color: #1a1a1a; }
      td.desc, th.desc { color: #333; line-height: 1.5; }
      .phase { page-break-inside: auto; }
      .footer { margin-top: 28px; text-align: center; color: #888; font-size: 10px; border-top: 1px solid #ddd; padding-top: 10px; }
      .toc { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 18px; margin-bottom: 22px; font-size: 11.5px; }
      .toc strong { color: #1a5c38; }
      .toc ol { margin: 8px 0 0 18px; padding: 0; }
      .toc li { margin: 3px 0; }
    </style>
    <h1>TeeVents — Complete Tournament Organizer Feature Guide</h1>
    <p class="subtitle">Every feature available to a tournament organizer, listed in chronological order from concept to completion. Generated ${new Date().toLocaleDateString()} · ${phases.reduce((n, p) => n + p.features.length, 0)} features across ${phases.length} phases.</p>

    <div class="toc">
      <strong>Lifecycle Overview</strong>
      <ol>
        ${phases.map((p) => `<li>${p.phase} — ${p.features.length} features</li>`).join("")}
      </ol>
    </div>

    ${phaseHtml}

    <p class="footer">© ${new Date().getFullYear()} TeeVents Golf · Internal admin reference document · teevents.golf</p>
  `;
}

export default function AdminFeatureGuide() {
  const totalFeatures = phases.reduce((n, p) => n + p.features.length, 0);

  const handleDownload = () => {
    downloadHtmlAsPdf("TeeVents — Complete Tournament Organizer Feature Guide", buildPdfHtml());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Organizer Feature Guide
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Complete line-item document of every feature available to tournament organizers, organized in chronological order from initial concept to post-tournament wrap-up. <strong>{totalFeatures} features across {phases.length} phases.</strong>
          </p>
        </div>
        <Button onClick={handleDownload} className="gap-2 self-start">
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>

      <div className="space-y-5">
        {phases.map((p, i) => (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-primary/10 border-b border-border px-5 py-3">
              <h3 className="font-semibold text-foreground">{p.phase}</h3>
              <p className="text-xs text-muted-foreground italic mt-0.5">{p.blurb}</p>
            </div>
            <div className="divide-y divide-border">
              {p.features.map((f) => (
                <div key={f.num} className="flex gap-4 px-5 py-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {f.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm">{f.name}</div>
                    <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
