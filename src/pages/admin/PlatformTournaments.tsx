import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ExternalLink, Loader2, Search, Trophy, Users, DollarSign, Calendar, Building2, Edit3, Plus, Send, MailCheck } from "lucide-react";
import AdminCreateTournamentDialog from "@/components/admin/AdminCreateTournamentDialog";
import { toast } from "sonner";

type Row = {
  id: string;
  title: string;
  date: string | null;
  slug: string | null;
  custom_slug: string | null;
  course_name: string | null;
  location: string | null;
  organization_id: string | null;
  is_demo: boolean | null;
  is_pro: boolean | null;
  site_published: boolean | null;
  registration_open: boolean | null;
  managed_by_teevents: boolean | null;
  created_at: string;
  registration_fee_cents: number | null;
  created_by_admin_id: string | null;
  admin_invitation_sent_at: string | null;
  org_name?: string | null;
  registrations_count?: number;
  paid_count?: number;
  revenue_cents?: number;
  sponsors_count?: number;
};

export default function PlatformTournaments() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "demo" | "pro" | "managed">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin-login"); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      setAuthChecked(true);
      if (data) load();
    })();
  }, [navigate]);

  async function load() {
    setLoading(true);
    const { data: ts } = await supabase
      .from("tournaments")
      .select("id, title, date, slug, custom_slug, course_name, location, organization_id, is_demo, is_pro, site_published, registration_open, managed_by_teevents, created_at, registration_fee_cents, created_by_admin_id, admin_invitation_sent_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    const list = (ts as Row[]) || [];

    const orgIds = Array.from(new Set(list.map((t) => t.organization_id).filter(Boolean))) as string[];
    const tIds = list.map((t) => t.id);

    const [{ data: orgs }, { data: regs }, { data: spons }] = await Promise.all([
      supabase.from("organizations").select("id, name").in("id", orgIds.length ? orgIds : ["00000000-0000-0000-0000-000000000000"]) as any,
      supabase.from("tournament_registrations").select("tournament_id, payment_status, amount_paid_cents").in("tournament_id", tIds.length ? tIds : ["00000000-0000-0000-0000-000000000000"]) as any,
      supabase.from("tournament_sponsors").select("tournament_id").in("tournament_id", tIds.length ? tIds : ["00000000-0000-0000-0000-000000000000"]) as any,
    ]);

    const orgMap: Record<string, { name: string | null }> = {};
    for (const o of (orgs as any[]) || []) orgMap[o.id] = { name: o.name };

    const regAgg: Record<string, { count: number; paid: number; revenue: number }> = {};
    for (const r of (regs as any[]) || []) {
      const a = regAgg[r.tournament_id] ||= { count: 0, paid: 0, revenue: 0 };
      a.count++;
      if (r.payment_status === "paid") { a.paid++; a.revenue += r.amount_paid_cents || 0; }
    }
    const sponsorCount: Record<string, number> = {};
    for (const s of (spons as any[]) || []) sponsorCount[s.tournament_id] = (sponsorCount[s.tournament_id] || 0) + 1;

    setRows(list.map((t) => ({
      ...t,
      org_name: orgMap[t.organization_id || ""]?.name || null,
      registrations_count: regAgg[t.id]?.count || 0,
      paid_count: regAgg[t.id]?.paid || 0,
      revenue_cents: regAgg[t.id]?.revenue || 0,
      sponsors_count: sponsorCount[t.id] || 0,
    })));
    setLoading(false);
  }

  async function sendInvitation(t: Row) {
    if (!confirm(`Send the invitation email for "${t.title}" to the organizer now?`)) return;
    setSendingInvite(t.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-tournament-invitation", {
        body: { tournament_id: t.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Invitation sent to ${(data as any).email}`);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setSendingInvite(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "live" && r.is_demo) return false;
      if (filter === "demo" && !r.is_demo) return false;
      if (filter === "pro" && !r.is_pro) return false;
      if (filter === "managed" && !r.managed_by_teevents) return false;
      if (!q) return true;
      return [r.title, r.org_name, r.location, r.course_name, r.slug, r.custom_slug]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [rows, search, filter]);

  const summary = useMemo(() => {
    const t = filtered;
    return {
      tournaments: t.length,
      orgs: new Set(t.map((r) => r.organization_id).filter(Boolean)).size,
      registrations: t.reduce((s, r) => s + (r.registrations_count || 0), 0),
      revenue: t.reduce((s, r) => s + (r.revenue_cents || 0), 0),
    };
  }, [filtered]);

  if (!authChecked) return <div className="p-8">Loading…</div>;
  if (!isAdmin) return <div className="p-8">Admin access required.</div>;

  const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const slugOf = (r: Row) => r.custom_slug || r.slug || r.id;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Button>
          <h1 className="text-xl font-semibold">Platform Tournaments</h1>
          <Badge variant="secondary" className="ml-2">All tournaments using TeeVents</Badge>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create Tournament for Client
            </Button>
          </div>
        </div>
      </div>

      <AdminCreateTournamentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => load()}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Tournaments" value={summary.tournaments.toLocaleString()} />
          <StatCard icon={<Building2 className="h-4 w-4" />} label="Organizations" value={summary.orgs.toLocaleString()} />
          <StatCard icon={<Users className="h-4 w-4" />} label="Total Registrations" value={summary.registrations.toLocaleString()} />
          <StatCard icon={<DollarSign className="h-4 w-4" />} label="Total Revenue" value={money(summary.revenue)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Tournaments</CardTitle>
            <CardDescription>Full list of tournaments on the platform with key usage details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search title, organizer, course…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
              </div>
              {(["all", "live", "demo", "pro", "managed"] as const).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
              ))}
              <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}</Button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Regs</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Spons.</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {r.course_name && <span>{r.course_name}</span>}
                            {r.location && <span>· {r.location}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{r.org_name || <span className="text-muted-foreground italic">—</span>}</div>
                        </TableCell>
                        <TableCell>
                          {r.is_pro ? <Badge>Pro</Badge> : <Badge variant="outline">Base</Badge>}
                          {r.managed_by_teevents && <Badge variant="secondary" className="ml-1">Managed</Badge>}
                          {r.is_demo && <Badge variant="secondary" className="ml-1">Demo</Badge>}
                        </TableCell>
                        <TableCell>
                          {r.site_published ? <Badge>Published</Badge> : <Badge variant="outline">Draft</Badge>}
                          {r.registration_open && <Badge variant="secondary" className="ml-1">Reg Open</Badge>}
                          {r.created_by_admin_id && !r.admin_invitation_sent_at && (
                            <Badge variant="destructive" className="ml-1">Invite Pending</Badge>
                          )}
                          {r.created_by_admin_id && r.admin_invitation_sent_at && (
                            <Badge variant="secondary" className="ml-1"><MailCheck className="h-3 w-3 mr-1" />Invited</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.date ? new Date(r.date + "T00:00:00").toLocaleDateString() : <span className="text-muted-foreground">—</span>}
                          <div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Created {new Date(r.created_at).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell className="text-right">{r.registrations_count}</TableCell>
                        <TableCell className="text-right">{r.paid_count}</TableCell>
                        <TableCell className="text-right">{money(r.revenue_cents || 0)}</TableCell>
                        <TableCell className="text-right">{r.sponsors_count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/t/${slugOf(r)}`} target="_blank"><ExternalLink className="h-3.5 w-3.5 mr-1" />Site</Link>
                            </Button>
                            {r.created_by_admin_id && !r.admin_invitation_sent_at && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => sendInvitation(r)}
                                disabled={sendingInvite === r.id}
                              >
                                {sendingInvite === r.id
                                  ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                  : <Send className="h-3.5 w-3.5 mr-1" />}
                                Send Invitation
                              </Button>
                            )}
                            {r.organization_id && (
                              <>
                                <Button asChild variant="secondary" size="sm">
                                  <Link to={`/dashboard/leaderboard?admin_org=${r.organization_id}&tournament_id=${r.id}`} target="_blank"><Edit3 className="h-3.5 w-3.5 mr-1" />Edit Scores</Link>
                                </Button>
                                <Button asChild variant="default" size="sm">
                                  <Link to={`/dashboard?admin_org=${r.organization_id}&tournament_id=${r.id}`} target="_blank"><ExternalLink className="h-3.5 w-3.5 mr-1" />Dashboard</Link>
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No tournaments match your filters.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
