import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Trophy, ClipboardCheck, Users, MessageSquare,
  DollarSign, Wallet, Award, ShoppingBag, Settings, LogOut, ShoppingCart,
  BarChart3, ScanLine, Gavel, ImageIcon, UserCheck, ClipboardList, Heart,
  Clock, CreditCard, Share2, FileEdit, Printer, PenLine, Mail, HelpCircle,
  FlaskConical, MapPin, Sliders, Search as SearchIcon, Megaphone,
  Building2, Store, Target, BedDouble, Ticket, Eye, Activity, ArrowRight,
} from "lucide-react";
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
      { title: "Sponsorship Management", icon: Award },
      { title: "Lodging", icon: BedDouble },
      { title: "Team Management", icon: Building2 },
      { title: "Organization Info", icon: Building2 },
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
    label: "Operations",
    color: "border-l-purple-400 bg-purple-400/5",
    items: [
      { title: "Players", icon: Users },
      { title: "Waitlist", icon: ClipboardList },
      { title: "Check-In", icon: ScanLine },
      { title: "Tee Sheet", icon: Clock },
      { title: "Live Leaderboard", icon: BarChart3 },
      { title: "Scoring", icon: PenLine },
      { title: "Test Simulator", icon: FlaskConical },
      { title: "Volunteers", icon: UserCheck },
      { title: "Vendors", icon: Store },
      { title: "Side Events", icon: Ticket },
      { title: "Team Performance", icon: Target },
      { title: "Event Day Contests", icon: Trophy },
      { title: "Messages", icon: MessageSquare },
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
      { title: "Day-Of Page", icon: ScanLine },
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
        {/* Sidebar — visual replica of real DashboardSidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-primary text-primary-foreground border-r border-border overflow-y-auto max-h-[calc(100vh-44px)] sticky top-[44px]">
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
                      onClick={() => setActiveNav(it.title)}
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
                  onClick={() => setActiveNav(it.title)}
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
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b-2 border-secondary bg-secondary/15 px-4">
            <div className="flex items-center gap-2">
              <span className="text-base md:text-lg font-display font-bold text-foreground">
                {orgName} Dashboard
              </span>
            </div>
            <Link to={`/sample/${slug}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Eye className="h-4 w-4" /> View public site
            </Link>
          </header>

          <main className="flex-1 bg-golf-cream p-3 sm:p-4 md:p-6 overflow-x-auto">
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

            {/* Contextual sample panels — change with sidebar selection */}
            {activeNav === "Players" || activeNav === "Dashboard" ? (
              <div className="bg-card rounded-lg border border-border p-6 mb-6">
                <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><Users className="h-5 w-5" />Registered Players</h3>
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground"><tr><th className="py-2">Name</th><th>Handicap</th><th>Status</th></tr></thead>
                  <tbody>
                    {participants.slice(0, 10).map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="py-2">{p.name}</td>
                        <td>{p.handicap}</td>
                        <td><Badge variant="outline" className="text-xs">Paid</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {activeNav === "Live Leaderboard" || activeNav === "Scoring" || activeNav === "Dashboard" ? (
              <div className="bg-card rounded-lg border border-border p-6 mb-6">
                <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5" />Live Leaderboard</h3>
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground"><tr><th className="py-2">Pos</th><th>Team</th><th>Gross</th><th>Net</th><th>Thru</th></tr></thead>
                  <tbody>
                    {leaderboard.map((l) => (
                      <tr key={l.id} className="border-b">
                        <td className="py-2 font-semibold">{l.position}</td>
                        <td>{l.player_name}</td>
                        <td>{formatScore(l.gross_score)}</td>
                        <td>{formatScore(l.net_score)}</td>
                        <td>{l.thru}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {activeNav === "Sponsorship Management" || activeNav === "Dashboard" ? (
              <div className="bg-card rounded-lg border border-border p-6 mb-6">
                <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><Award className="h-5 w-5" />Sponsors</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {sponsors.map((s) => (
                    <div key={s.id} className="border rounded-md p-3 flex items-center gap-3">
                      <div className="h-12 w-12 rounded flex items-center justify-center text-white font-bold" style={{ backgroundColor: s.logo_color }}>{s.name[0]}</div>
                      <div className="flex-1">
                        <div className="font-medium">{s.name}</div>
                        <Badge variant="outline" className="text-xs">{s.level}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeNav === "Finances" || activeNav === "Dashboard" ? (
              <div className="bg-card rounded-lg border border-border p-6 mb-6">
                <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><Wallet className="h-5 w-5" />Finances</h3>
                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  <div className="border rounded-md p-3"><div className="text-xs text-muted-foreground">Gross Revenue</div><div className="text-xl font-bold">{fmt(totalRevenue)}</div></div>
                  <div className="border rounded-md p-3"><div className="text-xs text-muted-foreground">Platform Fee (5%)</div><div className="text-xl font-bold text-orange-600">{fmt(platformFee)}</div></div>
                  <div className="border rounded-md p-3"><div className="text-xs text-muted-foreground">Net to Organizer</div><div className="text-xl font-bold text-green-600">{fmt(netPayout)}</div></div>
                </div>
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground"><tr><th className="py-2">Customer</th><th>Type</th><th>Gross</th><th>Fee</th><th>Net</th></tr></thead>
                  <tbody>
                    {participants.slice(0, 8).map((p) => {
                      const g = sample.registration_fee_cents;
                      const f = Math.round(g * 0.05);
                      return (
                        <tr key={p.id} className="border-b">
                          <td className="py-2">{p.name}</td>
                          <td><Badge variant="outline">Registration</Badge></td>
                          <td>{fmt(g)}</td>
                          <td className="text-orange-600">{fmt(f)}</td>
                          <td className="text-green-600">{fmt(g - f)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {activeNav === "Payout Settings" ? (
              <div className="bg-card rounded-lg border border-border p-6 mb-6">
                <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5" />Payout Settings</h3>
                <div className="border rounded-md p-4 bg-green-50">
                  <div className="flex justify-between"><span className="font-medium">Stripe Connect</span><Badge className="bg-green-600">Connected</Badge></div>
                  <div className="text-xs text-muted-foreground mt-1">Account ending •••• 4242 — Payouts arrive within 2 business days</div>
                </div>
              </div>
            ) : null}

            {activeNav === "Share & Promote" ? (
              <div className="bg-card rounded-lg border border-border p-6 mb-6">
                <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2"><Share2 className="h-5 w-5" />Share & Promote</h3>
                <p className="text-sm mb-2">Your tournament URL:</p>
                <code className="block bg-muted p-3 rounded font-mono text-sm">{window.location.origin}/sample/{slug}</code>
              </div>
            ) : null}

            {/* Generic feature preview — any other sidebar item shows a realistic mock panel */}
            {![
              "Dashboard","Players","Live Leaderboard","Scoring","Sponsorship Management",
              "Finances","Payout Settings","Share & Promote"
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
