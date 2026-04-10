import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, DollarSign, Trophy, Heart, UserCheck,
  MessageSquare, Settings, ArrowLeft, TrendingUp, Clock, Wallet, Mail,
  CheckCircle2, AlertCircle, ListChecks, Printer, ClipboardList,
  QrCode, BarChart3, ShoppingBag, Gavel, Camera, Gift, Share2,
  Palette, CreditCard, HelpCircle, CalendarRange, FileText, Lock,
  Star, MapPin, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SEO from "@/components/SEO";
import logoBlack from "@/assets/logo-black.png";
import {
  sampleTournamentFull as t,
  samplePlayers,
  sampleDashboardFinances as fin,
  sampleDashboardTransactions,
  samplePayouts,
  sampleSponsorsDetailed,
  sampleVolunteersDetailed,
  sampleMessages,
} from "@/components/sample-tournament/sampleDashboardData";
import { sampleLeaderboard } from "@/components/sample-tournament/sampleData";

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fillPct = Math.round((t.current_registrations / t.max_players) * 100);

type PlanTier = "base" | "starter" | "premium";

interface SidebarItem {
  key: string;
  label: string;
  icon: any;
  plan: PlanTier;
}

interface SidebarCategory {
  label: string;
  color: string;
  items: SidebarItem[];
}

const sidebarCategories: SidebarCategory[] = [
  {
    label: "OVERVIEW",
    color: "border-gray-400",
    items: [
      { key: "home", label: "Dashboard", icon: LayoutDashboard, plan: "base" },
      { key: "tournaments", label: "Tournaments", icon: CalendarRange, plan: "base" },
      { key: "planning-guide", label: "Planning Guide", icon: ListChecks, plan: "base" },
      { key: "printables", label: "Printables", icon: Printer, plan: "base" },
    ],
  },
  {
    label: "MANAGEMENT",
    color: "border-blue-400",
    items: [
      { key: "registration", label: "Registration", icon: ClipboardList, plan: "base" },
      { key: "players", label: "Players", icon: Users, plan: "base" },
      { key: "check-in", label: "Check-In", icon: QrCode, plan: "base" },
      { key: "waitlist", label: "Waitlist", icon: Clock, plan: "starter" },
      { key: "leaderboard", label: "Leaderboard", icon: Trophy, plan: "starter" },
      { key: "scoring", label: "Scoring", icon: Star, plan: "starter" },
      { key: "tee-sheet", label: "Tee Sheet", icon: MapPin, plan: "starter" },
      { key: "messages", label: "Messages", icon: MessageSquare, plan: "starter" },
      { key: "email-templates", label: "Email Templates", icon: Mail, plan: "starter" },
    ],
  },
  {
    label: "FINANCES",
    color: "border-yellow-500",
    items: [
      { key: "finances", label: "Finances", icon: DollarSign, plan: "base" },
      { key: "budget", label: "Budget", icon: BarChart3, plan: "starter" },
      { key: "sponsors", label: "Sponsors", icon: Heart, plan: "starter" },
      { key: "store", label: "Add On Store", icon: ShoppingBag, plan: "premium" },
      { key: "auction", label: "Auction", icon: Gavel, plan: "premium" },
    ],
  },
  {
    label: "ENGAGEMENT & OPERATIONS",
    color: "border-green-400",
    items: [
      { key: "gallery", label: "Gallery", icon: Camera, plan: "starter" },
      { key: "volunteers", label: "Volunteers", icon: UserCheck, plan: "starter" },
      { key: "surveys", label: "Surveys", icon: FileText, plan: "starter" },
      { key: "donations", label: "Donations", icon: Gift, plan: "premium" },
      { key: "share", label: "Share & Promote", icon: Share2, plan: "base" },
      { key: "flyer-studio", label: "Flyer Studio", icon: Palette, plan: "premium" },
    ],
  },
  {
    label: "SETTINGS",
    color: "border-gray-400",
    items: [
      { key: "payout-settings", label: "Payout Settings", icon: CreditCard, plan: "base" },
      { key: "director-shop", label: "Director Shop", icon: ShoppingBag, plan: "premium" },
      { key: "help", label: "Help Center", icon: HelpCircle, plan: "base" },
    ],
  },
];

const allItems = sidebarCategories.flatMap((c) => c.items);

const PlanBadge = ({ plan }: { plan: PlanTier }) => {
  const styles: Record<PlanTier, string> = {
    base: "bg-emerald-500 text-white",
    starter: "bg-amber-400 text-emerald-900",
    premium: "bg-violet-500 text-white",
  };
  const labels: Record<PlanTier, string> = { base: "Base", starter: "Starter", premium: "Premium" };
  return (
    <span className={`${styles[plan]} px-1.5 py-0.5 rounded-full text-[9px] font-semibold leading-none`}>
      {labels[plan]}
    </span>
  );
};

