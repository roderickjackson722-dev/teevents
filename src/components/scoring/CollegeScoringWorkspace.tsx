import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { FastScoreEntry } from "@/components/scoring/FastScoreEntry";
import {
  filterPlayers,
  indexScores,
  playerName,
  playerTotal,
  roundTotal,
  statusLabel,
  teamStandings,
  type PlayerRow,
  type PlayerStatus,
  type ScoreIndex,
} from "@/lib/collegeScoring";
import type { ScoringAdapter, ScoringEvent } from "@/lib/collegeScoringAdapter";

interface Props {
  adapter: ScoringAdapter;
  /** Event the user is locked to (scoring admins assigned to a single event). */
  lockedEventId?: string | null;
  /** Rendered under the event selector (organizer setup cards). */
  setupSlot?: (event: ScoringEvent, reload: () => void) => React.ReactNode;
}

const STORAGE_KEY = "collegeScoringEventId";

/**
 * High-speed college scoring workspace: event selector (never auto-switches),
 * division tabs, team/player/pairing search, fast score entry and best-4-of-5
 * team standings.
 */
export function CollegeScoringWorkspace({ adapter, lockedEventId, setupSlot }: Props) {
  const [events, setEvents] = useState<ScoringEvent[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [index, setIndex] = useState<ScoreIndex>({});
  const [divisionId, setDivisionId] = useState<string>("");
  const [teamQuery, setTeamQuery] = useState("");
  const [playerQuery, setPlayerQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [editing, setEditing] = useState<PlayerRow | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Load the event list once. The remembered event is restored, never replaced.
  useEffect(() => {
    (async () => {
      try {
        const list = await adapter.listEvents();
        setEvents(list);
        let stored = "";
        try {
          stored = localStorage.getItem(STORAGE_KEY) || "";
        } catch {
          /* ignore */
        }
        const initial =
          (lockedEventId && list.some((e) => e.id === lockedEventId) && lockedEventId) ||
          (stored && list.some((e) => e.id === stored) && stored) ||
          list[0]?.id ||
          "";
        setEventId(initial);
      } catch (e: any) {
        setAccessError(e?.message || "Could not load your events.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const event = useMemo(() => events.find((e) => e.id === eventId) || null, [events, eventId]);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [roster, scores] = await Promise.all([
        adapter.loadRoster(eventId),
        adapter.loadScores(eventId),
      ]);
      setPlayers(roster);
      setIndex(indexScores(scores));
      setAccessError(null);
    } catch (e: any) {
      setAccessError(
        e?.message?.includes("Not authorized")
          ? "You do not have access to this event. Please contact the tournament organizer."
          : e?.message || "Could not load scores."
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    try {
      localStorage.setItem(STORAGE_KEY, eventId);
    } catch {
      /* ignore */
    }
    setDivisionId("");
    load();
  }, [eventId, load]);

  const rounds = event?.rounds || 1;
  const divisions = event?.divisions || [];
  const roundList = Array.from({ length: rounds }, (_, i) => i + 1);

  const visible = useMemo(
    () =>
      filterPlayers(players, {
        team: teamQuery,
        player: playerQuery,
        group: groupQuery,
        divisionId: divisionId || null,
      }),
    [players, teamQuery, playerQuery, groupQuery, divisionId]
  );

  const standings = useMemo(
    () =>
      teamStandings(
        divisionId ? players.filter((p) => (p.division_id || "") === divisionId) : players,
        index,
        rounds,
        Math.max(1, event?.countingScores || 4)
      ),
    [players, index, rounds, divisionId, event?.countingScores]
  );

  const saveEntry = async (
    perRound: Record<number, Record<number, string>>,
    status: PlayerStatus,
    reason: string
  ) => {
    if (!editing || !eventId) return;
    try {
      for (const round of roundList) {
        await adapter.saveRound(eventId, editing.registration_id, round, perRound[round] || {});
      }
      if (status !== editing.status || (reason || "") !== (editing.status_reason || "")) {
        await adapter.setStatus(eventId, editing.registration_id, status, reason);
      }
      toast.success(`Saved scores for ${playerName(editing)}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not save scores");
      throw e;
    }
  };

  const confirmSwitch = () => {
    if (!pendingEventId) return;
    setEventId(pendingEventId);
    setPendingEventId(null);
    setSwitching(false);
  };

  if (loading && !events.length) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event selector — requires confirmation, never auto-switches */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Event</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lockedEventId ? (
            <p className="text-sm">
              You are assigned to:{" "}
              <span className="font-semibold">{event?.eventTitle || event?.title || "—"}</span>
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((e) => {
                const active = e.id === eventId;
                return (
                  <div
                    key={e.id}
                    className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                      active ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.eventTitle || e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.date ? new Date(`${e.date}T12:00:00`).toLocaleDateString() : "No date"} ·{" "}
                        {e.rounds} round{e.rounds === 1 ? "" : "s"}
                        {e.divisions.length ? ` · ${e.divisions.length} divisions` : ""}
                      </div>
                    </div>
                    {active ? (
                      <Badge>Current</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPendingEventId(e.id);
                          setSwitching(true);
                        }}
                      >
                        Switch Event
                      </Button>
                    )}
                  </div>
                );
              })}
              {!events.length && (
                <p className="text-sm text-muted-foreground">No events available to score yet.</p>
              )}
            </div>
          )}
          {event && (
            <p className="text-sm text-muted-foreground">
              ℹ️ You are currently working on:{" "}
              <span className="font-medium text-foreground">{event.eventTitle || event.title}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {accessError && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">{accessError}</CardContent>
        </Card>
      )}

      {event && setupSlot?.(event, load)}

      {event && !accessError && (
        <>
          {/* Division selector */}
          {divisions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Division</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={divisionId === "" ? "default" : "outline"}
                  onClick={() => setDivisionId("")}
                >
                  All Divisions
                </Button>
                {divisions.map((d) => (
                  <Button
                    key={d.id}
                    size="sm"
                    variant={divisionId === d.id ? "default" : "outline"}
                    onClick={() => setDivisionId(d.id)}
                  >
                    {d.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Scoring dashboard */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                Scoring Dashboard
                {divisionId
                  ? ` – ${divisions.find((d) => d.id === divisionId)?.name || divisionId}`
                  : ""}
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search by Team…"
                    value={teamQuery}
                    onChange={(e) => setTeamQuery(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search by Player…"
                    value={playerQuery}
                    onChange={(e) => setPlayerQuery(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Filter by Group/Pairing…"
                    value={groupQuery}
                    onChange={(e) => setGroupQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">Team</th>
                      <th className="py-2 pr-3">Player</th>
                      <th className="py-2 pr-3">Status</th>
                      {roundList.map((r) => (
                        <th key={r} className="py-2 pr-3 text-right">
                          R{r}
                        </th>
                      ))}
                      <th className="py-2 pr-3 text-right">Total</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((p) => {
                      const total = playerTotal(index, p, rounds);
                      return (
                        <tr key={p.registration_id} className="border-b last:border-0">
                          <td className="py-2 pr-3">{p.team_name || "—"}</td>
                          <td className="py-2 pr-3 font-medium">{playerName(p)}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={p.status === "active" ? "secondary" : "destructive"}>
                              {statusLabel(p.status)}
                            </Badge>
                          </td>
                          {roundList.map((r) => (
                            <td key={r} className="py-2 pr-3 text-right tabular-nums">
                              {p.status === "active" ? roundTotal(index, p.registration_id, r) ?? "—" : "—"}
                            </td>
                          ))}
                          <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                            {total ?? "—"}
                          </td>
                          <td className="py-2 text-right">
                            <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {!visible.length && (
                      <tr>
                        <td colSpan={5 + roundList.length} className="py-6 text-center text-muted-foreground">
                          No players match these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                {visible.length} player{visible.length === 1 ? "" : "s"} shown. WD and DQ players are excluded
                from team totals.
              </p>
            </CardContent>
          </Card>

          {/* Team standings — best 4 of 5 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Team Standings
                {divisionId
                  ? ` – ${divisions.find((d) => d.id === divisionId)?.name || divisionId}`
                  : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">Team</th>
                      <th className="py-2 pr-3 text-right">Total Score</th>
                      <th className="py-2">Players (Best 4)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s) => (
                      <tr key={s.teamId} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-3 font-medium">{s.teamName}</td>
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                          {s.total ?? "—"}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {s.counted.length
                            ? s.counted.map((c) => `${c.name} (${c.total})`).join(", ")
                            : "No scores yet"}
                        </td>
                      </tr>
                    ))}
                    {!standings.length && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-muted-foreground">
                          Assign players to teams to see team standings.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <FastScoreEntry
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        player={editing}
        divisionName={
          divisions.find((d) => d.id === (editing?.division_id || ""))?.name ||
          editing?.division_id ||
          null
        }
        rounds={rounds}
        index={index}
        onSave={saveEntry}
      />

      <AlertDialog open={switching} onOpenChange={(o) => !o && setSwitching(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch event?</AlertDialogTitle>
            <AlertDialogDescription>
              You are currently working on {event?.eventTitle || event?.title || "this event"}. Switching will
              load a different event's roster and scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingEventId(null)}>Stay here</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>Switch Event</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
