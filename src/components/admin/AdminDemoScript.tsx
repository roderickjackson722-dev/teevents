import { Clock, MessageSquare, Monitor, Trophy, CreditCard, BarChart3, QrCode, CheckCircle, Sparkles, ArrowRight, Download, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadHtmlAsPdf } from "@/components/printables/printUtils";

type Section = {
  time: string;
  duration: string;
  title: string;
  icon: any;
  color: string;
  route?: string;
  intro?: string;
  points: string[];
  table?: { headers: string[]; rows: string[][] };
};

const sections: Section[] = [
  {
    time: "0:00 – 2:00",
    duration: "2 min",
    title: "Opening",
    icon: MessageSquare,
    color: "bg-primary/10 text-primary",
    points: [
      "\"Thanks for joining me. Today I'll show you how TeeVents helps you run better golf tournaments – from registration to payout.\"",
      "\"We have three plans: Base (free), Starter ($299 per event), and Premium ($999 per event). I'll show you which features are in each.\"",
      "Ask: \"Tell me about your tournament — how many players, is it a fundraiser, how do you manage it today?\"",
      "Listen for pain points: spreadsheets, manual check-in, no website, payment headaches, sponsor management struggles.",
    ],
  },
  {
    time: "2:00 – 7:00",
    duration: "5 min",
    title: "Core Features — Base Plan (Free)",
    icon: Monitor,
    color: "bg-emerald-500/10 text-emerald-600",
    route: "/sample-dashboard",
    intro: "\"These features come with every tournament, including our free Base plan:\"",
    points: [],
    table: {
      headers: ["Feature", "Description"],
      rows: [
        ["Dashboard & Overview", "Real-time registration counter, financial summary, recent activity feed"],
        ["Registration & Players", "Customizable registration form, player database with CSV export, QR check-in"],
        ["Finances", "Transaction history, payout settings, available balance tracking"],
        ["Share & Promote", "QR code generator, short tournament URLs, social media templates"],
        ["Planning Guide", "30-item checklist from 12 months out to post-event"],
        ["Printables", "Scorecards, cart signs, name badges, alpha list, sponsor signs, hole assignments"],
        ["Course Details", "Enter course rating, slope, hole pars, stroke indexes for handicap calculations"],
        ["Handicap System", "USGA-compliant Course Handicap calculation, stroke allocation (dots/pops per hole)"],
      ],
    },
  },
  {
    time: "7:00 – 12:00",
    duration: "5 min",
    title: "Starter Features — Upgrade ($299 per event)",
    icon: Trophy,
    color: "bg-amber-500/10 text-amber-600",
    route: "/sample-dashboard → Starter items",
    intro: "\"When you're ready for more, Starter adds:\"",
    points: [],
    table: {
      headers: ["Feature", "Description"],
      rows: [
        ["Waitlist Management", "Automatic queue with 'Offer Spot' buttons"],
        ["Live Leaderboard", "Real-time scores, embeddable on any website, sponsor logo rotation"],
        ["Display Mode Leaderboard", "Dedicated /live/{slug} route – dark mode, large fonts, TV-optimized, auto-refresh"],
        ["Sponsor QR Code", "Generate QR code for sponsor page sharing, download PNG"],
        ["Custom Tournament URL", "Editable /tournament/{custom-slug} (3 edits max, redirects from old URL)"],
        ["Scoring & Tee Sheet", "Score entry by group, drag-and-drop tee time grid"],
        ["Messages & Email Templates", "Email/SMS blasts, scheduled delivery, pre-written templates"],
        ["Sponsor Management", "Tiered sponsor portal with asset delivery, ROI tracking, logo upload"],
        ["Budget Tracking", "Income vs. expense by category, paid/unpaid status"],
        ["Photo Gallery", "Upload and showcase event photos on the public site"],
        ["Volunteer Coordination", "Shift scheduling, QR check-in, automated reminders"],
        ["Post-Event Surveys", "Feedback with ratings, text, and multiple choice questions"],
        ["Test Scoring Simulator", "Run mock tournament to test scoring, handicaps, leaderboard before going live"],
        ["Team Management", "Add team members with roles (Admin, Editor, Viewer) and permissions"],
      ],
    },
  },
  {
    time: "12:00 – 17:00",
    duration: "5 min",
    title: "Premium Features — All-Inclusive ($999 per event)",
    icon: Sparkles,
    color: "bg-violet-500/10 text-violet-600",
    route: "/sample-dashboard → Premium items",
    intro: "\"Premium is our all-inclusive plan for organizations running multiple tournaments or high-value fundraisers:\"",
    points: [
      "Adapt emphasis based on prospect needs:",
      "Fundraiser → Donations + Auction features",
      "Corporate outing → Add On Store + Gallery",
      "Club championship → Custom URL + Leaderboard Display Mode",
    ],
    table: {
      headers: ["Feature", "Description"],
      rows: [
        ["Add On Store", "Sell branded merchandise with Stripe checkout"],
        ["Silent Auction & Raffle", "Bidding, buy-now, winner tracking, raffle ticket sales"],
        ["Donation Tracking", "Fundraising page with progress bar and configurable goals"],
        ["Flyer Studio", "Canva-integrated template gallery for flyers, social posts, banners"],
        ["Director Shop", "Premium add-ons (consulting, signage, hole-in-one insurance)"],
        ["Leaderboard Gallery", "Upload live event photos that appear on the leaderboard display"],
        ["Public Tournament Search", "Opt-in to appear on /tournaments/search for increased visibility"],
        ["Everything in Base + Starter", "Plus priority support and reduced reserve rates"],
      ],
    },
  },
  {
    time: "17:00 – 20:00",
    duration: "3 min",
    title: "Pricing & Fee Model",
    icon: CreditCard,
    color: "bg-green-500/10 text-green-600",
    route: "/pricing",
    intro: "\"TeeVents charges a 5% platform fee per transaction. You choose who pays:\"",
    points: [
      "No holding: Funds are sent directly to your Stripe account at checkout (Stripe Connect). TeeVents never holds your money.",
    ],
    table: {
      headers: ["Model", "Golfer Pays", "You Receive"],
      rows: [
        ["Pass to Golfer", "Registration + 5% + Stripe fees", "100% of registration"],
        ["Absorb Fees", "Registration only", "Registration minus 5% minus Stripe fees (~$138.15 on $150)"],
      ],
    },
  },
  {
    time: "20:00 – 22:00",
    duration: "2 min",
    title: "Payouts & Payment Methods",
    icon: BarChart3,
    color: "bg-teal-500/10 text-teal-600",
    intro: "\"Get paid automatically with three payout options:\"",
    points: [
      "Default method: Check (manual) – funds held in TeeVents escrow until organizer configures payout.",
      "Stripe Connect: Automatic split at checkout – 5% to TeeVents, net to organizer.",
      "Admin oversight: TeeVents admin can see all organizers' payout status and pending funds.",
    ],
    table: {
      headers: ["Method", "Speed", "Fee", "Best For"],
      rows: [
        ["Stripe Connect (Recommended)", "1-3 business days", "No additional fee", "Most organizers"],
        ["PayPal (Manual)", "5-7 business days", "1% (min $0.50)", "Organizers without Stripe"],
        ["Check (Manual)", "Upon request", "No additional fee", "Organizations needing paper checks"],
      ],
    },
  },
  {
    time: "22:00 – 25:00",
    duration: "3 min",
    title: "Live Scoring & QR Scorecards",
    icon: QrCode,
    color: "bg-amber-500/10 text-amber-600",
    route: "/sample-dashboard → Leaderboard + Printables",
    points: [
      "Show the admin leaderboard — real-time scores, group-by-group.",
      "Navigate to Printables → Scorecards tab with QR codes.",
      "\"Players scan this code with their phone — no app download, no login. They enter scores hole-by-hole, and the leaderboard updates live.\"",
      "The flow: 1) Player scans QR code on scorecard 2) Phone opens scoring page (using their unique player code) 3) Enter gross scores per hole 4) System calculates net scores using their handicap 5) Leaderboard updates instantly (both Gross and Net views).",
      "This is the 'wow moment' — let it land.",
    ],
  },
  {
    time: "25:00 – 27:00",
    duration: "2 min",
    title: "QR Check-In & Volunteer Management",
    icon: CheckCircle,
    color: "bg-rose-500/10 text-rose-600",
    route: "/sample-dashboard → Check-In",
    points: [
      "Show real-time check-in counter.",
      "\"Open the Scan Station on any tablet, scan QR codes, and check players in instantly.\"",
      "Volunteer features: Shift scheduling with QR check-in, automated reminders before shifts, real-time check-in status in dashboard.",
      "Show manual search fallback for walk-ups.",
    ],
  },
  {
    time: "27:00 – 28:00",
    duration: "1 min",
    title: "Sponsor Management & Live Leaderboard Branding",
    icon: Megaphone,
    color: "bg-indigo-500/10 text-indigo-600",
    route: "/sample-dashboard → Sponsors + Live Leaderboard",
    intro: "\"Sponsors get a dedicated portal where they can:\"",
    points: [
      "Upload logos and digital assets",
      "Download tax receipts",
      "Track ROI with impression counts",
      "On the live leaderboard: sponsor logos appear in rotating banner or sidebar.",
      "Organizer controls placement (top, sidebar, footer).",
      "Increases sponsor visibility and retention.",
    ],
  },
  {
    time: "28:00 – 30:00",
    duration: "2 min",
    title: "Close & Next Steps",
    icon: ArrowRight,
    color: "bg-secondary/10 text-secondary",
    points: [
      "\"Which features are most important for your tournament? I can customize a plan for you.\"",
      "Address any questions or concerns.",
      "\"I can set up your tournament right now — takes just a few minutes.\"",
      "Share the sign-up link: teevents.golf/get-started",
      "If nonprofit: mention tax-deductible donation receipts and EIN verification.",
      "Follow up within 24 hours with a recap email.",
    ],
  },
];

