import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Loader2, Save, Share2, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SponsorBanner } from "@/components/SponsorBanner";
import { getFormatById, stablefordPoints } from "@/lib/scoringFormats";
import { Badge } from "@/components/ui/badge";

interface PlayerScore {
  registration_id: string;
  first_name: string;
  last_name: string;
  handicap: number | null;
  scores: Record<number, number>;
  total: number;
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
        .select("id, title, course_par, slug, site_published")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!org,
  });

  const selectedTournamentData = tournaments?.find((t) => t.id === selectedTournament);

  const { data: registrations } = useQuery({
    queryKey: ["leaderboard-players", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, handicap")
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
      scores: scoreMap[r.id] || {},
      total: Object.values(scoreMap[r.id] || {}).reduce((sum, s) => sum + s, 0),
    }));

    ps.sort((a, b) => {
      if (a.total === 0 && b.total === 0) return 0;
      if (a.total === 0) return 1;
      if (b.total === 0) return -1;
      return a.total - b.total;
    });

    setPlayerScores(ps);
  }, [registrations, scores]);

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
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
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

      {selectedTournament && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" /> Scorecard
              {selectedTournamentData && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  Par {selectedTournamentData.course_par || 72}
                </span>
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
