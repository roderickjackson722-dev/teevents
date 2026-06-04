import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Trophy, ClipboardCheck, Users, MessageSquare,
  DollarSign, Wallet, Award, ShoppingBag, Settings, LogOut, ShoppingCart,
  BarChart3, ScanLine, Gavel, ImageIcon, UserCheck, ClipboardList, Heart,
  Clock, CreditCard, Share2, FileEdit, Printer, PenLine, Mail, HelpCircle,
  MapPin, Sliders, Search as SearchIcon, Megaphone,
  Building2, Store, Target, BedDouble, Ticket, Eye, Activity, ArrowRight,
  Menu, ContactRound,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoWhite from "@/assets/logo-white.png";
import { formatScore } from "@/lib/sampleMockData";

// Mirror real DashboardSidebar categories
const categories: { label: string; color: string; items: { title: string; icon: any }[] }[] = [
  {
    label: "Organizer Setup",
    color: "border-l-secondary bg-secondary/5",
    items: [
      { title: "Dashboard", icon: LayoutDashboard },
      { title: "Planning Guide", icon: ClipboardCheck },
      { title: "Setup Checklist", icon: ClipboardCheck },
      { title: "View Tournament", icon: Eye },
    ],
  },
  {
    label: "Course Setup",
    color: "border-l-sky-400 bg-sky-400/5",
    items: [
      { title: "Course Details", icon: MapPin },
      { title: "Pin Sheets", icon: MapPin },
      { title: "Handicap Settings", icon: Sliders },
    ],
  },
  {
    label: "Tournament Setup",
    color: "border-l-blue-400 bg-blue-400/5",
    items: [
      { title: "Tournament Details", icon: Trophy },
      { title: "Registration Management", icon: FileEdit },
      { title: "Live Leaderboard", icon: BarChart3 },
      { title: "Sponsorship Management", icon: Award },
      { title: "Event Day Contests", icon: Trophy },
      { title: "Lodging", icon: BedDouble },
      { title: "Team Management", icon: Building2 },
      { title: "Organization Info", icon: Building2 },
      { title: "Day of Event Page", icon: ScanLine },
      { title: "Side Events", icon: Ticket },
    ],
  },
  {
    label: "Operations",
    color: "border-l-purple-400 bg-purple-400/5",
    items: [
      { title: "Players & Pairings", icon: Users },
      { title: "Waitlist", icon: ClipboardList },
      { title: "Check-In", icon: ScanLine },
      { title: "Live Leaderboard (View)", icon: Eye },
      { title: "Scoring", icon: PenLine },
      { title: "Sponsor Management", icon: Award },
      { title: "Volunteers", icon: UserCheck },
      { title: "Vendors", icon: Store },
      { title: "Messages", icon: MessageSquare },
      { title: "Team Performance", icon: Target },
      { title: "CRM", icon: ContactRound },
    ],
  },
  {
    label: "Promotion & Marketing",
    color: "border-l-green-400 bg-green-400/5",
    items: [
      { title: "Share & Promote", icon: Share2 },
      { title: "Flyer Studio", icon: Megaphone },
      { title: "Printables", icon: Printer },
      { title: "Email Templates", icon: Mail },
      { title: "Public Search", icon: SearchIcon },
    ],
  },
  {
    label: "Finance",
    color: "border-l-yellow-400 bg-yellow-400/5",
    items: [
      { title: "Finances", icon: Wallet },
      { title: "Payout Settings", icon: CreditCard },
      { title: "Budget", icon: DollarSign },
      { title: "Add On Store", icon: ShoppingBag },
      { title: "Director Shop", icon: ShoppingCart },
    ],
  },
  {
    label: "Post-Event",
    color: "border-l-teal-400 bg-teal-400/5",
    items: [
      { title: "Surveys & Feedback", icon: ClipboardList },
      { title: "Photo Gallery", icon: ImageIcon },
      { title: "Donations", icon: Heart },
      { title: "Auctions", icon: Gavel },
      { title: "Raffles", icon: Ticket },
      { title: "Media Clips", icon: ImageIcon },
    ],
  },
];

const settingsItems = [
  { title: "General Settings", icon: Settings },
  { title: "Help Center", icon: HelpCircle },
  { title: "Activity Log", icon: Activity },
];

function getCountdown(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = new Date(dateStr + "T08:00:00").getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, passed: true };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    passed: false,
  };
}

