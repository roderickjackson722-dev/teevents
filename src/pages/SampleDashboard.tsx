import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, DollarSign, Trophy, Heart, UserCheck,
  MessageSquare, Settings, ArrowLeft, CalendarRange, MapPin,
  TrendingUp, Clock, Wallet, Mail, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const sidebarItems = [
  { key: "home", label: "Dashboard", icon: LayoutDashboard },
  { key: "players", label: "Players", icon: Users },
  { key: "finances", label: "Finances", icon: DollarSign },
  { key: "leaderboard", label: "Leaderboard", icon: Trophy },
  { key: "sponsors", label: "Sponsors", icon: Heart },
  { key: "volunteers", label: "Volunteers", icon: UserCheck },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "settings", label: "Settings", icon: Settings },
];

const SampleDashboard = () => {
  const [activeTab, setActiveTab] = useState("home");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      <SEO title="Sample Dashboard | TeeVents" description="Interactive sample organizer dashboard for the Pebble Beach Charity Classic." path="/sample-dashboard" />

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-primary text-primary-foreground border-r border-primary/20 min-h-screen">
        <div className="p-4 border-b border-primary-foreground/10 flex items-center gap-2">
          <img src={logoBlack} alt="TeeVents" className="h-7 w-7 object-contain brightness-0 invert" />
          <div>
            <p className="text-xs font-bold leading-tight">TeeVents</p>
            <p className="text-[10px] text-primary-foreground/60">Demo Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === item.key
                  ? "bg-primary-foreground/15 text-primary-foreground font-semibold"
                  : "text-primary-foreground/70 hover:bg-primary-foreground/10"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </button>
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
        {/* Top Bar */}
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
            <Button size="sm" variant="secondary" onClick={() => navigate("/pricing")}>
              Get Started
            </Button>
          </div>
        </header>

        {/* Mobile Tab Switcher */}
        <div className="md:hidden border-b border-border bg-muted/50 overflow-x-auto">
          <div className="flex gap-1 p-2">
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
                  activeTab === item.key
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto space-y-6">
          {activeTab === "home" && <HomeTab />}
          {activeTab === "players" && <PlayersTab />}
          {activeTab === "finances" && <FinancesTab />}
          {activeTab === "leaderboard" && <LeaderboardTab />}
          {activeTab === "sponsors" && <SponsorsTab />}
          {activeTab === "volunteers" && <VolunteersTab />}
          {activeTab === "messages" && <MessagesTab />}
          {activeTab === "settings" && <SettingsTab />}
        </main>
      </div>
    </div>
  );
};

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

/* ─── Players ─── */
const PlayersTab = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-foreground">Registered Players ({samplePlayers.length})</h2>
      <Badge variant="outline">{t.current_registrations} total registered</Badge>
    </div>
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

/* ─── Finances ─── */
const FinancesTab = () => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold text-foreground">Financial Dashboard</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: "Total Collected", value: fin.total_collected, icon: DollarSign, color: "text-green-600" },
        { label: "Platform Fees (5%)", value: fin.platform_fees, icon: TrendingUp, color: "text-destructive" },
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
      <TabsList>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="payouts">Payouts</TabsTrigger>
      </TabsList>
      <TabsContent value="transactions">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Transaction History</CardTitle>
              <Badge variant="outline" className="text-xs">Next payout: {fin.next_payout_date}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["Date", "Golfer", "Gross", "Fee (5%)", "Hold (15%)", "Net", "Status"].map((h) => (
                      <th key={h} className="p-3 text-left font-semibold text-muted-foreground text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleDashboardTransactions.map((tx, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-3 text-muted-foreground text-xs">{tx.date}</td>
                      <td className="p-3 font-medium">{tx.golfer}</td>
                      <td className="p-3 text-right">{fmt(tx.gross)}</td>
                      <td className="p-3 text-right text-destructive">{fmt(tx.fee)}</td>
                      <td className="p-3 text-right text-yellow-600">{fmt(tx.hold)}</td>
                      <td className="p-3 text-right font-semibold">{fmt(tx.net)}</td>
                      <td className="p-3">
                        <Badge variant={tx.status === "Released" ? "default" : "outline"} className="text-xs">{tx.status}</Badge>
                      </td>
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
          <CardHeader><CardTitle className="text-base">Payout History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["Date", "Amount", "Method", "Batch ID", "Status", "Transactions"].map((h) => (
                      <th key={h} className="p-3 text-left font-semibold text-muted-foreground text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {samplePayouts.map((p, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-3 text-muted-foreground text-xs">{p.date}</td>
                      <td className="p-3 font-bold text-green-600">{fmt(p.amount)}</td>
                      <td className="p-3 text-xs">{p.method}</td>
                      <td className="p-3 text-xs font-mono text-muted-foreground">{p.batchId}</td>
                      <td className="p-3"><Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">{p.status}</Badge></td>
                      <td className="p-3 text-center">{p.transactions}</td>
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

/* ─── Leaderboard ─── */
const LeaderboardTab = () => (
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-foreground">Live Leaderboard</h2>
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {["Pos", "Team", "Score", "Thru"].map((h) => (
                <th key={h} className="p-3 text-left font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
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

/* ─── Sponsors ─── */
const SponsorsTab = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-foreground">Sponsors ({sampleSponsorsDetailed.length})</h2>
      <p className="text-sm text-muted-foreground">Total: {fmt(sampleSponsorsDetailed.reduce((s, sp) => s + sp.amount, 0))}</p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sampleSponsorsDetailed.map((sp, i) => (
        <Card key={i}>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={sp.level === "Platinum" ? "default" : "outline"}>{sp.level}</Badge>
              <Badge variant={sp.status === "Paid" ? "default" : "secondary"} className={`text-xs ${sp.status === "Paid" ? "bg-green-100 text-green-800 border-green-200" : ""}`}>
                {sp.status}
              </Badge>
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

/* ─── Volunteers ─── */
const VolunteersTab = () => (
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-foreground">Volunteers ({sampleVolunteersDetailed.length})</h2>
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Name", "Email", "Role", "Shift", "Status"].map((h) => (
                  <th key={h} className="p-3 text-left font-semibold text-muted-foreground text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleVolunteersDetailed.map((v, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="p-3 font-medium text-foreground">{v.name}</td>
                  <td className="p-3 text-muted-foreground text-xs">{v.email}</td>
                  <td className="p-3 text-xs">{v.role}</td>
                  <td className="p-3 text-xs text-muted-foreground">{v.shift}</td>
                  <td className="p-3">
                    <Badge variant={v.status === "Confirmed" ? "default" : "outline"} className={`text-xs ${v.status === "Confirmed" ? "bg-green-100 text-green-800 border-green-200" : ""}`}>
                      {v.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);

/* ─── Messages ─── */
const MessagesTab = () => (
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-foreground">Messages</h2>
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
              <Badge variant={m.status === "Sent" ? "default" : m.status === "Scheduled" ? "secondary" : "outline"} className="text-xs">
                {m.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Settings ─── */
const SettingsTab = () => (
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-foreground">Tournament Settings</h2>
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
            <p className="text-xs text-muted-foreground">
              This is a demo dashboard. In a real tournament, you can edit all settings, toggle fee models, manage registration fields, and configure your tournament website.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default SampleDashboard;
