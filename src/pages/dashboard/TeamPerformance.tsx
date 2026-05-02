import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, Download, Loader2, Copy, Trophy, Users, DollarSign,
  Award, Target, BarChart3, Crown,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Tournament = { id: string; title: string; slug: string | null; custom_slug?: string | null };

type Promoter = {
  id: string;
  tournament_id: string;
  name: string;
  email: string;
  role: string | null;
  unique_ref_code: string;
  is_active: boolean;
  created_at: string;
};

type RegRow = {
  id: string;
  promoter_id: string | null;
  total_amount_cents: number | null;
  payment_status: string;
  created_at: string;
};

type Incentive = {
  id: string;
  tournament_id: string;
  name: string;
  description: string | null;
  threshold_registrations: number | null;
  threshold_revenue_cents: number | null;
  threshold_rank: number | null;
  reward_type: string | null;
  reward_value: string | null;
  awarded_to: string | null;
  awarded_at: string | null;
};

const ROLE_OPTIONS = ["Board Member", "Volunteer", "Staff", "Sponsor", "Other"];

const fmtUsd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const buildRefUrl = (origin: string, slug: string | null, code: string) =>
  `${origin}/t/${slug || ""}?ref=${code}`;

export default function TeamPerformance() {
  const { org } = useOrgContext();
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState<string>("");
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [regs, setRegs] = useState<RegRow[]>([]);
  const [clicks, setClicks] = useState<{ promoter_id: string }[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);

  // Add/edit promoter dialog
  const [promoterOpen, setPromoterOpen] = useState(false);
  const [editingPromoter, setEditingPromoter] = useState<Promoter | null>(null);
  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pRole, setPRole] = useState("Board Member");
  const [pCustomRole, setPCustomRole] = useState("");
  const [pActive, setPActive] = useState(true);
  const [savingP, setSavingP] = useState(false);

  // Incentive dialog
  const [incOpen, setIncOpen] = useState(false);
  const [editingInc, setEditingInc] = useState<Incentive | null>(null);
  const [iName, setIName] = useState("");
  const [iDesc, setIDesc] = useState("");
  const [iThresholdType, setIThresholdType] = useState<"registrations" | "revenue" | "rank" | "custom">("registrations");
  const [iThresholdValue, setIThresholdValue] = useState("");
  const [iRewardType, setIRewardType] = useState("gift_card");
  const [iRewardValue, setIRewardValue] = useState("");
  const [savingI, setSavingI] = useState(false);

  // Award dialog
  const [awardingInc, setAwardingInc] = useState<Incentive | null>(null);
  const [awardPromoterId, setAwardPromoterId] = useState<string>("");

  const tournament = useMemo(
    () => tournaments.find((t) => t.id === tournamentId) || null,
    [tournaments, tournamentId],
  );
  const slug = tournament?.custom_slug || tournament?.slug || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://teevents.golf";

  // Load tournaments
  useEffect(() => {
    if (!org) return;
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title, slug, custom_slug")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false });
      const list = (data || []) as Tournament[];
      setTournaments(list);
      if (list.length && !tournamentId) setTournamentId(list[0].id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  // Load promoters, regs, incentives, clicks per tournament
  const refresh = async () => {
    if (!tournamentId) return;
    const [{ data: prs }, { data: rs }, { data: incs }] = await Promise.all([
      supabase.from("team_promoters").select("*").eq("tournament_id", tournamentId).order("created_at", { ascending: false }),
      supabase
        .from("tournament_registrations")
        .select("id, promoter_id, total_amount_cents, payment_status, created_at")
        .eq("tournament_id", tournamentId),
      supabase.from("promoter_incentives").select("*").eq("tournament_id", tournamentId).order("created_at", { ascending: false }),
    ]);
    const promoterList = (prs || []) as Promoter[];
    setPromoters(promoterList);
    setRegs((rs || []) as RegRow[]);
    setIncentives((incs || []) as Incentive[]);

    // Clicks (only for active promoters of this tournament)
    if (promoterList.length) {
      const { data: cs } = await supabase
        .from("referral_clicks")
        .select("promoter_id")
        .in("promoter_id", promoterList.map((p) => p.id));
      setClicks((cs || []) as { promoter_id: string }[]);
    } else {
      setClicks([]);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  // Compute per-promoter performance
  const performance = useMemo(() => {
    return promoters.map((p) => {
      const myRegs = regs.filter((r) => r.promoter_id === p.id);
      const myClicks = clicks.filter((c) => c.promoter_id === p.id).length;
      const revenue = myRegs
        .filter((r) => r.payment_status === "paid")
        .reduce((s, r) => s + (r.total_amount_cents || 0), 0);
      const conv = myClicks > 0 ? Math.round((myRegs.length / myClicks) * 100) : 0;
      return {
        promoter: p,
        registrations: myRegs.length,
        revenueCents: revenue,
        clicks: myClicks,
        conversionRate: conv,
      };
    });
  }, [promoters, regs, clicks]);

  const sortedLeaderboard = useMemo(
    () => [...performance].sort((a, b) => b.registrations - a.registrations || b.revenueCents - a.revenueCents),
    [performance],
  );

  const totals = useMemo(() => {
    const totalRefs = performance.reduce((s, p) => s + p.registrations, 0);
    const totalRev = performance.reduce((s, p) => s + p.revenueCents, 0);
    const totalClicks = performance.reduce((s, p) => s + p.clicks, 0);
    const conv = totalClicks > 0 ? Math.round((totalRefs / totalClicks) * 100) : 0;
    return { totalRefs, totalRev, totalClicks, conv };
  }, [performance]);

  const chartData = useMemo(
    () =>
      sortedLeaderboard.slice(0, 10).map((p) => ({
        name: p.promoter.name.length > 14 ? p.promoter.name.slice(0, 13) + "…" : p.promoter.name,
        Registrations: p.registrations,
        Revenue: Math.round(p.revenueCents / 100),
      })),
    [sortedLeaderboard],
  );

  // ---- Promoter handlers ----
  const openNewPromoter = () => {
    setEditingPromoter(null);
    setPName(""); setPEmail(""); setPRole("Board Member"); setPCustomRole(""); setPActive(true);
    setPromoterOpen(true);
  };
  const openEditPromoter = (p: Promoter) => {
    setEditingPromoter(p);
    setPName(p.name); setPEmail(p.email);
    if (p.role && ROLE_OPTIONS.includes(p.role)) {
      setPRole(p.role); setPCustomRole("");
    } else {
      setPRole("Other"); setPCustomRole(p.role || "");
    }
    setPActive(p.is_active);
    setPromoterOpen(true);
  };
  const savePromoter = async () => {
    if (!pName.trim() || !pEmail.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setSavingP(true);
    const role = pRole === "Other" ? (pCustomRole.trim() || null) : pRole;
    if (editingPromoter) {
      const { error } = await supabase
        .from("team_promoters")
        .update({ name: pName.trim(), email: pEmail.trim(), role, is_active: pActive })
        .eq("id", editingPromoter.id);
      if (error) toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      else toast({ title: "Team member updated" });
    } else {
      const { error } = await supabase.from("team_promoters").insert({
        tournament_id: tournamentId,
        name: pName.trim(),
        email: pEmail.trim(),
        role,
        is_active: pActive,
      } as any);
      if (error) toast({ title: "Failed to add", description: error.message, variant: "destructive" });
      else toast({ title: "Team member added" });
    }
    setSavingP(false);
    setPromoterOpen(false);
    refresh();
  };
  const removePromoter = async (id: string) => {
    if (!confirm("Remove this team member? Their referral attribution on existing registrations will remain.")) return;
    const { error } = await supabase.from("team_promoters").delete().eq("id", id);
    if (error) toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    else { toast({ title: "Removed" }); refresh(); }
  };

  const copyLink = (code: string) => {
    const url = buildRefUrl(origin, slug, code);
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: url });
  };

  const exportPromotersCsv = () => {
    const rows = [
      ["Name", "Email", "Role", "Code", "Link", "Registrations", "Revenue", "Clicks", "Conversion %", "Active"],
      ...sortedLeaderboard.map((p) => [
        p.promoter.name,
        p.promoter.email,
        p.promoter.role || "",
        p.promoter.unique_ref_code,
        buildRefUrl(origin, slug, p.promoter.unique_ref_code),
        String(p.registrations),
        (p.revenueCents / 100).toFixed(2),
        String(p.clicks),
        `${p.conversionRate}%`,
        p.promoter.is_active ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `team-performance-${slug || tournamentId}.csv`;
    a.click();
  };

  const copyAllLinks = () => {
    const text = promoters
      .map((p) => `${p.name} (${p.role || "—"}): ${buildRefUrl(origin, slug, p.unique_ref_code)}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "All links copied" });
  };

  // ---- Incentive handlers ----
  const openNewIncentive = () => {
    setEditingInc(null);
    setIName(""); setIDesc("");
    setIThresholdType("registrations"); setIThresholdValue("");
    setIRewardType("gift_card"); setIRewardValue("");
    setIncOpen(true);
  };
  const openEditIncentive = (i: Incentive) => {
    setEditingInc(i);
    setIName(i.name); setIDesc(i.description || "");
    if (i.threshold_registrations) { setIThresholdType("registrations"); setIThresholdValue(String(i.threshold_registrations)); }
    else if (i.threshold_revenue_cents) { setIThresholdType("revenue"); setIThresholdValue(String(i.threshold_revenue_cents / 100)); }
    else if (i.threshold_rank) { setIThresholdType("rank"); setIThresholdValue(String(i.threshold_rank)); }
    else { setIThresholdType("custom"); setIThresholdValue(""); }
    setIRewardType(i.reward_type || "gift_card");
    setIRewardValue(i.reward_value || "");
    setIncOpen(true);
  };
  const saveIncentive = async () => {
    if (!iName.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSavingI(true);
    const payload: any = {
      tournament_id: tournamentId,
      name: iName.trim(),
      description: iDesc.trim() || null,
      reward_type: iRewardType,
      reward_value: iRewardValue.trim() || null,
      threshold_registrations: null,
      threshold_revenue_cents: null,
      threshold_rank: null,
    };
    const num = Number(iThresholdValue);
    if (iThresholdType === "registrations" && num > 0) payload.threshold_registrations = Math.round(num);
    if (iThresholdType === "revenue" && num > 0) payload.threshold_revenue_cents = Math.round(num * 100);
    if (iThresholdType === "rank" && num > 0) payload.threshold_rank = Math.round(num);

    const { error } = editingInc
      ? await supabase.from("promoter_incentives").update(payload).eq("id", editingInc.id)
      : await supabase.from("promoter_incentives").insert(payload);
    if (error) toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    else toast({ title: editingInc ? "Updated" : "Incentive created" });
    setSavingI(false);
    setIncOpen(false);
    refresh();
  };
  const deleteIncentive = async (id: string) => {
    if (!confirm("Delete this incentive?")) return;
    const { error } = await supabase.from("promoter_incentives").delete().eq("id", id);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else { toast({ title: "Deleted" }); refresh(); }
  };
  const openAward = (i: Incentive) => {
    setAwardingInc(i);
    setAwardPromoterId(sortedLeaderboard[0]?.promoter.id || "");
  };
  const confirmAward = async () => {
    if (!awardingInc || !awardPromoterId) return;
    const { error } = await supabase
      .from("promoter_incentives")
      .update({ awarded_to: awardPromoterId, awarded_at: new Date().toISOString() })
      .eq("id", awardingInc.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: "Incentive awarded" });
    setAwardingInc(null);
    refresh();
  };
  const unaward = async (i: Incentive) => {
    const { error } = await supabase
      .from("promoter_incentives")
      .update({ awarded_to: null, awarded_at: null })
      .eq("id", i.id);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else { toast({ title: "Award cleared" }); refresh(); }
  };

  const exportAwardsCsv = () => {
    const promById = new Map(promoters.map((p) => [p.id, p]));
    const rows = [
      ["Incentive", "Reward Type", "Reward Value", "Awarded To", "Email", "Awarded At"],
      ...incentives
        .filter((i) => i.awarded_to)
        .map((i) => {
          const p = promById.get(i.awarded_to!);
          return [
            i.name, i.reward_type || "", i.reward_value || "",
            p?.name || "", p?.email || "",
            i.awarded_at ? new Date(i.awarded_at).toLocaleString() : "",
          ];
        }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `incentives-awarded-${slug || tournamentId}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!tournaments.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Team Performance</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Create a tournament first to track team performance.</p>
        </CardContent>
      </Card>
    );
  }

  const rankIcons = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6" /> Team Performance</h1>
          <p className="text-muted-foreground text-sm">Track referrals from board members, volunteers, and staff.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Tournament:</Label>
          <Select value={tournamentId} onValueChange={setTournamentId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="text-2xl font-bold">{totals.totalRefs}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{fmtUsd(totals.totalRev)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Link Clicks</p>
              <p className="text-2xl font-bold">{totals.totalClicks}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">{totals.conv}%</p>
            </div>
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="incentives">Incentives</TabsTrigger>
        </TabsList>

        {/* Team Members */}
        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Each member gets a unique referral link.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyAllLinks} disabled={!promoters.length}>
                  <Copy className="h-4 w-4 mr-2" /> Copy All Links
                </Button>
                <Button variant="outline" size="sm" onClick={exportPromotersCsv} disabled={!promoters.length}>
                  <Download className="h-4 w-4 mr-2" /> Export CSV
                </Button>
                <Button size="sm" onClick={openNewPromoter}><Plus className="h-4 w-4 mr-2" /> Add Member</Button>
              </div>
            </CardHeader>
            <CardContent>
              {promoters.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No team members yet. Add your first promoter.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Regs</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {performance.map((p) => (
                      <TableRow key={p.promoter.id}>
                        <TableCell className="font-medium">{p.promoter.name}</TableCell>
                        <TableCell className="text-sm">{p.promoter.email}</TableCell>
                        <TableCell><Badge variant="outline">{p.promoter.role || "—"}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{p.promoter.unique_ref_code}</TableCell>
                        <TableCell className="text-right">{p.registrations}</TableCell>
                        <TableCell className="text-right">{fmtUsd(p.revenueCents)}</TableCell>
                        <TableCell>{p.promoter.is_active ? <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => copyLink(p.promoter.unique_ref_code)} title="Copy link"><Copy className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditPromoter(p.promoter)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => removePromoter(p.promoter.id)} title="Remove"><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Top Performers</CardTitle>
              <CardDescription>Ranked by registrations (then revenue).</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedLeaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No referral activity yet.</p>
              ) : (
                <>
                  <div className="mb-6 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="Registrations" fill="hsl(var(--primary))" />
                        <Bar dataKey="Revenue" fill="hsl(var(--secondary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Registrations</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Conv. %</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {sortedLeaderboard.map((p, idx) => (
                        <TableRow key={p.promoter.id}>
                          <TableCell className="font-bold">{rankIcons[idx] || `#${idx + 1}`}</TableCell>
                          <TableCell className="font-medium">{p.promoter.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.promoter.role || "—"}</TableCell>
                          <TableCell className="text-right">{p.registrations}</TableCell>
                          <TableCell className="text-right">{fmtUsd(p.revenueCents)}</TableCell>
                          <TableCell className="text-right">{p.clicks}</TableCell>
                          <TableCell className="text-right">{p.conversionRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incentives */}
        <TabsContent value="incentives">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Incentives</CardTitle>
                <CardDescription>Reward top performers for hitting milestones.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportAwardsCsv} disabled={!incentives.some((i) => i.awarded_to)}>
                  <Download className="h-4 w-4 mr-2" /> Export Awards
                </Button>
                <Button size="sm" onClick={openNewIncentive}><Plus className="h-4 w-4 mr-2" /> Add Incentive</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {incentives.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No incentives configured.</p>
              ) : incentives.map((i) => {
                const winner = promoters.find((p) => p.id === i.awarded_to);
                const thresholdLabel = i.threshold_registrations
                  ? `${i.threshold_registrations}+ registrations`
                  : i.threshold_revenue_cents
                  ? `${fmtUsd(i.threshold_revenue_cents)}+ revenue`
                  : i.threshold_rank
                  ? `Top ${i.threshold_rank}`
                  : "Custom / manual";
                return (
                  <div key={i.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        <span className="font-semibold">{i.name}</span>
                        <Badge variant="outline">{thresholdLabel}</Badge>
                      </div>
                      {i.description && <p className="text-sm text-muted-foreground mt-1">{i.description}</p>}
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Reward:</span>{" "}
                        <strong>{i.reward_value || i.reward_type || "—"}</strong>
                      </p>
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Awarded to:</span>{" "}
                        {winner ? <strong className="text-emerald-700">{winner.name}</strong> : <span className="italic text-muted-foreground">Not yet</span>}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!i.awarded_to ? (
                        <Button size="sm" onClick={() => openAward(i)} disabled={!promoters.length}>Award Now</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => unaward(i)}>Clear Award</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEditIncentive(i)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteIncentive(i.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Promoter dialog */}
      <Dialog open={promoterOpen} onOpenChange={setPromoterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPromoter ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
            <DialogDescription>A unique referral link is generated automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={pName} onChange={(e) => setPName(e.target.value)} /></div>
            <div><Label>Email *</Label><Input type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} /></div>
            <div>
              <Label>Role</Label>
              <Select value={pRole} onValueChange={setPRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {pRole === "Other" && (
                <Input className="mt-2" placeholder="Custom role" value={pCustomRole} onChange={(e) => setPCustomRole(e.target.value)} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={pActive} onCheckedChange={setPActive} />
              <Label>Active</Label>
            </div>
            {editingPromoter && (
              <div>
                <Label>Referral Link</Label>
                <div className="flex gap-2">
                  <Input readOnly value={buildRefUrl(origin, slug, editingPromoter.unique_ref_code)} className="font-mono text-xs" />
                  <Button type="button" variant="outline" onClick={() => copyLink(editingPromoter.unique_ref_code)}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoterOpen(false)}>Cancel</Button>
            <Button onClick={savePromoter} disabled={savingP}>
              {savingP && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incentive dialog */}
      <Dialog open={incOpen} onOpenChange={setIncOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingInc ? "Edit Incentive" : "Add Incentive"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={iName} onChange={(e) => setIName(e.target.value)} placeholder="Top Referrer Prize" /></div>
            <div><Label>Description</Label><Textarea value={iDesc} onChange={(e) => setIDesc(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Threshold Type</Label>
                <Select value={iThresholdType} onValueChange={(v) => setIThresholdType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registrations">Min registrations</SelectItem>
                    <SelectItem value="revenue">Min revenue ($)</SelectItem>
                    <SelectItem value="rank">Top rank</SelectItem>
                    <SelectItem value="custom">Manual selection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {iThresholdType !== "custom" && (
                <div>
                  <Label>Value</Label>
                  <Input type="number" value={iThresholdValue} onChange={(e) => setIThresholdValue(e.target.value)} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Reward Type</Label>
                <Select value={iRewardType} onValueChange={setIRewardType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gift_card">Gift card</SelectItem>
                    <SelectItem value="free_entry">Free entry</SelectItem>
                    <SelectItem value="recognition">Recognition</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reward Value</Label>
                <Input value={iRewardValue} onChange={(e) => setIRewardValue(e.target.value)} placeholder="$50 Amazon" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncOpen(false)}>Cancel</Button>
            <Button onClick={saveIncentive} disabled={savingI}>
              {savingI && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Award dialog */}
      <Dialog open={!!awardingInc} onOpenChange={(o) => !o && setAwardingInc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award “{awardingInc?.name}”</DialogTitle>
            <DialogDescription>Select the team member to award this incentive to.</DialogDescription>
          </DialogHeader>
          <Select value={awardPromoterId} onValueChange={setAwardPromoterId}>
            <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
            <SelectContent>
              {sortedLeaderboard.map((p) => (
                <SelectItem key={p.promoter.id} value={p.promoter.id}>
                  {p.promoter.name} — {p.registrations} regs / {fmtUsd(p.revenueCents)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwardingInc(null)}>Cancel</Button>
            <Button onClick={confirmAward} disabled={!awardPromoterId}>Award</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
