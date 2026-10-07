import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import RosterHandicapCell from "@/components/handicap/RosterHandicapCell";
import { HandicapLabel, formatIndex } from "@/components/handicap/HandicapBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { computeHandicaps, projectedIndex, scoreDifferential } from "@/lib/courseHandicap";
import { syncEventHandicaps, syncLeagueHandicaps } from "@/lib/handicapClient";

type Patch = { ghin?: string | null; index?: number | null; source?: "ghin" | "manual" | "none"; lastUpdated?: string | null; lowIndex?: number | null };

function toRow(patch: Patch, ghinColumn: string) {
  const row: Record<string, unknown> = {};
  if (patch.ghin !== undefined) row[ghinColumn] = patch.ghin;
  if (patch.index !== undefined) row.handicap_index = patch.index;
  if (patch.source) row.handicap_source = patch.source;
  if (patch.lastUpdated !== undefined) row.handicap_last_updated = patch.lastUpdated;
  if (patch.lowIndex !== undefined) row.low_handicap_index = patch.lowIndex;
  return row;
}

function LastSync({ targetId, bump }: { targetId: string | null; bump: number }) {
  const [log, setLog] = useState<any>(null);
  useEffect(() => {
    if (!targetId) return;
    (supabase.from("handicap_sync_logs") as any)
      .select("created_at, updated, total, manual_remaining, failed, pending, triggered_by")
      .eq("target_id", targetId).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: any) => setLog(data));
  }, [targetId, bump]);
  if (!log) return <span className="text-xs text-muted-foreground">Not synced yet</span>;
  return (
    <span className="text-xs text-muted-foreground">
      {log.pending ? "Pending Sync" : `Synced on ${new Date(log.created_at).toLocaleDateString()}`} · {log.updated} players updated, {log.manual_remaining} manual entries
      {log.triggered_by === "cron" ? " (daily auto-sync)" : ""}
    </span>
  );
}

