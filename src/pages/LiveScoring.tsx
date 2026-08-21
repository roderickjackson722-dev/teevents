import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, Trophy, ArrowLeft, Minus, Plus, Users, Eraser } from "lucide-react";
import { toast } from "sonner";
import { SponsorBanner } from "@/components/SponsorBanner";
import { activeRoundNumber, parsePairingsConfig } from "@/lib/pairingsConfig";
import { getFormatById } from "@/lib/scoringFormats";
import { isBrandingRemoved } from "@/components/BrandingTagline";
import { TeeventsFooter } from "@/components/TeeventsFooter";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  handicap: number | null;
  group_number: number | null;
  playing_handicap: number | null;
  strokes_per_hole: number[] | null;
  is_captain?: boolean;
  group_leader?: boolean;
}

interface TournamentData {
  id: string;
  title: string;
  course_par: number | null;
  scoring_format?: string;
  handicap_enabled?: boolean;
}

interface CourseData {
  hole_pars: number[] | null;
  stroke_indexes: number[] | null;
  hole_distances: number[] | null;
  name: string | null;
  tee_name: string | null;
}

export default function LiveScoring() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [sponsors, setSponsors] = useState<{ id: string; name: string; logo_url: string | null; website_url: string | null; tier: string }[]>([]);
  const [courseStrokeIndexes, setCourseStrokeIndexes] = useState<number[] | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginMode, setLoginMode] = useState(true);
  const [groupInput, setGroupInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [scoringCode, setScoringCode] = useState<string | null>(null);
  const [groupNumber, setGroupNumber] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  // Scores post to the round currently in play so multi-day events keep one
  // card per round.
  const [roundNumber, setRoundNumber] = useState(1);
  const [scores, setScores] = useState<Record<string, Record<number, number>>>({});
  const [editedScores, setEditedScores] = useState<Record<string, Record<number, number>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoLogging, setAutoLogging] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "single">("single");
  const [focusHole, setFocusHole] = useState<number>(1);
  const [teamName, setTeamName] = useState<string | null>(null);
  // Flight/division this group belongs to — used to scope the leaderboard link.
  const [flight, setFlight] = useState<{ id: string; name: string } | null>(null);
  const [restoring, setRestoring] = useState(true);


  const sessionKey = slug ? `teevents_scoring_session_${slug}` : null;



  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: resolved } = await (supabase as any).rpc("resolve_public_tournament", { _slug: slug });
      const match = Array.isArray(resolved) ? resolved[0] : null;
      const baseQuery = supabase
        .from("tournaments")
        .select("id, title, course_par, scoring_format, handicap_enabled, pairings_config, date, leaderboard_rotating_logos, leaderboard_sponsor_interval_ms, leaderboard_sponsor_banner_enabled, leaderboard_sponsor_rotation_order, branding_removed, branding_removed_by_admin");
      const { data } = match?.id
        ? await baseQuery.eq("id", match.id).maybeSingle()
        : await baseQuery.eq("slug", slug).eq("site_published", true).maybeSingle();
      setTournament(data as TournamentData | null);
      if (data) {
        setRoundNumber(
          activeRoundNumber(parsePairingsConfig((data as any).pairings_config), (data as any).date),
        );
      }
      setLoading(false);
      if (data) {

          // Load sponsors + uploaded rotating logos
          supabase
            .from("tournament_sponsors")
            .select("id, name, logo_url, website_url, tier, show_on_leaderboard, show_on_scoring_page")
            .eq("tournament_id", data.id)
            .eq("show_on_scoring_page", true)
            .order("sort_order")
            .then(({ data: sp }) => {

              // Scoring-page sponsors are controlled by the "Display on Scoring Page"
              // selection only — independent of the leaderboard banner toggle.

              const uploaded = (((data as any).leaderboard_rotating_logos) || []).map((l: any, idx: number) => ({
                id: `uploaded-${idx}`,
                name: l.name || "Sponsor",
                logo_url: l.url,
                website_url: l.website_url || null,
                tier: "gold",
              }));
              setSponsors([...uploaded, ...(sp || [])]);
            });

          // Load course data (pars, SI, distances)
          supabase
            .from("golf_courses")
            .select("stroke_indexes, hole_pars, hole_distances, name, tee_name")
            .eq("tournament_id", data.id)
            .limit(1)
            .single()
            .then(({ data: course }) => {
              if (course) {
                setCourseStrokeIndexes(course.stroke_indexes as number[] | null);
                setCourseData({
                  hole_pars: course.hole_pars as number[] | null,
                  stroke_indexes: course.stroke_indexes as number[] | null,
                  hole_distances: course.hole_distances as number[] | null,
                  name: course.name,
                  tee_name: course.tee_name,
                });
              }
            });
        }
    })();
  }, [slug]);


  // Auto-login via scoring code from QR
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || !tournament || autoLogging) return;
    setAutoLogging(true);

    (async () => {
      const { data: gNum } = await supabase.rpc("live_scoring_lookup_group", {
        _tournament_id: tournament.id,
        _scoring_code: code,
        _email: "",
      });

      if (gNum) {
        setScoringCode(code.toUpperCase());
        await loadGroup(gNum as number, code.toUpperCase());
      } else {
        setError("Invalid scoring code or player not assigned to a hole.");
      }
      setAutoLogging(false);
    })();
  }, [tournament, searchParams]);

  // Restore a previously saved scoring session (no need to re-enter the code)
  useEffect(() => {
    if (!tournament || !sessionKey) return;
    if (searchParams.get("code")) { setRestoring(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem(sessionKey);
        if (!raw) return;
        const saved = JSON.parse(raw) as { tournamentId?: string; code?: string; groupNumber?: number };
        if (!saved?.code || saved.tournamentId !== tournament.id) return;
        // Re-validate the stored code server-side; the group is derived from it, never from the client
        const { data: gNum } = await supabase.rpc("live_scoring_lookup_group", {
          _tournament_id: tournament.id,
          _scoring_code: saved.code,
          _email: "",
        });
        if (cancelled) return;
        if (gNum) {
          setScoringCode(saved.code);
          await loadGroup(gNum as number, saved.code);
        } else {
          localStorage.removeItem(sessionKey);
        }
      } catch {
        /* ignore malformed session */
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => { cancelled = true; setRestoring(false); };
  }, [tournament, sessionKey]);

  const persistSession = (code: string | null, gNum: number) => {
    if (!sessionKey || !tournament || !code) return;
    try {
      localStorage.setItem(
        sessionKey,
        JSON.stringify({ tournamentId: tournament.id, code, groupNumber: gNum })
      );
    } catch { /* storage unavailable */ }
  };

  const handleSignOut = () => {
    if (sessionKey) { try { localStorage.removeItem(sessionKey); } catch { /* noop */ } }
    setScoringCode(null);
    setGroupNumber(null);
    setPlayers([]);
    setScores({});
    setEditedScores({});
    setTeamName(null);
    setCodeInput("");
    setEmailInput("");
    setLoginMode(true);
  };

  const loadGroup = async (gNum: number, codeForSession?: string) => {
    if (!tournament) return;

    const { data: payload } = await supabase.rpc("get_live_scoring_group", {
      _tournament_id: tournament.id,
      _group_number: gNum,
    });
    const groupPlayers = (payload as any)?.players as any[] | undefined;
    const existingScores = (payload as any)?.scores as any[] | undefined;

    if (!groupPlayers || groupPlayers.length === 0) {
      setError(`No players found in Hole ${gNum}.`);
      return;
    }

    const scoreMap: Record<string, Record<number, number>> = {};
    existingScores?.forEach((s: any) => {
      // Only the round in play — earlier rounds keep their own saved cards.
      if ((Number(s.round_number) || 1) !== roundNumber) return;
      if (!scoreMap[s.registration_id]) scoreMap[s.registration_id] = {};
      scoreMap[s.registration_id][s.hole_number] = s.strokes;
    });

    const mappedPlayers: Player[] = groupPlayers.map((p: any) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      handicap: p.handicap,
      group_number: p.group_number,
      playing_handicap: p.playing_handicap,
      strokes_per_hole: p.strokes_per_hole as number[] | null,
      is_captain: !!p.is_captain,
      group_leader: !!p.group_leader,
    }));

    // Remember a scoring_code from the group so we can authorize saves
    const anyCode = groupPlayers.find((p: any) => p.scoring_code)?.scoring_code;
    const sessionCode = codeForSession || scoringCode || anyCode || null;
    if (!scoringCode && anyCode) setScoringCode(anyCode);

    setTeamName((payload as any)?.team_name || null);
    setPlayers(mappedPlayers);
    setScores(scoreMap);
    setGroupNumber(gNum);
    setLoginMode(false);
    persistSession(sessionCode, gNum);
  };

  // Resolve the group's flight so players see (and open) their own flight board.
  useEffect(() => {
    if (!tournament || players.length === 0) { return; }
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
      setFlight(tier ? { id: tier.id, name: tier.tier_name } : null);
    })();
  }, [tournament?.id, players]);



  const handleLogin = async () => {
    if (!tournament) return;
    setError("");
    let gNum: number | null = null;
    let loginCode: string | null = null;

    if (codeInput.trim()) {
      const { data } = await supabase.rpc("live_scoring_lookup_group", {
        _tournament_id: tournament.id,
        _scoring_code: codeInput.trim(),
        _email: "",
      });
      if (!data) { setError("Invalid scoring code."); return; }
      loginCode = codeInput.trim().toUpperCase();
      setScoringCode(loginCode);
      gNum = data as number;
    } else if (emailInput.trim()) {
      const { data } = await supabase.rpc("live_scoring_lookup_group", {
        _tournament_id: tournament.id,
        _scoring_code: "",
        _email: emailInput.trim(),
      });
      if (!data) { setError("Player not found or not assigned to a hole."); return; }
      gNum = data as number;
    } else {
      setError("Enter your scoring code or email."); return;
    }

    await loadGroup(gNum, loginCode ?? undefined);
    if (players.length === 0 && error === "") {
      setError(`No players found in Hole ${gNum}.`);
    }
  };

  const setScore = (regId: string, hole: number, num: number) => {
    const clamped = Math.max(1, Math.min(12, num));
    setEditedScores((prev) => ({
      ...prev,
      [regId]: { ...(prev[regId] || {}), [hole]: clamped },
    }));
  };

  const adjustScore = (regId: string, hole: number, delta: number) => {
    const current = editedScores[regId]?.[hole] ?? scores[regId]?.[hole] ?? (courseData?.hole_pars?.[hole - 1] ?? tournament?.course_par ? Math.round((tournament?.course_par || 72) / 18) : 4);
    setScore(regId, hole, (typeof current === "number" ? current : 4) + delta);
  };

  const getScore = (regId: string, hole: number) => {
    return editedScores[regId]?.[hole] ?? scores[regId]?.[hole] ?? "";
  };

  const getStrokesOnHole = (player: Player, holeIndex: number): number => {
    if (!player.strokes_per_hole || !Array.isArray(player.strokes_per_hole)) return 0;
    return player.strokes_per_hole[holeIndex] || 0;
  };

  const handleSave = async () => {
    if (!tournament) return;
    setSaving(true);
    const upserts: { tournament_id: string; registration_id: string; hole_number: number; strokes: number }[] = [];
    Object.entries(editedScores).forEach(([regId, holes]) => {
      Object.entries(holes).forEach(([hole, strokes]) => {
        upserts.push({ tournament_id: tournament.id, registration_id: regId, hole_number: parseInt(hole), strokes });
      });
    });

    if (upserts.length > 0) {
      if (!scoringCode) {
        toast.error("Missing scoring code. Please log in again with your code.");
        setSaving(false);
        return;
      }
      const { error } = await supabase.rpc("save_group_scores", {
        _tournament_id: tournament.id,
        _code: scoringCode,
        _scores: upserts.map((u) => ({
          registration_id: u.registration_id,
          hole_number: u.hole_number,
          round_number: roundNumber,
          strokes: u.strokes,
        })),
      });
      if (error) { toast.error(error.message); }
      else {
        setScores((prev) => {
          const next = { ...prev };
          Object.entries(editedScores).forEach(([regId, holes]) => {
            next[regId] = { ...(next[regId] || {}), ...holes };
          });
          return next;
        });
        setEditedScores({});
        toast.success("Scores saved!");
      }
    }
    setSaving(false);
  };

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  const hasEdits = Object.keys(editedScores).length > 0;
  const handicapEnabled = tournament?.handicap_enabled === true;
  const activeFormat = getFormatById(tournament?.scoring_format || "stroke_play");
  // Team formats play one ball / one team score per hole — hide individual entry entirely.
  const TEAM_ENTRY_SCORING = ["scramble", "best_ball", "alternate_shot", "shootout"];
  const isScramble = !!activeFormat && TEAM_ENTRY_SCORING.includes(activeFormat.scoring);



  // Scramble: one score for the whole group — applied to every player
  const getTeamScore = (hole: number) => {
    for (const p of players) {
      const v = editedScores[p.id]?.[hole] ?? scores[p.id]?.[hole];
      if (typeof v === "number") return v;
    }
    return "" as const;
  };

  const setTeamScore = (hole: number, num: number) => {
    const clamped = Math.max(1, Math.min(12, num));
    setEditedScores((prev) => {
      const next = { ...prev };
      players.forEach((p) => {
        next[p.id] = { ...(next[p.id] || {}), [hole]: clamped };
      });
      return next;
    });
  };

  const adjustTeamScore = (hole: number, delta: number) => {
    const current = getTeamScore(hole);
    const base = typeof current === "number"
      ? current
      : (courseData?.hole_pars?.[hole - 1] ?? Math.round((tournament?.course_par || 72) / 18));
    setTeamScore(hole, base + delta);
  };

  /** Save only the current hole's pending edits. Returns false if the save failed. */
  const saveHole = async (hole: number): Promise<boolean> => {
    if (!tournament) return false;
    const upserts = Object.entries(editedScores).flatMap(([regId, holeMap]) =>
      typeof holeMap[hole] === "number"
        ? [{ registration_id: regId, hole_number: hole, strokes: holeMap[hole] }]
        : []
    );
    if (upserts.length === 0) return true;
    if (!scoringCode) {
      toast.error("Missing scoring code. Please log in again with your code.");
      return false;
    }
    setSaving(true);
    const { error } = await supabase.rpc("save_group_scores", {
      _tournament_id: tournament.id,
      _code: scoringCode,
      _scores: upserts.map((u) => ({ ...u, round_number: roundNumber })),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setScores((prev) => {
      const next = { ...prev };
      upserts.forEach((u) => {
        next[u.registration_id] = { ...(next[u.registration_id] || {}), [hole]: u.strokes };
      });
      return next;
    });
    setEditedScores((prev) => {
      const next: typeof prev = {};
      Object.entries(prev).forEach(([regId, holeMap]) => {
        const { [hole]: _removed, ...rest } = holeMap;
        if (Object.keys(rest).length > 0) next[regId] = rest;
      });
      return next;
    });
    return true;
  };

  /** Erase saved + pending scores for a hole (whole group, or one player). */
  const clearHole = async (hole: number, regId?: string) => {
    if (!tournament) return;
    if (!scoringCode) {
      toast.error("Missing scoring code. Please log in again with your code.");
      return;
    }
    const who = regId ? players.find((p) => p.id === regId) : undefined;
    const label = who ? `${who.first_name} ${who.last_name}` : "this group";
    if (!window.confirm(`Clear the Hole ${hole} score for ${label}? This cannot be undone.`)) return;
    setSaving(true);
    const { error } = await supabase.rpc("clear_group_hole_scores", {
      _tournament_id: tournament.id,
      _code: scoringCode,
      _hole_number: hole,
      _round_number: roundNumber,
      _registration_id: regId ?? null,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const targets = regId ? [regId] : players.map((p) => p.id);
    setScores((prev) => {
      const next = { ...prev };
      targets.forEach((id) => {
        if (next[id]) {
          const { [hole]: _r, ...rest } = next[id];
          next[id] = rest;
        }
      });
      return next;
    });
    setEditedScores((prev) => {
      const next: typeof prev = {};
      Object.entries(prev).forEach(([id, holeMap]) => {
        if (targets.includes(id)) {
          const { [hole]: _r, ...rest } = holeMap;
          if (Object.keys(rest).length > 0) next[id] = rest;
        } else next[id] = holeMap;
      });
      return next;
    });
    toast.success(`Hole ${hole} score cleared`);
  };

  /** Save the current hole then navigate. Blank scores are allowed. */
  const goToHole = async (nextHole: number) => {
    const target = Math.max(1, Math.min(18, nextHole));
    if (target === focusHole) return;
    const hasAnyScore = players.some(
      (p) =>
        typeof (editedScores[p.id]?.[focusHole] ?? scores[p.id]?.[focusHole]) === "number"
    );
    const saved = await saveHole(focusHole);
    if (!saved) return;
    if (!hasAnyScore) {
      toast("You haven't entered a score for this hole. You can leave it blank or go back.");
    } else {
      toast.success(`Score saved for Hole ${focusHole}`, {
        description: `Moving to Hole ${target}...`,
      });
    }
    setFocusHole(target);
  };




  if (loading || autoLogging) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Tournament not found.</p>
      </div>
    );
  }

  if (loginMode && restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loginMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Trophy className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle className="text-xl">{tournament.title}</CardTitle>
            <p className="text-sm text-muted-foreground">Live Scoring — Enter your scoring code to begin</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Scoring Code</label>
              <Input
                type="text"
                placeholder="e.g. AB12CD"
                value={codeInput}
                onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setEmailInput(""); setGroupInput(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Your Email</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setCodeInput(""); setGroupInput(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleLogin} className="w-full">
              Start Scoring
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {sponsors.length > 0 && (
          <div className="mb-2">
            <SponsorBanner
              sponsors={sponsors}
              intervalMs={(tournament as any).leaderboard_sponsor_interval_ms || 5000}
              preserveOrder
              randomOrder={((tournament as any).leaderboard_sponsor_rotation_order || "sequential") === "random"}
            />
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{tournament.title} — Starting Hole {groupNumber}</h1>
            <p className="text-xs text-muted-foreground">
              {courseData?.name && `${courseData.name} · `}
              {courseData?.tee_name && `${courseData.tee_name} Tees · `}
              Par {tournament.course_par || 72}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasEdits && viewMode === "all" && (
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            )}
            <button
              onClick={handleSignOut}
              className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Group roster — this group only */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">
                {teamName ? teamName : `Your Group — Starting Hole ${groupNumber}`}
                <span className="text-muted-foreground font-normal"> · {players.length} player{players.length === 1 ? "" : "s"}</span>
              </p>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {players.map((p) => (
                <li key={p.id} className="flex items-center gap-1">
                  <span className="font-medium">{p.first_name} {p.last_name}</span>
                  {(p.is_captain || p.group_leader) && (
                    <span className="text-[10px] uppercase tracking-wide rounded bg-primary/10 text-primary px-1.5 py-0.5">Captain</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>


        {(() => {
          const fmt = getFormatById(tournament?.scoring_format || "stroke_play");
          if (fmt && fmt.teamSize > 1) {
            return (
              <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <p className="text-sm">
                  <span className="font-semibold">Team scoring:</span> Only one player per team needs to enter the score for the team. You can edit a hole's score at any time — tap − or + to change it.
                </p>
              </div>
            );
          }
          return null;
        })()}

        {/* View mode + hole selector — gives organizers/players more space when editing one hole at a time */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="inline-flex rounded-md border border-border overflow-hidden text-sm">
            <button
              onClick={() => setViewMode("single")}
              className={`px-3 py-1.5 ${viewMode === "single" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              Single Hole
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`px-3 py-1.5 border-l border-border ${viewMode === "all" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              All Holes
            </button>
          </div>
          {viewMode === "single" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToHole(focusHole - 1)}
                disabled={focusHole <= 1 || saving}
                className="h-9 w-9 rounded border bg-background hover:bg-muted disabled:opacity-40 flex items-center justify-center"
                aria-label="Previous hole"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Hole</span>
                <select
                  value={focusHole}
                  onChange={(e) => goToHole(parseInt(e.target.value))}
                  className="h-9 rounded border bg-background px-2 text-sm font-semibold min-w-[64px]"
                >
                  {holes.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                {courseData?.hole_pars?.[focusHole - 1] != null && (
                  <span className="text-xs text-muted-foreground ml-1">
                    · Par {courseData.hole_pars[focusHole - 1]}
                  </span>
                )}
              </div>
              <button
                onClick={() => goToHole(focusHole + 1)}
                disabled={focusHole >= 18 || saving}
                className="h-9 w-9 rounded border bg-background hover:bg-muted disabled:opacity-40 flex items-center justify-center rotate-180"
                aria-label="Next hole"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

            </div>
          )}
        </div>

        {viewMode === "single" && isScramble ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Team Score Entry</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {(() => {
                const par = courseData?.hole_pars?.[focusHole - 1] ?? Math.round((tournament.course_par || 72) / 18);
                const val = getTeamScore(focusHole);
                const display = typeof val === "number" ? val : "";
                return (
                  <div className="flex items-center justify-between gap-4 border rounded-lg p-3 bg-card">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-base">Hole {focusHole} · Par {par}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {players.map((p) => `${p.first_name} ${p.last_name?.[0] ?? ""}.`).join(", ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => adjustTeamScore(focusHole, -1)}
                        className="h-12 w-12 rounded-full border-2 bg-background hover:bg-muted flex items-center justify-center"
                        aria-label="Decrease team score"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <div className="w-16 h-16 rounded-lg border-2 bg-card text-center text-3xl font-bold flex items-center justify-center">
                        {display === "" ? <span className="text-muted-foreground/60 text-xl">{par}</span> : display}
                      </div>
                      <button
                        onClick={() => adjustTeamScore(focusHole, +1)}
                        className="h-12 w-12 rounded-full border-2 bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center"
                        aria-label="Increase team score"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => clearHole(focusHole)}
                        disabled={saving || display === ""}
                        className="h-12 w-12 rounded-full border-2 bg-background hover:bg-destructive/10 text-destructive disabled:opacity-40 flex items-center justify-center"
                        aria-label="Clear team score for this hole"
                        title="Clear this hole's score"
                      >
                        <Eraser className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })()}
              <p className="text-xs text-muted-foreground">
                One score per hole for the whole group — it applies to every player on the team.
                Entered a score on the wrong hole? Tap the eraser to clear it.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "single" ? (
          <Card>
            <CardContent className="p-4 space-y-3">
              {players.map((p) => {

                const strokeDots = handicapEnabled ? getStrokesOnHole(p, focusHole - 1) : 0;
                const val = getScore(p.id, focusHole);
                const display = typeof val === "number" ? val : "";
                const par = courseData?.hole_pars?.[focusHole - 1] ?? Math.round((tournament.course_par || 72) / 18);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-4 border rounded-lg p-3 bg-card">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-base truncate">
                        {p.first_name} {p.last_name}
                        {handicapEnabled && p.playing_handicap != null && (
                          <span className="text-xs text-muted-foreground ml-2">HCP {p.playing_handicap}</span>
                        )}
                      </div>
                      {strokeDots > 0 && (
                        <div className="flex gap-1 mt-1">
                          {Array.from({ length: strokeDots }, (_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-primary" title="Handicap stroke" />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => adjustScore(p.id, focusHole, -1)}
                        className="h-12 w-12 rounded-full border-2 bg-background hover:bg-muted flex items-center justify-center"
                        aria-label="Decrease score"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <div className="w-16 h-16 rounded-lg border-2 bg-card text-center text-3xl font-bold flex items-center justify-center">
                        {display === "" ? <span className="text-muted-foreground/60 text-xl">{par}</span> : display}
                      </div>
                      <button
                        onClick={() => adjustScore(p.id, focusHole, +1)}
                        className="h-12 w-12 rounded-full border-2 bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center"
                        aria-label="Increase score"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
        <Card>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">{isScramble ? "Team" : "Player"}</TableHead>
                    {holes.map((h) => (
                      <TableHead key={h} className="text-center w-12 min-w-[48px] text-xs border-r border-border last:border-r-0">{h}</TableHead>
                    ))}
                    <TableHead className="text-center font-bold min-w-[50px]">Gross</TableHead>
                    {handicapEnabled && <TableHead className="text-center font-bold min-w-[50px]">Net</TableHead>}
                  </TableRow>
                  {/* Par row */}
                  {courseData?.hole_pars && (
                    <TableRow className="bg-muted/30">
                      <TableHead className="sticky left-0 bg-muted/30 z-10 text-xs text-muted-foreground font-semibold">Par</TableHead>
                      {holes.map((h) => (
                        <TableHead key={h} className="text-center text-xs text-muted-foreground border-r border-border">
                          {courseData.hole_pars?.[h - 1] ?? ""}
                        </TableHead>
                      ))}
                      <TableHead className="text-center text-xs font-semibold text-muted-foreground">{tournament.course_par || 72}</TableHead>
                      {handicapEnabled && <TableHead />}
                    </TableRow>
                  )}
                  {/* SI row */}
                  {handicapEnabled && courseStrokeIndexes && (
                    <TableRow className="bg-muted/20">
                      <TableHead className="sticky left-0 bg-muted/20 z-10 text-[10px] text-muted-foreground">SI</TableHead>
                      {holes.map((h) => (
                        <TableHead key={h} className="text-center text-[10px] text-muted-foreground border-r border-border">
                          {courseStrokeIndexes[h - 1] || ""}
                        </TableHead>
                      ))}
                      <TableHead />
                      {handicapEnabled && <TableHead />}
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {isScramble ? (
                    <TableRow>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">Team</TableCell>
                      {holes.map((h) => {
                        const val = getTeamScore(h);
                        const display = typeof val === "number" ? val : "";
                        return (
                          <TableCell key={h} className="p-0.5 text-center border-r border-border">
                            <div className="inline-flex items-center gap-0.5">
                              <button
                                type="button"
                                aria-label="Decrease"
                                onClick={() => adjustTeamScore(h, -1)}
                                className="h-7 w-5 rounded border bg-background hover:bg-muted text-xs leading-none flex items-center justify-center"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <div className="w-7 h-7 rounded border bg-card text-center text-sm font-semibold flex items-center justify-center">
                                {display === "" ? (courseData?.hole_pars?.[h - 1] ?? "·") : display}
                              </div>
                              <button
                                type="button"
                                aria-label="Increase"
                                onClick={() => adjustTeamScore(h, +1)}
                                className="h-7 w-5 rounded border bg-background hover:bg-muted text-xs leading-none flex items-center justify-center"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold">
                        {(() => {
                          const total = holes.reduce((sum, h) => {
                            const v = getTeamScore(h);
                            return sum + (typeof v === "number" ? v : 0);
                          }, 0);
                          return total > 0 ? total : "—";
                        })()}
                      </TableCell>
                      {handicapEnabled && <TableCell className="text-center font-bold text-primary">—</TableCell>}
                    </TableRow>
                  ) : players.map((p) => {

                    const grossTotal = holes.reduce((sum, h) => {
                      const val = getScore(p.id, h);
                      return sum + (typeof val === "number" ? val : 0);
                    }, 0);
                    const netTotal = handicapEnabled
                      ? holes.reduce((sum, h) => {
                          const val = getScore(p.id, h);
                          if (typeof val !== "number") return sum;
                          return sum + val - getStrokesOnHole(p, h - 1);
                        }, 0)
                      : 0;

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">
                          {p.first_name} {p.last_name?.[0]}.
                          {handicapEnabled && p.playing_handicap != null && (
                            <span className="text-xs text-muted-foreground ml-1">({p.playing_handicap})</span>
                          )}
                          {!handicapEnabled && p.handicap !== null && (
                            <span className="text-xs text-muted-foreground ml-1">({p.handicap})</span>
                          )}
                        </TableCell>
                        {holes.map((h) => {
                          const strokeDots = handicapEnabled ? getStrokesOnHole(p, h - 1) : 0;
                          const val = getScore(p.id, h);
                          const display = typeof val === "number" ? val : "";
                          return (
                            <TableCell key={h} className="p-0.5 text-center border-r border-border">
                              <div className="relative">
                                <div className="inline-flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    aria-label="Decrease"
                                    onClick={() => adjustScore(p.id, h, -1)}
                                    className="h-7 w-5 rounded border bg-background hover:bg-muted text-xs leading-none flex items-center justify-center"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <div className="w-7 h-7 rounded border bg-card text-center text-sm font-semibold flex items-center justify-center">
                                    {display === "" ? (courseData?.hole_pars?.[h - 1] ?? "·") : display}
                                  </div>
                                  <button
                                    type="button"
                                    aria-label="Increase"
                                    onClick={() => adjustScore(p.id, h, +1)}
                                    className="h-7 w-5 rounded border bg-background hover:bg-muted text-xs leading-none flex items-center justify-center"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                {strokeDots > 0 && (
                                  <div className="flex justify-center gap-0.5 mt-0.5">
                                    {Array.from({ length: strokeDots }, (_, i) => (
                                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-bold">{grossTotal > 0 ? grossTotal : "—"}</TableCell>
                        {handicapEnabled && (
                          <TableCell className="text-center font-bold text-primary">
                            {grossTotal > 0 ? netTotal : "—"}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        )}

        {viewMode === "single" && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12"
                disabled={focusHole <= 1 || saving}
                onClick={() => goToHole(focusHole - 1)}
              >
                ← Previous
              </Button>
              <Button
                className="flex-1 h-12"
                disabled={focusHole >= 18 || saving}
                onClick={() => goToHole(focusHole + 1)}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Next Hole →
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              💡 Score saved when you move to the next hole.
            </p>
          </div>
        )}



        {slug && (
          <div className="pt-2 border-t space-y-2">
            {flight && (
              <p className="text-xs text-center text-muted-foreground">
                You are scoring in <span className="font-semibold text-foreground">{flight.name}</span>
              </p>
            )}
            <Button asChild variant="outline" className="w-full h-12">
              <a
                href={`/live/${slug}${flight ? `?flight=${flight.id}` : ""}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Trophy className="h-4 w-4 mr-2" /> {flight ? `${flight.name} Leaderboard` : "View Leaderboard"} →

              </a>
            </Button>
          </div>
        )}


      </div>
      {!isBrandingRemoved(tournament as any) && <TeeventsFooter tournament={tournament as any} />}
    </div>
  );
}
