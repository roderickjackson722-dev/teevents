import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LeagueTeamLeaderboard from "@/components/leagues/LeagueTeamLeaderboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, PenLine, Sparkles, Trophy, ExternalLink } from "lucide-react";
import { buildAllocation, netForHole, capNetDoubleBogey, type CourseSnapshot } from "@/lib/leagueHandicap";
import { computeEventSkins } from "@/lib/leagueSkins";
import { recomputeLeagueStandings } from "@/lib/leagueStandings";
import { CheckCircle2, RefreshCw } from "lucide-react";

interface Player {
  member_id: string;
  member_name: string;
  handicap_index: number | null;
  pairing_group?: number | null;
  alloc: ReturnType<typeof buildAllocation>;
}

export default function LeagueScoringTab({ leagueId }: { leagueId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [event, setEvent] = useState<any>(null);
  const [course, setCourse] = useState<CourseSnapshot | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Record<string, Record<number, string>>>({});
  // skin winners per hole (member_id) after last skins run
  const [skinWinners, setSkinWinners] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const roundStatus: string = event?.round_status || "not_started";

  const setRoundStatus = async (status: "in_progress" | "completed") => {
    if (!eventId) return;
    setStatusBusy(true);
    const { error } = await (supabase as any)
      .from("league_events")
      .update({ round_status: status })
      .eq("id", eventId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      setStatusBusy(false);
      return;
    }
    setEvent((prev: any) => (prev ? { ...prev, round_status: status } : prev));
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, round_status: status } : e)));
    if (status === "completed") {
      try {
        const n = await recomputeLeagueStandings(leagueId);
        toast({ title: "Round completed", description: `Points & payouts computed — ${n} players ranked.` });
      } catch (e: any) {
        toast({ title: "Round completed, recompute failed", description: e.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Round reopened" });
    }
    setStatusBusy(false);
  };

  const recompute = async () => {
    setStatusBusy(true);
    try {
      const n = await recomputeLeagueStandings(leagueId);
      toast({ title: `Points & payouts recomputed — ${n} players ranked` });
    } catch (e: any) {
      toast({ title: "Recompute failed", description: e.message, variant: "destructive" });
    }
    setStatusBusy(false);
  };

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("league_events")
        .select("id, event_name, event_date, course_id, skins_enabled, skins_mode, skins_carryover, skins_value_cents, round_status, completed_at")
        .eq("league_id", leagueId)
        .order("event_date");
      setEvents(data || []);
      if (data?.[0]) setEventId(data[0].id);
    })();
  }, [leagueId]);

  const load = async () => {
    if (!eventId) return;
    setLoading(true);

    const ev = events.find((e) => e.id === eventId);
    setEvent(ev || null);

    let courseData: CourseSnapshot | null = null;
    if (ev?.course_id) {
      const { data: c } = await (supabase as any)
        .from("golf_courses")
        .select("par_total, course_rating, slope_rating, hole_pars, hole_stroke_indexes")
        .eq("id", ev.course_id)
        .maybeSingle();
      courseData = c || null;
    }
    setCourse(courseData);

    const { data: regs } = await (supabase as any)
      .from("league_event_registrations")
      .select("member_id, pairing_group, league_members!inner(member_name, handicap_index)")
      .eq("event_id", eventId);

    const list: Player[] = (regs || [])
      .map((r: any) => ({
        member_id: r.member_id,
        member_name: r.league_members.member_name,
        handicap_index: r.league_members.handicap_index,
        pairing_group: r.pairing_group,
        alloc: buildAllocation(r.league_members.handicap_index, courseData),
      }))
      .sort((a: Player, b: Player) => (a.pairing_group ?? 99) - (b.pairing_group ?? 99));
    setPlayers(list);

    const { data: existing } = await (supabase as any)
      .from("league_event_scores")
      .select("member_id, hole_number, gross_score")
      .eq("event_id", eventId);
    const map: Record<string, Record<number, string>> = {};
    (existing || []).forEach((s: any) => {
      if (!map[s.member_id]) map[s.member_id] = {};
      map[s.member_id][s.hole_number] = String(s.gross_score ?? "");
    });
    setScores(map);

    if (ev?.skins_enabled) {
      const { data: sk } = await (supabase as any)
        .from("league_skins")
        .select("hole_number, winner_member_id")
        .eq("event_id", eventId);
      const wins: Record<number, string> = {};
      (sk || []).forEach((s: any) => { if (s.winner_member_id) wins[s.hole_number] = s.winner_member_id; });
      setSkinWinners(wins);
    } else {
      setSkinWinners({});
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, [eventId, events]);

  // Live sync: pull in scores as players enter them (player scoring pages, portal, etc.)
  useEffect(() => {
    if (!eventId) return;
    const refreshScores = async () => {
      const { data: existing } = await (supabase as any)
        .from("league_event_scores")
        .select("member_id, hole_number, gross_score")
        .eq("event_id", eventId);
      const map: Record<string, Record<number, string>> = {};
      (existing || []).forEach((s: any) => {
        if (!map[s.member_id]) map[s.member_id] = {};
        map[s.member_id][s.hole_number] = String(s.gross_score ?? "");
      });
      setScores(map);
    };
    const channel = (supabase as any)
      .channel(`league-event-scores-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "league_event_scores", filter: `event_id=eq.${eventId}` },
        () => refreshScores(),
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [eventId]);

  const setGross = (mid: string, hole: number, val: string) => {
    setScores((prev) => ({ ...prev, [mid]: { ...(prev[mid] || {}), [hole]: val } }));
  };

  const save = async () => {
    if (!eventId) return;
    setSaving(true);
    const rows: any[] = [];
    for (const p of players) {
      const holes = scores[p.member_id] || {};
      for (let h = 1; h <= 18; h++) {
        const g = holes[h];
        if (g !== "" && g != null && !isNaN(Number(g))) {
          const grossRaw = Number(g);
          const capped = capNetDoubleBogey(grossRaw, h - 1, p.alloc);
          const net = netForHole(grossRaw, h - 1, p.alloc);
          rows.push({
            event_id: eventId,
            member_id: p.member_id,
            hole_number: h,
            gross_score: capped,
            net_score: net,
          });
        }
      }
    }
    // Blanked cells clear the stored score for that player/hole
    const clears: { member_id: string; hole_number: number }[] = [];
    for (const p of players) {
      const holes = scores[p.member_id] || {};
      for (let h = 1; h <= 18; h++) {
        const g = holes[h];
        if (g === "" || g == null) clears.push({ member_id: p.member_id, hole_number: h });
      }
    }
    if (clears.length > 0) {
      const byMember: Record<string, number[]> = {};
      clears.forEach((c) => { (byMember[c.member_id] ||= []).push(c.hole_number); });
      for (const [mid, hs] of Object.entries(byMember)) {
        await (supabase as any)
          .from("league_event_scores")
          .delete()
          .eq("event_id", eventId)
          .eq("member_id", mid)
          .in("hole_number", hs);
      }
    }
    if (rows.length === 0) {
      toast({ title: clears.length ? "Cleared blank scores" : "No scores to save" });
      setSaving(false);
      return;
    }
    const { error } = await (supabase as any)
      .from("league_event_scores")
      .upsert(rows, { onConflict: "event_id,member_id,hole_number" });
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Auto-run skins when enabled for this event
    if (event?.skins_enabled) {
      try {
        await computeEventSkins(
          eventId,
          (event.skins_mode as "gross" | "net") || "gross",
          Number(event.skins_value_cents || 0),
          !!event.skins_carryover,
        );
        const { data: sk } = await (supabase as any)
          .from("league_skins")
          .select("hole_number, winner_member_id")
          .eq("event_id", eventId);
        const wins: Record<number, string> = {};
        (sk || []).forEach((s: any) => { if (s.winner_member_id) wins[s.hole_number] = s.winner_member_id; });
        setSkinWinners(wins);
      } catch (e: any) {
        toast({ title: "Skins recompute failed", description: e.message, variant: "destructive" });
      }
    }

    toast({ title: `Saved ${rows.length} scores${event?.skins_enabled ? " · skins updated" : ""}` });
    setSaving(false);
  };

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  const parRow = course?.hole_pars && course.hole_pars.length === 18 ? course.hole_pars : null;
  const skinsOn = !!event?.skins_enabled;

  return (
    <div className="space-y-6">
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <PenLine className="h-5 w-5" />
          <span className="text-xs text-muted-foreground hidden sm:inline">Live &mdash; syncs as players enter scores</span>
          <div className="flex-1 max-w-xs">
            <Label className="sr-only">Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger><SelectValue placeholder="Choose an event" /></SelectTrigger>
              <SelectContent>
                {events.map(e => <SelectItem key={e.id} value={e.id}>{e.event_name} — {e.event_date}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {skinsOn && (
            <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-900 border-yellow-300">
              <Sparkles className="h-3 w-3" /> Skins {event?.skins_mode || "gross"}
            </Badge>
          )}
          {eventId && (
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Scores
            </Button>
          )}
          {eventId && (
            <Button variant="outline" asChild>
              <a href={`/league-leaderboard/${eventId}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> Live Leaderboard
              </a>
            </Button>
          )}
        </div>

        {!eventId ? (
          <p className="text-muted-foreground text-sm py-6 text-center">Choose an event to enter scores.</p>
        ) : loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : players.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No players registered for this event yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-2 text-left sticky left-0 bg-muted/40 z-10 min-w-[200px]">Player</th>
                  <th className="p-2">CH</th>
                  {holes.map(h => (
                    <th key={h} className="p-1 min-w-[52px] text-center">
                      <div>H{h}</div>
                      {parRow && <div className="text-[10px] text-muted-foreground font-normal">par {parRow[h - 1]}</div>}
                    </th>
                  ))}
                  <th className="p-2">Gross</th>
                  <th className="p-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {players.map(p => {
                  let gTotal = 0, nTotal = 0;
                  const cells = holes.map((h) => {
                    const val = scores[p.member_id]?.[h] ?? "";
                    const grossNum = Number(val);
                    const strokes = p.alloc.strokesPerHole[h - 1] || 0;
                    let capped = 0, net = 0;
                    if (val !== "" && !isNaN(grossNum)) {
                      capped = capNetDoubleBogey(grossNum, h - 1, p.alloc);
                      net = netForHole(grossNum, h - 1, p.alloc);
                      gTotal += capped;
                      nTotal += net;
                    }
                    const isSkin = skinsOn && skinWinners[h] === p.member_id;
                    return (
                      <td key={h} className={`p-1 ${isSkin ? "bg-yellow-200/70" : ""}`}>
                        <div className="relative">
                          <Input
                            type="number"
                            value={val}
                            onChange={(e) => setGross(p.member_id, h, e.target.value)}
                            className={`h-8 w-12 px-1 text-center ${isSkin ? "border-yellow-500 font-bold" : ""}`}
                          />
                          {strokes > 0 && (
                            <span className="absolute -top-1 -right-1 text-[9px] text-primary font-bold">{'•'.repeat(Math.min(strokes, 2))}</span>
                          )}
                        </div>
                      </td>
                    );
                  });
                  return (
                    <tr key={p.member_id} className="border-b">
                      <td className="p-2 sticky left-0 bg-background z-10 font-medium">
                        {p.member_name}
                        {p.pairing_group && <span className="text-muted-foreground text-[10px] ml-1">G{p.pairing_group}</span>}
                      </td>
                      <td className="p-2 text-center">{p.alloc.courseHandicap}</td>
                      {cells}
                      <td className="p-2 font-semibold text-center">{gTotal || "—"}</td>
                      <td className="p-2 font-semibold text-center text-primary">{nTotal || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              CH = Course Handicap (WHS). Hole net = min(gross, par + strokes + 2) − strokes received. Dots show pops from the stroke index.
              {skinsOn && <> Cells shaded <span className="bg-yellow-200/70 px-1">yellow</span> won a skin.</>}
            </p>
          </div>
        )}
      </CardContent>
    </Card>

    {eventId && (
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">Round Status</h3>
            <Badge variant={roundStatus === "completed" ? "default" : "secondary"}>
              {roundStatus === "completed" ? "Completed" : roundStatus === "in_progress" ? "In Progress" : "Not Started"}
            </Badge>
          </div>
          {roundStatus === "completed" ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={recompute} disabled={statusBusy}>
                {statusBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Recompute Points &amp; Payouts
              </Button>
              <Button variant="outline" onClick={() => setRoundStatus("in_progress")} disabled={statusBusy}>
                Reopen Round
              </Button>
            </div>
          ) : (
            <>
              <Button onClick={() => setRoundStatus("completed")} disabled={statusBusy}>
                {statusBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Complete Round
              </Button>
              <p className="text-xs text-muted-foreground">
                Once completed, scores are finalized and points/payouts are computed. Partial scores are still counted.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    )}

    {eventId && (
      <Card>
        <CardContent className="pt-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Live Leaderboard</h3>
          <p className="text-xs text-muted-foreground">
            Team results for this event, updating live. Use the pencil to edit hole-by-hole scores — clear a hole and save to remove it.
          </p>
          <LeagueTeamLeaderboard eventId={eventId} editable />
        </CardContent>
      </Card>
    )}
    </div>
  );
}
