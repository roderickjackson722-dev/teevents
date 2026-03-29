import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Loader2, Save, Copy, ExternalLink, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SponsorBanner } from "@/components/SponsorBanner";
import { getFormatById, stablefordPoints, type ScoringFormat } from "@/lib/scoringFormats";
import { Badge } from "@/components/ui/badge";

interface PlayerScore {
  registration_id: string;
  first_name: string;
  last_name: string;
  handicap: number | null;
  group_number: number | null;
  scores: Record<number, number>;
  total: number;
}

interface TeamScore {
  groupNumber: number;
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

export default function Leaderboard() {
  const { org, loading: orgLoading } = useOrgContext();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState("");
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [editedScores, setEditedScores] = useState<Record<string, Record<number, number>>>({});

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, course_par, slug, site_published, scoring_format")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!org,
  });

  const selectedTournamentData = tournaments?.find((t) => t.id === selectedTournament);
  const scoringFormat = getFormatById((selectedTournamentData as any)?.scoring_format || "stroke_play");
  const isTeamFormat = scoringFormat && scoringFormat.teamSize > 1;
  const isStableford = scoringFormat?.scoring === "stableford";
  const coursePar = selectedTournamentData?.course_par || 72;
  const holePar = coursePar / 18;

  const { data: registrations } = useQuery({
    queryKey: ["leaderboard-players", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, handicap, group_number")
        .eq("tournament_id", selectedTournament)
        .order("last_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTournament,
  });

  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ["tournament-scores", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_scores")
        .select("registration_id, hole_number, strokes")
        .eq("tournament_id", selectedTournament);
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
      const { data, error } = await supabase
        .from("tournament_sponsors")
        .select("id, name, logo_url, website_url, tier, show_on_leaderboard")
        .eq("tournament_id", selectedTournament)
        .eq("show_on_leaderboard", true)
        .order("sort_order");
      if (error) throw error;
      return data;
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

  // Team leaderboard grouping
  const teamScores = useMemo<TeamScore[]>(() => {
    if (!isTeamFormat || !scoringFormat) return [];
    const groups: Record<number, PlayerScore[]> = {};
    playerScores.forEach((ps) => {
      if (ps.group_number != null) {
        if (!groups[ps.group_number]) groups[ps.group_number] = [];
        groups[ps.group_number].push(ps);
      }
    });

    return Object.entries(groups)
      .map(([gn, players]) => {
        const holeScores: Record<number, number> = {};
        let total = 0;
        holes.forEach((h) => {
          const val = computeTeamHoleScore(players, h, scoringFormat, editedScores);
          if (val != null) {
            holeScores[h] = val;
            total += val;
          }
        });
        return { groupNumber: parseInt(gn), players, holeScores, total };
      })
      .sort((a, b) => {
        if (a.total === 0 && b.total === 0) return 0;
        if (a.total === 0) return 1;
        if (b.total === 0) return -1;
        return a.total - b.total;
      });
  }, [playerScores, isTeamFormat, scoringFormat, editedScores]);

  // Stableford leaderboard
  const stablefordScores = useMemo(() => {
    if (!isStableford) return [];
    return playerScores
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
  }, [playerScores, isStableford, editedScores, holePar]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts: { tournament_id: string; registration_id: string; hole_number: number; strokes: number }[] = [];
      Object.entries(editedScores).forEach(([regId, holes]) => {
        Object.entries(holes).forEach(([hole, strokes]) => {
          upserts.push({
            tournament_id: selectedTournament,
            registration_id: regId,
            hole_number: parseInt(hole),
            strokes,
          });
        });
      });
      if (upserts.length === 0) return;
      const { error } = await supabase.from("tournament_scores").upsert(upserts, {
        onConflict: "registration_id,hole_number",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Scores saved!" });
      setEditedScores({});
      queryClient.invalidateQueries({ queryKey: ["tournament-scores", selectedTournament] });
    },
    onError: (e: Error) => {
      toast({ title: "Error saving scores", description: e.message, variant: "destructive" });
    },
  });

  const updateScore = (regId: string, hole: number, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) return;
    setEditedScores((prev) => ({
      ...prev,
      [regId]: { ...(prev[regId] || {}), [hole]: num },
    }));
  };

  const getScore = (ps: PlayerScore, hole: number) => {
    return editedScores[ps.registration_id]?.[hole] ?? ps.scores[hole] ?? "";
  };

  const hasEdits = Object.keys(editedScores).length > 0;
  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Leaderboard & Scoring</h1>
          <p className="text-muted-foreground">Enter scores and track the leaderboard in real-time.</p>
        </div>
        {hasEdits && (
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Scores"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a tournament" />
          </SelectTrigger>
          <SelectContent>
            {tournaments?.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

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
              <a href={`/t/${selectedTournamentData.slug}/scoring`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" /> Preview
              </a>
            </Button>
          </>
        )}
      </div>

      {selectedTournament && leaderboardSponsors && leaderboardSponsors.length > 0 && (
        <SponsorBanner sponsors={leaderboardSponsors} />
      )}

      {/* ===== TEAM LEADERBOARD ===== */}
      {selectedTournament && isTeamFormat && teamScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Users className="h-5 w-5" /> Team Leaderboard
              <Badge variant="secondary" className="text-xs font-normal">{scoringFormat?.name}</Badge>
              <span className="text-sm font-normal text-muted-foreground ml-2">Par {coursePar}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead className="min-w-[180px]">Team</TableHead>
                    {holes.map((h) => (
                      <TableHead key={h} className="text-center w-10 min-w-[40px] text-xs">{h}</TableHead>
                    ))}
                    <TableHead className="text-center font-bold min-w-[60px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamScores.map((team, i) => (
                    <TableRow key={team.groupNumber}>
                      <TableCell className="text-center font-bold text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="font-semibold">Group {team.groupNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {team.players.map((p) => `${p.first_name} ${p.last_name[0]}.`).join(", ")}
                        </div>
                      </TableCell>
                      {holes.map((h) => (
                        <TableCell key={h} className="text-center text-sm p-1">
                          {team.holeScores[h] != null ? (
                            <span className={
                              team.holeScores[h] < Math.round(holePar) ? "text-primary font-bold" :
                              team.holeScores[h] > Math.round(holePar) ? "text-destructive" : ""
                            }>
                              {team.holeScores[h]}
                            </span>
                          ) : "—"}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-bold text-lg">
                        {team.total > 0 ? team.total : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== STABLEFORD LEADERBOARD ===== */}
      {selectedTournament && isStableford && stablefordScores.length > 0 && (
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Player</TableHead>
                    {holes.map((h) => (
                      <TableHead key={h} className="text-center w-12 min-w-[48px] text-xs">{h}</TableHead>
                    ))}
                    <TableHead className="text-center font-bold min-w-[60px]">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stablefordScores.map((ps, i) => (
                    <TableRow key={ps.registration_id}>
                      <TableCell className="text-center font-bold text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium">
                        {ps.first_name} {ps.last_name}
                        {ps.handicap !== null && (
                          <span className="text-xs text-muted-foreground ml-1">({ps.handicap})</span>
                        )}
                      </TableCell>
                      {holes.map((h) => {
                        const val = getScore(ps, h);
                        return (
                          <TableCell key={h} className="p-1 text-center">
                            <Input
                              type="number"
                              min={0}
                              max={20}
                              value={val}
                              onChange={(e) => updateScore(ps.registration_id, h, e.target.value)}
                              className="w-12 h-8 text-center text-sm p-0"
                            />
                            {renderStablefordCell(val, h)}
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

      {/* ===== INDIVIDUAL SCORECARD (stroke play or score entry for team formats) ===== */}
      {selectedTournament && (
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Player</TableHead>
                      {isTeamFormat && <TableHead className="text-center w-14">Grp</TableHead>}
                      {holes.map((h) => (
                        <TableHead key={h} className="text-center w-12 min-w-[48px]">{h}</TableHead>
                      ))}
                      <TableHead className="text-center font-bold min-w-[60px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerScores.map((ps) => {
                      const currentTotal = holes.reduce((sum, h) => {
                        const val = getScore(ps, h);
                        return sum + (typeof val === "number" ? val : 0);
                      }, 0);
                      return (
                        <TableRow key={ps.registration_id}>
                          <TableCell className="sticky left-0 bg-card z-10 font-medium">
                            {ps.first_name} {ps.last_name}
                            {ps.handicap !== null && (
                              <span className="text-xs text-muted-foreground ml-1">({ps.handicap})</span>
                            )}
                          </TableCell>
                          {isTeamFormat && (
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {ps.group_number ?? "—"}
                            </TableCell>
                          )}
                          {holes.map((h) => (
                            <TableCell key={h} className="p-1 text-center">
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                value={getScore(ps, h)}
                                onChange={(e) => updateScore(ps.registration_id, h, e.target.value)}
                                className="w-12 h-8 text-center text-sm p-0"
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-bold text-lg">
                            {currentTotal > 0 ? currentTotal : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
