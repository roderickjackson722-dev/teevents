import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Trophy, Pencil, Check, Minus, Plus, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { allocateStrokes } from "@/lib/handicapUtils";
import { getFormatById } from "@/lib/scoringFormats";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Reg {
  id: string;
  first_name: string;
  last_name: string;
  group_position: number | null;
  playing_handicap: number | null;
  course_handicap: number | null;
  handicap: number | null;
}

interface Tournament {
  id: string;
  title: string;
  slug: string | null;
  course_par: number | null;
  hole_pars: number[] | null;
  live_allow_edit_past_holes: boolean;
  live_require_confirm_save: boolean;
  live_leaderboard_enabled: boolean;
  scoring_format: string | null;
}

const NUM_HOLES = 18;
const DEFAULT_SI = Array.from({ length: 18 }, (_, i) => i + 1);

export default function GroupScoring() {
  const { slug, code } = useParams<{ slug: string; code: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Reg[]>([]);
  const [scores, setScores] = useState<Record<string, Record<number, number>>>({});
  const [currentHole, setCurrentHole] = useState(1);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The flight (division) this scoring code belongs to. Scores are always saved
  // for this group only, and the leaderboard link opens on this flight.
  const [flight, setFlight] = useState<{ id: string; name: string } | null>(null);


  useEffect(() => {
    if (!slug || !code) return;
    (async () => {
      setLoading(true);
      setError(null);
      const cleanCode = code.trim().toUpperCase();
      const { data: access, error: accessError } = await (supabase as any).rpc("lookup_scoring_access", {
        _slug: slug,
        _code: cleanCode,
      });
      const match = Array.isArray(access) ? access[0] : null;
      if (accessError || !match || match.kind !== "group") {
        setError(accessError?.message || "No players found for this code.");
        setLoading(false);
        return;
      }
      const t = {
        id: match.tournament_id,
        title: match.title,
        slug: match.route_slug,
        course_par: match.course_par,
        hole_pars: match.hole_pars,
        live_allow_edit_past_holes: match.live_allow_edit_past_holes,
        live_require_confirm_save: match.live_require_confirm_save,
        live_leaderboard_enabled: match.live_leaderboard_enabled,
        scoring_format: null,
      } as Tournament;
      // Fetch scoring_format separately (lookup RPC doesn't return it)
      const { data: tRow } = await supabase
        .from("tournaments")
        .select("scoring_format")
        .eq("id", t.id)
        .maybeSingle();
      if (tRow?.scoring_format) t.scoring_format = tRow.scoring_format;
      setTournament(t);

      const { data: regs } = await supabase
        .rpc("get_group_scoring_roster", {
          _tournament_id: t.id,
          _code: cleanCode,
        });
      if (!regs || regs.length === 0) {
        setError("No players found for this code.");
        setLoading(false);
        return;
      }
      setPlayers(regs as Reg[]);

      const ids = (regs as Reg[]).map((r) => r.id);
      const { data: sc } = await supabase
        .from("tournament_scores")
        .select("registration_id, hole_number, strokes")
        .in("registration_id", ids);
      const map: Record<string, Record<number, number>> = {};
      (sc || []).forEach((s: any) => {
        map[s.registration_id] = map[s.registration_id] || {};
        map[s.registration_id][s.hole_number] = s.strokes;
      });
      setScores(map);

      // jump to first unscored hole
      const firstUnscored = (() => {
        for (let h = 1; h <= NUM_HOLES; h++) {
          if (!(regs as Reg[]).every((p) => map[p.id]?.[h] != null)) return h;
        }
        return 1;
      })();
      setCurrentHole(firstUnscored);
      setLoading(false);
    })();
  }, [slug, code]);
  // Resolve which flight/division this group plays in.
  useEffect(() => {
    if (!tournament || players.length === 0) return;
    (async () => {
      const { data: regRows } = await (supabase as any)
        .from("tournament_registrations")
        .select("flight_id")
        .in("id", players.map((p) => p.id));
      const flightId = (regRows || []).map((r: any) => r.flight_id).find((v: any) => !!v);
      if (!flightId) { setFlight(null); return; }
      const { data: tier } = await (supabase as any)
        .from("tournament_tiers")
        .select("id, tier_name")
        .eq("id", flightId)
        .maybeSingle();
      if (tier) setFlight({ id: tier.id, name: tier.tier_name });
    })();
  }, [tournament?.id, players]);


  // Realtime updates from other devices in the group
  useEffect(() => {
    if (!tournament || players.length === 0) return;
    const ids = players.map((p) => p.id);
    const channel = supabase
      .channel(`group-scoring-${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_scores", filter: `tournament_id=eq.${tournament.id}` },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (!row || !ids.includes(row.registration_id)) return;
          setScores((prev) => {
            const next = { ...prev };
            next[row.registration_id] = { ...(next[row.registration_id] || {}) };
            if (payload.eventType === "DELETE") delete next[row.registration_id][row.hole_number];
            else next[row.registration_id][row.hole_number] = row.strokes;
            return next;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tournament, players, code]);

  const holePar = useMemo(() => {
    if (!tournament) return 4;
    if (tournament.hole_pars && tournament.hole_pars[currentHole - 1]) return tournament.hole_pars[currentHole - 1];
    return Math.round((tournament.course_par || 72) / 18);
  }, [tournament, currentHole]);

  const strokesByPlayer = useMemo(() => {
    const out: Record<string, number[]> = {};
    players.forEach((p) => {
      const ph = p.playing_handicap ?? p.course_handicap ?? p.handicap ?? 0;
      out[p.id] = allocateStrokes(ph, DEFAULT_SI);
    });
    return out;
  }, [players]);

  const format = useMemo(() => getFormatById(tournament?.scoring_format || "stroke_play"), [tournament]);
  const isScramble = format?.scoring === "scramble";

  // Team score already recorded for this hole (all players share the same value in a scramble)
  const teamScoreForHole = (hole: number) => {
    for (const p of players) {
      const v = scores[p.id]?.[hole];
      if (v != null) return v;
    }
    return undefined;
  };

  const TEAM_KEY = "__team__";
  const teamDraft = draft[TEAM_KEY];
  const teamSaved = teamScoreForHole(currentHole);
  const teamNum = teamDraft != null && teamDraft !== "" ? parseInt(teamDraft, 10) : teamSaved;

  const pendingChanges = useMemo(() => {
    if (isScramble) return [];
    return players.filter((p) => {
      const d = draft[p.id];
      if (d == null || d === "") return false;
      const n = parseInt(d, 10);
      return !isNaN(n) && n !== scores[p.id]?.[currentHole];
    });
  }, [draft, scores, players, currentHole, isScramble]);

  const teamPending = isScramble && teamNum != null && !isNaN(teamNum) && teamNum !== teamSaved;
  const hasPending = isScramble ? teamPending : pendingChanges.length > 0;

  const isPastHole = currentHole < (() => {
    for (let h = 1; h <= NUM_HOLES; h++) {
      if (!players.every((p) => scores[p.id]?.[h] != null)) return h;
    }
    return NUM_HOLES + 1;
  })();

  const editLocked = isPastHole && tournament && !tournament.live_allow_edit_past_holes;

  const performSave = async () => {
    if (!tournament || !code) return;
    setSaving(true);
    const rows = isScramble
      ? players.map((p) => ({
          registration_id: p.id,
          hole_number: currentHole,
          strokes: teamNum as number,
        }))
      : pendingChanges.map((p) => ({
          registration_id: p.id,
          hole_number: currentHole,
          strokes: parseInt(draft[p.id], 10),
        }));
    const { error } = await supabase.rpc("save_group_scores", {
      _tournament_id: tournament.id,
      _code: code,
      _scores: rows,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setScores((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        next[r.registration_id] = { ...(next[r.registration_id] || {}), [r.hole_number]: r.strokes };
      });
      return next;
    });
    setDraft({});
    toast({ title: "Saved" });
    if (currentHole < NUM_HOLES) setCurrentHole(currentHole + 1);
  };

  const holesArr = Array.from({ length: NUM_HOLES }, (_, i) => i + 1);
  const parForHole = (h: number) => {
    if (!tournament) return 4;
    if (tournament.hole_pars && tournament.hole_pars[h - 1]) return tournament.hole_pars[h - 1];
    return Math.round((tournament.course_par || 72) / 18);
  };

  const [editTarget, setEditTarget] = useState<{ pid: string; hole: number } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (pid: string, hole: number) => {
    const existing = isScramble ? teamScoreForHole(hole) : scores[pid]?.[hole];
    setEditVal(existing != null ? String(existing) : "");
    setEditTarget({ pid, hole });
  };

  const saveEdit = async () => {
    if (!editTarget || !tournament || !code) return;
    const n = parseInt(editVal, 10);
    if (isNaN(n) || n < 1 || n > 20) {
      toast({ title: "Enter a score between 1 and 20", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    const rows = isScramble
      ? players.map((p) => ({ registration_id: p.id, hole_number: editTarget.hole, strokes: n }))
      : [{ registration_id: editTarget.pid, hole_number: editTarget.hole, strokes: n }];
    const { error } = await supabase.rpc("save_group_scores", {
      _tournament_id: tournament.id,
      _code: code,
      _scores: rows,
    });
    setSavingEdit(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setScores((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        next[r.registration_id] = { ...(next[r.registration_id] || {}), [r.hole_number]: r.strokes };
      });
      return next;
    });
    setEditTarget(null);
    toast({ title: "Score saved" });
  };

  const handleSave = () => {
    if (!hasPending) {
      if (currentHole < NUM_HOLES) setCurrentHole(currentHole + 1);
      return;
    }
    if (tournament?.live_require_confirm_save) setConfirmOpen(true);
    else performSave();
  };


  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <Trophy className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">{error || "Tournament unavailable."}</p>
        <Button asChild variant="outline"><Link to={`/score/${slug}`}>Try a different code</Link></Button>
      </div>
    );
  }

  const getNet = (p: Reg, hole: number, gross: number | undefined) => {
    if (gross == null) return null;
    const s = strokesByPlayer[p.id]?.[hole - 1] || 0;
    return gross - s;
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="font-bold text-foreground truncate flex items-center gap-2">
            <Trophy className="h-4 w-4 text-secondary shrink-0" />
            <span className="truncate">{tournament.title}</span>
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Group {code}</span>
            {flight && (
              <span className="inline-flex items-center rounded-full bg-secondary/15 text-secondary-foreground px-2 py-0.5 font-semibold">
                {flight.name}
              </span>
            )}
          </p>
        </div>
        {tournament.live_leaderboard_enabled && tournament.slug && (
          <Button asChild variant="outline" size="sm">
            <a
              href={`/live/${tournament.slug}?from=${encodeURIComponent(`/score/${slug}/${code}`)}${flight ? `&flight=${flight.id}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              📊 {flight ? `${flight.name} Leaderboard` : "View Live Leaderboard"}
            </a>
          </Button>
        )}


      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Hole nav */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentHole((h) => Math.max(1, h - 1))} disabled={currentHole === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground">Hole</p>
                <p className="text-2xl font-bold">{currentHole} <span className="text-base font-normal text-muted-foreground">of {NUM_HOLES}</span></p>
              </div>
              <Button variant="outline" size="icon" onClick={() => setCurrentHole((h) => Math.min(NUM_HOLES, h + 1))} disabled={currentHole === NUM_HOLES}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(currentHole)} onValueChange={(v) => setCurrentHole(parseInt(v, 10))}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: NUM_HOLES }, (_, i) => i + 1).map((h) => {
                    const allScored = players.every((p) => scores[p.id]?.[h] != null);
                    return <SelectItem key={h} value={String(h)}>Hole {h} {allScored ? "✓" : ""}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                Par {holePar} · SI {currentHole}
              </div>
            </div>
          </CardContent>
        </Card>

        {format && format.teamSize > 1 && (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 flex items-start gap-2">
            <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">{isScramble ? "Scramble scoring:" : "Team scoring:"}</span>{" "}
              {isScramble
                ? "Enter one team score per hole for the whole group. It applies to every player on the team."
                : "Only one player per team needs to enter the score for the team. You can edit a previously entered hole at any time."}
            </p>
          </div>
        )}

        {isScramble ? (
          /* Single team score entry */
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Team Score Entry — Group {code}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Hole {currentHole} · Par {holePar}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {players.map((p) => `${p.first_name} ${p.last_name?.[0] ?? ""}.`).join(", ")}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    disabled={!!editLocked || (teamNum ?? holePar) <= 1}
                    onClick={() =>
                      setDraft((d) => ({ ...d, [TEAM_KEY]: String(Math.max(1, (teamNum ?? holePar) - 1)) }))
                    }
                    aria-label="Decrease team score"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div
                    className={`w-16 h-12 rounded border text-center text-xl font-bold flex items-center justify-center ${
                      teamNum != null ? "bg-card text-foreground" : "bg-muted/40 text-muted-foreground"
                    }`}
                    aria-label="Team score"
                  >
                    {teamNum ?? holePar}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    disabled={!!editLocked || (teamNum ?? holePar) >= 12}
                    onClick={() =>
                      setDraft((d) => ({ ...d, [TEAM_KEY]: String(Math.min(12, (teamNum ?? holePar) + 1)) }))
                    }
                    aria-label="Increase team score"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {teamNum == null && (
                <p className="text-xs text-muted-foreground italic">Tap +/- to enter the team score for this hole.</p>
              )}
              {editLocked && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Editing past holes is locked by the organizer.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
        /* Player rows */
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Scores</CardTitle></CardHeader>

          <CardContent className="space-y-2">
            {players.map((p) => {
              const sStrokes = strokesByPlayer[p.id]?.[currentHole - 1] || 0;
              const gross = scores[p.id]?.[currentHole];
              const hasDraft = draft[p.id] != null && draft[p.id] !== "";
              const draftVal = draft[p.id] ?? (gross != null ? String(gross) : "");
              const grossNum = draftVal === "" ? undefined : parseInt(draftVal, 10);
              const net = getNet(p, currentHole, grossNum);
              const displayNum = grossNum ?? holePar; // default to par when nothing entered
              const setVal = (n: number) => {
                const clamped = Math.max(1, Math.min(12, n));
                setDraft((d) => ({ ...d, [p.id]: String(clamped) }));
              };
              const adjust = (delta: number) => setVal((grossNum ?? holePar) + delta);
              const locked = editLocked || false;
              return (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.first_name} {p.last_name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {sStrokes > 0 && (
                        <span className="text-secondary" title={`${sStrokes} stroke${sStrokes > 1 ? "s" : ""} on this hole`}>
                          {"●".repeat(sStrokes)}
                        </span>
                      )}
                      {grossNum != null && <span>net: {net}</span>}
                      {!hasDraft && gross == null && <span className="italic">tap +/- to enter</span>}
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      disabled={locked || displayNum <= 1}
                      onClick={() => adjust(-1)}
                      aria-label="Decrease score"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div
                      className={`w-14 h-12 rounded border text-center text-xl font-bold flex items-center justify-center ${
                        hasDraft || gross != null ? "bg-card text-foreground" : "bg-muted/40 text-muted-foreground"
                      }`}
                      aria-label="Current score"
                    >
                      {displayNum}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      disabled={locked || displayNum >= 12}
                      onClick={() => adjust(1)}
                      aria-label="Increase score"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {editLocked && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                Editing past holes is locked by the organizer.
              </p>
            )}
          </CardContent>
        </Card>
        )}


        {/* Hole summary */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Round Progress</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: NUM_HOLES }, (_, i) => i + 1).map((h) => {
              const allScored = players.every((p) => scores[p.id]?.[h] != null);
              const isCurrent = h === currentHole;
              return (
                <button
                  key={h}
                  onClick={() => setCurrentHole(h)}
                  className={`aspect-square rounded text-xs font-semibold border transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary"
                      : allScored
                        ? "bg-secondary/20 border-secondary/40 text-foreground"
                        : "bg-muted/40 border-border text-muted-foreground"
                  }`}
                  aria-label={`Hole ${h}${allScored ? " complete" : ""}`}
                >
                  {h}
                  {allScored && <Check className="h-3 w-3 mx-auto" />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Full scorecard — tap a hole to view / edit */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between gap-2">
              <span>Scorecard</span>
              <span className="text-xs font-normal text-muted-foreground">Tap a score to edit</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="scoring-table-wrap border-t border-border">
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr>
                    <th className="sticky-col left-0 p-2 text-left min-w-[110px] border-b border-border">Hole</th>
                    {holesArr.map((h) => (
                      <th
                        key={h}
                        onClick={() => setCurrentHole(h)}
                        className={`p-2 text-center min-w-[34px] border-b border-border cursor-pointer ${h === currentHole ? "text-primary font-bold" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                    <th className="p-2 text-center min-w-[44px] border-b border-border">Tot</th>
                  </tr>
                  <tr className="par-row">
                    <th className="sticky-col left-0 p-2 text-left text-muted-foreground font-semibold border-b border-border">Par</th>
                    {holesArr.map((h) => (
                      <th key={h} className="p-2 text-center text-muted-foreground border-b border-border">{parForHole(h)}</th>
                    ))}
                    <th className="p-2 text-center text-muted-foreground border-b border-border">
                      {holesArr.reduce((s, h) => s + parForHole(h), 0)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(isScramble ? [players[0]] : players).filter(Boolean).map((p) => {
                    const label = isScramble ? `Team ${code}` : `${p.first_name} ${p.last_name?.[0] ?? ""}.`;
                    const total = holesArr.reduce((sum, h) => sum + (scores[p.id]?.[h] ?? 0), 0);
                    return (
                      <tr key={p.id}>
                        <td className="sticky-col left-0 p-2 font-medium border-b border-border truncate max-w-[110px]">{label}</td>
                        {holesArr.map((h) => {
                          const v = isScramble ? teamScoreForHole(h) : scores[p.id]?.[h];
                          const par = parForHole(h);
                          return (
                            <td key={h} className="p-0 text-center border-b border-border">
                              <button
                                type="button"
                                onClick={() => { setCurrentHole(h); openEdit(p.id, h); }}
                                className={`w-full h-9 text-center ${h === currentHole ? "bg-primary/10" : ""} ${
                                  v != null && v < par ? "text-primary font-bold" : v != null && v > par ? "text-destructive" : ""
                                }`}
                                aria-label={`Edit ${label} hole ${h}`}
                              >
                                {v ?? "—"}
                              </button>
                            </td>
                          );
                        })}
                        <td className="p-2 text-center font-bold border-b border-border">{total > 0 ? total : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Sticky Save bar */}
      <div className="fixed bottom-0 inset-x-0 bg-card border-t border-border p-3 z-20">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleSave}
            disabled={saving || editLocked || false}
            className="w-full h-12 text-base bg-secondary text-secondary-foreground hover:bg-secondary/90"
            style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> :
              hasPending ? `Save & ${currentHole < NUM_HOLES ? "Next Hole →" : "Finish"}` :
              currentHole < NUM_HOLES ? "Next Hole →" : "Done"}
          </Button>
        </div>
      </div>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Score — Hole {editTarget?.hole}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">{isScramble ? "Team:" : "Player:"}</span>{" "}
                <span className="font-medium">
                  {isScramble
                    ? `Team ${code}`
                    : (() => {
                        const p = players.find((x) => x.id === editTarget.pid);
                        return p ? `${p.first_name} ${p.last_name}` : "";
                      })()}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Hole:</span>{" "}
                {editTarget.hole} (Par {parForHole(editTarget.hole)})
              </p>
              <p>
                <span className="text-muted-foreground">Current Score:</span>{" "}
                {(isScramble ? teamScoreForHole(editTarget.hole) : scores[editTarget.pid]?.[editTarget.hole]) ?? "—"}
              </p>
              <div className="space-y-1 pt-1">
                <label className="text-xs text-muted-foreground" htmlFor="new-score">New Score</label>
                <Input
                  id="new-score"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit} style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm scores for Hole {currentHole}</AlertDialogTitle>
            <AlertDialogDescription>
              {isScramble
                ? `Team score: ${teamNum ?? "—"}`
                : pendingChanges.map((p) => `${p.first_name}: ${draft[p.id]}`).join(" · ")}
            </AlertDialogDescription>

          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmOpen(false); performSave(); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
