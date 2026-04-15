import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  FlaskConical, Loader2, Plus, Trash2, Edit, Trophy, Users, PenLine, Save, AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  calcCourseHandicap, calcPlayingHandicap, allocateStrokes,
} from "@/lib/handicapUtils";

/* ─── types ─── */
interface TestParticipant {
  id: string;
  tournament_id: string;
  name: string;
  handicap_index: number | null;
  course_handicap: number | null;
  playing_handicap: number | null;
  created_at: string;
}

interface TestScore {
  id: string;
  tournament_id: string;
  test_participant_id: string;
  hole_number: number;
  gross_score: number | null;
  net_score: number | null;
}

/* ─── component ─── */
export default function TestScoringSimulator() {
  const { org, loading: orgLoading } = useOrgContext();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formHcIndex, setFormHcIndex] = useState("");
  const [scoringPlayer, setScoringPlayer] = useState<string | null>(null);
  const [editedScores, setEditedScores] = useState<Record<number, string>>({});

  /* tournaments */
  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, test_mode_enabled, handicap_enabled, handicap_allowance, max_handicap, course_par, golf_course_id")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!org,
  });

  const tournament = tournaments?.find((t) => t.id === selectedTournament);

  /* golf course */
  const { data: course } = useQuery({
    queryKey: ["golf-course-test", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("golf_courses")
        .select("*")
        .eq("tournament_id", selectedTournament)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTournament,
  });

  /* test participants */
  const { data: participants, isLoading: loadingP } = useQuery({
    queryKey: ["test-participants", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_participants")
        .select("*")
        .eq("tournament_id", selectedTournament)
        .order("created_at");
      if (error) throw error;
      return data as TestParticipant[];
    },
    enabled: !!selectedTournament,
  });

  /* test scores */
  const { data: scores } = useQuery({
    queryKey: ["test-scores", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_scores")
        .select("*")
        .eq("tournament_id", selectedTournament);
      if (error) throw error;
      return data as TestScore[];
    },
    enabled: !!selectedTournament,
  });

  /* ─── handicap helpers ─── */
  const computeHandicaps = (hcIndex: number | null) => {
    if (hcIndex == null || !course) return { courseHc: null, playingHc: null };
    const slope = course.slope_rating || 113;
    const cr = Number(course.course_rating) || 72;
    const par = course.par || 72;
    const allow = Number(tournament?.handicap_allowance) || 95;
    const maxVal = tournament?.max_handicap;
    let courseHc = calcCourseHandicap(hcIndex, slope, cr, par);
    if (maxVal != null && courseHc > maxVal) courseHc = maxVal;
    const playingHc = calcPlayingHandicap(courseHc, allow);
    return { courseHc, playingHc };
  };

  const strokeIndexes: number[] = (course?.stroke_indexes as number[]) || [];
  const holePars: number[] = useMemo(() => {
    const par = course?.par || 72;
    // Simple default: distribute par across 18 holes (4s with adjustments)
    const base = new Array(18).fill(4);
    const diff = par - 72;
    if (diff > 0) for (let i = 0; i < diff; i++) base[i % 18] = 5;
    if (diff < 0) for (let i = 0; i < Math.abs(diff); i++) base[i % 18] = 3;
    return base;
  }, [course?.par]);

  /* ─── toggle test mode ─── */
  const toggleTestMode = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("tournaments")
        .update({ test_mode_enabled: enabled })
        .eq("id", selectedTournament);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments", org?.orgId] });
      toast({ title: "Test mode updated" });
    },
  });

  /* ─── add / edit participant ─── */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const hcIndex = formHcIndex ? parseFloat(formHcIndex) : null;
      const { courseHc, playingHc } = computeHandicaps(hcIndex);
      if (editId) {
        const { error } = await supabase.from("test_participants").update({
          name: formName, handicap_index: hcIndex, course_handicap: courseHc, playing_handicap: playingHc,
        }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("test_participants").insert({
          tournament_id: selectedTournament, name: formName,
          handicap_index: hcIndex, course_handicap: courseHc, playing_handicap: playingHc,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-participants", selectedTournament] });
      setAddOpen(false);
      setEditId(null);
      setFormName("");
      setFormHcIndex("");
      toast({ title: editId ? "Participant updated" : "Mock golfer added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("test_participants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-participants", selectedTournament] });
      queryClient.invalidateQueries({ queryKey: ["test-scores", selectedTournament] });
      toast({ title: "Participant removed" });
    },
  });

  /* ─── save scores ─── */
  const saveScores = useMutation({
    mutationFn: async () => {
      if (!scoringPlayer) return;
      const player = participants?.find((p) => p.id === scoringPlayer);
      if (!player) return;
      const playingHc = player.playing_handicap || 0;
      const strokesArr = allocateStrokes(playingHc, strokeIndexes);

      for (const [hole, val] of Object.entries(editedScores)) {
        const holeNum = parseInt(hole);
        const gross = parseInt(val);
        if (isNaN(gross)) continue;
        const net = gross - (strokesArr[holeNum - 1] || 0);

        const { error } = await supabase.from("test_scores").upsert({
          tournament_id: selectedTournament,
          test_participant_id: scoringPlayer,
          hole_number: holeNum,
          gross_score: gross,
          net_score: net,
        }, { onConflict: "test_participant_id,hole_number" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-scores", selectedTournament] });
      setEditedScores({});
      toast({ title: "Scores saved!" });
    },
    onError: (e: Error) => toast({ title: "Error saving scores", description: e.message, variant: "destructive" }),
  });

  /* ─── leaderboard calc ─── */
  const leaderboard = useMemo(() => {
    if (!participants || !scores) return [];
    return participants.map((p) => {
      const pScores = scores.filter((s) => s.test_participant_id === p.id);
      const totalGross = pScores.reduce((sum, s) => sum + (s.gross_score || 0), 0);
      const totalNet = pScores.reduce((sum, s) => sum + (s.net_score || 0), 0);
      const thru = pScores.filter((s) => s.gross_score != null).length;
      return { ...p, totalGross, totalNet, thru };
    })
      .filter((p) => p.thru > 0)
      .sort((a, b) => a.totalNet - b.totalNet)
      .map((p, idx) => ({ ...p, position: idx + 1 }));
  }, [participants, scores]);

  /* ─── scoring player data ─── */
  const scoringPlayerData = participants?.find((p) => p.id === scoringPlayer);
  const scoringStrokesArr = scoringPlayerData
    ? allocateStrokes(scoringPlayerData.playing_handicap || 0, strokeIndexes)
    : new Array(18).fill(0);
  const existingScores = scores?.filter((s) => s.test_participant_id === scoringPlayer) || [];

  const openEdit = (p: TestParticipant) => {
    setEditId(p.id);
    setFormName(p.name);
    setFormHcIndex(p.handicap_index != null ? String(p.handicap_index) : "");
    setAddOpen(true);
  };

  const openAdd = () => {
    setEditId(null);
    setFormName("");
    setFormHcIndex("");
    setAddOpen(true);
  };

  if (orgLoading) return <div className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FlaskConical className="h-6 w-6" /> Test Scoring Simulator
        </h1>
        <p className="text-muted-foreground">
          Run mock tournaments to test scoring, handicaps, and leaderboards. Real golfers never see this data.
        </p>
      </div>

      {/* Tournament picker */}
      <Select value={selectedTournament} onValueChange={(v) => { setSelectedTournament(v); setScoringPlayer(null); }}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a tournament" />
        </SelectTrigger>
        <SelectContent>
          {tournaments?.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedTournament && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Select a tournament above to start the simulator.</p>
          </CardContent>
        </Card>
      )}

      {selectedTournament && tournament && (
        <>
          {/* Test mode toggle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={tournament.test_mode_enabled ?? false}
                    onCheckedChange={(v) => toggleTestMode.mutate(v)}
                  />
                  <div>
                    <Label className="font-medium">Enable Test Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, you can add mock participants and simulate live scoring.
                    </p>
                  </div>
                </div>
                {tournament.test_mode_enabled && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Test Mode Active
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {tournament.test_mode_enabled && (
            <Tabs defaultValue="participants" className="space-y-4">
              <TabsList>
                <TabsTrigger value="participants">
                  <Users className="h-4 w-4 mr-1.5" /> Participants
                </TabsTrigger>
                <TabsTrigger value="scoring">
                  <PenLine className="h-4 w-4 mr-1.5" /> Score Entry
                </TabsTrigger>
                <TabsTrigger value="leaderboard">
                  <Trophy className="h-4 w-4 mr-1.5" /> Leaderboard
                </TabsTrigger>
              </TabsList>

              {/* ═══ PARTICIPANTS TAB ═══ */}
              <TabsContent value="participants" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Test Participants</CardTitle>
                        <CardDescription>Add mock golfers to simulate a tournament round.</CardDescription>
                      </div>
                      <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={openAdd}>
                            <Plus className="h-4 w-4 mr-1" /> Add Mock Golfer
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{editId ? "Edit" : "Add"} Mock Golfer</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div>
                              <Label>Name</Label>
                              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. John Doe" />
                            </div>
                            <div>
                              <Label>Handicap Index</Label>
                              <Input type="number" step="0.1" value={formHcIndex} onChange={(e) => setFormHcIndex(e.target.value)} placeholder="e.g. 12.4" />
                              <p className="text-xs text-muted-foreground mt-1">
                                Course Handicap will be auto-calculated based on tournament course settings.
                              </p>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                              <Button onClick={() => saveMutation.mutate()} disabled={!formName.trim() || saveMutation.isPending}>
                                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                Save
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingP ? (
                      <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                    ) : !participants || participants.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6">No mock golfers added yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead className="text-center">HC Index</TableHead>
                              <TableHead className="text-center">Course HC</TableHead>
                              <TableHead className="text-center">Playing HC</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {participants.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell className="text-center">
                                  {p.handicap_index != null ? (
                                    <Badge variant="secondary">{p.handicap_index}</Badge>
                                  ) : "—"}
                                </TableCell>
                                <TableCell className="text-center">{p.course_handicap ?? "—"}</TableCell>
                                <TableCell className="text-center font-semibold">{p.playing_handicap ?? "—"}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(p.id)}
                                      className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══ SCORE ENTRY TAB ═══ */}
              <TabsContent value="scoring" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Test Score Entry</CardTitle>
                    <CardDescription>Select a mock golfer and enter hole-by-hole scores.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!participants || participants.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6">Add participants first.</p>
                    ) : (
                      <>
                        <Select value={scoringPlayer || ""} onValueChange={setScoringPlayer}>
                          <SelectTrigger className="w-[260px]">
                            <SelectValue placeholder="Select a golfer" />
                          </SelectTrigger>
                          <SelectContent>
                            {participants.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {scoringPlayer && scoringPlayerData && (
                          <>
                            <div className="flex items-center gap-4 text-sm">
                              <span>Course Handicap: <strong>{scoringPlayerData.course_handicap ?? "—"}</strong></span>
                              <span>Playing Handicap: <strong>{scoringPlayerData.playing_handicap ?? "—"}</strong></span>
                              {tournament.handicap_allowance && (
                                <Badge variant="outline">{tournament.handicap_allowance}%</Badge>
                              )}
                            </div>

                            {/* Front 9 */}
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-16">Hole</TableHead>
                                    {Array.from({ length: 9 }, (_, i) => (
                                      <TableHead key={i} className="text-center w-14">{i + 1}</TableHead>
                                    ))}
                                    <TableHead className="text-center font-semibold">Out</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <TableRow>
                                    <TableCell className="font-medium text-muted-foreground">Par</TableCell>
                                    {holePars.slice(0, 9).map((p, i) => (
                                      <TableCell key={i} className="text-center text-muted-foreground">{p}</TableCell>
                                    ))}
                                    <TableCell className="text-center font-semibold text-muted-foreground">
                                      {holePars.slice(0, 9).reduce((a, b) => a + b, 0)}
                                    </TableCell>
                                  </TableRow>
                                  {strokeIndexes.length >= 18 && (
                                    <TableRow>
                                      <TableCell className="font-medium text-muted-foreground">SI</TableCell>
                                      {strokeIndexes.slice(0, 9).map((si, i) => (
                                        <TableCell key={i} className="text-center text-xs text-muted-foreground">{si}</TableCell>
                                      ))}
                                      <TableCell />
                                    </TableRow>
                                  )}
                                  <TableRow>
                                    <TableCell className="font-medium text-muted-foreground">Strokes</TableCell>
                                    {scoringStrokesArr.slice(0, 9).map((s, i) => (
                                      <TableCell key={i} className="text-center">
                                        {s > 0 ? <span className="text-primary font-bold">{"●".repeat(s)}</span> : ""}
                                      </TableCell>
                                    ))}
                                    <TableCell />
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="font-medium">Score</TableCell>
                                    {Array.from({ length: 9 }, (_, i) => {
                                      const hole = i + 1;
                                      const existing = existingScores.find((s) => s.hole_number === hole);
                                      const val = editedScores[hole] ?? (existing?.gross_score != null ? String(existing.gross_score) : "");
                                      return (
                                        <TableCell key={i} className="text-center p-1">
                                          <Input
                                            type="number"
                                            min={1}
                                            max={15}
                                            value={val}
                                            onChange={(e) => setEditedScores((prev) => ({ ...prev, [hole]: e.target.value }))}
                                            className="w-12 h-8 text-center text-sm mx-auto p-0"
                                          />
                                        </TableCell>
                                      );
                                    })}
                                    <TableCell className="text-center font-semibold">
                                      {Array.from({ length: 9 }, (_, i) => {
                                        const hole = i + 1;
                                        const existing = existingScores.find((s) => s.hole_number === hole);
                                        const val = editedScores[hole] ?? (existing?.gross_score != null ? String(existing.gross_score) : "");
                                        return parseInt(val) || 0;
                                      }).reduce((a, b) => a + b, 0) || ""}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>

                            {/* Back 9 */}
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-16">Hole</TableHead>
                                    {Array.from({ length: 9 }, (_, i) => (
                                      <TableHead key={i} className="text-center w-14">{i + 10}</TableHead>
                                    ))}
                                    <TableHead className="text-center font-semibold">In</TableHead>
                                    <TableHead className="text-center font-semibold">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <TableRow>
                                    <TableCell className="font-medium text-muted-foreground">Par</TableCell>
                                    {holePars.slice(9, 18).map((p, i) => (
                                      <TableCell key={i} className="text-center text-muted-foreground">{p}</TableCell>
                                    ))}
                                    <TableCell className="text-center font-semibold text-muted-foreground">
                                      {holePars.slice(9, 18).reduce((a, b) => a + b, 0)}
                                    </TableCell>
                                    <TableCell className="text-center font-semibold text-muted-foreground">
                                      {holePars.reduce((a, b) => a + b, 0)}
                                    </TableCell>
                                  </TableRow>
                                  {strokeIndexes.length >= 18 && (
                                    <TableRow>
                                      <TableCell className="font-medium text-muted-foreground">SI</TableCell>
                                      {strokeIndexes.slice(9, 18).map((si, i) => (
                                        <TableCell key={i} className="text-center text-xs text-muted-foreground">{si}</TableCell>
                                      ))}
                                      <TableCell /><TableCell />
                                    </TableRow>
                                  )}
                                  <TableRow>
                                    <TableCell className="font-medium text-muted-foreground">Strokes</TableCell>
                                    {scoringStrokesArr.slice(9, 18).map((s, i) => (
                                      <TableCell key={i} className="text-center">
                                        {s > 0 ? <span className="text-primary font-bold">{"●".repeat(s)}</span> : ""}
                                      </TableCell>
                                    ))}
                                    <TableCell /><TableCell />
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="font-medium">Score</TableCell>
                                    {Array.from({ length: 9 }, (_, i) => {
                                      const hole = i + 10;
                                      const existing = existingScores.find((s) => s.hole_number === hole);
                                      const val = editedScores[hole] ?? (existing?.gross_score != null ? String(existing.gross_score) : "");
                                      return (
                                        <TableCell key={i} className="text-center p-1">
                                          <Input
                                            type="number"
                                            min={1}
                                            max={15}
                                            value={val}
                                            onChange={(e) => setEditedScores((prev) => ({ ...prev, [hole]: e.target.value }))}
                                            className="w-12 h-8 text-center text-sm mx-auto p-0"
                                          />
                                        </TableCell>
                                      );
                                    })}
                                    <TableCell className="text-center font-semibold">
                                      {Array.from({ length: 9 }, (_, i) => {
                                        const hole = i + 10;
                                        const existing = existingScores.find((s) => s.hole_number === hole);
                                        const val = editedScores[hole] ?? (existing?.gross_score != null ? String(existing.gross_score) : "");
                                        return parseInt(val) || 0;
                                      }).reduce((a, b) => a + b, 0) || ""}
                                    </TableCell>
                                    <TableCell className="text-center font-bold">
                                      {(() => {
                                        let total = 0;
                                        for (let h = 1; h <= 18; h++) {
                                          const existing = existingScores.find((s) => s.hole_number === h);
                                          const val = editedScores[h] ?? (existing?.gross_score != null ? String(existing.gross_score) : "");
                                          total += parseInt(val) || 0;
                                        }
                                        return total || "";
                                      })()}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>

                            <div className="flex justify-end">
                              <Button onClick={() => saveScores.mutate()} disabled={saveScores.isPending || Object.keys(editedScores).length === 0}>
                                {saveScores.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                Save Scores
                              </Button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══ LEADERBOARD TAB ═══ */}
              <TabsContent value="leaderboard" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="h-5 w-5" /> Test Leaderboard (Simulated)
                    </CardTitle>
                    <CardDescription>Live leaderboard based on test scores entered above.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {leaderboard.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6">
                        No scores entered yet. Add participants and enter scores to see the leaderboard.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16 text-center">Pos</TableHead>
                              <TableHead>Player</TableHead>
                              <TableHead className="text-center">Gross</TableHead>
                              <TableHead className="text-center">Net</TableHead>
                              <TableHead className="text-center">Thru</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leaderboard.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell className="text-center font-bold">{p.position}</TableCell>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell className="text-center">{p.totalGross}</TableCell>
                                <TableCell className="text-center font-semibold">{p.totalNet}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary">{p.thru}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
