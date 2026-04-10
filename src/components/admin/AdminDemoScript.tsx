import { Clock, MessageSquare, Monitor, Users, Trophy, CreditCard, BarChart3, Printer, QrCode, CheckCircle, Mail, Store, Gavel, Camera, Heart, ClipboardList, Globe, Sparkles, ArrowRight, ShoppingBag, Gift, FileText, UserCheck, Palette } from "lucide-react";

const sections = [
  {
    time: "0:00 – 2:00",
    duration: "2 min",
    title: "Opening",
    icon: MessageSquare,
    color: "bg-primary/10 text-primary",
    points: [
      "\"Thanks for joining me. Today I'll show you how TeeVents helps you run better golf tournaments – from registration to payout.\"",
      "\"We have three plans: Base (free), Starter ($299), and Premium ($999). I'll show you which features are in each.\"",
      "Ask: \"Tell me about your tournament — how many players, is it a fundraiser, how do you manage it today?\"",
      "Listen for pain points: spreadsheets, manual check-in, no website, payment headaches.",
    ],
  },
  {
    time: "2:00 – 7:00",
    duration: "5 min",
    title: "Core Features — Base Plan (Free)",
    icon: Monitor,
    color: "bg-emerald-500/10 text-emerald-600",
    route: "/sample-dashboard",
    points: [
      "\"These features come with every tournament, including our free Base plan:\"",
      "Dashboard & Overview — real-time registration counter, financial summary, recent activity feed.",
      "Registration & Players — customizable registration form, player database with CSV export, QR check-in.",
      "Finances — transaction history, payout settings (Stripe Connect), available balance tracking.",
      "Share & Promote — QR code generator, short tournament URLs, social media templates.",
      "Planning Guide — 30-item checklist from 12 months out to post-event.",
      "Printables — scorecards, cart signs, name badges, alpha list, sponsor signs, hole assignments.",
    ],
  },
  {
    time: "7:00 – 12:00",
    duration: "5 min",
    title: "Starter Features — Upgrade ($299)",
    icon: Trophy,
    color: "bg-amber-500/10 text-amber-600",
    route: "/sample-dashboard → Starter items",
    points: [
      "\"When you're ready for more, Starter adds:\"",
      "Waitlist management — automatic queue with 'Offer Spot' buttons.",
      "Live Leaderboard — real-time scores, embeddable on any website, sponsor logo rotation.",
      "Scoring & Tee Sheet — score entry by group, drag-and-drop tee time grid.",
      "Messages & Email Templates — email/SMS blasts, scheduled delivery, pre-written templates.",
      "Sponsor Management — tiered sponsor portal with asset delivery and ROI tracking.",
      "Budget Tracking — income vs. expense by category, paid/unpaid status.",
      "Photo Gallery — upload and showcase event photos on the public site.",
      "Volunteer Coordination — shift scheduling, QR check-in, automated reminders.",
      "Post-Event Surveys — feedback with ratings, text, and multiple choice questions.",
    ],
  },
  {
    time: "12:00 – 17:00",
    duration: "5 min",
    title: "Premium Features ($999)",
    icon: Sparkles,
    color: "bg-violet-500/10 text-violet-600",
    route: "/sample-dashboard → Premium items",
    points: [
      "\"Premium is our all-inclusive plan for organizations running multiple tournaments:\"",
      "Add On Store — sell branded merchandise with Stripe checkout.",
      "Silent Auction & Raffle — bidding, buy-now, winner tracking, raffle ticket sales.",
      "Donation Tracking — fundraising page with progress bar and configurable goals.",
      "Flyer Studio — Canva-integrated template gallery for flyers, social posts, banners.",
      "Director Shop — premium add-ons (consulting, signage, hole-in-one insurance).",
      "Everything in Base + Starter, plus priority support and reduced reserve rates.",
      "Adapt emphasis based on prospect needs (fundraiser → donations/auction; corporate → store/gallery).",
    ],
  },
  {
    time: "17:00 – 20:00",
    duration: "3 min",
    title: "Pricing & Fee Model",
    icon: CreditCard,
    color: "bg-green-500/10 text-green-600",
    route: "/pricing",
    points: [
      "\"TeeVents charges a 5% platform fee on registrations. You choose who pays:\"",
      "Pass to Golfer: Golfer pays registration + 5% + Stripe fees. You keep 100% of registration.",
      "Absorb Fees: Golfer pays registration only. You receive registration minus 5% minus Stripe fees (~$91.80 on $100).",
      "Hold: 15% held for 15 days after event for chargeback protection, then released automatically.",
    ],
  },
  {
    time: "20:00 – 22:00",
    duration: "2 min",
    title: "Payouts",
    icon: BarChart3,
    color: "bg-teal-500/10 text-teal-600",
    points: [
      "\"Get paid automatically:\"",
      "Bi-weekly payouts every other Monday.",
      "Manual withdrawals anytime ($25 minimum).",
      "5-business-day clearing period for each transaction.",
      "Direct to your Stripe-connected bank account.",
    ],
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
      "\"Players scan this code with their phone — no app download, no login.\"",
      "Explain the flow: Scan → phone opens scoring page → enter scores hole-by-hole → leaderboard updates live.",
      "This is usually the 'wow moment' — let it land.",
    ],
  },
  {
    time: "25:00 – 27:00",
    duration: "2 min",
    title: "QR Check-In",
    icon: CheckCircle,
    color: "bg-rose-500/10 text-rose-600",
    route: "/sample-dashboard → Check-In",
    points: [
      "Show real-time check-in counter (38/54 checked in).",
      "\"Open the Scan Station on any tablet, scan QR codes, and check players in instantly.\"",
      "Show manual search fallback for walk-ups.",
    ],
  },
  {
    time: "27:00 – 30:00",
    duration: "3 min",
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
  "Start from /sample-dashboard — it now shows EVERY feature with plan badges so prospects can see what they're getting.",
  "Let the QR scoring flow be your centerpiece — it's the most visually impressive feature.",
  "If they're currently using spreadsheets, show the CSV import and let them imagine the time saved.",
  "For nonprofits, lead with Donations + Auction features and mention Stripe Connect for direct payouts.",
  "Keep the Starter 'We build it for you' benefit in your back pocket as a closer for hesitant prospects.",
  "Point out the colored plan badges: 🟢 Base (free), 🟡 Starter ($299), 🟣 Premium ($999).",
  "Show the Budget Tracker and Sponsor Management together — organizers love seeing the financial overview.",
];

export default function AdminDemoScript() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">30-Minute Demo Script — 2026 Edition</h2>
        <p className="text-muted-foreground mt-1">
          Updated agenda and talking points organized by plan tier (Base → Starter → Premium).
        </p>
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
                <ul className="mt-3 space-y-2">
                  {s.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-6">
        <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-secondary" /> Pro Tips
        </h3>
        <ul className="space-y-3">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-secondary font-bold flex-shrink-0">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
