import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import { MoreVertical, Filter, Plus, Loader2, Users, Trophy } from "lucide-react";
import { toast } from "sonner";
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

const PAGE_SIZE = 10;

const SELECT_COLS =
  "id, title, date, course_name, status, slug, scoring_format, enterprise_event_type, enterprise_settings, max_players";

export default function EnterpriseHome() {
  const { org } = useOrgContext();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EnterpriseEventRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
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
      title="Events"
      description="Every tournament and league your club is running, in one list."
      actions={
        <Button asChild className="bg-secondary text-primary hover:bg-secondary/90">
          <Link to="/enterprise/create?type=single_round">
            <Plus className="mr-1.5 h-4 w-4" /> Create Event
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

      <div className="mb-3 flex flex-wrap items-center gap-2">
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

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-12 gap-3 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <div className="col-span-4">Event</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Course</div>
          <div className="col-span-1">Players</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading events…
          </div>
        ) : pageRows.length === 0 ? (
          <div className="p-10 text-center">
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
          pageRows.map((row) => {
            const meta = statusMeta(row.status);
            const settings = parseEnterpriseSettings(row.enterprise_settings);
            return (
              <div
                key={row.id}
                className="grid grid-cols-1 gap-2 border-b border-border px-4 py-3 last:border-0 md:grid-cols-12 md:items-center md:gap-3"
              >
                <div className="md:col-span-4">
                  <Link to={`/enterprise/create?tournament_id=${row.id}`} className="font-semibold text-foreground hover:text-primary">
                    {row.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {gameTypeLabel(settings.gameType || row.scoring_format)} · {settings.holes} holes
                  </p>
                </div>
                <div className="md:col-span-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground md:col-span-2">{row.date || "No date set"}</div>
                <div className="truncate text-sm text-muted-foreground md:col-span-2">{row.course_name || "—"}</div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground md:col-span-1">
                  <Users className="h-3.5 w-3.5" /> {counts[row.id] || 0}
                </div>
                <div className="md:col-span-1 md:text-right">
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
            );
          })
        )}
      </Card>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

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
