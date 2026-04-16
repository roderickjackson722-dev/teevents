import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, Trophy, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SponsorBanner } from "@/components/SponsorBanner";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  handicap: number | null;
  group_number: number | null;
  playing_handicap: number | null;
  strokes_per_hole: number[] | null;
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
  const [emailInput, setEmailInput] = useState("");
  const [groupNumber, setGroupNumber] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Record<string, Record<number, number>>>({});
  const [editedScores, setEditedScores] = useState<Record<string, Record<number, number>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoLogging, setAutoLogging] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("tournaments")
      .select("id, title, course_par, scoring_format, handicap_enabled")
      .eq("slug", slug)
      .eq("site_published", true)
      .single()
      .then(({ data }) => {
        setTournament(data as TournamentData | null);
        setLoading(false);
        if (data) {
          // Load sponsors
          supabase
            .from("tournament_sponsors")
            .select("id, name, logo_url, website_url, tier, show_on_leaderboard")
            .eq("tournament_id", data.id)
            .eq("show_on_leaderboard", true)
            .order("sort_order")
            .then(({ data: sp }) => setSponsors(sp || []));

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
      });
  }, [slug]);

  // Auto-login via scoring code from QR
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || !tournament || autoLogging) return;
    setAutoLogging(true);

    (async () => {
      const { data } = await supabase
        .from("tournament_registrations")
        .select("group_number")
        .eq("tournament_id", tournament.id)
        .eq("scoring_code", code.toUpperCase())
        .single();

      if (data?.group_number) {
        await loadGroup(data.group_number);
      } else {
        setError("Invalid scoring code or player not assigned to a hole.");
        setAutoLogging(false);
      }
    })();
  }, [tournament, searchParams]);

  const loadGroup = async (gNum: number) => {
    if (!tournament) return;

    const { data: groupPlayers } = await supabase
      .from("tournament_registrations")
      .select("id, first_name, last_name, handicap, group_number, playing_handicap, strokes_per_hole")
      .eq("tournament_id", tournament.id)
      .eq("group_number", gNum)
      .order("group_position");

    if (!groupPlayers || groupPlayers.length === 0) {
      setError(`No players found in Hole ${gNum}.`);
      return;
    }

    const regIds = groupPlayers.map((p) => p.id);
    const { data: existingScores } = await supabase
      .from("tournament_scores")
      .select("registration_id, hole_number, strokes")
      .eq("tournament_id", tournament.id)
      .in("registration_id", regIds);

    const scoreMap: Record<string, Record<number, number>> = {};
    existingScores?.forEach((s) => {
      if (!scoreMap[s.registration_id]) scoreMap[s.registration_id] = {};
      scoreMap[s.registration_id][s.hole_number] = s.strokes;
    });

    const mappedPlayers: Player[] = groupPlayers.map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      handicap: p.handicap,
      group_number: p.group_number,
      playing_handicap: p.playing_handicap,
      strokes_per_hole: p.strokes_per_hole as number[] | null,
    }));

    setPlayers(mappedPlayers);
    setScores(scoreMap);
    setGroupNumber(gNum);
    setLoginMode(false);
  };

  const handleLogin = async () => {
    if (!tournament) return;
    setError("");
    let gNum: number | null = null;

    if (groupInput.trim()) {
      gNum = parseInt(groupInput.trim());
      if (isNaN(gNum)) { setError("Invalid group number"); return; }
    } else if (emailInput.trim()) {
      const { data } = await supabase
        .from("tournament_registrations")
        .select("group_number")
        .eq("tournament_id", tournament.id)
        .eq("email", emailInput.trim().toLowerCase())
        .single();
      if (!data?.group_number) { setError("Player not found or not assigned to a hole."); return; }
      gNum = data.group_number;
    } else {
      setError("Enter a hole number or your email."); return;
    }

    await loadGroup(gNum);
    if (players.length === 0 && error === "") {
      setError(`No players found in Hole ${gNum}.`);
    }
  };

  const updateScore = (regId: string, hole: number, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0 || num > 20) return;
    setEditedScores((prev) => ({
      ...prev,
      [regId]: { ...(prev[regId] || {}), [hole]: num },
    }));
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
      const { error } = await supabase.from("tournament_scores").upsert(upserts, {
        onConflict: "registration_id,hole_number",
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

  if (loginMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Trophy className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle className="text-xl">{tournament.title}</CardTitle>
            <p className="text-sm text-muted-foreground">Live Scoring — Enter your hole to begin</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Hole Number</label>
              <Input
                type="number"
                placeholder="e.g. 3"
                value={groupInput}
                onChange={(e) => { setGroupInput(e.target.value); setEmailInput(""); }}
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
                onChange={(e) => { setEmailInput(e.target.value); setGroupInput(""); }}
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
            <SponsorBanner sponsors={sponsors} />
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => setLoginMode(true)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Change Hole
            </button>
            <h1 className="text-xl font-bold">{tournament.title} — Hole {groupNumber}</h1>
            <p className="text-xs text-muted-foreground">Par {tournament.course_par || 72}</p>
          </div>
          {hasEdits && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">Player</TableHead>
                    {handicapEnabled && courseStrokeIndexes && (
                      <TableHead className="text-center w-10 text-xs text-muted-foreground">SI</TableHead>
                    )}
                    {holes.map((h) => (
                      <TableHead key={h} className="text-center w-12 min-w-[48px] text-xs">{h}</TableHead>
                    ))}
                    <TableHead className="text-center font-bold min-w-[50px]">Gross</TableHead>
                    {handicapEnabled && <TableHead className="text-center font-bold min-w-[50px]">Net</TableHead>}
                  </TableRow>
                  {/* SI row */}
                  {handicapEnabled && courseStrokeIndexes && (
                    <TableRow className="bg-muted/30">
                      <TableHead className="sticky left-0 bg-muted/30 z-10 text-xs text-muted-foreground">SI</TableHead>
                      {holes.map((h) => (
                        <TableHead key={h} className="text-center text-[10px] text-muted-foreground">
                          {courseStrokeIndexes[h - 1] || ""}
                        </TableHead>
                      ))}
                      <TableHead />
                      {handicapEnabled && <TableHead />}
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {players.map((p) => {
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
                          return (
                            <TableCell key={h} className="p-0.5 text-center">
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={getScore(p.id, h)}
                                  onChange={(e) => updateScore(p.id, h, e.target.value)}
                                  className="w-11 h-8 text-center text-sm p-0"
                                />
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
      </div>
    </div>
  );
}