const tips = [
  "Start from /sample-dashboard – it now shows EVERY feature with plan badges (🟢 Base, 🟡 Starter, 🟣 Premium) so prospects can see what they're getting.",
  "Let the QR scoring flow be your centerpiece – it's the most visually impressive feature. Show the player scanning and the leaderboard updating live.",
  "If they're currently using spreadsheets – show the CSV import and let them imagine the time saved.",
  "For nonprofits – lead with Donations + Auction features and mention Stripe Connect for direct payouts.",
  "Keep the Starter 'We build it for you' benefit – use as a closer for hesitant prospects.",
  "Point out the colored plan badges – 🟢 Base (free), 🟡 Starter ($299), 🟣 Premium ($999).",
  "Show Budget Tracker + Sponsor Management together – organizers love seeing the financial overview paired with sponsor ROI.",
  "Highlight the new custom URL feature – organizers can brand their tournament with /tournament/their-event-name.",
  "Demonstrate the live leaderboard display mode – /live/{slug} with dark mode, large fonts, TV-optimized.",
  "For multi-tournament organizations – emphasize team management (add staff with roles) and public tournament search.",
];

function buildPdfHtml(): string {
  const sectionHtml = sections
    .map((s) => {
      const tableHtml = s.table
        ? `<table>
            <thead><tr>${s.table.headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
            <tbody>${s.table.rows
              .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
              .join("")}</tbody>
          </table>`
        : "";
      const pointsHtml = s.points.length
        ? `<ul>${s.points.map((p) => `<li>${p}</li>`).join("")}</ul>`
        : "";
      const introHtml = s.intro ? `<p class="intro">${s.intro}</p>` : "";
      const routeHtml = s.route ? `<p class="route">Navigate to: <code>${s.route}</code></p>` : "";
      return `
        <section class="section">
          <h2>${s.title}</h2>
          <p class="meta"><strong>${s.time}</strong> · ${s.duration}</p>
          ${routeHtml}
          ${introHtml}
          ${pointsHtml}
          ${tableHtml}
        </section>
      `;
    })
    .join("");

  const tipsHtml = `<ol>${tips.map((t) => `<li>${t}</li>`).join("")}</ol>`;

  return `
    <style>
      body { font-family: 'Georgia', serif; color: #1a1a1a; max-width: 820px; margin: 0 auto; }
      h1 { font-size: 26px; color: #1a5c38; border-bottom: 3px solid #1a5c38; padding-bottom: 8px; margin-bottom: 8px; }
      h2 { font-size: 18px; color: #1a5c38; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
      h3 { font-size: 15px; color: #333; margin-top: 18px; }
      p, li, td, th { font-size: 12.5px; line-height: 1.6; }
      .meta { color: #666; font-size: 11px; margin: 4px 0; }
      .route { color: #555; font-size: 11px; margin: 4px 0; }
      .route code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; font-size: 11px; }
      .intro { font-style: italic; color: #333; margin: 8px 0; }
      ul, ol { padding-left: 22px; margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f0f7f3; color: #1a5c38; font-weight: 600; }
      .section { page-break-inside: avoid; }
      .footer { margin-top: 32px; text-align: center; color: #888; font-size: 10px; }
    </style>
    <h1>🏌️ 30-Minute Demo Script — TeeVents 2026 Edition</h1>
    <p style="color:#666;font-size:11px;">Updated agenda and talking points organized by plan tier (Base → Starter → Premium) · ${new Date().toLocaleDateString()}</p>
    ${sectionHtml}
    <h2>Pro Tips for Success</h2>
    ${tipsHtml}
    <p class="footer">© ${new Date().getFullYear()} TeeVents Golf · Confidential — For internal sales use only</p>
  `;
}