export default function SampleDashboardPreview() {
  const { slug } = useParams<{ slug: string }>();
  const [sample, setSample] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: s } = await supabase.from("sample_tournaments").select("*").eq("unique_slug", slug).maybeSingle();
      if (!s) { setLoading(false); return; }
      setSample(s);
      const [{ data: p }, { data: sp }, { data: lb }] = await Promise.all([
        supabase.from("sample_participants").select("*").eq("sample_tournament_id", s.id),
        supabase.from("sample_sponsors").select("*").eq("sample_tournament_id", s.id),
        supabase.from("sample_leaderboard").select("*").eq("sample_tournament_id", s.id).order("position"),
      ]);
      setParticipants(p || []);
      setSponsors(sp || []);
      setLeaderboard(lb || []);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeNav]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!sample) return <div className="min-h-screen flex items-center justify-center">Mockup not found</div>;

  const countdown = getCountdown(sample.event_date);
  const totalRevenue = participants.length * (sample.registration_fee_cents || 0);
  const platformFee = Math.round(totalRevenue * 0.05);
  const netPayout = totalRevenue - platformFee;
  const fmt = (c: number) => `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const orgName = sample.tournament_name;

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      {/* Sample-mode banner (mirrors useDemoMode banner in real DashboardLayout) */}
      <div className="bg-secondary text-secondary-foreground px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium z-50 flex-wrap">
        <Eye className="h-4 w-4 flex-shrink-0" />
        <span>You're viewing a sample dashboard — this is what your real dashboard looks like.</span>
        <Link
          to="/get-started"
          className="inline-flex items-center gap-1 bg-secondary-foreground/20 hover:bg-secondary-foreground/30 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
        >
          Get Started <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex flex-1 min-w-0 w-full">
        {/* Sidebar nav content — shared between desktop aside and mobile sheet */}
        {(() => null)()}
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-primary text-primary-foreground border-r border-border overflow-y-auto max-h-[calc(100vh-44px)] sticky top-[44px]">
          <SidebarNavContent activeNav={activeNav} onSelect={(t) => setActiveNav(t)} />
        </aside>

        {/* Mobile sidebar (Sheet) */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="p-0 w-72 bg-primary text-primary-foreground border-r border-border overflow-y-auto">
            <SidebarNavContent
              activeNav={activeNav}
              onSelect={(t) => { setActiveNav(t); setMobileNavOpen(false); }}
            />
          </SheetContent>
        </Sheet>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b-2 border-secondary bg-secondary/15 px-3 sm:px-4 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md border border-secondary/40 bg-background text-foreground flex-shrink-0"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="text-sm sm:text-base md:text-lg font-display font-bold text-foreground truncate">
                {orgName} Dashboard
              </span>
            </div>
            <Link to={`/sample/${slug}`} className="text-xs sm:text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 flex-shrink-0">
              <Eye className="h-4 w-4" /> <span className="hidden sm:inline">View public site</span>
            </Link>
          </header>

          {/* Mobile-only prompt to explore sections */}
          <div className="md:hidden bg-secondary/10 border-b border-secondary/30 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-xs text-foreground">Explore every organizer section →</span>
            <button
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1.5 rounded-md"
            >
              <Menu className="h-3.5 w-3.5" /> Open Menu
            </button>
          </div>


          <main className="flex-1 bg-golf-cream p-3 sm:p-4 md:p-6 overflow-x-auto">
            {activeNav === "Dashboard" && (
              <>
                {/* Welcome card — mirrors DashboardHome */}
                <div className="mb-6 bg-secondary/15 border border-secondary/30 rounded-xl p-6">
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                    Welcome back, {orgName}
                  </h1>
                  <p className="text-muted-foreground mt-1 text-base">
                    Manage your golf tournaments from one place.
                  </p>
                </div>

                {/* Stats grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Tournaments", value: 1, icon: Trophy, color: "text-primary" },
                    { label: "Players", value: participants.length, icon: Users, color: "text-primary" },
                    { label: "Revenue", value: fmt(totalRevenue), icon: DollarSign, color: "text-secondary" },
                    { label: "Sponsors", value: sponsors.length, icon: Award, color: "text-primary" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-card rounded-lg border border-border p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Countdown */}
                {countdown && (
                  <div className="bg-card rounded-lg border border-border p-6 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-5 w-5 text-secondary" />
                      <h2 className="text-lg font-display font-bold text-foreground">Event Countdown</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{sample.tournament_name}</p>
                    {countdown.passed ? (
                      <p className="text-sm font-semibold text-secondary">🎉 Event day has arrived!</p>
                    ) : (
                      <div className="flex gap-4">
                        {[
                          { value: countdown.days, label: "Days" },
                          { value: countdown.hours, label: "Hours" },
                          { value: countdown.minutes, label: "Minutes" },
                        ].map((u) => (
                          <div key={u.label} className="text-center">
                            <p className="text-3xl font-display font-bold text-primary">{u.value}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{u.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="bg-card rounded-lg border border-border p-6 mb-6">
                  <h2 className="text-lg font-display font-bold text-foreground mb-4">Quick Actions</h2>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setActiveNav("Players")}><Users className="h-4 w-4 mr-2" />Players & Pairings</Button>
                    <Button variant="outline" onClick={() => setActiveNav("Registration Management")}><ClipboardList className="h-4 w-4 mr-2" />Registration</Button>
                    <Button variant="outline" onClick={() => setActiveNav("Check-In")}><ScanLine className="h-4 w-4 mr-2" />Check-In</Button>
                    <Button variant="outline" onClick={() => setActiveNav("Messages")}><MessageSquare className="h-4 w-4 mr-2" />Messages</Button>
                    <Button variant="outline" onClick={() => setActiveNav("Live Leaderboard")}><BarChart3 className="h-4 w-4 mr-2" />Leaderboard</Button>
                    <Button variant="outline" asChild><Link to={`/sample/${slug}`}><Eye className="h-4 w-4 mr-2" />View Tournament</Link></Button>
                  </div>
                </div>
              </>
            )}

            {/* Page header for non-Dashboard views */}
            {activeNav !== "Dashboard" && (
              <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{activeNav}</h1>
                  <p className="text-sm text-muted-foreground mt-1">Sample preview of the {activeNav} workspace.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveNav("Dashboard")}>
                  ← Back to Dashboard
                </Button>
              </div>
            )}

            {/* Contextual sample panels — change with sidebar selection */}
            {activeNav === "Players" ? <PlayersPanel /> : null}
            {activeNav === "Live Leaderboard" || activeNav === "Scoring" ? <LeaderboardPanel tournamentName={orgName} /> : null}
            {activeNav === "Sponsorship Management" ? <SponsorsPanel /> : null}
            {activeNav === "Finances" ? <FinancesPanel /> : null}
            {activeNav === "Payout Settings" ? <PayoutPanel /> : null}
            {activeNav === "Share & Promote" ? <SharePanel slug={slug || ""} tournamentName={orgName} /> : null}
            {activeNav === "Check-In" ? <CheckInPanel /> : null}
            {activeNav === "Volunteers" ? <VolunteersPanel /> : null}
            {activeNav === "Email Templates" || activeNav === "Messages" ? <EmailTemplatesPanel /> : null}
            {activeNav === "Auctions" ? <AuctionsPanel /> : null}
            {activeNav === "Raffles" ? <RafflesPanel /> : null}
            {activeNav === "Media Clips" || activeNav === "Photo Gallery" ? <MediaClipsPanel /> : null}
            {activeNav === "Tournament Details" || activeNav === "View Tournament" ? <SiteBuilderPanel tournamentName={orgName} slug={slug || ""} eventDate={sample.event_date} /> : null}
            {activeNav === "Waitlist" ? <WaitlistPanel /> : null}

            {/* Generic feature preview — any other sidebar item shows a realistic mock panel */}
            {![
              "Dashboard","Players","Live Leaderboard","Scoring","Sponsorship Management",
              "Finances","Payout Settings","Share & Promote","Check-In","Volunteers",
              "Email Templates","Messages","Auctions","Raffles","Media Clips","Photo Gallery",
              "Tournament Details","View Tournament","Waitlist",
            ].includes(activeNav) ? (
              <GenericFeaturePanel
                title={activeNav}
                tournamentName={orgName}
                participants={participants}
                sponsors={sponsors}
                leaderboard={leaderboard}
                fmt={fmt}
                totalRevenue={totalRevenue}
                slug={slug || ""}
              />
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

// ---------- Generic feature mock panel ----------
function GenericFeaturePanel({
  title, tournamentName, participants, sponsors, leaderboard, fmt, totalRevenue, slug,
}: {
  title: string; tournamentName: string; participants: any[]; sponsors: any[]; leaderboard: any[];
  fmt: (c: number) => string; totalRevenue: number; slug: string;
}) {
  // Tailored mock content per feature
  const content: Record<string, { description: string; rows?: { label: string; value: string }[]; list?: string[] }> = {
    "Planning Guide": {
      description: "Step-by-step 30-task checklist to plan your tournament from idea to event day.",
      list: ["✓ Set tournament date & venue","✓ Define entry fees and sponsorship tiers","◯ Open registration","◯ Confirm catering","◯ Print scorecards & cart signs","◯ Brief volunteers"],
    },
    "Setup Checklist": {
      description: "Quick visual checklist of essentials before you go live.",
      list: ["✓ Tournament details complete","✓ Course details added","✓ Payout method connected","◯ Custom domain set","◯ Sponsors uploaded"],
    },
    "View Tournament": { description: `Opens the public page for ${tournamentName}.` },
    "Course Details": {
      description: "Manage course information, par, yardage, and tee boxes.",
      rows: [
        { label: "Course", value: "Running Deer Golf Club" },
        { label: "Par", value: "72" },
        { label: "Yardage (Blue)", value: "6,824 yds" },
        { label: "Slope / Rating", value: "131 / 72.4" },
      ],
    },
    "Pin Sheets": { description: "Auto-generate printable pin sheet PDFs for each round." },
    "Handicap Settings": {
      description: "Configure handicap rules used to compute net scores.",
      rows: [{label:"System",value:"USGA"},{label:"Course Handicap",value:"100% allowance"},{label:"Max Handicap",value:"36.0"}],
    },
    "Tournament Details": {
      description: "Edit name, date, format and fees.",
      rows: [{label:"Name",value:tournamentName},{label:"Format",value:"Scramble"},{label:"Player Entry",value:fmt(25000)},{label:"Team Entry",value:fmt(100000)}],
    },
    "Registration Management": {
      description: `${participants.length} registrations received. Manage payments, refunds and team groupings.`,
      rows: [{label:"Paid",value:`${participants.length}`},{label:"Waitlist",value:"3"},{label:"Comped",value:"2"}],
    },
    "Lodging": { description: "Block hotel rooms and let players self-book at your group rate." },
    "Team Management": { description: "Invite assistants with granular permissions (registration, finances, scoring, etc.)." },
    "Organization Info": { description: "Logo, mission, 501(c)(3) info — used on receipts and public site." },
    "Flyer Studio": { description: "Generate a print-ready flyer in Canva with your branding pre-filled." },
    "Printables": { description: "Scorecards, cart signs, hole assignments, name badges, sponsor signs — all auto-populated and PDF-ready." },
    "Email Templates": { description: "Customize confirmation, reminder and thank-you emails sent to participants." },
    "Public Search": { description: "Toggle whether your tournament appears in the public TeeVents search." },
    "Waitlist": {
      description: "Automated waitlist with 24-hour claim window when a spot opens.",
      list: ["1. Casey Morgan — added 2 days ago","2. Pat Lee — added 1 day ago","3. Drew Kim — added 3 hours ago"],
    },
    "Check-In": { description: "Scan QR codes on event day to check players in and assign carts." },
    "Tee Sheet": { description: "Drag-and-drop pairings and shotgun-start hole assignments." },
    "Test Simulator": { description: "Simulate scores to verify your leaderboard and scoring rules before event day." },
    "Volunteers": { description: "Recruit and schedule volunteers by station and shift." },
    "Vendors": { description: "Sell vendor/exhibitor booth space with custom tiers." },
    "Side Events": { description: "Sell add-ons: skins, mulligans, raffle tickets, beat-the-pro, etc." },
    "Team Performance": { description: "Post-round team stats and trophy graphics." },
    "Event Day Contests": { description: "Closest-to-the-pin, long drive, hole-in-one — track on-course contests." },
    "Messages": {
      description: "Send announcements and updates to all participants.",
      list: ["📣 Tee times posted","☀️ Weather update: clear skies","🏆 Awards ceremony 3:30pm in the clubhouse"],
    },
    "Budget": {
      description: "Track planned vs actual revenue and expenses.",
      rows: [{label:"Projected Revenue",value:fmt(totalRevenue)},{label:"Projected Expenses",value:fmt(Math.round(totalRevenue*0.45))},{label:"Projected Net",value:fmt(Math.round(totalRevenue*0.55))}],
    },
    "Add On Store": { description: "Optional add-ons (mulligans, range balls, raffle bundles) sold during registration." },
    "Director Shop": { description: "Order branded TeeVents merch — banners, polo shirts, signage — for your event." },
    "Surveys & Feedback": { description: "Post-event survey automation. Average rating: ⭐ 4.8 / 5.0" },
    "Photo Gallery": { description: "Share event photos with players — auto-tagged by team." },
    "Donations": { description: "Accept additional donations on top of registration. To date: " + fmt(125000) },
    "Auctions": { description: "Live & silent auctions with bidder paddles and online bidding." },
    "Raffles": { description: "Sell raffle tickets digitally with random winner draw." },
    "Media Clips": { description: "Upload short event recap videos for social sharing." },
    "Day-Of Page": { description: "Mobile landing page for players on event day — schedule, pairings, leaderboard." },
    "General Settings": { description: "Tournament settings, branding, custom domain, notifications." },
    "Help Center": { description: "Step-by-step guides, video walkthroughs, and chat support." },
    "Activity Log": {
      description: "Full audit trail of every change made to your tournament.",
      list: ["2h ago — Sponsor 'Albany Auto' added","5h ago — Registration opened","1d ago — Tournament details updated"],
    },
  };

  const c = content[title] || { description: `Preview of the ${title} section. With TeeVents this is a full-featured tool — this is a quick mockup of what you'll see.` };

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-display font-bold">{title}</h3>
        <span className="text-xs bg-secondary/15 text-secondary px-2 py-1 rounded-full font-semibold">Sample preview</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{c.description}</p>
      {c.rows && (
        <div className="grid sm:grid-cols-2 gap-3">
          {c.rows.map((r) => (
            <div key={r.label} className="border rounded-md p-3 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className="font-semibold text-sm">{r.value}</span>
            </div>
          ))}
        </div>
      )}
      {c.list && (
        <ul className="space-y-2">
          {c.list.map((item, i) => (
            <li key={i} className="text-sm border-b pb-2 last:border-0">{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Helpers ----------
const MOCK_PLAYERS = [
  { name: "John Smith", handicap: 12.4, shirt: "Large", status: "Registered" },
  { name: "Sarah Jones", handicap: 8.2, shirt: "Medium", status: "Checked In" },
  { name: "Michael Brown", handicap: 18.0, shirt: "XL", status: "Registered" },
  { name: "Emily Davis", handicap: 14.5, shirt: "Small", status: "Registered" },
  { name: "David Wilson", handicap: 5.1, shirt: "Large", status: "Pending" },
  { name: "Lisa Taylor", handicap: 10.3, shirt: "Medium", status: "Checked In" },
  { name: "Robert Anderson", handicap: 16.2, shirt: "XL", status: "Registered" },
  { name: "Jennifer Martinez", handicap: 9.7, shirt: "Small", status: "Registered" },
  { name: "Thomas Garcia", handicap: 11.8, shirt: "Large", status: "Registered" },
  { name: "Patricia Rodriguez", handicap: 7.4, shirt: "Medium", status: "Checked In" },
  { name: "Charles Miller", handicap: 19.2, shirt: "XL", status: "Pending" },
  { name: "Barbara Williams", handicap: 13.6, shirt: "Medium", status: "Registered" },
];

const AVATAR_COLORS = ["1a5c38", "F5A623", "3B82F6", "8B5CF6", "EF4444", "10B981", "F97316", "0EA5E9", "EC4899", "6366F1"];
function avatarUrl(name: string, i: number) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=80&bold=true`;
}

function DemoBtn({ children, tip = "Active in the live version", ...rest }: any) {
  return (
    <button
      {...rest}
      title={tip}
      className="inline-flex items-center gap-1.5 text-sm font-medium border border-input bg-background hover:bg-accent px-3 py-1.5 rounded-md transition-colors"
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "Checked In" ? "bg-green-100 text-green-800 border-green-300"
    : status === "Pending" ? "bg-amber-100 text-amber-800 border-amber-300"
    : "bg-blue-100 text-blue-800 border-blue-300";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles}`}>{status}</span>;
}

// ---------- Panels ----------
function PlayersPanel() {
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-lg font-display font-bold flex items-center gap-2"><Users className="h-5 w-5" />Registered Players (12)</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input disabled placeholder="Search players..." className="pl-8 pr-3 py-1.5 text-sm border border-input rounded-md bg-background w-48" />
          </div>
          <DemoBtn tip="CSV export available in the live version">Export CSV</DemoBtn>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground"><tr><th className="py-2">Player</th><th>Handicap</th><th>Shirt</th><th>Status</th></tr></thead>
          <tbody>
            {MOCK_PLAYERS.map((p, i) => (
              <tr key={p.name} className="border-b hover:bg-muted/30">
                <td className="py-2.5 flex items-center gap-3">
                  <img src={avatarUrl(p.name, i)} alt="" className="h-8 w-8 rounded-full" />
                  <span className="font-medium">{p.name}</span>
                </td>
                <td>{p.handicap.toFixed(1)}</td>
                <td>{p.shirt}</td>
                <td><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const MOCK_SPONSORS_FULL = [
  { name: "Title Sponsor", level: "Title", color: "3B82F6" },
  { name: "Premier Partner", level: "Gold", color: "F5A623" },
  { name: "Supporting Sponsor", level: "Silver", color: "9CA3AF" },
  { name: "Beverage Sponsor", level: "Bronze", color: "F97316" },
  { name: "Prize Sponsor", level: "Bronze", color: "8B5CF6" },
  { name: "Media Partner", level: "Bronze", color: "10B981" },
];
function SponsorsPanel() {
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-lg font-display font-bold flex items-center gap-2"><Award className="h-5 w-5" />Sponsors (6)</h3>
        <DemoBtn>Asset Delivery</DemoBtn>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_SPONSORS_FULL.map((s) => (
          <div key={s.name} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <img src={`https://placehold.co/300x140/${s.color}/ffffff?text=${encodeURIComponent(s.name)}`} alt={s.name} className="w-full h-28 object-cover" />
            <div className="p-3">
              <div className="font-semibold">{s.name}</div>
              <div className="flex items-center justify-between mt-1">
                <Badge variant="outline" className="text-xs">{s.level}</Badge>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-xs text-primary hover:underline">Visit website →</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const MOCK_LB = [
  { pos: 1, name: "Team Mulligan", gross: -8, net: -10 },
  { pos: 2, name: "Albany Auto Group", gross: -6, net: -8 },
  { pos: 3, name: "First Tee Foundation", gross: -5, net: -7 },
  { pos: 4, name: "Coastal Realty", gross: -4, net: -5 },
  { pos: 5, name: "Title Sponsor Team", gross: -3, net: -4 },
  { pos: 6, name: "Youth Golf Academy", gross: -2, net: -3 },
  { pos: 7, name: "Smith & Associates", gross: -1, net: -2 },
  { pos: 8, name: "Johnson Family", gross: 0, net: -1 },
  { pos: 9, name: "Team Charity", gross: 2, net: 0 },
  { pos: 10, name: "Birdie Club", gross: 3, net: 1 },
];
function LeaderboardPanel({ tournamentName }: { tournamentName: string }) {
  const [view, setView] = useState<"gross" | "net">("gross");
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      {/* Rotating sponsor banner */}
      <div className="flex items-center gap-3 overflow-hidden bg-muted/40 rounded-md p-2 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-shrink-0">Presented by</span>
        {MOCK_SPONSORS_FULL.slice(0, 4).map((s) => (
          <img key={s.name} src={`https://placehold.co/100x32/${s.color}/ffffff?text=${encodeURIComponent(s.name.split(" ")[0])}`} alt={s.name} className="h-7 rounded" />
        ))}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-lg font-display font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5" />Live Leaderboard — {tournamentName}</h3>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border overflow-hidden">
            <button onClick={() => setView("gross")} className={`px-3 py-1 text-xs font-semibold ${view === "gross" ? "bg-primary text-primary-foreground" : "bg-background"}`}>Gross</button>
            <button onClick={() => setView("net")} className={`px-3 py-1 text-xs font-semibold ${view === "net" ? "bg-primary text-primary-foreground" : "bg-background"}`}>Net</button>
          </div>
          <DemoBtn tip="Auto-refreshes live during tournaments">Refresh</DemoBtn>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground"><tr><th className="py-2 w-12">Pos</th><th>Player / Team</th><th className="text-right">Gross</th><th className="text-right">Net</th><th className="text-right">Thru</th></tr></thead>
          <tbody>
            {MOCK_LB.map((l) => (
              <tr key={l.pos} className={`border-b ${l.pos <= 3 ? "bg-secondary/5" : ""}`}>
                <td className="py-2 font-bold">{l.pos}</td>
                <td className="font-medium">{l.name}</td>
                <td className={`text-right ${view === "gross" ? "font-bold text-primary" : ""}`}>{formatScore(l.gross)}</td>
                <td className={`text-right ${view === "net" ? "font-bold text-primary" : ""}`}>{formatScore(l.net)}</td>
                <td className="text-right">18</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const MOCK_TX = [
  { date: "May 15", golfer: "John Smith" },
  { date: "May 14", golfer: "Sarah Jones" },
  { date: "May 13", golfer: "Michael Brown" },
  { date: "May 12", golfer: "Emily Davis" },
  { date: "May 11", golfer: "David Wilson" },
];
function FinancesPanel() {
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><Wallet className="h-5 w-5" />Finances</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="border rounded-md p-3 bg-primary/5"><div className="text-xs text-muted-foreground">Total Collected</div><div className="text-xl font-bold text-primary">$8,100.00</div></div>
        <div className="border rounded-md p-3"><div className="text-xs text-muted-foreground">Platform Fees (5%)</div><div className="text-xl font-bold text-orange-600">$405.00</div></div>
        <div className="border rounded-md p-3"><div className="text-xs text-muted-foreground">Stripe Fees</div><div className="text-xl font-bold text-orange-600">$243.00</div></div>
        <div className="border rounded-md p-3 bg-green-50"><div className="text-xs text-muted-foreground">Net to You</div><div className="text-xl font-bold text-green-700">$7,452.00</div></div>
      </div>
      <div className="border rounded-md p-3 mb-4 bg-green-50 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm"><CreditCard className="h-4 w-4 text-green-700" /><span className="font-semibold">Connected to Stripe</span><span className="text-muted-foreground">Bank •••• 4242</span></div>
        <Badge className="bg-green-600">Active</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground"><tr><th className="py-2">Date</th><th>Golfer</th><th className="text-right">Gross</th><th className="text-right">Platform</th><th className="text-right">Stripe</th><th className="text-right">Net</th></tr></thead>
          <tbody>
            {MOCK_TX.map((t) => (
              <tr key={t.golfer} className="border-b">
                <td className="py-2">{t.date}</td>
                <td>{t.golfer}</td>
                <td className="text-right">$150.00</td>
                <td className="text-right text-orange-600">$7.50</td>
                <td className="text-right text-orange-600">$4.65</td>
                <td className="text-right text-green-700 font-semibold">$137.85</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayoutPanel() {
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5" />Payout Settings</h3>
      <div className="border-2 border-green-500 rounded-lg p-5 bg-green-50">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <img src="https://placehold.co/60x30/635BFF/ffffff?text=stripe" alt="Stripe" className="h-7 rounded" />
            <span className="font-bold text-lg">Stripe Connected</span>
          </div>
          <Badge className="bg-green-600">Active</Badge>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Connected Account</div><div className="font-semibold">Bank •••• 4242</div></div>
          <div><div className="text-xs text-muted-foreground">Payout Schedule</div><div className="font-semibold">Automatic (2–3 business days)</div></div>
        </div>
        <div className="mt-4 flex gap-2">
          <DemoBtn>Change Bank Account</DemoBtn>
          <DemoBtn>View Payout History</DemoBtn>
        </div>
      </div>
    </div>
  );
}

function SharePanel({ slug, tournamentName }: { slug: string; tournamentName: string }) {
  const url = `${window.location.origin}/sample/${slug}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><Share2 className="h-5 w-5" />Share & Promote</h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="text-center border rounded-lg p-4 bg-muted/20">
          <img src={qr} alt="QR" className="mx-auto rounded-md border bg-white p-2" />
          <p className="text-xs text-muted-foreground mt-2">Players scan to register</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Tournament URL</label>
            <code className="block bg-muted p-2.5 rounded font-mono text-xs break-all">{url}</code>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Short link</label>
            <code className="block bg-muted p-2.5 rounded font-mono text-sm">teev.vent/{slug}</code>
          </div>
          <DemoBtn>Copy Link</DemoBtn>
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">SHARE TO</p>
            <div className="flex gap-2">
              <DemoBtn tip="Share to Facebook in live version">📘 Facebook</DemoBtn>
              <DemoBtn tip="Share to LinkedIn in live version">💼 LinkedIn</DemoBtn>
              <DemoBtn tip="Share to X in live version">🐦 X</DemoBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckInPanel() {
  const checked = MOCK_PLAYERS.filter((p) => p.status === "Checked In").slice(0, 5);
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><ScanLine className="h-5 w-5" />Check-In</h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border-2 border-dashed border-secondary rounded-lg p-6 text-center bg-secondary/5">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=checkin-demo" alt="QR scanner" className="mx-auto rounded border bg-white p-2" />
          <p className="text-sm font-semibold mt-3">QR Code Scanner</p>
          <p className="text-xs text-muted-foreground">Point camera at player's QR badge</p>
        </div>
        <div>
          <div className="bg-primary text-primary-foreground rounded-lg p-4 mb-3 text-center">
            <div className="text-3xl font-bold">12 / 54</div>
            <div className="text-xs uppercase tracking-wider opacity-80">Checked In</div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">RECENT CHECK-INS</p>
          <ul className="space-y-2">
            {checked.map((p, i) => (
              <li key={p.name} className="flex items-center gap-2 text-sm border-b pb-2">
                <img src={avatarUrl(p.name, i)} alt="" className="h-7 w-7 rounded-full" />
                <span className="flex-1">{p.name}</span>
                <span className="text-green-600 font-bold">✓</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const MOCK_SHIFTS = [
  { role: "Check-in Desk", time: "7:00 AM – 10:00 AM", filled: 2, slots: 3 },
  { role: "Beverage Cart", time: "9:00 AM – 2:00 PM", filled: 1, slots: 2 },
  { role: "Scoring Tent", time: "11:00 AM – 3:00 PM", filled: 3, slots: 4 },
];
function VolunteersPanel() {
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><UserCheck className="h-5 w-5" />Volunteer Shifts</h3>
      <div className="space-y-3">
        {MOCK_SHIFTS.map((s) => {
          const pct = (s.filled / s.slots) * 100;
          return (
            <div key={s.role} className="border rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div>
                  <div className="font-semibold">{s.role}</div>
                  <div className="text-xs text-muted-foreground">{s.time}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{s.filled} / {s.slots} filled</span>
                  <DemoBtn>Sign Up</DemoBtn>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-secondary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MOCK_EMAILS = [
  { name: "Registration Confirmation", subject: "You're registered! 🏌️", preview: "Thanks for registering for our tournament. Here are your details and what to expect on tournament day..." },
  { name: "Tee Time Reminder", subject: "Your tee time is tomorrow", preview: "Just a friendly reminder — your tee time is tomorrow at 8:12 AM. Please arrive 30 minutes early..." },
  { name: "Post-Event Thank You", subject: "Thanks for playing!", preview: "What a day! Thank you for joining us. View photos, final leaderboard, and donation totals here..." },
];
function EmailTemplatesPanel() {
  const [selected, setSelected] = useState(0);
  const e = MOCK_EMAILS[selected];
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><Mail className="h-5 w-5" />Email Templates</h3>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-2">
          {MOCK_EMAILS.map((m, i) => (
            <button key={m.name} onClick={() => setSelected(i)} className={`w-full text-left p-3 rounded-md border transition ${i === selected ? "border-secondary bg-secondary/10" : "hover:bg-muted/40"}`}>
              <div className="font-semibold text-sm">{m.name}</div>
              <div className="text-xs text-muted-foreground truncate">{m.subject}</div>
            </button>
          ))}
        </div>
        <div className="md:col-span-2 border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b text-xs">
            <div><span className="text-muted-foreground">Subject:</span> <span className="font-semibold">{e.subject}</span></div>
          </div>
          <div className="p-4 bg-white">
            <div className="h-16 bg-gradient-to-r from-primary to-primary/80 rounded mb-3 flex items-center justify-center text-primary-foreground font-display font-bold">Your Tournament</div>
            <p className="text-sm text-foreground/80 leading-relaxed">{e.preview}</p>
            <button className="mt-3 bg-secondary text-secondary-foreground px-4 py-2 rounded text-sm font-semibold">View Details</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuctionsPanel() {
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><Gavel className="h-5 w-5" />Live Auctions</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="border rounded-lg overflow-hidden">
          <img src="https://placehold.co/400x200/1a5c38/ffffff?text=Signed+Golf+Memorabilia" alt="Auction item" className="w-full h-40 object-cover" />
          <div className="p-4">
            <div className="font-semibold">Signed Golf Memorabilia</div>
            <p className="text-xs text-muted-foreground mb-3">Authenticated PGA Tour signed flag and ball set.</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Current bid</div>
                <div className="text-xl font-bold text-primary">$250</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Time left</div>
                <div className="text-sm font-semibold">2d 4h</div>
              </div>
            </div>
            <DemoBtn tip="Bids placed live during your event">Place Bid</DemoBtn>
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <img src="https://placehold.co/400x200/F5A623/ffffff?text=Weekend+Getaway" alt="Auction item" className="w-full h-40 object-cover" />
          <div className="p-4">
            <div className="font-semibold">Weekend Golf Getaway</div>
            <p className="text-xs text-muted-foreground mb-3">2-night stay + round of golf for 4 at a premier resort.</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Current bid</div>
                <div className="text-xl font-bold text-primary">$675</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Time left</div>
                <div className="text-sm font-semibold">1d 18h</div>
              </div>
            </div>
            <DemoBtn>Place Bid</DemoBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function RafflesPanel() {
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><Ticket className="h-5 w-5" />Raffles</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="border rounded-lg overflow-hidden">
          <img src="https://placehold.co/400x180/10B981/ffffff?text=50%2F50+Cash+Raffle" alt="Raffle" className="w-full h-36 object-cover" />
          <div className="p-4">
            <div className="font-semibold mb-1">50/50 Cash Raffle</div>
            <div className="text-xs text-muted-foreground mb-2">Draw: Tournament awards dinner</div>
            <div className="h-2 bg-muted rounded-full mb-1"><div className="h-full bg-secondary rounded-full" style={{ width: "45%" }} /></div>
            <div className="text-xs text-muted-foreground mb-3">45 / 100 tickets sold</div>
            <DemoBtn>Buy Tickets</DemoBtn>
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <img src="https://placehold.co/400x180/8B5CF6/ffffff?text=Pro+Shop+Bundle" alt="Raffle" className="w-full h-36 object-cover" />
          <div className="p-4">
            <div className="font-semibold mb-1">Pro Shop Bundle ($500)</div>
            <div className="text-xs text-muted-foreground mb-2">Draw: Tournament awards dinner</div>
            <div className="h-2 bg-muted rounded-full mb-1"><div className="h-full bg-secondary rounded-full" style={{ width: "72%" }} /></div>
            <div className="text-xs text-muted-foreground mb-3">72 / 100 tickets sold</div>
            <DemoBtn>Buy Tickets</DemoBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaClipsPanel() {
  const clips = [
    { title: "2024 Tournament Highlights", color: "1a5c38" },
    { title: "Sponsor Interview", color: "F5A623" },
    { title: "Course Tour", color: "3B82F6" },
  ];
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><ImageIcon className="h-5 w-5" />Media Clips</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        {clips.map((c) => (
          <div key={c.title} className="border rounded-lg overflow-hidden group cursor-pointer">
            <div className="relative">
              <img src={`https://placehold.co/320x180/${c.color}/ffffff?text=${encodeURIComponent(c.title)}`} alt={c.title} className="w-full h-32 object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition">
                <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center text-primary text-xl">▶</div>
              </div>
            </div>
            <div className="p-3"><div className="font-semibold text-sm">{c.title}</div><div className="text-xs text-muted-foreground">2:14</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SiteBuilderPanel({ tournamentName, slug, eventDate }: { tournamentName: string; slug: string; eventDate: string | null }) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-lg font-display font-bold flex items-center gap-2"><FileEdit className="h-5 w-5" />Site Builder</h3>
        <DemoBtn tip="In the live version, this publishes your site">Publish Site</DemoBtn>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 border rounded-lg overflow-hidden">
          <div className="bg-muted/30 px-3 py-2 text-xs text-muted-foreground border-b">Live preview</div>
          <div className="relative h-56 bg-gradient-to-br from-primary to-primary/70 flex flex-col items-center justify-center text-primary-foreground p-6 text-center">
            <h2 className="text-2xl font-display font-bold">{tournamentName}</h2>
            <p className="text-sm opacity-90 mt-1">{eventDate || "Coming Soon"}</p>
            <button className="mt-4 bg-secondary text-secondary-foreground px-5 py-2 rounded font-semibold text-sm">Register Now</button>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">BRAND COLORS</p>
            <div className="flex gap-2">
              {["#1a5c38", "#F5A623", "#3B82F6", "#8B5CF6", "#EF4444"].map((c) => (
                <button key={c} className="h-8 w-8 rounded-full border-2 border-white shadow" style={{ backgroundColor: c }} title="Click to change in live version" />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">URL</p>
            <code className="block bg-muted p-2 rounded text-xs">teevents.golf/{slug}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

function WaitlistPanel() {
  const list = [
    { name: "Casey Morgan", added: "2 days ago" },
    { name: "Pat Lee", added: "1 day ago" },
    { name: "Drew Kim", added: "3 hours ago" },
  ];
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><ClipboardList className="h-5 w-5" />Waitlist</h3>
      <p className="text-sm text-muted-foreground mb-3">Automated 24-hour claim window when a spot opens.</p>
      <ul className="space-y-2">
        {list.map((p, i) => (
          <li key={p.name} className="flex items-center gap-3 border-b pb-2">
            <span className="font-bold text-muted-foreground w-6">{i + 1}.</span>
            <img src={avatarUrl(p.name, i)} alt="" className="h-8 w-8 rounded-full" />
            <span className="flex-1 font-medium">{p.name}</span>
            <span className="text-xs text-muted-foreground">added {p.added}</span>
            <DemoBtn>Offer Spot</DemoBtn>
          </li>
        ))}
      </ul>
    </div>
  );
}


function SidebarNavContent({ activeNav, onSelect }: { activeNav: string; onSelect: (title: string) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-primary-foreground/10">
        <img src={logoWhite} alt="TeeVents" className="h-8 w-8 object-contain flex-shrink-0" />
        <span className="font-display text-lg font-semibold tracking-wide">TeeVents</span>
      </div>

      {categories.map((cat) => (
        <div key={cat.label} className={`${cat.color.split(" ").find(c => c.startsWith("bg-")) ?? ""} rounded-md mx-1 my-1`}>
          <div className={`border-l-2 ${cat.color.split(" ").find(c => c.startsWith("border-l-")) ?? ""} ml-1 pl-2`}>
            <div className="text-primary-foreground/60 text-[10px] tracking-widest uppercase font-semibold py-1.5">
              {cat.label}
            </div>
          </div>
          <div className="space-y-0.5 pb-1">
            {cat.items.map((it) => {
              const isActive = activeNav === it.title;
              return (
                <button
                  key={it.title}
                  onClick={() => onSelect(it.title)}
                  className={`flex items-center w-full px-3 py-1.5 text-sm rounded transition-colors text-left ${
                    isActive
                      ? "bg-primary-foreground/15 text-secondary font-medium"
                      : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  }`}
                >
                  <it.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{it.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mx-1 my-1">
        <div className="border-l-2 border-l-gray-400 ml-2 pl-2">
          <div className="text-primary-foreground/50 text-[10px] tracking-widest uppercase font-semibold py-1.5">
            Settings
          </div>
        </div>
        <div className="space-y-0.5 pb-1">
          {settingsItems.map((it) => (
            <button
              key={it.title}
              onClick={() => onSelect(it.title)}
              className="flex items-center w-full px-3 py-1.5 text-sm rounded text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground text-left"
            >
              <it.icon className="mr-2 h-4 w-4" />
              <span>{it.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-primary-foreground/10 p-3">
        <button className="flex items-center gap-2 text-primary-foreground/60 hover:text-primary-foreground text-sm w-full">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
