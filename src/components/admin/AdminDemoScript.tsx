import { Clock, MessageSquare, Monitor, Users, Trophy, CreditCard, BarChart3, Printer, QrCode, CheckCircle, Mail, Store, Gavel, Camera, Heart, ClipboardList, Globe, Sparkles, ArrowRight } from "lucide-react";

const sections = [
  {
    time: "0:00 – 2:00",
    duration: "2 min",
    title: "Welcome & Set the Stage",
    icon: MessageSquare,
    color: "bg-primary/10 text-primary",
    points: [
      "Introduce yourself and thank them for their time.",
      "Ask: \"Tell me about your tournament — how many players, is it a fundraiser, how do you manage it today?\"",
      "Listen for pain points: spreadsheets, manual check-in, no website, payment headaches.",
      "Transition: \"Let me show you exactly how TeeVents solves all of that.\"",
    ],
  },
  {
    time: "2:00 – 5:00",
    duration: "3 min",
    title: "Dashboard Overview",
    icon: Monitor,
    color: "bg-blue-500/10 text-blue-600",
    route: "/dashboard",
    points: [
      "Show the main dashboard — highlight the at-a-glance stats (players, revenue, check-ins).",
      "Point out the left sidebar: \"Everything you need lives right here — no switching between tools.\"",
      "Mention the Planning Guide checklist: \"We give you a 30-item checklist from 12 months out to post-event.\"",
    ],
  },
  {
    time: "5:00 – 8:00",
    duration: "3 min",
    title: "Tournament Website Builder",
    icon: Globe,
    color: "bg-emerald-500/10 text-emerald-600",
    route: "/dashboard/tournaments → Site Builder",
    points: [
      "Show the 3 templates: Classic Green, Modern Navy, Charity Warmth.",
      "Highlight: \"Pick a template, upload your logo, set your colors — publish with one click.\"",
      "Preview the public site — show mobile-responsive design.",
      "Mention 8 built-in pages: Home, Contests, Registration, Photos, Location, Agenda, Donation, Contact.",
      "Call out custom domain support for Starter+ plans.",
    ],
  },
  {
    time: "8:00 – 12:00",
    duration: "4 min",
    title: "Player Management & Registration",
    icon: Users,
    color: "bg-violet-500/10 text-violet-600",
    route: "/dashboard/players",
    points: [
      "Show the player roster — search, filter, payment status columns.",
      "Demo adding a player manually via the dialog.",
      "Show CSV import: \"Already have a spreadsheet? Import your entire roster in seconds.\"",
      "Switch to Pairings tab — drag-and-drop players into foursomes.",
      "Show the Auto-Assign button: \"One click and we build all your groups.\"",
      "Mention online registration with Stripe payments on the public site.",
    ],
  },
  {
    time: "12:00 – 16:00",
    duration: "4 min",
    title: "Live Scoring & QR Scorecards",
    icon: Trophy,
    color: "bg-amber-500/10 text-amber-600",
    route: "/dashboard/leaderboard + /dashboard/printables",
    points: [
      "Show the admin leaderboard — real-time scores, group-by-group.",
      "Navigate to Printables → Scorecards tab.",
      "Show QR codes on scorecards: \"Players scan this code with their phone — no app download, no login.\"",
      "Explain the flow: Scan → phone opens scoring page → enter scores hole-by-hole → leaderboard updates live.",
      "This is usually the 'wow moment' — let it land.",
      "Mention sponsor logos rotate on the public leaderboard.",
    ],
  },
  {
    time: "16:00 – 18:00",
    duration: "2 min",
    title: "QR Check-In",
    icon: QrCode,
    color: "bg-rose-500/10 text-rose-600",
    route: "/dashboard/check-in",
    points: [
      "Show the check-in dashboard with real-time counter.",
      "Explain: \"Print QR badges, open the Scan Station on any tablet, and check players in instantly.\"",
      "Show manual search fallback for walk-ups.",
      "Mention undo check-in capability.",
    ],
  },
  {
    time: "18:00 – 20:00",
    duration: "2 min",
    title: "Sponsors & Budget",
    icon: BarChart3,
    color: "bg-teal-500/10 text-teal-600",
    route: "/dashboard/sponsors + /dashboard/budget",
    points: [
      "Show sponsor tiers: Title, Gold, Silver, Bronze — logos auto-display on tournament site.",
      "Show budget tracking: income vs. expenses by category, paid/unpaid status.",
      "Highlight: \"Know exactly where your money is at all times.\"",
    ],
  },
  {
    time: "20:00 – 22:00",
    duration: "2 min",
    title: "Messaging & Communication",
    icon: Mail,
    color: "bg-indigo-500/10 text-indigo-600",
    route: "/dashboard/messages",
    points: [
      "Show email and SMS messaging capabilities.",
      "Mention scheduled messages: \"Set up reminders before event day and they send automatically.\"",
      "Highlight recipient count tracking and message history.",
    ],
  },
  {
    time: "22:00 – 25:00",
    duration: "3 min",
    title: "Advanced Features (Pro Tier)",
    icon: Sparkles,
    color: "bg-purple-500/10 text-purple-600",
    route: "Various dashboard pages",
    points: [
      "Merchandise Store — sell branded items with Stripe checkout.",
      "Silent Auction & Raffle — bidding, buy-now, winner tracking.",
      "Photo Gallery — upload and showcase event photos on the public site.",
      "Donations — fundraising page with progress bar and configurable goals.",
      "Surveys — post-event feedback with rating, text, and multiple choice.",
      "Volunteer Coordination — define roles, time slots, and track signups.",
      "Adapt emphasis based on prospect's needs (fundraiser → donations/auction; corporate → store/gallery).",
    ],
  },
  {
    time: "25:00 – 27:00",
    duration: "2 min",
    title: "Printables Suite",
    icon: Printer,
    color: "bg-orange-500/10 text-orange-600",
    route: "/dashboard/printables",
    points: [
      "Walk through: Scorecards, Cart Signs, Name Badges, Alpha List, Sponsor Signs, Hole Assignments.",
      "Highlight: \"Everything you'd normally create in Word or pay a designer for — done automatically.\"",
      "Show print preview and one-click PDF export.",
    ],
  },
  {
    time: "27:00 – 28:00",
    duration: "1 min",
    title: "Pricing & Plans",
    icon: CreditCard,
    color: "bg-green-500/10 text-green-600",
    route: "/dashboard/upgrade",
    points: [
      "Show the 3 tiers: Base (Free, 5% fee), Starter ($499, 0% fee), Premium ($1,999, 0% fee).",
      "Emphasize: \"Base includes custom domains, sponsors, budget, gallery & printables — all free.\"",
      "Starter highlight: \"We build your tournament platform for you — full concierge setup + no fees.\"",
      "Premium highlight: \"$25K hole-in-one insurance + auction item included.\"",
    ],
  },
  {
    time: "28:00 – 30:00",
    duration: "2 min",
    title: "Close & Next Steps",
    icon: ArrowRight,
    color: "bg-secondary/10 text-secondary",
    points: [
      "Ask: \"What stood out to you? Which features would make the biggest difference for your event?\"",
      "Address any questions or concerns.",
      "Offer: \"I can set up your tournament right now — takes just a few minutes.\"",
      "Share the sign-up link: teevents.golf/get-started",
      "If nonprofit: mention tax-deductible donation receipts and EIN verification.",
      "Follow up within 24 hours with a recap email.",
    ],
  },
];

const tips = [
  "Personalize the demo by referencing their specific tournament (# of players, fundraiser vs. corporate, etc.).",
  "Let the QR scoring flow be your centerpiece — it's the most visually impressive feature.",
  "If they're currently using spreadsheets, show the CSV import and let them imagine the time saved.",
  "For nonprofits, lead with Donations + Auction features and mention Stripe Connect for direct payouts.",
  "Keep the Starter 'We build it for you' benefit in your back pocket as a closer for hesitant prospects.",
  "Share your screen from the /sample-organizer login page and walk through together.",
];

export default function AdminDemoScript() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">30-Minute Demo Script</h2>
        <p className="text-muted-foreground mt-1">
          Agenda and talking points for live demos of the Sample Organizer dashboard.
        </p>
      </div>

      {/* Timeline */}
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
                  <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">
                    {s.time}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {s.duration}
                  </span>
                </div>
                {s.route && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">{s.route}</p>
                )}
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

      {/* Pro Tips */}
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