/* ---------------- Tournaments ---------------- */
function EventHandicaps({ orgId }: { orgId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, { gross: number; holes: number }>>({});
  const [view, setView] = useState<"gross" | "net">("net");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    (supabase.from("tournaments") as any)
      .select("id, title, date, handicap_enabled")
      .eq("organization_id", orgId).eq("is_enterprise", true)
      .order("date", { ascending: false }).limit(200)
      .then(({ data }: any) => {
        const list = (data || []).sort((a: any, b: any) => Number(b.handicap_enabled) - Number(a.handicap_enabled));
        setEvents(list);
        if (list[0]) setEventId(list[0].id);
      });
  }, [orgId]);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    const [{ data: ev }, { data: regs }, { data: sc }] = await Promise.all([
      (supabase.from("tournaments") as any).select("id, title, handicap_enabled, handicap_allowance_percentage, course_rating, slope_rating, course_par, handicap_sync_enabled, enterprise_settings").eq("id", eventId).maybeSingle(),
      (supabase.from("tournament_registrations") as any).select("id, first_name, last_name, ghin_id, handicap_index, handicap_source, handicap_last_updated").eq("tournament_id", eventId).order("last_name"),
      (supabase.from("tournament_scores") as any).select("registration_id, strokes").eq("tournament_id", eventId).limit(5000),
    ]);
    setEvent(ev);
    setPlayers(regs || []);
    const agg: Record<string, { gross: number; holes: number }> = {};
    (sc || []).forEach((r: any) => {
      if (r.strokes == null) return;
      const a = (agg[r.registration_id] ||= { gross: 0, holes: 0 });
      a.gross += r.strokes; a.holes += 1;
    });
    setScores(agg);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const settings = useMemo(() => event ? ({
    courseRating: event.course_rating, slopeRating: event.slope_rating, par: event.course_par ?? 72,
    allowancePercentage: event.handicap_allowance_percentage ?? 100,
    holes: Number(event.enterprise_settings?.holes) === 9 ? 9 : 18,
  }) : null, [event]);

  const rows = useMemo(() => players.map((p) => {
    const c = settings ? computeHandicaps(p.handicap_index, settings) : { courseHandicap: null, playingHandicap: null };
    const s = scores[p.id];
    return { ...p, ...c, gross: s?.gross ?? null, thru: s?.holes ?? 0, net: s && c.playingHandicap != null ? s.gross - c.playingHandicap : s?.gross ?? null };
  }), [players, settings, scores]);

  const board = useMemo(() => rows.filter((r) => r.gross != null)
    .sort((a, b) => (view === "net" ? a.net - b.net : a.gross - b.gross)), [rows, view]);

  const save = async (p: any, patch: Patch) => {
    const row = toRow(patch, "ghin_id");
    if (patch.index != null) row.handicap = Math.round(patch.index);
    const { error } = await (supabase.from("tournament_registrations") as any).update(row).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    if (patch.index != null) {
      await (supabase.from("handicap_index_history") as any).insert({ organization_id: orgId, registration_id: p.id, handicap_index: patch.index, source: patch.source || "manual" });
      if (settings) {
        const c = computeHandicaps(patch.index, settings);
        if (c.courseHandicap != null) {
          await (supabase.from("course_handicaps") as any).upsert({ event_id: eventId, player_id: p.id, handicap_index: patch.index, course_handicap: c.courseHandicap, playing_handicap: c.playingHandicap, calculated_at: new Date().toISOString() }, { onConflict: "event_id,player_id" });
          await (supabase.from("tournament_registrations") as any).update({ course_handicap: c.courseHandicap, playing_handicap: c.playingHandicap }).eq("id", p.id);
        }
      }
    }
    toast.success("Saved.");
    load();
  };

  const syncAll = async () => {
    if (!eventId) return;
    setSyncing(true);
    try { const res = await syncEventHandicaps(eventId); toast.success(res.message, { duration: 8000 }); await load(); setBump((b) => b + 1); }
    catch (e: any) { toast.error(e.message); }
    setSyncing(false);
  };

  if (!events.length) return <p className="text-sm text-muted-foreground">No Enterprise tournaments yet. <Link className="underline" to="/enterprise/create">Create one</Link> and turn on handicaps in the Players step.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={eventId || undefined} onValueChange={setEventId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Choose a tournament" /></SelectTrigger>
          <SelectContent>{events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}{e.handicap_enabled ? " · Handicaps on" : ""}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={syncAll} disabled={syncing} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          {syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />} Sync All Handicaps
        </Button>
        <LastSync targetId={eventId} bump={bump} />
      </div>

      {event && !event.handicap_enabled && (
        <p className="rounded-md bg-muted p-3 text-sm">Handicaps are off for this event. Turn them on in the <Link className="font-semibold underline" to={`/enterprise/create?tournament_id=${event.id}`}>event wizard</Link> (Players step).</p>
      )}
      {event?.handicap_enabled && (
        <p className="text-xs text-muted-foreground">
          Course Rating {event.course_rating ?? "—"} · Slope {event.slope_rating ?? "—"} · Par {event.course_par ?? 72} · Allowance {event.handicap_allowance_percentage ?? 100}%
          {event.handicap_sync_enabled ? " · GHIN auto-sync daily" : ""}
        </p>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Players</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No players in this event yet.</p> : (
            <div className="divide-y divide-border text-sm">
              <div className="hidden grid-cols-[1.2fr_2.4fr_0.7fr_0.7fr] gap-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                <span>Player</span>
                <HandicapLabel kind="index">Handicap Index</HandicapLabel>
                <HandicapLabel kind="course">Course Hcp</HandicapLabel>
                <HandicapLabel kind="playing">Playing Hcp</HandicapLabel>
              </div>
              {rows.map((p) => (
                <div key={p.id} className="grid items-center gap-2 py-2 md:grid-cols-[1.2fr_2.4fr_0.7fr_0.7fr] md:gap-3">
                  <span className="font-medium">{p.first_name} {p.last_name}</span>
                  <RosterHandicapCell
                    value={{ ghin: p.ghin_id, lastName: p.last_name, index: p.handicap_index, source: p.handicap_source, lastUpdated: p.handicap_last_updated }}
                    onSave={(patch) => save(p, patch)}
                  />
                  <span className="tabular-nums"><span className="text-muted-foreground md:hidden">Course: </span>{p.courseHandicap ?? "—"}</span>
                  <span className="font-semibold tabular-nums"><span className="font-normal text-muted-foreground md:hidden">Playing: </span>{p.playingHandicap ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {event?.handicap_enabled && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Leaderboard</CardTitle>
            <div className="inline-flex rounded-md border border-border p-1">
              {(["gross", "net"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`rounded px-3 py-1 text-xs font-semibold ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {v === "gross" ? "Gross" : "Net"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {board.length === 0 ? <p className="text-sm text-muted-foreground">No scores entered yet.</p> : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-1">#</th><th>Player</th><th className="text-right">Thru</th><th className="text-right">Gross</th><th className="text-right">Net</th></tr>
                </thead>
                <tbody>
                  {board.map((r, i) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-1.5 font-bold">{i + 1}</td>
                      <td>{r.first_name} {r.last_name}</td>
                      <td className="text-right">{r.thru}</td>
                      <td className={`text-right ${view === "gross" ? "font-bold" : ""}`}>{r.gross}</td>
                      <td className={`text-right ${view === "net" ? "font-bold" : ""}`}>{r.net}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Leagues ---------------- */
function LeagueHandicaps({ orgId }: { orgId: string }) {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [rounds, setRounds] = useState<Record<string, { date: string; gross: number; diff: number | null }[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    (supabase.from("golf_leagues") as any).select("id, league_name").eq("organization_id", orgId).order("created_at", { ascending: false })
      .then(({ data }: any) => { setLeagues(data || []); if (data?.[0]) setLeagueId(data[0].id); });
  }, [orgId]);

  const load = useCallback(async () => {
    if (!leagueId) return;
    const { data: mem } = await (supabase.from("league_members") as any)
      .select("id, member_name, ghin_id, handicap_index, handicap_source, handicap_last_updated")
      .eq("league_id", leagueId).neq("is_active", false).order("member_name");
    setMembers(mem || []);
    const ids = (mem || []).map((m: any) => m.id);
    if (!ids.length) { setHistory({}); setRounds({}); return; }
    const [{ data: hist }, { data: evs }, { data: courses }] = await Promise.all([
      (supabase.from("handicap_index_history") as any).select("league_member_id, handicap_index, source, recorded_at").in("league_member_id", ids).order("recorded_at"),
      (supabase.from("league_events") as any).select("id, event_date, holes, league_course_id").eq("league_id", leagueId),
      (supabase.from("league_courses") as any).select("id, course_rating, slope_rating, par_total").eq("league_id", leagueId),
    ]);
    const h: Record<string, any[]> = {};
    (hist || []).forEach((r: any) => (h[r.league_member_id] ||= []).push(r));
    setHistory(h);
    const courseById = new Map((courses || []).map((c: any) => [c.id, c]));
    const fallback = (courses || [])[0];
    const evById = new Map((evs || []).map((e: any) => [e.id, e]));
    const evIds = (evs || []).map((e: any) => e.id);
    if (!evIds.length) { setRounds({}); return; }
    const { data: sc } = await (supabase.from("league_event_scores") as any).select("event_id, member_id, gross_score").in("event_id", evIds).limit(10000);
    const tot: Record<string, Record<string, { gross: number; holes: number }>> = {};
    (sc || []).forEach((r: any) => {
      if (r.gross_score == null) return;
      const m = ((tot[r.member_id] ||= {})[r.event_id] ||= { gross: 0, holes: 0 });
      m.gross += r.gross_score; m.holes += 1;
    });
    const out: Record<string, { date: string; gross: number; diff: number | null }[]> = {};
    Object.entries(tot).forEach(([mid, byEv]) => {
      out[mid] = Object.entries(byEv).map(([eid, v]) => {
        const ev: any = evById.get(eid);
        const course: any = courseById.get(ev?.league_course_id) || fallback;
        const full = v.holes >= 18;
        const nine = v.holes >= 9 && v.holes < 18;
        let diff: number | null = null;
        if (course?.course_rating && course?.slope_rating && (full || nine)) {
          // 9-hole rounds use half the 18-hole rating, doubled to an 18-hole equivalent.
          diff = full ? scoreDifferential(v.gross, Number(course.course_rating), Number(course.slope_rating))
            : scoreDifferential(v.gross * 2, Number(course.course_rating), Number(course.slope_rating));
        }
        return { date: ev?.event_date || "", gross: v.gross, diff };
      }).sort((a, b) => a.date.localeCompare(b.date));
    });
    setRounds(out);
  }, [leagueId]);

  useEffect(() => { load(); }, [load]);

  const save = async (m: any, patch: Patch) => {
    const row = toRow(patch, "ghin_id");
    if (patch.lastUpdated) row.handicap_updated_at = patch.lastUpdated;
    const { error } = await (supabase.from("league_members") as any).update(row).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    if (patch.index != null) await (supabase.from("handicap_index_history") as any).insert({ organization_id: orgId, league_member_id: m.id, handicap_index: patch.index, source: patch.source || "manual" });
    toast.success("Saved.");
    load();
  };

  const syncAll = async () => {
    if (!leagueId) return;
    setSyncing(true);
    try { const res = await syncLeagueHandicaps(leagueId); toast.success(res.message, { duration: 8000 }); await load(); setBump((b) => b + 1); }
    catch (e: any) { toast.error(e.message); }
    setSyncing(false);
  };

  if (!leagues.length) return <p className="text-sm text-muted-foreground">No leagues yet. <Link className="underline" to="/enterprise/leagues?new=1">Create a league</Link>.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={leagueId || undefined} onValueChange={setLeagueId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Choose a league" /></SelectTrigger>
          <SelectContent>{leagues.map((l) => <SelectItem key={l.id} value={l.id}>{l.league_name}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={syncAll} disabled={syncing} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          {syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />} Sync All Handicaps
        </Button>
        <LastSync targetId={leagueId} bump={bump} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Handicap Tracker</CardTitle></CardHeader>
        <CardContent>
          {members.length === 0 ? <p className="text-sm text-muted-foreground">No members in this league yet.</p> : (
            <div className="divide-y divide-border text-sm">
              {members.map((m) => {
                const r = rounds[m.id] || [];
                const diffs = r.map((x) => x.diff).filter((d): d is number => d != null);
                const proj = projectedIndex(diffs);
                const trend = proj != null && m.handicap_index != null ? proj - Number(m.handicap_index) : null;
                return (
                  <div key={m.id} className="py-2">
                    <div className="grid items-center gap-2 md:grid-cols-[1.2fr_2.4fr_0.6fr_0.9fr_auto] md:gap-3">
                      <span className="font-medium">{m.member_name}</span>
                      <RosterHandicapCell
                        value={{ ghin: m.ghin_id, lastName: String(m.member_name || "").split(" ").pop() || "", index: m.handicap_index, source: m.handicap_source, lastUpdated: m.handicap_last_updated }}
                        onSave={(patch) => save(m, patch)}
                      />
                      <span className="text-muted-foreground">{r.length} rounds</span>
                      <span className="flex items-center gap-1">
                        Projected {formatIndex(proj)}
                        {trend != null && trend !== 0 && (trend < 0 ? <TrendingDown className="h-3.5 w-3.5 text-primary" /> : <TrendingUp className="h-3.5 w-3.5 text-destructive" />)}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setOpen(open === m.id ? null : m.id)}>{open === m.id ? "Hide" : "History"}</Button>
                    </div>
                    {open === m.id && (
                      <div className="mt-2 grid gap-3 rounded-md bg-muted p-3 text-xs md:grid-cols-2">
                        <div>
                          <p className="mb-1 font-semibold">Index history</p>
                          {(history[m.id] || []).length === 0 ? <p className="text-muted-foreground">No changes recorded yet.</p> : (
                            <ul className="space-y-0.5">
                              {(history[m.id] || []).slice(-12).reverse().map((h, i) => (
                                <li key={i}>{new Date(h.recorded_at).toLocaleDateString()} — {formatIndex(Number(h.handicap_index))} <span className="text-muted-foreground">({h.source === "ghin" ? "GHIN" : "Manual"})</span></li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <p className="mb-1 font-semibold">Rounds &amp; differentials</p>
                          {r.length === 0 ? <p className="text-muted-foreground">No league rounds scored yet.</p> : (
                            <ul className="space-y-0.5">
                              {r.slice(-20).reverse().map((x, i) => (
                                <li key={i}>{x.date || "—"} — Gross {x.gross} · Differential {x.diff ?? "— (add course rating & slope)"}</li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-1 text-muted-foreground">Projected index uses the best differentials of the last 20 rounds (WHS). Needs at least 3 rounds.</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EnterpriseHandicaps() {
  const { org } = useOrgContext();
  return (
    <EnterpriseLayout
      title="Handicaps"
      description="USGA Handicap Indexes, Course and Playing Handicaps, GHIN sync and net scoring."
      crumbs={[{ label: "Handicaps" }]}
    >
      {!org ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <Tabs defaultValue="events">
          <TabsList><TabsTrigger value="events">Tournaments</TabsTrigger><TabsTrigger value="leagues">Leagues</TabsTrigger></TabsList>
          <TabsContent value="events" className="mt-4"><EventHandicaps orgId={org.orgId} /></TabsContent>
          <TabsContent value="leagues" className="mt-4"><LeagueHandicaps orgId={org.orgId} /></TabsContent>
        </Tabs>
      )}
    </EnterpriseLayout>
  );
}
