import { Clock, MessageSquare, Settings, Users, Megaphone, QrCode, Trophy, BarChart3, Mail, ArrowRight, Download, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadHtmlAsPdf } from "@/components/printables/printUtils";

type Section = {
  time: string;
  duration: string;
  phase: "Opening" | "Pre-Tournament" | "Tournament Day" | "Post-Tournament" | "Close";
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
    time: "0:00 – 1:00",
    duration: "1 min",
    phase: "Opening",
    title: "Opening & Discovery",
    icon: MessageSquare,
    color: "bg-primary/10 text-primary",
    points: [
      "\"Thanks for joining. In the next 15 minutes I'll walk you through TeeVents end-to-end — exactly how organizers run a tournament from setup to payout.\"",
      "Quick discovery: \"How many players, is it a fundraiser, and how are you running it today?\"",
      "Listen for pain points: spreadsheets, manual check-in, no website, payment headaches, sponsor tracking.",
    ],
  },

  // ────────────────── PRE-TOURNAMENT ──────────────────
  {
    time: "1:00 – 4:00",
    duration: "3 min",
    phase: "Pre-Tournament",
    title: "1. Build the Tournament Website",
    icon: Settings,
    color: "bg-emerald-500/10 text-emerald-600",
    route: "/sample-dashboard → Site Builder",
    intro: "\"Step one: a branded tournament website in under 10 minutes.\"",
    points: [
      "Show Site Builder: pick a template, drop in logo, set primary/accent colors.",
      "Public View tab: toggle public listing, choose state, enable countdown timer, drag-and-drop which sections appear (Leaderboard, Sponsors, Auction, Donations, etc.).",
      "Custom URL: /tournament/your-event-name — or connect your own custom domain.",
      "\"Click Publish — it's live. Share the link anywhere.\"",
    ],
  },
  {
    time: "4:00 – 6:00",
    duration: "2 min",
    phase: "Pre-Tournament",
    title: "2. Registration, Payments & Sponsors",
    icon: Users,
    color: "bg-blue-500/10 text-blue-600",
    route: "/sample-dashboard → Registration + Sponsors",
    intro: "\"Collect registrations, fees, and sponsor commitments — all in one place.\"",
    points: [
      "Online registration form (individual or team) with Stripe checkout — Apple Pay, Google Pay, all cards.",
      "Pass Fees toggle: golfer pays the 5% platform fee, or you absorb it. Funds go straight to your Stripe account — TeeVents never holds your money.",
      "Sponsor portal: tiered packages, sponsors upload logos, get tax receipts, and ROI tracking.",
      "Waitlist auto-fills sold-out events with one-click 'Offer Spot' emails.",
    ],
    table: {
      headers: ["Model", "Golfer Pays", "You Receive"],
      rows: [
        ["Pass to Golfer", "Reg + 5% + Stripe fees", "100% of registration"],
        ["Absorb Fees", "Registration only", "~$138.15 on $150 registration"],
      ],
    },
  },
  {
    time: "6:00 – 7:30",
    duration: "1.5 min",
    phase: "Pre-Tournament",
    title: "3. Promote with Marketing Tools",
    icon: Megaphone,
    color: "bg-amber-500/10 text-amber-600",
    route: "/sample-dashboard → Share & Promote + Flyer Studio",
    intro: "\"Built-in marketing — no separate Canva or email tool needed.\"",
    points: [
      "Share & Promote: branded QR codes, short URLs, ready-to-send Email/SMS/Facebook/LinkedIn templates.",
      "Flyer Studio (Premium): Canva-integrated templates for flyers and social posts.",
      "Messages: schedule email/SMS blasts to all players or specific groups.",
    ],
  },
  {
    time: "7:30 – 8:30",
    duration: "1 min",
    phase: "Pre-Tournament",
    title: "4. Plan the Event (Quick Browse)",
    icon: CheckCircle,
    color: "bg-teal-500/10 text-teal-600",
    route: "/sample-dashboard → Planning Guide, Pairings, Printables",
    intro: "\"A quick look at the prep tools that save hours:\"",
    points: [
      "30-step Planning Guide auto-loads with every tournament (12 months out → game day).",
      "Pairings & Tee Sheet: drag-and-drop foursomes, or auto-assign.",
      "Printables: scorecards (with QR codes), cart signs, name badges, alpha list, sponsor signs, hole assignments.",
      "Course Details: enter rating, slope, pars, stroke index — feeds USGA handicap calculations automatically.",
    ],
  },

  // ────────────────── TOURNAMENT DAY ──────────────────
  {
    time: "8:30 – 10:00",
    duration: "1.5 min",
    phase: "Tournament Day",
    title: "5. Check-In with QR Codes",
    icon: QrCode,
    color: "bg-rose-500/10 text-rose-600",
    route: "/sample-dashboard → Check-In",
    intro: "\"Game day starts here — check players in on a tablet in seconds.\"",
    points: [
      "Open Scan Station on any phone or tablet, scan player QR codes — done.",
      "Real-time check-in counter on the dashboard.",
      "Manual search fallback for walk-ups.",
      "Volunteer check-in works the same way with shift reminders.",
    ],
  },
  {
    time: "10:00 – 12:30",
    duration: "2.5 min",
    phase: "Tournament Day",
    title: "6. Live Scoring & Leaderboard ⭐",
    icon: Trophy,
    color: "bg-violet-500/10 text-violet-600",
    route: "/sample-dashboard → Leaderboard + Live Display",
    intro: "\"This is the wow moment — show it slowly and let it land.\"",
    points: [
      "Print scorecards include a unique QR code per group.",
      "Players scan with their phone — no app, no login. Enter scores hole-by-hole.",
      "System calculates net scores using each player's USGA handicap automatically.",
      "Leaderboard updates LIVE — Gross & Net views, supports 8 scoring formats (Stroke, Scramble, Best Ball, Stableford, Skins, etc.).",
      "Display Mode (/live/{slug}): dark mode, large fonts, TV-optimized — perfect for the clubhouse screen.",
      "Sponsor logos rotate on the leaderboard for added ROI.",
    ],
  },
  {
    time: "12:30 – 13:30",
    duration: "1 min",
    phase: "Tournament Day",
    title: "7. Fundraising During the Event (Quick Browse)",
    icon: Sparkles,
    color: "bg-pink-500/10 text-pink-600",
    route: "/sample-dashboard → Auction, Donations, Store",
    intro: "\"Premium fundraising tools that run alongside the round:\"",
    points: [
      "Silent Auction & 50/50 Raffle: bidding, buy-now, winner tracking — all from phones.",
      "Donations: live progress bar against your fundraising goal.",
      "Add-On Store: sell merchandise (mulligans, skins, branded gear) at checkout.",
    ],
  },

  // ────────────────── POST-TOURNAMENT ──────────────────
  {
    time: "13:30 – 14:30",
    duration: "1 min",
    phase: "Post-Tournament",
    title: "8. Payouts, Reporting & Follow-Up",
    icon: BarChart3,
    color: "bg-green-500/10 text-green-600",
    route: "/sample-dashboard → Finances + Surveys + Gallery",
    intro: "\"Wrap-up is just as automated as setup.\"",
    points: [
      "Finances: full transaction history, paid/unpaid status, budget vs. actual by category.",
      "Payouts: Stripe Connect (1-3 days, automatic), PayPal, or check on request.",
      "Post-event Surveys: automated feedback with ratings and open-ended questions.",
      "Photo Gallery: upload event photos to your public site for sponsors and players.",
      "Nonprofit mode: branded tax-deductible receipts emailed automatically.",
    ],
    table: {
      headers: ["Payout Method", "Speed", "Best For"],
      rows: [
        ["Stripe Connect", "1-3 business days", "Most organizers (recommended)"],
        ["PayPal Manual", "5-7 business days", "No Stripe account"],
        ["Check on Request", "Upon request", "Need paper checks"],
      ],
    },
  },

  // ────────────────── CLOSE ──────────────────
  {
    time: "14:30 – 15:00",
    duration: "30 sec",
    phase: "Close",
    title: "9. Pricing & Next Steps",
    icon: ArrowRight,
    color: "bg-secondary/10 text-secondary",
    intro: "\"Three simple plans — pick what fits your event:\"",
    points: [
      "Base (Free): registration, payments, dashboard, printables, planning guide, course/handicap.",
      "Starter ($299/event): live leaderboard, sponsors, waitlist, messages, tee sheet, custom URL.",
      "Premium ($999/event): auction, donations, store, flyer studio, public search listing — full all-inclusive.",
      "Always 5% platform fee per transaction. Funds go directly to you — no holding.",
      "Close: \"Want me to set this up for your tournament right now? Takes about 5 minutes.\"",
      "Send recap email within 24 hours with a sign-up link: teevents.golf/get-started",
    ],
  },
];

