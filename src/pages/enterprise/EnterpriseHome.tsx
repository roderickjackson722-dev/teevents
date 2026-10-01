import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, CalendarPlus, CheckCircle2, CircleDollarSign, Clock3, FileBarChart, Flag, Loader2, MoreVertical, Plus, Search, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { enterpriseStatusOf, gameTypeLabel, parseEnterpriseSettings, type EnterpriseEventRow } from "@/lib/enterprise";

type DashboardFilter = "all" | "tournaments" | "leagues" | "drafts" | "completed";

interface LeagueRow {
  id: string;
  league_name: string;
  league_slug: string;
  start_date: string | null;
  end_date: string | null;
  publish_status: string | null;
  is_active: boolean;
  member_count?: number;
}

interface UnifiedRow {
  id: string;
  kind: "tournament" | "league";
  title: string;
  date: string | null;
  course: string | null;
  detail: string;
  people: number;
  status: "draft" | "active" | "complete";
  sortDate: string;
  tournament?: EnterpriseEventRow;
  league?: LeagueRow;
}

const FILTERS: { value: DashboardFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tournaments", label: "Tournaments" },
  { value: "leagues", label: "Leagues" },
  { value: "drafts", label: "Drafts" },
  { value: "completed", label: "Completed" },
];

const tournamentStatus = (status?: string | null): UnifiedRow["status"] => {
  const normalized = enterpriseStatusOf(status);
  if (normalized === "complete") return "complete";
  if (normalized === "ready" || normalized === "in_progress") return "active";
  return "draft";
};

