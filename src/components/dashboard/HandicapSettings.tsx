import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Info, Calculator } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FORMAT_ALLOWANCES, calcCourseHandicap, calcPlayingHandicap, allocateStrokes } from "@/lib/handicapUtils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  tournamentId: string;
  scoringFormat?: string;
}

export default function HandicapSettings({ tournamentId, scoringFormat }: Props) {
  const queryClient = useQueryClient();

  // Tournament handicap settings
  const { data: tournament, isLoading: loadingT } = useQuery({
    queryKey: ["tournament-handicap", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, handicap_enabled, handicap_allowance, max_handicap, golf_course_id, course_par")
        .eq("id", tournamentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  // Golf course for this tournament
  const { data: courses } = useQuery({
    queryKey: ["golf-courses", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("golf_courses")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  // Players with handicap data
  const { data: players } = useQuery({
    queryKey: ["handicap-players", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, handicap_index, course_handicap, playing_handicap, handicap, group_number")
        .eq("tournament_id", tournamentId)
        .order("last_name");
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  const [enabled, setEnabled] = useState(false);
  const [allowance, setAllowance] = useState("95");
  const [maxHc, setMaxHc] = useState("");
  const [courseName, setCourseName] = useState("");
  const [teeName, setTeeName] = useState("White");
  const [coursePar, setCoursePar] = useState("72");
  const [courseRating, setCourseRating] = useState("72.0");
  const [slopeRating, setSlopeRating] = useState("113");
  const [strokeIndexes, setStrokeIndexes] = useState<string[]>(Array(18).fill(""));

  // Initialize from data
  useEffect(() => {
    if (tournament) {
      setEnabled(tournament.handicap_enabled ?? false);
      setAllowance(String(tournament.handicap_allowance ?? 95));
      setMaxHc(tournament.max_handicap != null ? String(tournament.max_handicap) : "");
    }
  }, [tournament]);

  useEffect(() => {
    const course = courses?.[0];
    if (course) {
      setCourseName(course.name || "");
      setTeeName(course.tee_name || "White");
      setCoursePar(String(course.par || 72));
      setCourseRating(String(course.course_rating || 72.0));
      setSlopeRating(String(course.slope_rating || 113));
      if (course.stroke_indexes && Array.isArray(course.stroke_indexes)) {
        setStrokeIndexes(course.stroke_indexes.map(String));
      }
    }
  }, [courses]);

  // Set recommended allowance based on format
  useEffect(() => {
    if (scoringFormat && FORMAT_ALLOWANCES[scoringFormat]) {
      setAllowance(String(FORMAT_ALLOWANCES[scoringFormat].allowance));
    }
  }, [scoringFormat]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsedSI = strokeIndexes.map((v) => parseInt(v) || 0);
      const courseData = {
        tournament_id: tournamentId,
        name: courseName,
        tee_name: teeName,
        par: parseInt(coursePar) || 72,
        course_rating: parseFloat(courseRating) || 72.0,
        slope_rating: parseInt(slopeRating) || 113,
        stroke_indexes: parsedSI,
      };

      // Upsert course
      let courseId = courses?.[0]?.id;
      if (courseId) {
        const { error } = await supabase.from("golf_courses").update(courseData).eq("id", courseId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("golf_courses").insert(courseData).select("id").single();
        if (error) throw error;
        courseId = data.id;
      }

      // Update tournament
      const { error: tErr } = await supabase.from("tournaments").update({
        handicap_enabled: enabled,
        handicap_allowance: parseFloat(allowance) || 95,
        max_handicap: maxHc ? parseInt(maxHc) : null,
        golf_course_id: courseId,
      }).eq("id", tournamentId);
      if (tErr) throw tErr;

      // If enabled, recalculate all player handicaps
      if (enabled && players && players.length > 0) {
        const slope = parseInt(slopeRating) || 113;
        const cr = parseFloat(courseRating) || 72.0;
        const par = parseInt(coursePar) || 72;
        const allow = parseFloat(allowance) || 95;
        const maxVal = maxHc ? parseInt(maxHc) : null;

        for (const p of players) {
          const hcIndex = p.handicap_index ?? p.handicap;
          if (hcIndex == null) continue;
          let courseHc = calcCourseHandicap(hcIndex, slope, cr, par);
          if (maxVal != null && courseHc > maxVal) courseHc = maxVal;
          const playingHc = calcPlayingHandicap(courseHc, allow);
          const strokesArr = allocateStrokes(playingHc, parsedSI);

          await supabase.from("tournament_registrations").update({
            course_handicap: courseHc,
            playing_handicap: playingHc,
            strokes_per_hole: strokesArr,
          }).eq("id", p.id);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Handicap settings saved!" });
      queryClient.invalidateQueries({ queryKey: ["tournament-handicap", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["golf-courses", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["handicap-players", tournamentId] });
    },
    onError: (e: Error) => {
      toast({ title: "Error saving settings", description: e.message, variant: "destructive" });
    },
  });

  const updateSI = (idx: number, val: string) => {
    setStrokeIndexes((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  if (loadingT) return <div className="py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" /> Handicap Settings
              </CardTitle>
              <CardDescription>Configure handicap scoring for this tournament.</CardDescription>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={setEnabled} id="hc-enable" />
            <Label htmlFor="hc-enable" className="font-medium">Enable Handicap Scoring</Label>
          </div>

          {enabled && (
            <>
              {/* Course info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Course Name</Label>
                  <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Pine Valley GC" />
                </div>
                <div>
                  <Label className="text-sm">Tee</Label>
                  <Select value={teeName} onValueChange={setTeeName}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Blue", "White", "Red", "Gold", "Black", "Green"].map((t) => (
                        <SelectItem key={t} value={t}>{t} Tees</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Par</Label>
                  <Input type="number" value={coursePar} onChange={(e) => setCoursePar(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm">Course Rating</Label>
                  <Input type="number" step="0.1" value={courseRating} onChange={(e) => setCourseRating(e.target.value)} placeholder="e.g. 72.5" />
                </div>
                <div>
                  <Label className="text-sm">Slope Rating</Label>
                  <Input type="number" value={slopeRating} onChange={(e) => setSlopeRating(e.target.value)} placeholder="e.g. 135" />
                </div>
                <div>
                  <Label className="text-sm">Handicap Allowance (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={allowance} onChange={(e) => setAllowance(e.target.value)} className="w-24" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  {scoringFormat && FORMAT_ALLOWANCES[scoringFormat] && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" /> USGA recommends {FORMAT_ALLOWANCES[scoringFormat].allowance}% for {FORMAT_ALLOWANCES[scoringFormat].label}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm">Maximum Handicap (optional)</Label>
                  <Input type="number" value={maxHc} onChange={(e) => setMaxHc(e.target.value)} placeholder="e.g. 36" />
                </div>
              </div>

              {/* Stroke Indexes */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Stroke Indexes (SI) — Hole Difficulty Ranking</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Enter the Stroke Index (1 = hardest, 18 = easiest) for each hole. Found on the course scorecard.
                </p>
                <div className="grid grid-cols-9 gap-2">
                  {Array.from({ length: 18 }, (_, i) => (
                    <div key={i} className="text-center">
                      <div className="text-[10px] text-muted-foreground font-medium mb-0.5">H{i + 1}</div>
                      <Input
                        type="number"
                        min={1}
                        max={18}
                        value={strokeIndexes[i]}
                        onChange={(e) => updateSI(i, e.target.value)}
                        className="w-full h-8 text-center text-sm p-0"
                        placeholder="-"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Player handicap preview */}
      {enabled && players && players.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Player Handicap Preview</CardTitle>
            <CardDescription>Calculated handicaps based on current settings. Save to update.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">HC Index</TableHead>
                    <TableHead className="text-center">Course HC</TableHead>
                    <TableHead className="text-center">Playing HC</TableHead>
                    <TableHead className="text-center">Grp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((p) => {
                    const hcIndex = p.handicap_index ?? (p as any).handicap;
                    const slope = parseInt(slopeRating) || 113;
                    const cr = parseFloat(courseRating) || 72.0;
                    const par = parseInt(coursePar) || 72;
                    const allow = parseFloat(allowance) || 95;
                    const maxVal = maxHc ? parseInt(maxHc) : null;

                    let courseHc = hcIndex != null ? calcCourseHandicap(hcIndex, slope, cr, par) : null;
                    if (courseHc != null && maxVal != null && courseHc > maxVal) courseHc = maxVal;
                    const playingHc = courseHc != null ? calcPlayingHandicap(courseHc, allow) : null;

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                        <TableCell className="text-center">
                          {hcIndex != null ? <Badge variant="secondary">{hcIndex}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">{courseHc ?? "—"}</TableCell>
                        <TableCell className="text-center font-semibold">{playingHc ?? "—"}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{p.group_number ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
