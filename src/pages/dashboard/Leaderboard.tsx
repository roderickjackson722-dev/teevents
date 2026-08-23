import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import { computeScoreProgress, type ProgressRow } from "@/lib/scoreProgress";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useTournamentIdParam } from "@/hooks/useTournamentIdParam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Loader2, Save, Copy, ExternalLink, Users, ArrowLeft, FlaskConical, Lock, WifiOff, CloudUpload, AlertTriangle, Search, CheckCircle2, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SponsorBanner } from "@/components/SponsorBanner";
import { getFormatById, stablefordPoints, type ScoringFormat } from "@/lib/scoringFormats";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeaderboardGallery from "@/components/dashboard/LeaderboardGallery";
import LiveDisplayShareCard from "@/components/dashboard/LiveDisplayShareCard";
import LeaderboardDesignCard from "@/components/dashboard/LeaderboardDesignCard";
import LeaderboardSponsorCard from "@/components/dashboard/LeaderboardSponsorCard";
import TickerSponsorsCard from "@/components/dashboard/TickerSponsorsCard";

import LeaderboardFreezeCard from "@/components/dashboard/LeaderboardFreezeCard";
import { ScoreInput, parseScoreInput } from "@/components/dashboard/ScoreInput";
import ScoreEditHistory from "@/components/dashboard/ScoreEditHistory";
import LeaderboardHeaderCard from "@/components/dashboard/LeaderboardHeaderCard";
import LeaderboardResetCard from "@/components/dashboard/LeaderboardResetCard";
import RoundClosureCard from "@/components/dashboard/RoundClosureCard";
import { activeRoundNumber, parsePairingsConfig, roundLabel } from "@/lib/pairingsConfig";
import { closedRoundSet, nextOpenRound, type TournamentRoundRow } from "@/lib/tournamentRounds";

import { useOfflineScoreQueue } from "@/hooks/useOfflineScoreQueue";
import ScoreEntryWd, { isWithdrawn } from "@/components/dashboard/ScoreEntryWd";

// Score validation: strokes must be an integer between 1 and 20 inclusive.
const MIN_STROKES = 1;
const MAX_STROKES = 20;
function validateStrokes(n: unknown): string | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return "Must be a number";
  if (!Number.isInteger(n)) return "Whole strokes only";
  if (n < MIN_STROKES) return `Min ${MIN_STROKES}`;
  if (n > MAX_STROKES) return `Max ${MAX_STROKES}`;
  return null;
}

interface PlayerScore {
  registration_id: string;
  first_name: string;
  last_name: string;
  handicap: number | null;
  group_number: number | null;
  scores: Record<number, number>;
  total: number;
  playing_handicap: number | null;
  strokes_per_hole: number[] | null;
  /** Registration status — "wd" players are excluded from scoring. */
  status?: string | null;
}

interface TeamScore {
  key: string;
  label: string;
  isUnassigned?: boolean;
  groupNumber: number | null;
  players: PlayerScore[];
  holeScores: Record<number, number>;
  total: number;
}


const DEFAULT_HOLE_PAR = 4;

function computeTeamHoleScore(
  players: PlayerScore[],
  hole: number,
  format: ScoringFormat,
  editedScores: Record<string, Record<number, number>>
): number | null {
  const strokes = players
    .map((p) => editedScores[p.registration_id]?.[hole] ?? p.scores[hole])
    .filter((v): v is number => v !== undefined && v !== null);
  if (strokes.length === 0) return null;

  if (format.scoring === "best_ball" || format.scoring === "shamble") {
    return Math.min(...strokes);
  }
  // scramble — there should be one score per hole per team, take the min (or first)
  if (format.scoring === "scramble") {
    return Math.min(...strokes);
  }
  return null;
}

/**
 * Expanded edit area shown inside the selected scoring row. Keeps the
 * organizer's focus on the row they picked (no jumping to the top of the page)
 * and offers plus/minus entry with a Save & Next Hole action.
 */
function InlineHoleEditor({
  label,
  hole,
  par,
  value,
  maxHole,
  disabled,
  saving,
  onHole,
  onValue,
  onSaveNext,
}: {
  label: string;
  hole: number;
  par: number;
  value: number;
  maxHole: number;
  disabled?: boolean;
  saving?: boolean;
  onHole: (h: number) => void;
  onValue: (n: number) => void;
  onSaveNext: () => void;
}) {
  return (
    <div className="rounded-md border-2 border-secondary bg-card p-3 flex flex-wrap items-center gap-4">
      <div className="font-semibold">{label}</div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onHole(Math.max(1, hole - 1))} disabled={hole <= 1} aria-label="Previous hole">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm whitespace-nowrap">Hole {hole} · Par {par}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onHole(Math.min(maxHole, hole + 1))} disabled={hole >= maxHole} aria-label="Next hole">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-9 w-9" disabled={disabled || value <= 0} onClick={() => onValue(Math.max(0, value - 1))} aria-label="Decrease score">
          <Minus className="h-4 w-4" />
        </Button>
        <div className="w-14 h-9 rounded border flex items-center justify-center text-lg font-bold">{value}</div>
        <Button variant="outline" size="icon" className="h-9 w-9" disabled={disabled || value >= 20} onClick={() => onValue(Math.min(20, value + 1))} aria-label="Increase score">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Button
        onClick={onSaveNext}
        disabled={saving || hole >= maxHole}
        style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}
      >
        {saving ? "Saving…" : disabled ? "Next Hole →" : "Save & Next Hole →"}
      </Button>
      <p className="text-xs text-muted-foreground w-full">
        {disabled
          ? "View-only: this button just moves to the next hole — no scores are changed."
          : "Saving will automatically advance to the next hole. Existing scores for other holes are untouched."}
      </p>

    </div>
  );
}