const statusClass: Record<UnifiedRow["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary text-primary-foreground",
  complete: "bg-secondary text-secondary-foreground",
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function EnterpriseHome({ tournamentsOnly = false }: { tournamentsOnly?: boolean }) {
  const { org } = useOrgContext();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EnterpriseEventRow[]>([]);
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [leagueCounts, setLeagueCounts] = useState<Record<string, number>>({});
  const [revenueCents, setRevenueCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DashboardFilter>(tournamentsOnly ? "tournaments" : "all");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EnterpriseEventRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!org) return;
    setLoading(true);
    const yearStart = `${new Date().getFullYear()}-01-01T00:00:00.000Z`;
    const [eventResult, leagueResult, revenueResult] = await Promise.all([
      (supabase.from("tournaments") as any)
        .select("id, title, date, course_name, status, slug, scoring_format, enterprise_event_type, enterprise_settings, max_players")
        .eq("organization_id", org.orgId)
        .eq("is_enterprise", true)
        .order("created_at", { ascending: false }),
      (supabase.from("golf_leagues") as any)
        .select("id, league_name, league_slug, start_date, end_date, publish_status, is_active")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false }),
      (supabase.from("platform_transactions") as any)
        .select("amount_cents, status, created_at")
        .eq("organization_id", org.orgId)
        .gte("created_at", yearStart),
    ]);

    const tournamentRows = (eventResult.data || []) as EnterpriseEventRow[];
    const leagueRows = (leagueResult.data || []) as LeagueRow[];
    setEvents(tournamentRows);
    setLeagues(leagueRows);
    setRevenueCents(((revenueResult.data || []) as { amount_cents: number; status: string | null }[])
      .filter((row) => ["paid", "succeeded", "complete", "completed"].includes((row.status || "").toLowerCase()))
      .reduce((sum, row) => sum + (row.amount_cents || 0), 0));

    const [registrationResult, memberResult] = await Promise.all([
      tournamentRows.length
        ? (supabase.from("tournament_registrations") as any).select("tournament_id").in("tournament_id", tournamentRows.map((row) => row.id))
        : Promise.resolve({ data: [] }),
      leagueRows.length
        ? (supabase.from("league_members") as any).select("league_id").in("league_id", leagueRows.map((row) => row.id))
        : Promise.resolve({ data: [] }),
    ]);
    const tournamentMap: Record<string, number> = {};
    ((registrationResult.data || []) as { tournament_id: string }[]).forEach((row) => { tournamentMap[row.tournament_id] = (tournamentMap[row.tournament_id] || 0) + 1; });
    const leagueMap: Record<string, number> = {};
    ((memberResult.data || []) as { league_id: string }[]).forEach((row) => { leagueMap[row.league_id] = (leagueMap[row.league_id] || 0) + 1; });
    setEventCounts(tournamentMap);
    setLeagueCounts(leagueMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, [org]);

  const rows = useMemo<UnifiedRow[]>(() => {
    const tournamentRows = events.map((event) => {
      const settings = parseEnterpriseSettings(event.enterprise_settings);
      return {
        id: event.id,
        kind: "tournament" as const,
        title: event.title,
        date: event.date,
        course: event.course_name,
        detail: `${gameTypeLabel(settings.gameType || event.scoring_format)} · ${settings.holes} holes`,
        people: eventCounts[event.id] || 0,
        status: tournamentStatus(event.status),
        sortDate: event.date || "0000-00-00",
        tournament: event,
      };
    });
    const leagueRows = leagues.map((league) => {
      const isPast = Boolean(league.end_date && new Date(`${league.end_date}T23:59:59`).getTime() < Date.now());
      const status: UnifiedRow["status"] = isPast || !league.is_active ? "complete" : league.publish_status === "draft" ? "draft" : "active";
      return {
        id: league.id,
        kind: "league" as const,
        title: league.league_name,
        date: league.start_date,
        course: "Season-long league",
        detail: league.end_date ? `Season through ${league.end_date}` : "Season schedule",
        people: leagueCounts[league.id] || 0,
        status,
        sortDate: league.start_date || "0000-00-00",
        league,
      };
    });
    return [...tournamentRows, ...leagueRows].sort((a, b) => b.sortDate.localeCompare(a.sortDate));
  }, [events, leagues, eventCounts, leagueCounts]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if ((tournamentsOnly || filter === "tournaments") && row.kind !== "tournament") return false;
      if (filter === "leagues" && row.kind !== "league") return false;
      if (filter === "drafts" && row.status !== "draft") return false;
      if (filter === "completed" && row.status !== "complete") return false;
      if (query && !`${row.title} ${row.course || ""} ${row.detail}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [rows, filter, search, tournamentsOnly]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = rows.filter((row) => row.status !== "complete" && row.date && new Date(`${row.date}T00:00:00`) > today).length;
  const active = rows.filter((row) => row.status === "active").length;
  const completed = rows.filter((row) => row.status === "complete").length;

  const duplicate = async (row: EnterpriseEventRow) => {
    if (!org) return;
    setBusy(true);
    const { data: full } = await (supabase.from("tournaments") as any).select("*").eq("id", row.id).maybeSingle();
    if (!full) { setBusy(false); toast.error("Could not read that event."); return; }
    const skip = new Set(["id", "created_at", "updated_at", "slug", "custom_slug", "custom_domain", "registration_url", "status"]);
    const copy: Record<string, unknown> = {};
    Object.entries(full as Record<string, unknown>).forEach(([key, value]) => { if (!skip.has(key)) copy[key] = value; });
    Object.assign(copy, {
      title: `${row.title} (Copy)`, status: "draft", organization_id: org.orgId, is_enterprise: true,
      pricing_version: "2026-10", pricing_model: "enterprise", platform_fee_percent: 0,
      event_fee_paid: false, flat_rate_enabled: false, flat_rate_paid: false,
      white_glove_requested: true, white_glove_completed: false,
    });
    const { data: created, error } = await (supabase.from("tournaments") as any).insert(copy).select("id").maybeSingle();
    if (error || !created?.id) { setBusy(false); toast.error(error?.message || "Could not duplicate this event."); return; }
    const { data: registrations } = await (supabase.from("tournament_registrations") as any)
      .select("first_name, last_name, email, phone, handicap, handicap_index, group_number, group_position, group_label, starting_hole")
      .eq("tournament_id", row.id);
    const players = ((registrations || []) as Record<string, unknown>[]).map((registration) => ({ ...registration, tournament_id: created.id, payment_status: "unpaid", status: "active" }));
    if (players.length) await (supabase.from("tournament_registrations") as any).insert(players);
    setBusy(false);
    toast.success("Event duplicated as a draft.");
    load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const { error } = await supabase.from("tournaments").delete().eq("id", deleteTarget.id);
    setBusy(false);
    setDeleteTarget(null);
    if (error) toast.error(error.message);
    else { toast.success("Event deleted."); load(); }
  };

  const menuLinks = (row: EnterpriseEventRow) => {
    const query = `?tournament_id=${row.id}`;
    return [
      ["Edit Event Information", `/enterprise/create${query}`],
      ["Edit Teams", `/dashboard/players${query}`],
      ["Edit Pairings / Handicaps", `/dashboard/tee-sheet${query}`],
      ["Edit Scores", `/dashboard/scoring${query}`],
      ["Leaderboard Settings", `/enterprise/leaderboard-settings${query}`],
      ["Skins, Deuces and Putts", `/enterprise/skins${query}`],
      ["Print Scorecards and Reports", `/enterprise/printables${query}`],
      ["Send Email", `/enterprise/communications${query}`],
    ];
  };

  const title = tournamentsOnly ? "Tournaments" : "Enterprise Dashboard";
  const description = tournamentsOnly ? "All single and multi-round tournaments." : "Your club's events, activity, and performance at a glance.";

  return (
    <EnterpriseLayout title={title} description={description} crumbs={tournamentsOnly ? [{ label: "Tournaments" }] : [{ label: "Home" }]}>
      {!tournamentsOnly && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Enterprise overview">
            {[
              { label: "Upcoming Events", value: upcoming, icon: CalendarDays },
              { label: "Active Events", value: active, icon: Clock3 },
              { label: "Completed Events", value: completed, icon: CheckCircle2 },
              { label: "Revenue This Year", value: money.format(revenueCents / 100), icon: CircleDollarSign },
            ].map((stat) => (
              <div key={stat.label} className="rounded-md border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{stat.label}</span>
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/8 text-primary"><stat.icon className="h-4 w-4" /></span>
                </div>
                <p className="font-display text-3xl font-semibold text-primary">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="my-8 border-y border-border py-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="mr-auto font-display text-xl font-semibold text-primary">Quick Actions</h2>
              <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90"><Link to="/enterprise/create"><Plus className="mr-1.5 h-4 w-4" /> New Tournament</Link></Button>
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"><Link to="/enterprise/leagues?new=1"><Plus className="mr-1.5 h-4 w-4" /> New League</Link></Button>
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"><Link to="/dashboard/finances"><FileBarChart className="mr-1.5 h-4 w-4" /> View Reports</Link></Button>
            </div>
          </section>
        </>
      )}

      <section>
        <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">Event portfolio</p>
            <h2 className="font-display text-2xl font-semibold text-primary">{tournamentsOnly ? "All Tournaments" : "Recent Events"}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_minmax(220px,320px)] sm:items-center">
            {!tournamentsOnly && (
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-md border border-border bg-card p-1">
                {FILTERS.map((item) => (
                  <Button key={item.value} type="button" size="sm" variant="ghost" onClick={() => setFilter(item.value)} className={cn("shrink-0", filter === item.value && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}>{item.label}</Button>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events" className="bg-card pl-9" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading events…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-primary/30 bg-card px-6 py-14 text-center">
            <CalendarPlus className="mx-auto mb-3 h-9 w-9 text-secondary" />
            <h3 className="font-display text-xl font-semibold text-primary">Ready to run your first event?</h3>
            <Button asChild className="mt-4 bg-secondary text-secondary-foreground hover:bg-secondary/90"><Link to="/enterprise/create"><Plus className="mr-1.5 h-4 w-4" /> New Tournament</Link></Button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-md border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">No events match this filter.</div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border bg-card">
            {filteredRows.map((row) => (
              <article key={`${row.kind}-${row.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-border p-4 last:border-b-0 md:grid-cols-[minmax(0,1.5fr)_minmax(180px,.8fr)_auto_auto] md:items-center md:px-5">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]", row.kind === "tournament" ? "bg-primary/10 text-primary" : "bg-secondary/25 text-primary")}>{row.kind}</span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", statusClass[row.status])}>{row.status}</span>
                  </div>
                  <Link to={row.kind === "tournament" ? `/enterprise/create?tournament_id=${row.id}` : `/dashboard/leagues/${row.id}/manage`} className="block truncate font-display text-lg font-semibold text-foreground hover:text-primary">{row.title}</Link>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 shrink-0" /> {row.date || "Date not set"} · {row.course || "Course not set"}</p>
                </div>
                <div className="hidden min-w-0 md:block">
                  <p className="truncate text-sm font-medium text-foreground">{row.detail}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="h-3.5 w-3.5" /> {row.people} {row.kind === "league" ? "members" : "players"}</p>
                </div>
                <div className="hidden md:block"><span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", statusClass[row.status])}>{row.status}</span></div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${row.title}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="truncate">{row.title}</DropdownMenuLabel>
                    {row.tournament ? (
                      <>
                        {menuLinks(row.tournament).map(([label, to]) => <DropdownMenuItem key={label} onClick={() => navigate(to)}>{label}</DropdownMenuItem>)}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={busy} onClick={() => duplicate(row.tournament as EnterpriseEventRow)}>Duplicate Event</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row.tournament as EnterpriseEventRow)}>Delete</DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/leagues/${row.id}/manage`)}>Manage League</DropdownMenuItem>
                        {row.league?.league_slug && <DropdownMenuItem onClick={() => navigate(`/league/${row.league?.league_slug}`)}>View Public Page</DropdownMenuItem>}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="col-span-2 flex items-center gap-4 text-xs text-muted-foreground md:hidden">
                  <span>{row.detail}</span><span className="shrink-0">{row.people} {row.kind === "league" ? "members" : "players"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this event?</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.title} and its players, pairings and scores will be removed. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">Delete event</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EnterpriseLayout>
  );
}