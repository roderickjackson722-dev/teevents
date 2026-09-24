import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { MoreVertical, Filter, Plus, Loader2, Users, Trophy, CalendarDays, Flag, Gift } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ENTERPRISE_EVENT_TYPES,
  ENTERPRISE_STATUSES,
  enterpriseStatusOf,
  eventTypeLabel,
  gameTypeLabel,
  parseEnterpriseSettings,
  statusMeta,
  type EnterpriseEventRow,
} from "@/lib/enterprise";

const PAGE_SIZE = 9;

const SELECT_COLS =
  "id, title, date, course_name, status, slug, scoring_format, enterprise_event_type, enterprise_settings, max_players";

/** Colored top bar per event status, echoing the clubhouse card design. */
const statusBar: Record<string, string> = {
  draft: "bg-muted-foreground/40",
  ready: "bg-secondary",
  in_progress: "bg-primary",
  complete: "bg-muted-foreground/25",
};

export default function EnterpriseHome() {
  const { org } = useOrgContext();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EnterpriseEventRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [leagueCount, setLeagueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("single_round");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<EnterpriseEventRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!org) return;
    setLoading(true);
    const { data } = await (supabase.from("tournaments") as any)
      .select(SELECT_COLS)
      .eq("organization_id", org.orgId)
      .eq("is_enterprise", true)
      .order("created_at", { ascending: false });
    const rows = (data || []) as EnterpriseEventRow[];
    setEvents(rows);

    if (rows.length) {
      const { data: regs } = await (supabase.from("tournament_registrations") as any)
        .select("tournament_id")
        .in("tournament_id", rows.map((r) => r.id));
      const map: Record<string, number> = {};
      ((regs || []) as { tournament_id: string }[]).forEach((r) => {
        map[r.tournament_id] = (map[r.tournament_id] || 0) + 1;
      });
      setCounts(map);
    } else {
      setCounts({});
    }

    const { count: leagues } = await (supabase.from("golf_leagues") as any)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.orgId);
    setLeagueCount(leagues || 0);

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if ((e.enterprise_event_type || "single_round") !== tab) return false;
      if (statusFilter !== "all" && enterpriseStatusOf(e.status) !== statusFilter) return false;
      if (q && !(e.title || "").toLowerCase().includes(q) && !(e.course_name || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, tab, statusFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [tab, statusFilter, search]);

  const totalPlayers = Object.values(counts).reduce((a, b) => a + b, 0);
  const activeEvents = events.filter((e) => ["ready", "in_progress"].includes(enterpriseStatusOf(e.status))).length;

  const duplicate = async (row: EnterpriseEventRow) => {
    if (!org) return;
    setBusy(true);
    const { data: full } = await (supabase.from("tournaments") as any)
      .select("*")
      .eq("id", row.id)
      .maybeSingle();
    if (!full) {
      setBusy(false);
      toast.error("Could not read that event.");
      return;
    }
    const skip = new Set([
      "id",
      "created_at",
      "updated_at",
      "slug",
      "custom_slug",
      "custom_domain",
      "registration_url",
      "status",
    ]);
    const copy: Record<string, unknown> = {};
    Object.entries(full as Record<string, unknown>).forEach(([k, v]) => {
      if (!skip.has(k)) copy[k] = v;
    });
    copy.title = `${row.title} (Copy)`;
    copy.status = "draft";
    copy.organization_id = org.orgId;
    copy.is_enterprise = true;

    const { data: created, error } = await (supabase.from("tournaments") as any)
      .insert(copy)
      .select("id")
      .maybeSingle();
    if (error || !created?.id) {
      setBusy(false);
      toast.error(error?.message || "Could not duplicate this event.");
      return;
    }

    // Clone the player list so the copy is ready to pair.
    const { data: regs } = await (supabase.from("tournament_registrations") as any)
      .select("first_name, last_name, email, phone, handicap, handicap_index, group_number, group_position, group_label, starting_hole, team_id")
      .eq("tournament_id", row.id);
    const players = ((regs || []) as Record<string, unknown>[]).map((r) => ({
      ...r,
      team_id: null,
      tournament_id: created.id,
      payment_status: "unpaid",
      status: "active",
    }));
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
    else {
      toast.success("Event deleted.");
      load();
    }
  };

  const menuLinks = (row: EnterpriseEventRow): { label: string; to: string }[] => {
    const q = `?tournament_id=${row.id}`;
    return [
      { label: "Edit Event Information", to: `/enterprise/create${q}` },
      { label: "Edit Teams", to: `/dashboard/players${q}` },
      { label: "Edit Pairings / Handicaps", to: `/dashboard/tee-sheet${q}` },
      { label: "Edit Tees", to: `/dashboard/course-details${q}` },
      { label: "Edit Scores", to: `/dashboard/scoring${q}` },
      { label: "Flights and Status", to: `/enterprise/leaderboard-settings${q}` },
      { label: "Skins, Deuces and Putts", to: `/enterprise/skins${q}` },
      { label: "Hole by Hole Settings", to: `/enterprise/leaderboard-settings${q}#event-options` },
      { label: "Print Scorecards and Reports", to: `/enterprise/printables${q}` },
      { label: "Send Email", to: `/enterprise/communications${q}` },
      { label: "Post Scores", to: `/dashboard/scoring${q}` },
      { label: "Update Payouts & Points", to: `/dashboard/scoring-payouts${q}` },
    ];
  };

  return (
    <EnterpriseLayout
      title="Tournament Dashboard"
      description="Manage your club's events, players and leagues."
      crumbs={[{ label: "Events" }]}
      actions={
        <Button asChild className="bg-secondary text-primary hover:bg-secondary/90">
          <Link to="/enterprise/create?type=single_round">
            <Plus className="mr-1.5 h-4 w-4" /> New Event
          </Link>
        </Button>
      }
    >
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {ENTERPRISE_EVENT_TYPES.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
          <Filter className="mr-1.5 h-4 w-4" /> Filter
        </Button>
        {showFilters && (
          <>
            <Input
              placeholder="Search name or course"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:w-56"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ENTERPRISE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "event" : "events"}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading events…
        </div>
      ) : pageRows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-semibold text-foreground">No {eventTypeLabel(tab).toLowerCase()} events yet</p>
          <p className="mb-4 text-sm text-muted-foreground">Create one in four quick steps.</p>
          <Button asChild className="bg-secondary text-primary hover:bg-secondary/90">
            <Link to={`/enterprise/create?type=${tab}`}>
              <Plus className="mr-1.5 h-4 w-4" /> Create {eventTypeLabel(tab)}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {pageRows.map((row) => {
            const meta = statusMeta(row.status);
            const settings = parseEnterpriseSettings(row.enterprise_settings);
            const status = enterpriseStatusOf(row.status);
            return (
              <div
                key={row.id}
                className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={cn("h-2", statusBar[status] || "bg-muted-foreground/40")} />
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="rounded bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {eventTypeLabel(row.enterprise_event_type || "single_round")}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>

                  <Link
                    to={`/enterprise/create?tournament_id=${row.id}`}
                    className="block text-lg text-primary transition-colors group-hover:text-secondary"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {row.date || "No date set"} · {row.course_name || "No course"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {gameTypeLabel(settings.gameType || row.scoring_format)} · {settings.holes} holes
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {counts[row.id] || 0}
                      {row.max_players ? `/${row.max_players}` : ""} players
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${row.title}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel className="truncate">{row.title}</DropdownMenuLabel>
                        {menuLinks(row).map((l) => (
                          <DropdownMenuItem key={l.label} onClick={() => navigate(l.to)}>
                            {l.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={busy} onClick={() => duplicate(row)}>
                          Duplicate Event
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Create-new card */}
          <Link
            to={`/enterprise/create?type=${tab}`}
            className="group flex min-h-44 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Plus className="h-6 w-6" />
            </div>
            <span className="font-semibold text-foreground">Start a new {eventTypeLabel(tab).toLowerCase()}</span>
            <span className="mt-1 text-xs text-muted-foreground">Guided four-step setup</span>
          </Link>
        </div>
      )}

      {pageCount > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Club snapshot */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-primary p-5 text-primary-foreground shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest opacity-70">Active Events</p>
          <p className="mt-1 text-2xl">{activeEvents}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Registered Players</p>
          <p className="mt-1 text-2xl text-primary">{totalPlayers}</p>
        </div>
        <Link to="/enterprise/leagues" className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Flag className="h-3.5 w-3.5" /> Leagues
          </p>
          <p className="mt-1 text-2xl text-primary">{leagueCount}</p>
        </Link>
        <Link to="/enterprise/resources/earn-300" className="group relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Gift className="h-3.5 w-3.5" /> Referral Credit
          </p>
          <p className="mt-1 text-2xl text-secondary">Earn $300</p>
        </Link>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title} and its players, pairings and scores will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">
              Delete event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EnterpriseLayout>
  );
}