export default function Leaderboard({ mode = "all" }: { mode?: "all" | "settings" | "entry" }) {
  const showEntry = mode !== "settings";
  const showSettings = mode !== "entry";


  const { org, loading: orgLoading } = useOrgContext();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useTournamentIdParam();
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [editedScores, setEditedScores] = useState<Record<string, Record<number, number>>>({});
  const [scoreView, setScoreView] = useState<"gross" | "net">("gross");
  // Score-entry helpers: name/team filter, expanded row selection, and the hole
  // targeted by the expanded inline editor.
  const [scoreSearch, setScoreSearch] = useState("");
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [editHole, setEditHole] = useState(1);
  const [workingRound, setWorkingRound] = useState(1);
  const initializedTournamentRef = useRef<string | null>(null);


  // Detect platform admin — admins get access to ALL tournaments across every org
  const { data: isPlatformAdmin } = useQuery({
    queryKey: ["is-platform-admin", org?.userId],
    queryFn: async () => {
      if (!org?.userId) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: org.userId, _role: "admin" as any });
      return !!data;
    },
    enabled: !!org?.userId,
  });

  // Role-based gating: only owners/admins/editors/scoring_only + platform admins may write scores.
  const SCORING_ROLES = new Set(["owner", "admin", "editor", "scoring_only"]);
  const canEditScores =
    !!isPlatformAdmin ||
    (!!org && (SCORING_ROLES.has(org.role) || (org.permissions || []).includes("scoring")));

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId, isPlatformAdmin],
    queryFn: async () => {
      let query = supabase
        .from("tournaments")
        .select("id, title, date, pairings_config, course_par, slug, site_published, scoring_format, handicap_enabled, organization_id, leaderboard_frozen_at, leaderboard_frozen_by, leaderboard_last_reset_at, organizations(name)")
        .order("date", { ascending: false });
      if (!isPlatformAdmin) {
        query = query.eq("organization_id", org!.orgId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!org,
  });

  const selectedTournamentData = tournaments?.find((t) => t.id === selectedTournament);
  const scoringFormat = getFormatById((selectedTournamentData as any)?.scoring_format || "stroke_play");
  const isTeamFormat = scoringFormat && scoringFormat.teamSize > 1;
  const isStableford = scoringFormat?.scoring === "stableford";
  const handicapEnabled = (selectedTournamentData as any)?.handicap_enabled === true;
  const coursePar = selectedTournamentData?.course_par || 72;
  const pairingsCfg = useMemo(
    () => parsePairingsConfig((selectedTournamentData as any)?.pairings_config),
    [selectedTournamentData],
  );
  const totalRounds = Math.max(1, pairingsCfg.rounds || 1);
  const { data: roundRows } = useQuery({
    queryKey: ["tournament-rounds", selectedTournament],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tournament_rounds")
        .select("round_number, status, closed_at")
        .eq("tournament_id", selectedTournament);
      if (error) throw error;
      return (data || []) as TournamentRoundRow[];
    },
    enabled: !!selectedTournament,
  });
  const closedRounds = useMemo(() => closedRoundSet(roundRows), [roundRows]);
  const roundLocked = closedRounds.has(workingRound);

  useEffect(() => {
    if (!selectedTournamentData || !roundRows || initializedTournamentRef.current === selectedTournament) return;
    initializedTournamentRef.current = selectedTournament;
    setWorkingRound(nextOpenRound(
      activeRoundNumber(pairingsCfg, (selectedTournamentData as any).date),
      closedRounds,
      totalRounds,
    ));
    setEditedScores({});
    setSelectedRowKey(null);
  }, [selectedTournament, selectedTournamentData, pairingsCfg, roundRows, closedRounds, totalRounds]);

  // Freeze state
  const frozenAt: string | null = (selectedTournamentData as any)?.leaderboard_frozen_at ?? null;
  const isFrozen = !!frozenAt && new Date(frozenAt).getTime() <= Date.now();
  const canManageFreeze =
    !!isPlatformAdmin || (!!org && (org.role === "owner" || org.role === "admin"));

  // Offline queue
  const { online, pending, enqueue, flush } = useOfflineScoreQueue(selectedTournament || null);

  // Per-cell validation errors: { [regId]: { [hole]: message } }
  const [scoreErrors, setScoreErrors] = useState<Record<string, Record<number, string>>>({});

  // Fetch course data for hole pars
  const { data: courseData } = useQuery({
    queryKey: ["leaderboard-course", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("golf_courses")
        .select("hole_pars, stroke_indexes, name, tee_name, par")
        .eq("tournament_id", selectedTournament)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTournament,
  });

  const holePars = (courseData?.hole_pars as number[] | null) ?? null;
  const getHolePar = (h: number): number => {
    if (holePars && holePars[h - 1] != null) return holePars[h - 1];
    return Math.round(coursePar / 18);
  };
  const holePar = coursePar / 18;
  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

  const { data: registrations } = useQuery({
    queryKey: ["leaderboard-players", selectedTournament, workingRound],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, handicap, group_number, playing_handicap, strokes_per_hole, payment_status, status")
        .eq("tournament_id", selectedTournament)
        .order("last_name");
      if (error) throw error;
      // Mirror Players & Pairings: only paid roster players appear on the leaderboard.
      const assignments = pairingsCfg.assignmentsByDay[String(workingRound - 1)];
      return (data || [])
        .filter((r: any) => (r.payment_status || "").toLowerCase() === "paid")
        .map((r: any) => ({ ...r, group_number: assignments?.[r.id]?.g ?? r.group_number }));
    },
    enabled: !!selectedTournament,
  });


  // Team names saved per pairing group — shown instead of "Team 1", "Team 2", ...
  const { data: teamNameRows } = useQuery({
    queryKey: ["leaderboard-team-names", selectedTournament],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("registration_groups")
        .select("group_number, team_name, group_name")
        .eq("tournament_id", selectedTournament)
        .not("group_number", "is", null);
      if (error) throw error;
      return (data || []) as Array<{ group_number: number; team_name: string | null; group_name: string | null }>;
    },
    enabled: !!selectedTournament,
  });

  const teamNamesByHole = useMemo(() => {
    const m: Record<number, string> = {};
    (teamNameRows || []).forEach((r) => {
      const nm = String(r.team_name || r.group_name || "").trim();
      if (nm) m[r.group_number] = nm;
    });
    return m;
  }, [teamNameRows]);

  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ["tournament-scores", selectedTournament, workingRound],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_scores")
        .select("registration_id, hole_number, strokes, round_number")
        .eq("tournament_id", selectedTournament)
        .eq("round_number", workingRound);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTournament,
  });

  // Realtime subscription for live score updates
  useEffect(() => {
    if (!selectedTournament) return;
    const channel = supabase
      .channel(`scores-${selectedTournament}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_scores',
          filter: `tournament_id=eq.${selectedTournament}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tournament-scores", selectedTournament] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTournament, queryClient]);

  const { data: leaderboardSponsors } = useQuery({
    queryKey: ["leaderboard-sponsors", selectedTournament],
    queryFn: async () => {
      const [{ data: sponsorRows, error }, { data: tRow }] = await Promise.all([
        supabase
          .from("tournament_sponsors")
          .select("id, name, logo_url, website_url, tier, show_on_leaderboard")
          .eq("tournament_id", selectedTournament)
          .eq("show_on_leaderboard", true)
          .order("sort_order"),
        supabase
          .from("tournaments")
          .select("leaderboard_rotating_logos, leaderboard_sponsor_interval_ms, leaderboard_sponsor_banner_enabled, leaderboard_sponsor_rotation_order")
          .eq("id", selectedTournament)
          .maybeSingle(),
      ]);
      if (error) throw error;
      const uploaded = ((tRow as any)?.leaderboard_rotating_logos || []).map((l: any, idx: number) => ({
        id: `uploaded-${idx}`,
        name: l.name || "Sponsor",
        logo_url: l.url,
        website_url: l.website_url || null,
        tier: "gold",
        show_on_leaderboard: true,
      }));
      const enabled = (tRow as any)?.leaderboard_sponsor_banner_enabled !== false;
      const interval = (tRow as any)?.leaderboard_sponsor_interval_ms || 5000;
      const randomOrder = ((tRow as any)?.leaderboard_sponsor_rotation_order || "sequential") === "random";
      return { list: enabled ? [...uploaded, ...(sponsorRows || [])] : [], interval, randomOrder };
    },
    enabled: !!selectedTournament,
  });

  useEffect(() => {
    if (!registrations || !scores) return;
    const scoreMap: Record<string, Record<number, number>> = {};
    scores.forEach((s) => {
      if (!scoreMap[s.registration_id]) scoreMap[s.registration_id] = {};
      scoreMap[s.registration_id][s.hole_number] = s.strokes;
    });

    const ps: PlayerScore[] = registrations.map((r) => ({
      registration_id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      handicap: r.handicap,
      group_number: r.group_number,
      scores: scoreMap[r.id] || {},
      total: Object.values(scoreMap[r.id] || {}).reduce((sum, s) => sum + s, 0),
      playing_handicap: r.playing_handicap ?? null,
      strokes_per_hole: (r.strokes_per_hole as number[] | null) ?? null,
      status: (r as any).status ?? "active",
    }));

    // Sort: for stableford highest first, else lowest first
    ps.sort((a, b) => {
      if (a.total === 0 && b.total === 0) return 0;
      if (a.total === 0) return 1;
      if (b.total === 0) return -1;
      return a.total - b.total;
    });

    setPlayerScores(ps);
  }, [registrations, scores]);

  // Withdrawn players never count toward scoring, team totals, skins or payouts.
  const activePlayerScores = useMemo(
    () => playerScores.filter((ps) => !isWithdrawn(ps.status)),
    [playerScores],
  );
  const withdrawnPlayerScores = useMemo(
    () => playerScores.filter((ps) => isWithdrawn(ps.status)),
    [playerScores],
  );

  // Team leaderboard grouping
  const teamScores = useMemo<TeamScore[]>(() => {
    if (!isTeamFormat || !scoringFormat) return [];
    const groups: Record<number, PlayerScore[]> = {};
    activePlayerScores.forEach((ps) => {
      if (ps.group_number != null) {
        if (!groups[ps.group_number]) groups[ps.group_number] = [];
        groups[ps.group_number].push(ps);
      }
    });

    const build = (players: PlayerScore[]) => {
      const holeScores: Record<number, number> = {};
      let total = 0;
      holes.forEach((h) => {
        const val = computeTeamHoleScore(players, h, scoringFormat, editedScores);
        if (val != null) {
          holeScores[h] = val;
          total += val;
        }
      });
      return { holeScores, total };
    };

    const assigned: TeamScore[] = Object.entries(groups).map(([gn, players]) => ({
      key: `g-${gn}`,
      label: teamNamesByHole[parseInt(gn)] || `Team ${gn}`,
      groupNumber: parseInt(gn),
      players,
      ...build(players),
    }));

    // Players without a pairing assignment still need to appear — show each as
    // their own single-player "team" so nobody is missing from the leaderboard.
    const unassigned: TeamScore[] = activePlayerScores
      .filter((ps) => ps.group_number == null)
      .map((ps) => ({
        key: `u-${ps.registration_id}`,
        label: `${ps.first_name} ${ps.last_name}`,
        isUnassigned: true,
        groupNumber: null,
        players: [ps],
        ...build([ps]),
      }));

    return [...assigned, ...unassigned].sort((a, b) => {
      if (a.total === 0 && b.total === 0) return 0;
      if (a.total === 0) return 1;
      if (b.total === 0) return -1;
      return a.total - b.total;
    });
  }, [activePlayerScores, isTeamFormat, scoringFormat, editedScores, teamNamesByHole]);


  // Stableford leaderboard
  const stablefordScores = useMemo(() => {
    if (!isStableford) return [];
    return activePlayerScores
      .map((ps) => {
        let points = 0;
        holes.forEach((h) => {
          const strokes = editedScores[ps.registration_id]?.[h] ?? ps.scores[h];
          if (strokes != null) {
            points += stablefordPoints(strokes, Math.round(holePar));
          }
        });
        return { ...ps, points };
      })
      .sort((a, b) => {
        if (a.points === 0 && b.points === 0) return 0;
        if (a.points === 0) return 1;
        if (b.points === 0) return -1;
        return b.points - a.points; // Highest first
      });
  }, [activePlayerScores, isStableford, editedScores, holePar]);

  const saveMutation = useMutation({
    mutationFn: async (scoreSnapshot: Record<string, Record<number, number>>) => {
      if (!canEditScores) {
        throw new Error("You don't have permission to submit scores. Ask your tournament owner to grant a scoring role.");
      }
      if (isFrozen) {
        throw new Error("This leaderboard is frozen. Unfreeze it in the Freeze Leaderboard card to edit scores.");
      }
      if (roundLocked) {
        throw new Error(`${roundLabel(workingRound - 1)} is closed. Reopen it before changing scores.`);
      }

      // ---- Validation ----
      const errs: Record<string, Record<number, string>> = {};
      const upserts: { tournament_id: string; registration_id: string; hole_number: number; round_number: number; strokes: number }[] = [];
      Object.entries(scoreSnapshot).forEach(([regId, holes]) => {
        Object.entries(holes).forEach(([hole, strokes]) => {
          const holeNum = parseInt(hole);
          const err = validateStrokes(strokes);
          if (err) {
            if (!errs[regId]) errs[regId] = {};
            errs[regId][holeNum] = err;
          } else {
            upserts.push({
              tournament_id: selectedTournament,
              registration_id: regId,
              hole_number: holeNum,
              round_number: workingRound,
              strokes,
            });
          }
        });
      });
      setScoreErrors(errs);
      if (Object.keys(errs).length > 0) {
        const count = Object.values(errs).reduce((sum, holes) => sum + Object.keys(holes).length, 0);
        throw new Error(
          `${count} invalid score${count === 1 ? "" : "s"}. Strokes must be a whole number between ${MIN_STROKES} and ${MAX_STROKES}.`
        );
      }
      if (upserts.length === 0) return { mode: "noop" as const };

      // ---- Offline fallback: queue instead of network call ----
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueue(upserts.map(({ tournament_id, registration_id, hole_number, round_number, strokes }) => ({
          tournament_id, registration_id, hole_number, round_number, strokes,
        })));
        return { mode: "queued" as const, count: upserts.length };
      }

      const { data: { user } } = await supabase.auth.getUser();
      const prevMap: Record<string, Record<number, number>> = {};
      (scores || []).forEach((s: any) => {
        if (!prevMap[s.registration_id]) prevMap[s.registration_id] = {};
        prevMap[s.registration_id][s.hole_number] = s.strokes;
      });
      const editLogs: any[] = [];
      upserts.forEach((u) => {
        const oldScore = prevMap[u.registration_id]?.[u.hole_number] ?? null;
        if (oldScore !== u.strokes && user) {
          editLogs.push({
            tournament_id: selectedTournament,
            registration_id: u.registration_id,
            hole_number: u.hole_number,
            round_number: workingRound,
            old_score: oldScore,
            new_score: u.strokes,
            edited_by: user.id,
            editor_type: isPlatformAdmin ? "admin" : "organizer",
          });
        }
      });

      try {
        const { data: persistedRows, error } = await supabase
          .from("tournament_scores")
          .upsert(upserts, {
            onConflict: "registration_id,round_number,hole_number",
          })
          .select("registration_id, hole_number, strokes, round_number");
        if (error) throw error;
        const persisted = persistedRows || [];
        const persistedKeys = new Set(
          persisted.map((row) => `${row.registration_id}:${row.round_number}:${row.hole_number}:${row.strokes}`),
        );
        const missing = upserts.filter(
          (row) => !persistedKeys.has(`${row.registration_id}:${row.round_number}:${row.hole_number}:${row.strokes}`),
        );
        if (missing.length > 0) {
          throw new Error(
            `${missing.length} score${missing.length === 1 ? " was" : "s were"} not confirmed by the database. Your entries remain on screen; please save again.`,
          );
        }
        if (editLogs.length > 0) {
          await (supabase as any).from("score_edits").insert(editLogs);
        }
        return { mode: "saved" as const, count: persisted.length, persisted, roundNumber: workingRound };
      } catch (e: any) {
        // Network / fetch failures — queue for later sync so the scorekeeper doesn't lose work.
        const msg = String(e?.message || e || "");
        const looksNetwork = /network|fetch|failed to fetch|load failed/i.test(msg);
        if (looksNetwork) {
          enqueue(upserts.map(({ tournament_id, registration_id, hole_number, round_number, strokes }) => ({
            tournament_id, registration_id, hole_number, round_number, strokes,
          })));
          return { mode: "queued" as const, count: upserts.length };
        }
        throw e;
      }
    },
    onSuccess: (result, scoreSnapshot) => {
      if (!result) return;
      if (result.mode === "queued") {
        toast({
          title: `Saved ${result.count} score${result.count === 1 ? "" : "s"} offline`,
          description: "We'll sync automatically when you're back online.",
        });
      } else if (result.mode === "saved") {
        toast({ title: "Scores saved!" });
        // Put the confirmed rows into the active-round cache immediately. This
        // prevents a concurrent realtime refresh from briefly restoring stale
        // values after the organizer saves a large scorecard batch.
        queryClient.setQueryData(
          ["tournament-scores", selectedTournament, result.roundNumber],
          (current: Array<{ registration_id: string; hole_number: number; strokes: number; round_number: number }> | undefined) => {
            const byCell = new Map<string, { registration_id: string; hole_number: number; strokes: number; round_number: number }>();
            (current || []).forEach((row) => byCell.set(`${row.registration_id}:${row.hole_number}`, row));
            result.persisted.forEach((row) => byCell.set(`${row.registration_id}:${row.hole_number}`, row));
            return Array.from(byCell.values());
          },
        );
      }
      // Only clear values included in this request. A scorekeeper can keep
      // entering scores while a save is in flight; those newer edits must not
      // be erased when the earlier request completes.
      setEditedScores((current) => {
        const next: Record<string, Record<number, number>> = {};
        Object.entries(current).forEach(([regId, holes]) => {
          Object.entries(holes).forEach(([hole, value]) => {
            const holeNumber = Number(hole);
            if (scoreSnapshot[regId]?.[holeNumber] !== value) {
              if (!next[regId]) next[regId] = {};
              next[regId][holeNumber] = value;
            }
          });
        });
        return next;
      });
      setScoreErrors({});
      queryClient.invalidateQueries({ queryKey: ["tournament-scores", selectedTournament] });
    },
    onError: (e: Error) => {
      toast({ title: "Can't save scores", description: e.message, variant: "destructive" });
    },
  });

  const setScore = (regId: string, hole: number, num: number) => {
    setEditedScores((prev) => ({
      ...prev,
      [regId]: { ...(prev[regId] || {}), [hole]: num },
    }));
    // Live-clear any prior error for this cell.
    setScoreErrors((prev) => {
      if (!prev[regId]?.[hole]) return prev;
      const next = { ...prev, [regId]: { ...prev[regId] } };
      delete next[regId][hole];
      if (Object.keys(next[regId]).length === 0) delete next[regId];
      return next;
    });
  };

  const clearScore = (regId: string, hole: number) => {
    setEditedScores((prev) => {
      const next = { ...prev };
      const holes = { ...(next[regId] || {}) };
      delete holes[hole];
      if (Object.keys(holes).length === 0) delete next[regId];
      else next[regId] = holes;
      return next;
    });
    setScoreErrors((prev) => {
      if (!prev[regId]?.[hole]) return prev;
      const next = { ...prev, [regId]: { ...prev[regId] } };
      delete next[regId][hole];
      if (Object.keys(next[regId]).length === 0) delete next[regId];
      return next;
    });
  };

  const updateScore = (regId: string, hole: number, value: string) => {
    const parsed = parseScoreInput(value);
    if (parsed.kind === "clear") clearScore(regId, hole);
    else if (parsed.kind === "value") setScore(regId, hole, parsed.value);
    else if (parsed.kind === "invalid") {
      // Show inline error immediately; don't commit the bad value.
      setScoreErrors((prev) => ({
        ...prev,
        [regId]: { ...(prev[regId] || {}), [hole]: `1–${MAX_STROKES} only` },
      }));
    }
  };

  const getScore = (ps: PlayerScore, hole: number) => {
    return editedScores[ps.registration_id]?.[hole] ?? ps.scores[hole] ?? "";
  };
  const getScoreError = (regId: string, hole: number): string | undefined =>
    scoreErrors[regId]?.[hole];

  /** Team formats share one score per hole — apply the edit to every player on the team. */
  const updateTeamScore = (players: PlayerScore[], hole: number, raw: string) => {
    players.forEach((p) => updateScore(p.registration_id, hole, raw));
  };
  const setTeamScoreValue = (players: PlayerScore[], hole: number, n: number) => {
    players.forEach((p) => setScore(p.registration_id, hole, n));
  };

  const hasEdits = Object.keys(editedScores).length > 0;

  const hasErrors = Object.keys(scoreErrors).length > 0;

  // ---- Filter by player or team name (a player match shows the whole team) ----
  const searchTerm = scoreSearch.trim().toLowerCase();
  const matchesPlayer = (ps: PlayerScore) =>
    `${ps.first_name} ${ps.last_name}`.toLowerCase().includes(searchTerm);

  const visibleTeamScores = useMemo(() => {
    if (!searchTerm) return teamScores;
    return teamScores.filter(
      (t) => t.label.toLowerCase().includes(searchTerm) || t.players.some(matchesPlayer)
    );
  }, [teamScores, searchTerm]);

  const visiblePlayerScores = useMemo(() => {
    if (!searchTerm) return activePlayerScores;
    return activePlayerScores.filter(matchesPlayer);
  }, [activePlayerScores, searchTerm]);

  const visibleStablefordScores = useMemo(() => {
    if (!searchTerm) return stablefordScores;
    return stablefordScores.filter(matchesPlayer);
  }, [stablefordScores, searchTerm]);

  // ---- Progress: which hole entries are still missing a score? ----
  // Uses the shared, unit-tested helper so the yellow highlight and this
  // summary always agree, and both react instantly to unsaved edits.
  const progress = useMemo(() => {
    const rows: ProgressRow[] = isTeamFormat
      ? teamScores.map((t) => ({
          label: t.label,
          registrationId: t.players[0]?.registration_id ?? t.key,
          saved: t.holeScores,
        }))
      : activePlayerScores.map((ps) => ({
          label: `${ps.first_name} ${ps.last_name}`,
          registrationId: ps.registration_id,
          saved: ps.scores,
        }));
    return computeScoreProgress(rows, holes, editedScores);
  }, [isTeamFormat, teamScores, activePlayerScores, holes, editedScores]);

  const allScoresEntered = progress.complete;


  // Notify the organizer once, the moment the last missing score is filled in.
  const completeNotifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedTournament) return;
    if (allScoresEntered) {
      if (completeNotifiedRef.current !== selectedTournament) {
        completeNotifiedRef.current = selectedTournament;
        toast({
          title: "All scores entered",
          description: "Every group has a score on every hole. The final leaderboard is ready to share.",
        });
      }
    } else if (completeNotifiedRef.current === selectedTournament) {
      // Scoring re-opened (a score was cleared) — allow the notice to fire again.
      completeNotifiedRef.current = null;
    }
  }, [allScoresEntered, selectedTournament]);

  /**
   * Save pending edits (when the user may edit), then advance the inline editor
   * to the next hole. For view-only roles or a frozen leaderboard this only
   * changes the selected hole — it never writes scores.
   */
  const saveAndNext = async () => {
    const mayWrite = canEditScores && !isFrozen && !roundLocked;
    try {
      if (mayWrite && hasEdits) await saveMutation.mutateAsync(editedScores);
      setEditHole((h) => Math.min(holes.length, h + 1));
    } catch {
      /* mutation surfaces its own toast */
    }
  };





  if (orgLoading) return <div className="p-6">Loading...</div>;

  const renderStablefordCell = (strokes: number | "", hole: number) => {
    if (strokes === "" || typeof strokes !== "number") return null;
    const pts = stablefordPoints(strokes, Math.round(holePar));
    return (
      <span className={`text-[10px] block mt-0.5 font-semibold ${pts >= 3 ? "text-primary" : pts === 0 ? "text-destructive" : "text-muted-foreground"}`}>
        {pts}pt
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
            Live Leaderboard & Scoring
            {isFrozen && (
              <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> Frozen</Badge>
            )}
            {!online && (
              <Badge variant="outline" className="gap-1 border-amber-500 text-amber-700 dark:text-amber-300">
                <WifiOff className="h-3 w-3" /> Offline
              </Badge>
            )}
            {pending.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <CloudUpload className="h-3 w-3" /> {pending.length} queued
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Enter scores and track the leaderboard in real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && online && (
            <Button variant="outline" size="sm" onClick={() => flush()}>
              <CloudUpload className="h-4 w-4 mr-1" /> Sync {pending.length}
            </Button>
          )}
          {hasEdits && canEditScores && (
            <Button
              onClick={() => saveMutation.mutate(editedScores)}
              disabled={saveMutation.isPending || isFrozen || roundLocked}
              title={roundLocked ? `${roundLabel(workingRound - 1)} is closed` : isFrozen ? "Leaderboard is frozen" : undefined}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : isFrozen ? "Frozen" : "Save Scores"}
            </Button>
          )}
        </div>
      </div>

      {selectedTournament && !canEditScores && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 px-4 py-3 text-sm">
          <strong>View-only:</strong> Your role ({org?.role || "viewer"}) can view the leaderboard but cannot submit or edit scores.
          Ask an organization owner or admin to grant you a scoring role (Owner, Admin, Editor, or Scoring Only).
        </div>
      )}

      {selectedTournament && isFrozen && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-start gap-2">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>Leaderboard frozen.</strong> Score entry is locked as of {new Date(frozenAt!).toLocaleString()}. Unfreeze below to resume edits.
          </div>
        </div>
      )}

      {selectedTournament && roundLocked && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm flex items-start gap-2">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          <div><strong>{roundLabel(workingRound - 1)} is closed.</strong> Scores are visible for review but cannot be changed unless the round is reopened.</div>
        </div>
      )}

      {selectedTournament && !online && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 px-4 py-3 text-sm flex items-start gap-2">
          <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>You're offline.</strong> Score submissions will be queued on this device and synced automatically when the connection returns.
          </div>
        </div>
      )}

      {selectedTournament && hasErrors && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>Fix invalid scores before saving.</strong> Strokes must be a whole number between {MIN_STROKES} and {MAX_STROKES}.
          </div>
        </div>
      )}


      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a tournament" />
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {isPlatformAdmin && (
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Platform Admin — All Tournaments
              </div>
            )}
            {tournaments?.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
                {isPlatformAdmin && t.organizations?.name && (
                  <span className="text-xs text-muted-foreground ml-2">· {t.organizations.name}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>

        </Select>

        {selectedTournament && totalRounds > 1 && (
          <Select
            value={String(workingRound)}
            onValueChange={(value) => {
              setWorkingRound(Number(value));
              setEditedScores({});
              setSelectedRowKey(null);
            }}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Working round" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalRounds }, (_, index) => index + 1).map((round) => (
                <SelectItem key={round} value={String(round)}>
                  {roundLabel(round - 1)}{closedRounds.has(round) ? " — Closed" : " — Open"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {selectedTournamentData?.slug && selectedTournamentData?.site_published && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = `${window.location.origin}/t/${selectedTournamentData.slug}/scoring`;
                navigator.clipboard.writeText(url);
                toast({ title: "Link copied!", description: "Share this with your players so they can enter scores." });
              }}
            >
              <Copy className="h-4 w-4 mr-1.5" /> Copy Scoring Link
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={`/live/${selectedTournamentData.slug}?preview=1`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" /> Preview
              </a>
            </Button>
          </>
        )}

        {/* Gross/Net toggle */}
        {selectedTournament && handicapEnabled && !isTeamFormat && !isStableford && (
          <Tabs value={scoreView} onValueChange={(v) => setScoreView(v as "gross" | "net")} className="w-auto">
            <TabsList>
              <TabsTrigger value="gross">Gross</TabsTrigger>
              <TabsTrigger value="net">Net</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {selectedTournament && leaderboardSponsors && leaderboardSponsors.list.length > 0 && (
        <SponsorBanner sponsors={leaderboardSponsors.list} intervalMs={leaderboardSponsors.interval} preserveOrder randomOrder={leaderboardSponsors.randomOrder} />
      )}

      {/* ===== SEARCH + PROGRESS ===== */}
      {showEntry && selectedTournament && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search player or team name…"
                value={scoreSearch}
                onChange={(e) => setScoreSearch(e.target.value)}
                aria-label="Filter scoring by player or team name"
              />
            </div>
            {scoreSearch && (
              <Button variant="ghost" size="sm" onClick={() => setScoreSearch("")}>Clear filter</Button>
            )}
            {selectedTournamentData?.slug && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/live/${selectedTournamentData.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1.5" /> View Live Leaderboard
                  </a>
                </Button>
                {allScoresEntered ? (
                  <Button size="sm" asChild style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}>
                    <a href={`/live/${selectedTournamentData.slug}`} target="_blank" rel="noopener noreferrer">
                      <Trophy className="h-4 w-4 mr-1.5" /> View Final Leaderboard
                    </a>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled
                    title={
                      progress.total === 0
                        ? "Add players and pairings to start scoring."
                        : `${progress.missing.length} hole ${progress.missing.length === 1 ? "entry" : "entries"} still need scores.`
                    }
                  >
                    <Trophy className="h-4 w-4 mr-1.5" /> View Final Leaderboard
                  </Button>
                )}
              </>
            )}

          </div>

          {progress.total > 0 && progress.missing.length > 0 && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Scores Remaining: {progress.missing.length} of {progress.total} hole entries need scores.
              </div>
              <ul className="mt-1.5 space-y-0.5 text-xs">
                {progress.missing.slice(0, 8).map((m) => (
                  <li key={`${m.label}-${m.hole}`}>• {m.label} — Hole {m.hole}</li>
                ))}
                {progress.missing.length > 8 && <li>• +{progress.missing.length - 8} more…</li>}
              </ul>
            </div>
          )}

          {progress.total > 0 && progress.missing.length === 0 && (
            <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <CheckCircle2 className="h-4 w-4" /> All Scores Entered!
              </div>
              <p className="text-muted-foreground mt-1">All teams have completed scoring for all holes.</p>
              {selectedTournamentData?.slug && (
                <Button size="sm" className="mt-2" asChild>
                  <a href={`/live/${selectedTournamentData.slug}`} target="_blank" rel="noopener noreferrer">
                    View Final Leaderboard
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== TEAM LEADERBOARD ===== */}
      {showEntry && selectedTournament && isTeamFormat && teamScores.length > 0 && (

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Users className="h-5 w-5" /> Team Leaderboard
              <Badge variant="secondary" className="text-xs font-normal">{scoringFormat?.name}</Badge>
              <span className="text-sm font-normal text-muted-foreground ml-2">Par {coursePar}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto scoring-table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center sticky-col left-0">#</TableHead>
                    <TableHead className="min-w-[180px] sticky-col left-10">Team</TableHead>
                    {holes.map((h) => (
                      <TableHead key={h} className="text-center w-10 min-w-[40px] text-xs">{h}</TableHead>
                    ))}
                    <TableHead className="text-center font-bold min-w-[60px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTeamScores.map((team, i) => {
                    const isSelected = selectedRowKey === team.key;
                    return (
                    <Fragment key={team.key}>
                    <TableRow
                      className={isSelected ? "bg-secondary/10 outline outline-2 outline-secondary" : undefined}
                    >
                      <TableCell className="text-center font-bold text-muted-foreground sticky-col left-0">{i + 1}</TableCell>
                      <TableCell className="font-medium sticky-col left-10">

                        <button
                          type="button"
                          className="font-semibold flex items-center gap-2 text-left hover:underline"
                          onClick={() => setSelectedRowKey(isSelected ? null : team.key)}
                        >
                          {team.label}
                          {team.isUnassigned && (
                            <Badge variant="outline" className="text-[10px] font-normal">No pairing</Badge>
                          )}
                        </button>
                        <div className="text-xs text-muted-foreground">
                          {team.players.map((p) => `${p.first_name} ${p.last_name[0]}.`).join(", ")}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {team.players.map((p) => (
                            <span key={p.registration_id} className="inline-flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">{p.first_name}</span>
                              <ScoreEntryWd
                                registrationId={p.registration_id}
                                playerName={`${p.first_name} ${p.last_name}`}
                                status={p.status}
                                disabled={!canEditScores}
                                onChanged={() => queryClient.invalidateQueries({ queryKey: ["leaderboard-players", selectedTournament, workingRound] })}
                              />
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      {holes.map((h) => {
                        const val = team.holeScores[h];
                        const missing = val == null;
                        if (canEditScores && !isFrozen && !roundLocked) {
                          return (
                            <TableCell key={h} className={`p-1 text-center ${missing ? "incomplete-score" : "complete-score"}`}>
                              <ScoreInput
                                value={typeof val === "number" ? val : ""}
                                par={getHolePar(h)}
                                ariaLabel={`${team.label} hole ${h}`}
                                onChange={(raw) => updateTeamScore(team.players, h, raw)}
                                onSet={(n) => setTeamScoreValue(team.players, h, n)}
                              />
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={h} className={`text-center text-sm p-1 ${missing ? "incomplete-score" : ""}`}>
                            {val != null ? (
                              <span className={
                                val < Math.round(holePar) ? "text-primary font-bold" :
                                val > Math.round(holePar) ? "text-destructive" : ""
                              }>
                                {val}
                              </span>
                            ) : "—"}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold text-lg">
                        {team.total > 0 ? team.total : "—"}
                      </TableCell>
                    </TableRow>
                    {isSelected && (
                      <TableRow key={`${team.key}-edit`} className="bg-secondary/10">
                        <TableCell colSpan={holes.length + 3} className="p-3">
                          <InlineHoleEditor
                            label={team.label}
                            hole={editHole}
                            par={getHolePar(editHole)}
                            value={Number(
                              editedScores[team.players[0].registration_id]?.[editHole] ??
                              team.holeScores[editHole] ?? 0
                            )}
                            maxHole={holes.length}
                            disabled={!canEditScores || isFrozen || roundLocked}
                            saving={saveMutation.isPending}
                            onHole={setEditHole}
                            onValue={(n) => setTeamScoreValue(team.players, editHole, n)}
                            onSaveNext={saveAndNext}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                    </Fragment>
                    );
                  })}


                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== STABLEFORD LEADERBOARD ===== */}
      {showEntry && selectedTournament && isStableford && stablefordScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Trophy className="h-5 w-5" /> Stableford Leaderboard
              <Badge variant="secondary" className="text-xs font-normal">Stableford</Badge>
              <span className="text-sm font-normal text-muted-foreground ml-2">Par {coursePar}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3 flex gap-4">
              <span>Eagle+ = 4pt</span>
              <span>Birdie = 3pt</span>
              <span className="font-semibold">Par = 2pt</span>
              <span>Bogey = 1pt</span>
              <span>Double+ = 0pt</span>
            </div>
            <div className="overflow-x-auto scoring-table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center sticky-col left-0">#</TableHead>
                    <TableHead className="sticky-col left-10 min-w-[150px]">Player</TableHead>
                    {holes.map((h) => (
                      <TableHead key={h} className="text-center w-12 min-w-[48px] text-xs">{h}</TableHead>
                    ))}
                    <TableHead className="text-center font-bold min-w-[60px]">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleStablefordScores.map((ps, i) => (
                    <TableRow key={ps.registration_id}>
                      <TableCell className="text-center font-bold text-muted-foreground sticky-col left-0">{i + 1}</TableCell>
                      <TableCell className="sticky-col left-10 font-medium">

                        {ps.first_name} {ps.last_name}
                        {ps.handicap !== null && (
                          <span className="text-xs text-muted-foreground ml-1">({ps.handicap})</span>
                        )}
                      </TableCell>
                      {holes.map((h) => {
                        const val = getScore(ps, h);
                        const hp = getHolePar(h);
                        const err = getScoreError(ps.registration_id, h);
                        return (
                          <TableCell key={h} className="p-1 text-center">
                            <ScoreInput
                              value={typeof val === "number" ? val : ""}
                              par={hp}
                              ariaLabel={`${ps.first_name} ${ps.last_name} hole ${h}`}
                              onChange={(raw) => updateScore(ps.registration_id, h, raw)}
                              onSet={(n) => setScore(ps.registration_id, h, n)}
                              className={err ? "border-destructive ring-1 ring-destructive" : undefined}
                            />
                            {err ? (
                              <span className="text-[10px] block mt-0.5 font-semibold text-destructive">{err}</span>
                            ) : (
                              renderStablefordCell(val, h)
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold text-lg text-primary">
                        {ps.points > 0 ? ps.points : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== INDIVIDUAL SCORECARD (stroke play only — team formats score from the team leaderboard) ===== */}
      {showEntry && selectedTournament && !isTeamFormat && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Trophy className="h-5 w-5" /> {isTeamFormat ? "Individual Score Entry" : "Scorecard"}
              {selectedTournamentData && !isTeamFormat && !isStableford && (
                <>
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    Par {coursePar}
                  </span>
                  {scoringFormat && (
                    <Badge variant="secondary" className="text-xs font-normal">{scoringFormat.name}</Badge>
                  )}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoresLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : playerScores.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No registered players yet.</p>
            ) : (
              <div className="overflow-x-auto scoring-table-wrap">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky-col left-0 min-w-[150px]">Player</TableHead>
                      {isTeamFormat && <TableHead className="text-center w-14">Grp</TableHead>}
                      {holes.map((h) => (
                        <TableHead key={h} className="text-center w-12 min-w-[48px]">{h}</TableHead>
                      ))}
                      <TableHead className="text-center font-bold min-w-[60px]">Gross</TableHead>
                      {handicapEnabled && <TableHead className="text-center font-bold min-w-[60px]">Net</TableHead>}
                    </TableRow>
                    {/* Par row */}
                    {holePars && (
                      <TableRow className="bg-muted/30 par-row">
                        <TableHead className="sticky-col left-0 text-xs text-muted-foreground font-semibold">Par</TableHead>

                        {isTeamFormat && <TableHead />}
                        {holes.map((h) => (
                          <TableHead key={h} className="text-center text-xs text-muted-foreground">{getHolePar(h)}</TableHead>
                        ))}
                        <TableHead className="text-center text-xs font-semibold text-muted-foreground">{coursePar}</TableHead>
                        {handicapEnabled && <TableHead />}
                      </TableRow>
                    )}
                  </TableHeader>
                  <TableBody>
                    {visiblePlayerScores.map((ps) => {
                      const grossTotal = holes.reduce((sum, h) => {
                        const val = getScore(ps, h);
                        return sum + (typeof val === "number" ? val : 0);
                      }, 0);
                      const netTotal = handicapEnabled && ps.strokes_per_hole
                        ? holes.reduce((sum, h) => {
                            const val = getScore(ps, h);
                            if (typeof val !== "number") return sum;
                            return sum + val - (ps.strokes_per_hole?.[h - 1] || 0);
                          }, 0)
                        : grossTotal;
                      const rowKey = `p-${ps.registration_id}`;
                      const isSelected = selectedRowKey === rowKey;
                      return (
                        <Fragment key={ps.registration_id}>
                        <TableRow
                          className={isSelected ? "bg-secondary/10 outline outline-2 outline-secondary" : undefined}
                        >
                          <TableCell className="sticky-col left-0 font-medium">
                            <button
                              type="button"
                              className="text-left hover:underline"
                              onClick={() => setSelectedRowKey(isSelected ? null : rowKey)}
                            >
                              {ps.first_name} {ps.last_name}
                            </button>
                            {handicapEnabled && ps.playing_handicap != null ? (
                              <span className="text-xs text-muted-foreground ml-1">({ps.playing_handicap})</span>
                            ) : ps.handicap !== null ? (
                              <span className="text-xs text-muted-foreground ml-1">({ps.handicap})</span>
                            ) : null}
                            <div className="mt-1">
                              <ScoreEntryWd
                                registrationId={ps.registration_id}
                                playerName={`${ps.first_name} ${ps.last_name}`}
                                status={ps.status}
                                disabled={!canEditScores}
                                onChanged={() => queryClient.invalidateQueries({ queryKey: ["leaderboard-players", selectedTournament, workingRound] })}
                              />
                            </div>
                          </TableCell>
                          {isTeamFormat && (
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {ps.group_number ?? "—"}
                            </TableCell>
                          )}
                          {holes.map((h) => {
                            const val = getScore(ps, h);
                            const hp = getHolePar(h);
                            const err = getScoreError(ps.registration_id, h);
                            const scoreColorClass = typeof val === "number"
                              ? val < hp ? "text-primary font-bold" : val > hp ? "text-destructive" : ""
                              : "";
                            const missing = typeof val !== "number";
                            return (
                              <TableCell key={h} className={`p-1 text-center ${missing ? "incomplete-score" : "complete-score"}`}>
                                <ScoreInput
                                  value={typeof val === "number" ? val : ""}
                                  par={hp}
                                  ariaLabel={`${ps.first_name} ${ps.last_name} hole ${h}`}
                                  onChange={(raw) => updateScore(ps.registration_id, h, raw)}
                                  onSet={(n) => setScore(ps.registration_id, h, n)}
                                  className={`${scoreColorClass} ${err ? "border-destructive ring-1 ring-destructive" : ""}`}
                                />
                                {err && (
                                  <span className="text-[10px] block mt-0.5 font-semibold text-destructive">{err}</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-bold text-lg">
                            {grossTotal > 0 ? grossTotal : "—"}
                          </TableCell>
                          {handicapEnabled && (
                            <TableCell className="text-center font-bold text-lg text-primary">
                              {grossTotal > 0 ? netTotal : "—"}
                            </TableCell>
                          )}
                        </TableRow>
                        {isSelected && (
                          <TableRow key={`${ps.registration_id}-edit`} className="bg-secondary/10">
                            <TableCell colSpan={holes.length + (isTeamFormat ? 3 : 2) + (handicapEnabled ? 1 : 0)} className="p-3">
                              <InlineHoleEditor
                                label={`${ps.first_name} ${ps.last_name}`}
                                hole={editHole}
                                par={getHolePar(editHole)}
                                value={Number(editedScores[ps.registration_id]?.[editHole] ?? ps.scores[editHole] ?? 0)}
                                maxHole={holes.length}
                                disabled={!canEditScores || isFrozen || roundLocked}
                                saving={saveMutation.isPending}
                                onHole={setEditHole}
                                onValue={(n) => setScore(ps.registration_id, editHole, n)}
                                onSaveNext={saveAndNext}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                        </Fragment>
                      );
                    })}

                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showSettings && selectedTournament && (
        <LeaderboardFreezeCard
          tournamentId={selectedTournament}
          frozenAt={frozenAt}
          canManage={canManageFreeze}
          onChange={() => queryClient.invalidateQueries({ queryKey: ["tournaments", org?.orgId, isPlatformAdmin] })}
        />
      )}

      {showSettings && selectedTournament && (
        <LeaderboardHeaderCard
          tournamentId={selectedTournament}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["tournaments", org?.orgId, isPlatformAdmin] })}
        />
      )}

      {showSettings && selectedTournament && (
        <LiveDisplayShareCard
          tournamentId={selectedTournament}
          tournamentSlug={selectedTournamentData?.slug || null}
        />
      )}

      {showSettings && selectedTournament && (
        <LeaderboardDesignCard
          tournamentId={selectedTournament}
          tournamentSlug={selectedTournamentData?.slug || null}
          orgId={org?.orgId}
        />
      )}

      {showSettings && selectedTournament && (
        <TickerSponsorsCard tournamentId={selectedTournament} />
      )}

      {showSettings && selectedTournament && org && (
        <LeaderboardSponsorCard tournamentId={selectedTournament} orgId={org.orgId} />
      )}


      {showSettings && selectedTournament && org && (
        <LeaderboardGallery tournamentId={selectedTournament} orgId={org.orgId} />
      )}

      {showEntry && selectedTournament && withdrawnPlayerScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Withdrawn (WD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              These players are excluded from scoring, team totals, skins and payouts.
            </p>
            {withdrawnPlayerScores.map((ps) => (
              <div key={ps.registration_id} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{ps.first_name} {ps.last_name}</span>
                <Badge variant="secondary" className="text-[10px] uppercase">WD</Badge>
                <ScoreEntryWd
                  registrationId={ps.registration_id}
                  playerName={`${ps.first_name} ${ps.last_name}`}
                  status={ps.status}
                  disabled={!canEditScores}
                  onChanged={() => queryClient.invalidateQueries({ queryKey: ["leaderboard-players", selectedTournament, workingRound] })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Edit history lives at the very bottom of the page */}
      {showEntry && selectedTournament && (
        <RoundClosureCard tournamentId={selectedTournament} />
      )}

      {showEntry && selectedTournament && (
        <ScoreEditHistory tournamentId={selectedTournament} />
      )}

      {showSettings && selectedTournament && (
        <LeaderboardResetCard
          tournamentId={selectedTournament}
          canManage={canManageFreeze}
          lastResetAt={(selectedTournamentData as any)?.leaderboard_last_reset_at ?? null}
          onChange={() => {
            queryClient.invalidateQueries({ queryKey: ["tournaments", org?.orgId, isPlatformAdmin] });
            queryClient.invalidateQueries({ queryKey: ["tournament-scores", selectedTournament] });
          }}
        />
      )}

      {showEntry && selectedTournament && hasEdits && canEditScores && (
        <div className="sticky bottom-3 z-30 flex justify-end pointer-events-none">
          <Button
            className="pointer-events-auto shadow-lg"
            onClick={() => saveMutation.mutate(editedScores)}
            disabled={saveMutation.isPending || isFrozen || roundLocked || hasErrors}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save Scores"}
          </Button>
        </div>
      )}
    </div>
  );
}