const SampleDashboard = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [upgradeModal, setUpgradeModal] = useState<PlanTier | null>(null);
  const navigate = useNavigate();

  const handleTabClick = (key: string) => {
    setActiveTab(key);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <SEO title="Sample Dashboard | TeeVents" description="Interactive sample organizer dashboard showcasing all TeeVents features." path="/sample-dashboard" />

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-primary text-primary-foreground border-r border-primary/20 min-h-screen overflow-y-auto">
        <div className="p-4 border-b border-primary-foreground/10 flex items-center gap-2">
          <img src={logoBlack} alt="TeeVents" className="h-7 w-7 object-contain brightness-0 invert" />
          <div>
            <p className="text-xs font-bold leading-tight">TeeVents</p>
            <p className="text-[10px] text-primary-foreground/60">Demo Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-3">
          {sidebarCategories.map((cat) => (
            <div key={cat.label}>
              <div className={`border-l-2 ${cat.color} pl-2 mb-1`}>
                <p className="text-[9px] font-bold text-primary-foreground/50 tracking-wider">{cat.label}</p>
              </div>
              <div className="space-y-0.5">
                {cat.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleTabClick(item.key)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      activeTab === item.key
                        ? "bg-primary-foreground/15 text-primary-foreground font-semibold"
                        : "text-primary-foreground/70 hover:bg-primary-foreground/10"
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <PlanBadge plan={item.plan} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-primary-foreground/10">
          <Badge variant="outline" className="w-full justify-center text-[10px] border-primary-foreground/30 text-primary-foreground/60">
            Demo Mode — No live data
          </Badge>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/sample-organizer")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Demo
            </Button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-foreground">{t.name}</h1>
              <p className="text-xs text-muted-foreground">{t.date} · {t.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800 border-green-200">{t.status}</Badge>
            <Button size="sm" variant="secondary" onClick={() => navigate("/pricing")}>Get Started</Button>
          </div>
        </header>

        {/* Mobile Tab Switcher */}
        <div className="md:hidden border-b border-border bg-muted/50 overflow-x-auto">
          <div className="flex gap-1 p-2">
            {allItems.slice(0, 10).map((item) => (
              <button
                key={item.key}
                onClick={() => handleTabClick(item.key)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] whitespace-nowrap ${
                  activeTab === item.key
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="h-3 w-3" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto space-y-6">
          {activeTab === "home" && <HomeTab />}
          {activeTab === "tournaments" && <TournamentsTab />}
          {activeTab === "planning-guide" && <PlanningGuideTab />}
          {activeTab === "printables" && <PrintablesTab />}
          {activeTab === "registration" && <PlayersTab />}
          {activeTab === "players" && <PlayersTab />}
          {activeTab === "check-in" && <CheckInTab />}
          {activeTab === "waitlist" && <WaitlistTab />}
          {activeTab === "leaderboard" && <LeaderboardTab />}
          {activeTab === "scoring" && <ScoringTab />}
          {activeTab === "tee-sheet" && <TeeSheetTab />}
          {activeTab === "messages" && <MessagesTab />}
          {activeTab === "email-templates" && <EmailTemplatesTab />}
          {activeTab === "finances" && <FinancesTab />}
          {activeTab === "budget" && <BudgetTab />}
          {activeTab === "sponsors" && <SponsorsTab />}
          {activeTab === "store" && <StoreTab />}
          {activeTab === "auction" && <AuctionTab />}
          {activeTab === "gallery" && <GalleryTab />}
          {activeTab === "volunteers" && <VolunteersTab />}
          {activeTab === "surveys" && <SurveysTab />}
          {activeTab === "donations" && <DonationsTab />}
          {activeTab === "share" && <ShareTab />}
          {activeTab === "flyer-studio" && <FlyerStudioTab />}
          {activeTab === "payout-settings" && <PayoutSettingsTab />}
          {activeTab === "director-shop" && <DirectorShopTab />}
          {activeTab === "help" && <HelpTab />}
          {activeTab === "settings" && <SettingsTab />}
        </main>
      </div>

      {/* Upgrade Modal */}
      <Dialog open={!!upgradeModal} onOpenChange={() => setUpgradeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-violet-500" />
              {upgradeModal === "premium" ? "Premium Feature" : "Starter Feature"}
            </DialogTitle>
            <DialogDescription>
              This feature requires a {upgradeModal === "premium" ? "Premium" : "Starter"} plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            {upgradeModal === "premium" ? (
              <ul className="space-y-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-500" /> Add On Store</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-500" /> Auction Management</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-500" /> Donation Tracking</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-500" /> Flyer Studio with Canva templates</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-500" /> Live Leaderboard & Scoring</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-500" /> Waitlist & Tee Sheet</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-500" /> Sponsor & Budget Management</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-500" /> Email & SMS Messaging</li>
              </ul>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <Button onClick={() => navigate("/pricing")} className="flex-1">View Pricing</Button>
            <Button variant="outline" onClick={() => navigate("/pricing")} className="flex-1">Start Free Trial</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─────────────────────── TAB COMPONENTS ─────────────────────── */

const SectionHeader = ({ title, badge, count }: { title: string; badge?: PlanTier; count?: string }) => (
  <div className="flex items-center gap-3">
    <h2 className="text-xl font-bold text-foreground">{title}</h2>
    {badge && <PlanBadge plan={badge} />}
    {count && <Badge variant="outline">{count}</Badge>}
  </div>
);

/* ─── Dashboard Home ─── */
const HomeTab = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: "Registered", value: `${t.current_registrations}/${t.max_players}`, icon: Users, color: "text-primary" },
        { label: "Revenue", value: fmt(fin.total_collected), icon: DollarSign, color: "text-green-600" },
        { label: "Sponsors", value: sampleSponsorsDetailed.length.toString(), icon: Heart, color: "text-secondary" },
        { label: "Volunteers", value: sampleVolunteersDetailed.length.toString(), icon: UserCheck, color: "text-blue-600" },
      ].map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-5 flex items-center gap-3">
            <s.icon className={`h-8 w-8 ${s.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader><CardTitle className="text-lg">Registration Progress</CardTitle></CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">{t.current_registrations} of {t.max_players} spots</span>
          <span className="font-bold text-foreground">{fillPct}%</span>
        </div>
        <Progress value={fillPct} className="h-3" />
        <p className="text-xs text-muted-foreground mt-2">{t.max_players - t.current_registrations} spots remaining · Closes {t.registration_close_date}</p>
      </CardContent>
    </Card>
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Quick Finances</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Collected</span><span className="font-bold">{fmt(fin.total_collected)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Platform Fees (5%)</span><span className="text-destructive">{fmt(fin.platform_fees)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Pending Hold</span><span className="text-yellow-600">{fmt(fin.pending_hold)}</span></div>
          <div className="flex justify-between border-t pt-2"><span className="font-semibold">Available</span><span className="font-bold text-green-600">{fmt(fin.available_balance)}</span></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2.5 text-sm">
          {[
            { icon: CheckCircle2, text: "Barbara Wilson registered", time: "Apr 4", color: "text-green-600" },
            { icon: DollarSign, text: "Payout BATCH-001 completed", time: "Apr 1", color: "text-primary" },
            { icon: Heart, text: "Pacific Insurance paid sponsorship", time: "Mar 30", color: "text-secondary" },
            { icon: Mail, text: "Welcome email sent to 54 players", time: "Mar 1", color: "text-blue-600" },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <a.icon className={`h-4 w-4 ${a.color} flex-shrink-0`} />
              <span className="text-foreground flex-1">{a.text}</span>
              <span className="text-xs text-muted-foreground">{a.time}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

/* ─── Tournaments ─── */
const TournamentsTab = () => {
  const tournaments = [
    { name: "Pebble Beach Charity Classic", date: "June 15, 2026", status: "Live", registrations: 54, max: 72 },
    { name: "Summer Open Championship", date: "August 8, 2026", status: "Draft", registrations: 0, max: 120 },
    { name: "Fall Classic Fundraiser", date: "October 10, 2026", status: "Draft", registrations: 0, max: 72 },
  ];
  return (
    <div className="space-y-4">
      <SectionHeader title="My Tournaments" badge="base" count={`${tournaments.length} tournaments`} />
      <div className="grid gap-4">
        {tournaments.map((tr, i) => (
          <Card key={i}>
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{tr.name}</p>
                <p className="text-xs text-muted-foreground">{tr.date} · {tr.registrations}/{tr.max} registered</p>
              </div>
              <Badge variant={tr.status === "Live" ? "default" : "outline"} className={tr.status === "Live" ? "bg-green-100 text-green-800 border-green-200" : ""}>{tr.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ─── Planning Guide ─── */
const PlanningGuideTab = () => {
  const items = [
    { category: "12 Months Out", tasks: ["Select date & venue", "Set budget goals", "Form committee"], done: [true, true, false] },
    { category: "6 Months Out", tasks: ["Secure sponsors", "Design tournament website", "Set registration fees"], done: [true, true, true] },
    { category: "3 Months Out", tasks: ["Open registration", "Order signage & prizes", "Recruit volunteers"], done: [true, false, false] },
    { category: "1 Month Out", tasks: ["Send reminders", "Finalize pairings", "Confirm catering"], done: [false, false, false] },
    { category: "Week Of", tasks: ["Print scorecards & badges", "Setup check-in station", "Brief volunteers"], done: [false, false, false] },
    { category: "Post Event", tasks: ["Send thank you emails", "Distribute survey", "Final payout"], done: [false, false, false] },
  ];
  const total = items.reduce((s, c) => s + c.tasks.length, 0);
  const completed = items.reduce((s, c) => s + c.done.filter(Boolean).length, 0);
  return (
    <div className="space-y-4">
      <SectionHeader title="Planning Guide" badge="base" count={`${completed}/${total} complete`} />
      <Progress value={(completed / total) * 100} className="h-2" />
      <div className="space-y-4">
        {items.map((cat) => (
          <Card key={cat.category}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{cat.category}</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {cat.tasks.map((task, j) => (
                <div key={j} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className={`h-4 w-4 ${cat.done[j] ? "text-green-500" : "text-muted-foreground/30"}`} />
                  <span className={cat.done[j] ? "line-through text-muted-foreground" : "text-foreground"}>{task}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ─── Printables ─── */
const PrintablesTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Printables" badge="base" />
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {["Scorecards", "Cart Signs", "Name Badges", "Alpha List", "Sponsor Signs", "Hole Assignments"].map((item) => (
        <Card key={item}>
          <CardContent className="pt-5 text-center space-y-3">
            <Printer className="h-8 w-8 mx-auto text-primary" />
            <p className="font-semibold text-foreground">{item}</p>
            <Button variant="outline" size="sm" disabled>Preview & Print</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Players / Registration ─── */
const PlayersTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Registered Players" badge="base" count={`${samplePlayers.length} players`} />
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Name", "Email", "Phone", "Handicap", "Shirt", "Dietary", "Date", "Status"].map((h) => (
                  <th key={h} className="text-left p-3 font-semibold text-muted-foreground text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {samplePlayers.map((p, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 font-medium text-foreground whitespace-nowrap">{p.first_name} {p.last_name}</td>
                  <td className="p-3 text-muted-foreground text-xs">{p.email}</td>
                  <td className="p-3 text-muted-foreground text-xs">{p.phone}</td>
                  <td className="p-3 text-center">{p.handicap}</td>
                  <td className="p-3 text-xs">{p.shirt_size}</td>
                  <td className="p-3 text-xs text-muted-foreground">{p.dietary}</td>
                  <td className="p-3 text-xs text-muted-foreground">{p.date}</td>
                  <td className="p-3"><Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);

/* ─── Check-In ─── */
const CheckInTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Check-In Station" badge="base" />
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Checked In", value: "38", color: "text-green-600" },
        { label: "Remaining", value: "16", color: "text-amber-600" },
        { label: "Total", value: "54", color: "text-primary" },
      ].map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-5 text-center">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardContent className="pt-5 text-center space-y-4">
        <QrCode className="h-16 w-16 mx-auto text-primary" />
        <p className="font-semibold text-foreground">QR Scanner Ready</p>
        <p className="text-sm text-muted-foreground">Open on a tablet to scan player QR codes for instant check-in</p>
        <Button disabled>Open Scan Station</Button>
      </CardContent>
    </Card>
  </div>
);

/* ─── Waitlist ─── */
const WaitlistTab = () => {
  const waitlist = [
    { name: "Alex Morgan", email: "alex@example.com", date: "2026-04-05", position: 1 },
    { name: "Chris Evans", email: "chris@example.com", date: "2026-04-06", position: 2 },
    { name: "Dana White", email: "dana@example.com", date: "2026-04-06", position: 3 },
    { name: "Eva Green", email: "eva@example.com", date: "2026-04-07", position: 4 },
    { name: "Frank Castle", email: "frank@example.com", date: "2026-04-08", position: 5 },
  ];
  return (
    <div className="space-y-4">
      <SectionHeader title="Waitlist" badge="starter" count={`${waitlist.length} waiting`} />
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">{["#", "Name", "Email", "Date Added", "Action"].map((h) => <th key={h} className="p-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {waitlist.map((w) => (
                <tr key={w.position} className="border-b border-border/50">
                  <td className="p-3 font-bold">{w.position}</td>
                  <td className="p-3 font-medium text-foreground">{w.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{w.email}</td>
                  <td className="p-3 text-xs text-muted-foreground">{w.date}</td>
                  <td className="p-3"><Button size="sm" variant="outline" disabled>Offer Spot</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── Leaderboard ─── */
const LeaderboardTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Live Leaderboard" badge="starter" />
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">{["Pos", "Team", "Score", "Thru"].map((h) => <th key={h} className="p-3 text-left font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {sampleLeaderboard.map((team) => (
              <tr key={team.position} className={`border-b border-border/50 ${team.position <= 3 ? "bg-secondary/5" : ""}`}>
                <td className="p-3 font-bold text-foreground">{team.position}</td>
                <td className="p-3 font-medium text-foreground">{team.name}</td>
                <td className={`p-3 font-bold ${team.score < 0 ? "text-green-600" : team.score > 0 ? "text-destructive" : "text-foreground"}`}>
                  {team.score > 0 ? `+${team.score}` : team.score === 0 ? "E" : team.score}
                </td>
                <td className="p-3 text-muted-foreground">{team.thru}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
);

/* ─── Scoring ─── */
const ScoringTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Score Entry" badge="starter" />
    <Card>
      <CardHeader><CardTitle className="text-base">Group 1 — Hole 1-9</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left text-xs font-semibold text-muted-foreground">Player</th>
                {Array.from({ length: 9 }, (_, i) => <th key={i} className="p-2 text-center text-xs font-semibold text-muted-foreground">{i + 1}</th>)}
                <th className="p-2 text-center text-xs font-semibold text-muted-foreground">Out</th>
              </tr>
            </thead>
            <tbody>
              {samplePlayers.slice(0, 4).map((p, pi) => (
                <tr key={pi} className="border-b border-border/50">
                  <td className="p-2 font-medium text-foreground whitespace-nowrap text-xs">{p.first_name} {p.last_name}</td>
                  {[4, 5, 3, 4, 5, 4, 3, 4, 5].map((par, hi) => {
                    const score = par + (pi % 2 === 0 ? (hi % 3 === 0 ? -1 : 0) : (hi % 4 === 0 ? 1 : 0));
                    return <td key={hi} className={`p-2 text-center text-xs font-mono ${score < par ? "text-green-600 font-bold" : score > par ? "text-destructive" : ""}`}>{score}</td>;
                  })}
                  <td className="p-2 text-center text-xs font-bold">{34 + pi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);

/* ─── Tee Sheet ─── */
const TeeSheetTab = () => {
  const tees = [
    { time: "7:00 AM", hole: 1, group: "Smith, Jones, Brown, Davis" },
    { time: "7:10 AM", hole: 2, group: "Wilson, Taylor, Anderson, Martinez" },
    { time: "7:20 AM", hole: 3, group: "Garcia, Rodriguez, Miller, Wilson B." },
    { time: "7:30 AM", hole: 4, group: "TBD" },
    { time: "7:40 AM", hole: 5, group: "TBD" },
  ];
  return (
    <div className="space-y-4">
      <SectionHeader title="Tee Sheet" badge="starter" />
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">{["Tee Time", "Starting Hole", "Group"].map((h) => <th key={h} className="p-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {tees.map((t, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="p-3 font-mono font-semibold text-foreground">{t.time}</td>
                  <td className="p-3">Hole {t.hole}</td>
                  <td className="p-3 text-muted-foreground text-xs">{t.group}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── Messages ─── */
const MessagesTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Messages" badge="starter" />
    <div className="space-y-3">
      {sampleMessages.map((m, i) => (
        <Card key={i}>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{m.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.recipients} recipients · {m.sent}</p>
                </div>
              </div>
              <Badge variant={m.status === "Sent" ? "default" : m.status === "Scheduled" ? "secondary" : "outline"} className="text-xs">{m.status}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Email Templates ─── */
const EmailTemplatesTab = () => {
  const templates = [
    { name: "Registration Confirmation", desc: "Sent immediately after payment", status: "Active" },
    { name: "Event Reminder", desc: "Sent 3 days before tournament", status: "Active" },
    { name: "Thank You", desc: "Sent 1 day after event", status: "Draft" },
    { name: "Sponsor Follow-up", desc: "Post-event sponsor thank you", status: "Draft" },
  ];
  return (
    <div className="space-y-4">
      <SectionHeader title="Email Templates" badge="starter" />
      <div className="grid sm:grid-cols-2 gap-4">
        {templates.map((t) => (
          <Card key={t.name}>
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground text-sm">{t.name}</p>
                <Badge variant={t.status === "Active" ? "default" : "outline"} className="text-xs">{t.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
              <Button variant="outline" size="sm" disabled>Edit Template</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ─── Finances ─── */
const FinancesTab = () => (
  <div className="space-y-6">
    <SectionHeader title="Financial Dashboard" badge="base" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: "Total Collected", value: fin.total_collected, icon: DollarSign, color: "text-green-600" },
        { label: "TeeVents Fee (5%)", value: fin.platform_fees, icon: TrendingUp, color: "text-destructive" },
        { label: "Pending Hold", value: fin.pending_hold, icon: Clock, color: "text-yellow-600" },
        { label: "Available Balance", value: fin.available_balance, icon: Wallet, color: "text-primary" },
      ].map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-5 text-center">
            <c.icon className={`h-7 w-7 mx-auto mb-2 ${c.color}`} />
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{fmt(c.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
    <Tabs defaultValue="transactions">
      <TabsList><TabsTrigger value="transactions">Transactions</TabsTrigger><TabsTrigger value="payouts">Payouts</TabsTrigger></TabsList>
      <TabsContent value="transactions">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">{["Date", "Golfer", "Gross", "Fee (5%)", "Hold (15%)", "Net", "Status"].map((h) => <th key={h} className="p-3 text-left font-semibold text-muted-foreground text-xs">{h}</th>)}</tr></thead>
                <tbody>
                  {sampleDashboardTransactions.map((tx, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-3 text-muted-foreground text-xs">{tx.date}</td>
                      <td className="p-3 font-medium">{tx.golfer}</td>
                      <td className="p-3 text-right">{fmt(tx.gross)}</td>
                      <td className="p-3 text-right text-destructive">{fmt(tx.fee)}</td>
                      <td className="p-3 text-right text-yellow-600">{fmt(tx.hold)}</td>
                      <td className="p-3 text-right font-semibold">{fmt(tx.net)}</td>
                      <td className="p-3"><Badge variant={tx.status === "Released" ? "default" : "outline"} className="text-xs">{tx.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="payouts">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">{["Date", "Amount", "Method", "Batch ID", "Status"].map((h) => <th key={h} className="p-3 text-left font-semibold text-muted-foreground text-xs">{h}</th>)}</tr></thead>
                <tbody>
                  {samplePayouts.map((p, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-3 text-muted-foreground text-xs">{p.date}</td>
                      <td className="p-3 font-bold text-green-600">{fmt(p.amount)}</td>
                      <td className="p-3 text-xs">{p.method}</td>
                      <td className="p-3 text-xs font-mono text-muted-foreground">{p.batchId}</td>
                      <td className="p-3"><Badge className="text-xs bg-green-100 text-green-800 border-green-200">{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
);

/* ─── Budget ─── */
const BudgetTab = () => {
  const items = [
    { desc: "Registration Revenue", category: "Income", amount: 8100, type: "income", paid: true },
    { desc: "Sponsor Revenue", amount: 12000, category: "Income", type: "income", paid: true },
    { desc: "Course Rental", amount: 3500, category: "Venue", type: "expense", paid: true },
    { desc: "Catering", amount: 2800, category: "Food & Bev", type: "expense", paid: false },
    { desc: "Prizes & Awards", amount: 1500, category: "Prizes", type: "expense", paid: false },
    { desc: "Signage & Printing", amount: 800, category: "Marketing", type: "expense", paid: true },
  ];
  const income = items.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0);
  const expenses = items.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0);
  return (
    <div className="space-y-4">
      <SectionHeader title="Budget Tracker" badge="starter" />
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 text-center"><p className="text-xs text-muted-foreground">Income</p><p className="text-lg font-bold text-green-600">{fmt(income)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-lg font-bold text-destructive">{fmt(expenses)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-xs text-muted-foreground">Net</p><p className="text-lg font-bold text-primary">{fmt(income - expenses)}</p></CardContent></Card>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">{["Description", "Category", "Type", "Amount", "Status"].map((h) => <th key={h} className="p-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="p-3 font-medium text-foreground">{item.desc}</td>
                  <td className="p-3 text-xs text-muted-foreground">{item.category}</td>
                  <td className="p-3"><Badge variant={item.type === "income" ? "default" : "secondary"} className="text-xs">{item.type}</Badge></td>
                  <td className={`p-3 font-semibold ${item.type === "income" ? "text-green-600" : "text-destructive"}`}>{item.type === "income" ? "+" : "-"}{fmt(item.amount)}</td>
                  <td className="p-3"><Badge variant={item.paid ? "default" : "outline"} className={`text-xs ${item.paid ? "bg-green-100 text-green-800 border-green-200" : ""}`}>{item.paid ? "Paid" : "Pending"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── Sponsors ─── */
const SponsorsTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Sponsors" badge="starter" count={fmt(sampleSponsorsDetailed.reduce((s, sp) => s + sp.amount, 0))} />
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sampleSponsorsDetailed.map((sp, i) => (
        <Card key={i}>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={sp.level === "Platinum" ? "default" : "outline"}>{sp.level}</Badge>
              <Badge variant={sp.status === "Paid" ? "default" : "secondary"} className={`text-xs ${sp.status === "Paid" ? "bg-green-100 text-green-800 border-green-200" : ""}`}>{sp.status}</Badge>
            </div>
            <img src={sp.logo} alt={sp.name} className="w-full h-16 object-contain rounded" />
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground text-sm">{sp.name}</span>
              <span className="font-bold text-foreground">{fmt(sp.amount)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Store ─── */
const StoreTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Add On Store" badge="premium" />
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { name: "Tournament Polo Shirt", price: 45, img: "https://placehold.co/300x200/1a365d/ffffff?text=Polo+Shirt" },
        { name: "Golf Cap", price: 25, img: "https://placehold.co/300x200/2d6a4f/ffffff?text=Golf+Cap" },
        { name: "Tournament Towel", price: 15, img: "https://placehold.co/300x200/7c3aed/ffffff?text=Towel" },
      ].map((p) => (
        <Card key={p.name}>
          <CardContent className="pt-0 p-0">
            <img src={p.img} alt={p.name} className="w-full h-32 object-cover rounded-t-lg" />
            <div className="p-4 space-y-2">
              <p className="font-semibold text-foreground text-sm">{p.name}</p>
              <p className="font-bold text-primary">{fmt(p.price)}</p>
              <Button size="sm" variant="outline" className="w-full" disabled>Add to Cart</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Auction ─── */
const AuctionTab = () => {
  const items = [
    { title: "Signed Tiger Woods Glove", type: "Auction", currentBid: 350, bids: 8 },
    { title: "4-Night Stay at Pebble Beach", type: "Auction", currentBid: 2100, bids: 15 },
    { title: "Pro Shop Gift Card Bundle", type: "Raffle", currentBid: 0, bids: 42 },
    { title: "Custom Golf Bag", type: "Auction", currentBid: 480, bids: 6 },
  ];
  return (
    <div className="space-y-4">
      <SectionHeader title="Auction & Raffle" badge="premium" />
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <Card key={item.title}>
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground text-sm">{item.title}</p>
                <Badge variant={item.type === "Auction" ? "default" : "secondary"} className="text-xs">{item.type}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.type === "Auction" ? "Current Bid" : "Tickets Sold"}</span>
                <span className="font-bold text-foreground">{item.type === "Auction" ? fmt(item.currentBid) : item.bids}</span>
              </div>
              {item.type === "Auction" && <p className="text-xs text-muted-foreground">{item.bids} bids</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ─── Gallery ─── */
const GalleryTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Photo Gallery" badge="starter" />
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i} className="overflow-hidden">
          <img src={`https://placehold.co/400x300/${["1a365d", "2d6a4f", "7c3aed", "dc2626", "b45309", "0d9488"][i]}/ffffff?text=Photo+${i + 1}`} alt={`Gallery ${i + 1}`} className="w-full h-40 object-cover" />
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Volunteers ─── */
const VolunteersTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Volunteers" badge="starter" count={`${sampleVolunteersDetailed.length} volunteers`} />
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">{["Name", "Email", "Role", "Shift", "Status"].map((h) => <th key={h} className="p-3 text-left font-semibold text-muted-foreground text-xs">{h}</th>)}</tr></thead>
            <tbody>
              {sampleVolunteersDetailed.map((v, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="p-3 font-medium text-foreground">{v.name}</td>
                  <td className="p-3 text-muted-foreground text-xs">{v.email}</td>
                  <td className="p-3 text-xs">{v.role}</td>
                  <td className="p-3 text-xs text-muted-foreground">{v.shift}</td>
                  <td className="p-3"><Badge variant={v.status === "Confirmed" ? "default" : "outline"} className={`text-xs ${v.status === "Confirmed" ? "bg-green-100 text-green-800 border-green-200" : ""}`}>{v.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);

/* ─── Surveys ─── */
const SurveysTab = () => {
  const results = [
    { question: "How would you rate the overall event?", avg: 4.6, responses: 42 },
    { question: "How was the course condition?", avg: 4.8, responses: 42 },
    { question: "Would you attend again?", avg: 4.9, responses: 42 },
    { question: "How was the food & beverage?", avg: 4.2, responses: 38 },
  ];
  return (
    <div className="space-y-4">
      <SectionHeader title="Post-Event Survey" badge="starter" count="42 responses" />
      <div className="grid sm:grid-cols-2 gap-4">
        {results.map((r) => (
          <Card key={r.question}>
            <CardContent className="pt-5 space-y-2">
              <p className="font-medium text-foreground text-sm">{r.question}</p>
              <div className="flex items-center gap-2">
                <div className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(r.avg) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />)}</div>
                <span className="text-sm font-bold text-foreground">{r.avg}</span>
                <span className="text-xs text-muted-foreground">({r.responses})</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ─── Donations ─── */
const DonationsTab = () => {
  const donations = [
    { name: "John Smith", amount: 100, date: "2026-04-01" },
    { name: "Sarah Jones", amount: 250, date: "2026-04-02" },
    { name: "Anonymous", amount: 50, date: "2026-04-03" },
    { name: "Michael Brown", amount: 500, date: "2026-04-04" },
    { name: "Emily Davis", amount: 75, date: "2026-04-05" },
  ];
  const total = donations.reduce((s, d) => s + d.amount, 0);
  const goal = 5000;
  return (
    <div className="space-y-4">
      <SectionHeader title="Donations" badge="premium" />
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Raised</span>
            <span className="font-bold text-foreground">{fmt(total)} of {fmt(goal)} goal</span>
          </div>
          <Progress value={(total / goal) * 100} className="h-3" />
          <p className="text-xs text-muted-foreground">{donations.length} donors · {Math.round((total / goal) * 100)}% of goal</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">{["Donor", "Amount", "Date"].map((h) => <th key={h} className="p-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {donations.map((d, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="p-3 font-medium text-foreground">{d.name}</td>
                  <td className="p-3 font-bold text-green-600">{fmt(d.amount)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{d.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── Share & Promote ─── */
const ShareTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Share & Promote" badge="base" />
    <div className="grid sm:grid-cols-2 gap-4">
      <Card>
        <CardContent className="pt-5 text-center space-y-3">
          <QrCode className="h-24 w-24 mx-auto text-primary" />
          <p className="font-semibold text-foreground">Tournament QR Code</p>
          <p className="text-xs text-muted-foreground">Scan to view tournament page</p>
          <Button variant="outline" size="sm" disabled>Download QR</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5 space-y-3">
          <p className="font-semibold text-foreground">Short URL</p>
          <div className="bg-muted rounded-lg p-3 font-mono text-sm text-foreground">teevents.golf/t/pebble-beach-2026</div>
          <p className="font-semibold text-foreground mt-4">Social Media Templates</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>📣 Join us for the Pebble Beach Charity Classic! Register now at teevents.golf/t/pebble-beach-2026</p>
            <p>⛳ Only 18 spots left! Don't miss out on this incredible day of golf for charity.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

/* ─── Flyer Studio ─── */
const FlyerStudioTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Flyer Studio" badge="premium" />
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {["Classic Tournament Flyer", "Modern Save the Date", "Sponsor Thank You", "Social Media Post", "Email Header", "Registration Banner"].map((name) => (
        <Card key={name}>
          <CardContent className="pt-5 text-center space-y-3">
            <Palette className="h-8 w-8 mx-auto text-violet-500" />
            <p className="font-semibold text-foreground text-sm">{name}</p>
            <Button variant="outline" size="sm" disabled>Customize in Canva</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Payout Settings ─── */
const PayoutSettingsTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Payout Settings" badge="base" />
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Stripe Connect — Connected</p>
              <p className="text-xs text-green-600">Payouts go directly to your bank account</p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {[
            { label: "Payout Schedule", value: "Bi-weekly (every other Monday)" },
            { label: "Minimum Withdrawal", value: "$25.00" },
            { label: "Bank Account", value: "••••4567 (Chase)" },
            { label: "Next Payout Date", value: "April 14, 2026" },
          ].map((s) => (
            <div key={s.label} className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-medium text-foreground">{s.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

/* ─── Director Shop ─── */
const DirectorShopTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Director Shop" badge="premium" />
    <div className="grid sm:grid-cols-2 gap-4">
      {[
        { name: "White Glove Consulting", price: 499, desc: "1-on-1 tournament setup & strategy session" },
        { name: "Custom Course Signage Package", price: 299, desc: "Professional tee signs, directional signs, sponsor banners" },
        { name: "Hole-in-One Insurance", price: 199, desc: "Coverage up to $25,000 for par-3 contests" },
        { name: "Premium Support Package", price: 149, desc: "Priority support for your tournament week" },
      ].map((p) => (
        <Card key={p.name}>
          <CardContent className="pt-5 space-y-2">
            <p className="font-semibold text-foreground">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.desc}</p>
            <p className="font-bold text-primary text-lg">{fmt(p.price)}</p>
            <Button size="sm" variant="outline" disabled>Add to Cart</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Help ─── */
const HelpTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Help Center" badge="base" />
    <div className="grid sm:grid-cols-2 gap-4">
      {[
        { title: "Getting Started", desc: "Create your first tournament and configure settings" },
        { title: "Payment & Fees", desc: "Understand platform fees, holds, and payouts" },
        { title: "Connect Stripe", desc: "Set up your Stripe account to receive payouts" },
        { title: "Refunds & Chargebacks", desc: "How refunds and disputes are handled" },
        { title: "Custom Domains", desc: "Point your own domain to your tournament site" },
        { title: "Contact Support", desc: "Reach our team at support@teevents.golf" },
      ].map((h) => (
        <Card key={h.title}>
          <CardContent className="pt-5 space-y-1">
            <p className="font-semibold text-foreground text-sm">{h.title}</p>
            <p className="text-xs text-muted-foreground">{h.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Settings ─── */
const SettingsTab = () => (
  <div className="space-y-4">
    <SectionHeader title="Tournament Settings" badge="base" />
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {[
            { label: "Tournament Name", value: t.name },
            { label: "Date", value: t.date },
            { label: "Location", value: t.location },
            { label: "Registration Fee", value: fmt(t.registration_fee) },
            { label: "Max Players", value: t.max_players.toString() },
            { label: "Fee Model", value: "Pass to Golfer" },
            { label: "Status", value: t.status },
            { label: "Registration Closes", value: t.registration_close_date },
          ].map((s) => (
            <div key={s.label} className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-medium text-foreground">{s.value}</span>
            </div>
          ))}
        </div>
        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">This is a demo dashboard. In a real tournament, you can edit all settings, toggle fee models, manage registration fields, and configure your tournament website.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default SampleDashboard;