export default function AdminDemoScript() {
  const handleDownloadPdf = () => {
    downloadHtmlAsPdf("TeeVents 30-Minute Demo Script", buildPdfHtml());
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">30-Minute Demo Script — 2026 Edition</h2>
          <p className="text-muted-foreground mt-1">
            Updated agenda and talking points organized by plan tier (Base → Starter → Premium).
          </p>
        </div>
        <Button onClick={handleDownloadPdf} className="gap-2 self-start">
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>

      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-foreground text-lg">{s.title}</h3>
                  <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{s.time}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duration}</span>
                </div>
                {s.route && <p className="text-xs text-muted-foreground font-mono mt-1">{s.route}</p>}
                {s.intro && <p className="text-sm text-foreground italic mt-3">{s.intro}</p>}
                {s.points.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {s.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.table && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          {s.table.headers.map((h, k) => (
                            <th key={k} className="text-left p-2 bg-muted/50 border border-border font-medium text-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.table.rows.map((row, r) => (
                          <tr key={r}>
                            {row.map((cell, c) => (
                              <td key={c} className="p-2 border border-border text-muted-foreground align-top">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-6">
        <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-secondary" /> Pro Tips for Success
        </h3>
        <ol className="space-y-3 list-decimal list-inside">
          {tips.map((tip, i) => (
            <li key={i} className="text-sm text-muted-foreground">
              <span>{tip}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