const tips = [
  "Always demo from /sample-dashboard — every menu item is pre-populated and tagged with a plan badge.",
  "Spend the most time on QR scoring + live leaderboard — it's the single most memorable feature.",
  "Anchor every section to a phase: 'Before the event…', 'On game day…', 'After the round…'. Helps prospects mentally map their workflow.",
  "Skim Premium fundraising features (auction/donations/store) unless prospect is a charity — then make them the centerpiece.",
  "If they currently use spreadsheets, drop in: 'How long does check-in/sponsor tracking/payment reconciliation usually take you?' — let them feel the pain.",
  "End on the 'Want me to set it up right now?' close. Most signups happen when momentum is highest.",
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
          <h2><span class="phase">${s.phase}</span> · ${s.title}</h2>
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
      h2 { font-size: 16px; color: #1a5c38; margin-top: 22px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
      .phase { display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; background: #1a5c38; color: #fff; padding: 2px 8px; border-radius: 10px; margin-right: 6px; vertical-align: middle; }
      h3 { font-size: 15px; color: #333; margin-top: 18px; }
      p, li, td, th { font-size: 12.5px; line-height: 1.55; }
      .meta { color: #666; font-size: 11px; margin: 4px 0; }
      .route { color: #555; font-size: 11px; margin: 4px 0; }
      .route code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; font-size: 11px; }
      .intro { font-style: italic; color: #333; margin: 8px 0; }
      ul, ol { padding-left: 22px; margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 7px; text-align: left; vertical-align: top; }
      th { background: #f0f7f3; color: #1a5c38; font-weight: 600; }
      .section { page-break-inside: avoid; }
      .footer { margin-top: 32px; text-align: center; color: #888; font-size: 10px; }
    </style>
    <h1>🏌️ 15-Minute Demo Script — TeeVents</h1>
    <p style="color:#666;font-size:11px;">Lifecycle flow: Pre-Tournament → Tournament Day → Post-Tournament · ${new Date().toLocaleDateString()}</p>
    ${sectionHtml}
    <h2>Pro Tips for Success</h2>
    ${tipsHtml}
    <p class="footer">© ${new Date().getFullYear()} TeeVents Golf · Confidential — For internal sales use only</p>
  `;
}

const phaseStyles: Record<Section["phase"], string> = {
  "Opening": "bg-primary/10 text-primary border-primary/30",
  "Pre-Tournament": "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  "Tournament Day": "bg-violet-500/10 text-violet-700 border-violet-500/30",
  "Post-Tournament": "bg-green-500/10 text-green-700 border-green-500/30",
  "Close": "bg-secondary/10 text-secondary border-secondary/30",
};

export default function AdminDemoScript() {
  const handleDownloadPdf = () => {
    downloadHtmlAsPdf("TeeVents 15-Minute Demo Script", buildPdfHtml());
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">15-Minute Demo Script</h2>
          <p className="text-muted-foreground mt-1">
            Tournament-lifecycle flow: <strong>Pre-Tournament → Tournament Day → Post-Tournament</strong>. Hits every core feature, browses extras quickly.
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${phaseStyles[s.phase]}`}>
                    {s.phase}
                  </span>
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
