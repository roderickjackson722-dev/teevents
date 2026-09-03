import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ExternalLink, Loader2, Search, Trophy, Users, DollarSign, Calendar, Building2, Edit3, Plus, Send, MailCheck, UserPlus, Eye, ChevronDown, ChevronUp } from "lucide-react";
import AdminFeatureToggles from "@/components/admin/AdminFeatureToggles";
import AdminCreateTournamentDialog from "@/components/admin/AdminCreateTournamentDialog";
import SampleModePanel from "@/components/admin/SampleModePanel";
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
  is_sample?: boolean | null;
  pass_fees_to_registrants?: boolean | null;
  org_plan?: string | null;
  org_feature_overrides?: Record<string, boolean> | null;
  org_fee_override?: number | null;
};

export default function PlatformTournaments() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "draft" | "ended" | "demo" | "pro" | "managed">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [sampleFor, setSampleFor] = useState<Row | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [togglingFees, setTogglingFees] = useState<string | null>(null);


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
      .select("id, title, date, slug, custom_slug, course_name, location, organization_id, is_demo, is_pro, site_published, registration_open, managed_by_teevents, created_at, registration_fee_cents, created_by_admin_id, admin_invitation_sent_at, is_sample, pass_fees_to_registrants")
      .order("created_at", { ascending: false })
      .limit(1000);
    const list = (ts as Row[]) || [];

    const orgIds = Array.from(new Set(list.map((t) => t.organization_id).filter(Boolean))) as string[];
    const tIds = list.map((t) => t.id);

    const [{ data: orgs }, { data: regs }, { data: spons }] = await Promise.all([
      supabase.from("organizations").select("id, name, plan, feature_overrides, fee_override").in("id", orgIds.length ? orgIds : ["00000000-0000-0000-0000-000000000000"]) as any,
      supabase.from("tournament_registrations").select("tournament_id, payment_status").in("tournament_id", tIds.length ? tIds : ["00000000-0000-0000-0000-000000000000"]) as any,
      supabase.from("tournament_sponsors").select("tournament_id").in("tournament_id", tIds.length ? tIds : ["00000000-0000-0000-0000-000000000000"]) as any,
    ]);

    const orgMap: Record<string, any> = {};
    for (const o of (orgs as any[]) || []) orgMap[o.id] = o;

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
      org_plan: orgMap[t.organization_id || ""]?.plan || "base",
      org_feature_overrides: orgMap[t.organization_id || ""]?.feature_overrides || null,
      org_fee_override: orgMap[t.organization_id || ""]?.fee_override ?? null,
      registrations_count: regAgg[t.id]?.count || 0,
      paid_count: regAgg[t.id]?.paid || 0,
      revenue_cents: regAgg[t.id]?.revenue || 0,
      sponsors_count: sponsorCount[t.id] || 0,
    })));
    setLoading(false);
  }

  const callAdminApi = useCallback(async (action?: string, body?: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`);
    if (action) url.searchParams.set("action", action);
    const res = await fetch(url.toString(), {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Request failed");
    }
    return res.json();
  }, []);

  async function togglePassFees(t: Row) {
    setTogglingFees(t.id);
    try {
      await callAdminApi("toggle-pass-fees", { tournament_id: t.id, pass_fees_to_registrants: !t.pass_fees_to_registrants });
      setRows((prev) => prev.map((r) => (r.id === t.id ? { ...r, pass_fees_to_registrants: !t.pass_fees_to_registrants } : r)));
      toast.success("Fee setting updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    } finally {
      setTogglingFees(null);
    }
  }

  async function sendInvitation(t: Row) {
    // If no organizer was assigned at creation, prompt for email now.
    let emailInput: string | null = null;
    if (!t.org_name || /\(unassigned\)/i.test(t.org_name)) {
      emailInput = window.prompt(
        `Enter the organizer's email address for "${t.title}".\n\nWe'll create an account (if needed), assign them as the organizer, and email them a temporary password.`,
        ""
      );
      if (!emailInput) return;
      emailInput = emailInput.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
        toast.error("Please enter a valid email address");
        return;
      }
    } else {
      if (!confirm(`Send the invitation email for "${t.title}" to the organizer now?`)) return;
    }
    setSendingInvite(t.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-tournament-invitation", {
        body: { tournament_id: t.id, ...(emailInput ? { email: emailInput } : {}) },
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



  async function attachOrganizer(t: Row) {
    const email = window.prompt(
      `Attach an organizer to "${t.title}".\n\nEnter the organizer's email. They'll be added as OWNER of the organization that already owns this tournament, so it appears on their dashboard immediately.\n\nNo password will be changed for existing users.`,
      ""
    );
    if (!email) return;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setAttaching(t.id);
    try {
      let { data, error } = await supabase.functions.invoke("admin-attach-organizer", {
        body: { tournament_id: t.id, email: trimmed, role: "owner" },
      });
      if (error) throw error;
      if ((data as any)?.error === "no_user") {
        if (!confirm(`No account exists for ${trimmed}. Create one now and attach as owner? A temporary password will be shown to you (nothing is emailed).`)) {
          setAttaching(null);
          return;
        }
        const retry = await supabase.functions.invoke("admin-attach-organizer", {
          body: { tournament_id: t.id, email: trimmed, role: "owner", create_if_missing: true },
        });
        if (retry.error) throw retry.error;
        data = retry.data;
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as any;
      if (res.temp_password) {
        window.prompt(
          `Account created for ${trimmed}. Copy the temporary password below and share it with the organizer:`,
          res.temp_password
        );
      }
      toast.success(`${trimmed} is now an owner of this tournament's organization.`);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Failed to attach organizer");
    } finally {
      setAttaching(null);
    }
  }



  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const from = dateFrom || null;
    const to = dateTo || null;
    return rows.filter((r) => {
      // Status pill filters
      if (filter === "live" && !(r.site_published && (r.date ? r.date >= today : true))) return false;
      if (filter === "draft" && r.site_published) return false;
      if (filter === "ended" && !(r.date && r.date < today)) return false;
      if (filter === "demo" && !r.is_demo) return false;
      if (filter === "pro" && !r.is_pro) return false;
      if (filter === "managed" && !r.managed_by_teevents) return false;
      // Date range on tournament date
      if (from && (!r.date || r.date < from)) return false;
      if (to && (!r.date || r.date > to)) return false;
      // Search across organizer name, title, course, location, slug
      if (!q) return true;
      return [r.title, r.org_name, r.location, r.course_name, r.slug, r.custom_slug]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [rows, search, filter, dateFrom, dateTo]);

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

      {sampleFor && (
        <SampleModePanel
          open={!!sampleFor}
          onOpenChange={(o) => !o && setSampleFor(null)}
          tournamentId={sampleFor.id}
          tournamentTitle={sampleFor.title}
          onChanged={() => load()}
        />
      )}

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
                <Input placeholder="Search organizer, title, course…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>From</span>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[150px]" />
                <span>To</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[150px]" />
              </div>
              {(["all", "live", "draft", "ended", "demo", "pro", "managed"] as const).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
              ))}
              {(search || dateFrom || dateTo || filter !== "all") && (
                <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setFilter("all"); }}>Reset</Button>
              )}
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
                      <Fragment key={r.id}>
                      <TableRow>
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
                          {r.is_sample && <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-700 border-amber-500/40"><Eye className="h-3 w-3 mr-0.5" />Sample</Badge>}
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
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/t/${slugOf(r)}`} target="_blank"><ExternalLink className="h-3.5 w-3.5 mr-1" />Site</Link>
                            </Button>
                            <Button variant={r.is_sample ? "secondary" : "outline"} size="sm" onClick={() => setSampleFor(r)}>
                              <Eye className="h-3.5 w-3.5 mr-1" />{r.is_sample ? "Sample On" : "Sample Mode"}
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => attachOrganizer(r)}
                                  disabled={attaching === r.id}
                                  title="Add an organizer as owner of this tournament's organization"
                                >
                                  {attaching === r.id
                                    ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                    : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                                  Attach Organizer
                                </Button>
                                <Button asChild variant="secondary" size="sm">
                                  <Link to={`/admin/scoring/${r.id}`} target="_blank"><Edit3 className="h-3.5 w-3.5 mr-1" />Edit Scores</Link>
                                </Button>
                                <Button asChild variant="default" size="sm">
                                  <Link to={`/dashboard?admin_org=${r.organization_id}&tournament_id=${r.id}`} target="_blank"><ExternalLink className="h-3.5 w-3.5 mr-1" />Dashboard</Link>
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Feature toggles & overrides"
                              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                            >
                              {expanded === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded === r.id && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={10} className="p-6">
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                onClick={() => togglePassFees(r)}
                                disabled={togglingFees === r.id}
                                className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                                  r.pass_fees_to_registrants
                                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                <DollarSign className="h-4 w-4" />
                                {r.pass_fees_to_registrants ? "Fees Passed to Registrants ✓" : "Pass Fees to Registrants"}
                              </button>
                              <span className="text-xs text-muted-foreground">
                                {r.pass_fees_to_registrants
                                  ? "Platform + Stripe fees are added to the registration total."
                                  : "Organizer absorbs the platform + Stripe fees."}
                              </span>
                            </div>
                            {r.organization_id ? (
                              <AdminFeatureToggles
                                organizationId={r.organization_id}
                                orgName={r.org_name || "Organization"}
                                currentPlan={r.org_plan || "base"}
                                currentOverrides={r.org_feature_overrides || null}
                                currentFeeOverride={r.org_fee_override ?? null}
                                callAdminApi={callAdminApi}
                                onRefresh={load}
                              />
                            ) : (
                              <p className="mt-4 text-sm text-muted-foreground">No organization attached — feature overrides unavailable.</p>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
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
