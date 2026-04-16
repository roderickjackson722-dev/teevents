import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Save, Loader2, MapPin, Globe, Plus, Trash2, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

interface HoleData {
  par: string;
  si: string;
  distance: string;
}

const DEFAULT_HOLES: HoleData[] = Array.from({ length: 18 }, () => ({ par: "4", si: "", distance: "" }));

const TEE_OPTIONS = ["Black", "Blue", "White", "Red", "Gold", "Green", "Silver", "Championship", "Senior", "Ladies", "Forward"];

export default function CourseDetails() {
  const queryClient = useQueryClient();
  const tournamentId = localStorage.getItem("selectedTournamentId");

  // Fetch existing course
  const { data: course, isLoading } = useQuery({
    queryKey: ["course-details", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("golf_courses")
        .select("*")
        .eq("tournament_id", tournamentId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  // Fetch tee sets
  const { data: teeSets } = useQuery({
    queryKey: ["course-tee-sets", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_tee_sets")
        .select("*")
        .eq("tournament_id", tournamentId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  const [courseName, setCourseName] = useState("");
  const [teeName, setTeeName] = useState("Blue");
  const [courseRating, setCourseRating] = useState("72.0");
  const [slopeRating, setSlopeRating] = useState("113");
  const [courseAddress, setCourseAddress] = useState("");
  const [courseWebsite, setCourseWebsite] = useState("");
  const [holes, setHoles] = useState<HoleData[]>(DEFAULT_HOLES);
  const [showTeeSets, setShowTeeSets] = useState(false);
  const [teeSetDialogOpen, setTeeSetDialogOpen] = useState(false);

  // Tee set form
  const [newTeeName, setNewTeeName] = useState("White");
  const [newTeePar, setNewTeePar] = useState("72");
  const [newTeeCR, setNewTeeCR] = useState("72.0");
  const [newTeeSR, setNewTeeSR] = useState("113");
  const [newTeeHoles, setNewTeeHoles] = useState<HoleData[]>(DEFAULT_HOLES);

  useEffect(() => {
    if (course) {
      setCourseName(course.name || "");
      setTeeName(course.tee_name || "Blue");
      setCourseRating(String(course.course_rating || 72.0));
      setSlopeRating(String(course.slope_rating || 113));
      setCourseAddress((course as any).course_address || "");
      setCourseWebsite((course as any).course_website || "");

      const holePars = (course as any).hole_pars as number[] | null;
      const holeSIs = course.stroke_indexes as number[] | null;
      const holeDists = (course as any).hole_distances as number[] | null;

      const loaded: HoleData[] = Array.from({ length: 18 }, (_, i) => ({
        par: holePars?.[i] != null ? String(holePars[i]) : "4",
        si: holeSIs?.[i] != null ? String(holeSIs[i]) : "",
        distance: holeDists?.[i] != null ? String(holeDists[i]) : "",
      }));
      setHoles(loaded);
    }
  }, [course]);

  useEffect(() => {
    if (teeSets && teeSets.length > 0) setShowTeeSets(true);
  }, [teeSets]);

  const parTotal = holes.reduce((s, h) => s + (parseInt(h.par) || 0), 0);
  const frontPar = holes.slice(0, 9).reduce((s, h) => s + (parseInt(h.par) || 0), 0);
  const backPar = holes.slice(9).reduce((s, h) => s + (parseInt(h.par) || 0), 0);
  const frontDist = holes.slice(0, 9).reduce((s, h) => s + (parseInt(h.distance) || 0), 0);
  const backDist = holes.slice(9).reduce((s, h) => s + (parseInt(h.distance) || 0), 0);

  const updateHole = (idx: number, field: keyof HoleData, value: string) => {
    setHoles(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const holePars = holes.map(h => parseInt(h.par) || 4);
      const holeSIs = holes.map(h => parseInt(h.si) || 0);
      const holeDists = holes.map(h => parseInt(h.distance) || 0);
      const hasDistances = holeDists.some(d => d > 0);

      const payload = {
        tournament_id: tournamentId!,
        name: courseName,
        tee_name: teeName,
        par: parTotal,
        course_rating: parseFloat(courseRating) || 72.0,
        slope_rating: parseInt(slopeRating) || 113,
        stroke_indexes: holeSIs,
        hole_pars: holePars,
        hole_distances: hasDistances ? holeDists : null,
        course_address: courseAddress || null,
        course_website: courseWebsite || null,
      };

      if (course?.id) {
        const { error } = await supabase.from("golf_courses").update(payload).eq("id", course.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("golf_courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Course details saved!" });
      queryClient.invalidateQueries({ queryKey: ["course-details", tournamentId] });
    },
    onError: (e: Error) => {
      toast({ title: "Error saving", description: e.message, variant: "destructive" });
    },
  });

  const addTeeSetMutation = useMutation({
    mutationFn: async () => {
      const holePars = newTeeHoles.map(h => parseInt(h.par) || 4);
      const holeSIs = newTeeHoles.map(h => parseInt(h.si) || 0);
      const holeDists = newTeeHoles.map(h => parseInt(h.distance) || 0);
      const hasDistances = holeDists.some(d => d > 0);

      const { error } = await supabase.from("course_tee_sets").insert({
        tournament_id: tournamentId!,
        tee_name: newTeeName,
        par_total: parseInt(newTeePar) || 72,
        course_rating: parseFloat(newTeeCR) || 72.0,
        slope_rating: parseInt(newTeeSR) || 113,
        hole_pars: holePars,
        hole_stroke_indexes: holeSIs,
        hole_distances: hasDistances ? holeDists : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tee set added!" });
      setTeeSetDialogOpen(false);
      setNewTeeHoles(DEFAULT_HOLES);
      queryClient.invalidateQueries({ queryKey: ["course-tee-sets", tournamentId] });
    },
    onError: (e: Error) => {
      toast({ title: "Error adding tee set", description: e.message, variant: "destructive" });
    },
  });

  const deleteTeeSetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_tee_sets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tee set removed" });
      queryClient.invalidateQueries({ queryKey: ["course-tee-sets", tournamentId] });
    },
  });

  if (!tournamentId) {
    return <div className="p-6 text-muted-foreground">Please select a tournament first.</div>;
  }

  if (isLoading) {
    return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl">
      <SEO title="Course Details" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Course Details</h1>
          <p className="text-sm text-muted-foreground">
            Enter your course info for handicap calculations, scorecards, and live scoring.
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save Course Details
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Course Name</Label>
              <Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="e.g. Pebble Beach Golf Links" />
            </div>
            <div>
              <Label>Tee Set</Label>
              <Select value={teeName} onValueChange={setTeeName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t} Tees</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Ratings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Course Ratings (USGA)</CardTitle>
          <CardDescription>These values are on the course scorecard or USGA website.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Par</Label>
              <Input value={String(parTotal)} readOnly className="bg-muted font-semibold" />
              <p className="text-xs text-muted-foreground mt-1">Auto-calculated from hole pars</p>
            </div>
            <div>
              <Label>Course Rating</Label>
              <Input type="number" step="0.1" value={courseRating} onChange={e => setCourseRating(e.target.value)} placeholder="72.5" />
            </div>
            <div>
              <Label>Slope Rating</Label>
              <Input type="number" value={slopeRating} onChange={e => setSlopeRating(e.target.value)} placeholder="135" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hole-by-Hole */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hole-by-Hole Data</CardTitle>
          <CardDescription>Enter par, stroke index (SI), and optional yardage for each hole.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Hole</TableHead>
                  <TableHead className="w-20">Par</TableHead>
                  <TableHead className="w-20">SI</TableHead>
                  <TableHead className="w-24">Yards</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holes.slice(0, 9).map((h, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>
                      <Select value={h.par} onValueChange={v => updateHole(i, "par", v)}>
                        <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{[3, 4, 5].map(p => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={1} max={18} value={h.si} onChange={e => updateHole(i, "si", e.target.value)} className="w-16 h-8 text-center" placeholder="-" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={h.distance} onChange={e => updateHole(i, "distance", e.target.value)} className="w-20 h-8 text-center" placeholder="-" />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Out</TableCell>
                  <TableCell>{frontPar}</TableCell>
                  <TableCell></TableCell>
                  <TableCell>{frontDist > 0 ? frontDist : ""}</TableCell>
                </TableRow>
                {holes.slice(9).map((h, i) => (
                  <TableRow key={i + 9}>
                    <TableCell className="font-medium">{i + 10}</TableCell>
                    <TableCell>
                      <Select value={h.par} onValueChange={v => updateHole(i + 9, "par", v)}>
                        <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{[3, 4, 5].map(p => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={1} max={18} value={h.si} onChange={e => updateHole(i + 9, "si", e.target.value)} className="w-16 h-8 text-center" placeholder="-" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={h.distance} onChange={e => updateHole(i + 9, "distance", e.target.value)} className="w-20 h-8 text-center" placeholder="-" />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>In</TableCell>
                  <TableCell>{backPar}</TableCell>
                  <TableCell></TableCell>
                  <TableCell>{backDist > 0 ? backDist : ""}</TableCell>
                </TableRow>
                <TableRow className="bg-primary/5 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell>{parTotal}</TableCell>
                  <TableCell></TableCell>
                  <TableCell>{frontDist + backDist > 0 ? frontDist + backDist : ""}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-4 w-4" /> Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Course Address</Label>
              <Input value={courseAddress} onChange={e => setCourseAddress(e.target.value)} placeholder="1700 17-Mile Drive, Pebble Beach, CA" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Globe className="h-3 w-3" /> Course Website</Label>
              <Input value={courseWebsite} onChange={e => setCourseWebsite(e.target.value)} placeholder="https://www.pebblebeach.com" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multiple Tee Sets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Multiple Tee Sets</CardTitle>
              <CardDescription>Add different tee sets for various flights (Senior, Ladies, etc.)</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={showTeeSets} onCheckedChange={setShowTeeSets} />
              <Label className="text-sm">Enable</Label>
            </div>
          </div>
        </CardHeader>
        {showTeeSets && (
          <CardContent className="space-y-4">
            {teeSets && teeSets.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tee</TableHead>
                    <TableHead className="text-center">Par</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">Slope</TableHead>
                    <TableHead className="text-center">Default</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teeSets.map(ts => (
                    <TableRow key={ts.id}>
                      <TableCell className="font-medium">{ts.tee_name}</TableCell>
                      <TableCell className="text-center">{ts.par_total}</TableCell>
                      <TableCell className="text-center">{ts.course_rating}</TableCell>
                      <TableCell className="text-center">{ts.slope_rating}</TableCell>
                      <TableCell className="text-center">
                        {ts.is_default && <Star className="h-4 w-4 text-yellow-500 mx-auto" />}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteTeeSetMutation.mutate(ts.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Dialog open={teeSetDialogOpen} onOpenChange={setTeeSetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Add Tee Set</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Tee Set</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tee Name</Label>
                      <Select value={newTeeName} onValueChange={setNewTeeName}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TEE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Par Total</Label>
                      <Input type="number" value={newTeePar} onChange={e => setNewTeePar(e.target.value)} />
                    </div>
                    <div>
                      <Label>Course Rating</Label>
                      <Input type="number" step="0.1" value={newTeeCR} onChange={e => setNewTeeCR(e.target.value)} />
                    </div>
                    <div>
                      <Label>Slope Rating</Label>
                      <Input type="number" value={newTeeSR} onChange={e => setNewTeeSR(e.target.value)} />
                    </div>
                  </div>

                  <Separator />
                  <Label className="font-medium">Hole-by-Hole (optional)</Label>
                  <div className="grid grid-cols-4 gap-1 text-xs text-center font-medium text-muted-foreground">
                    <div>Hole</div><div>Par</div><div>SI</div><div>Yards</div>
                  </div>
                  {newTeeHoles.map((h, i) => (
                    <div key={i} className="grid grid-cols-4 gap-1 items-center">
                      <div className="text-sm text-center font-medium">{i + 1}</div>
                      <Select value={h.par} onValueChange={v => {
                        const next = [...newTeeHoles];
                        next[i] = { ...next[i], par: v };
                        setNewTeeHoles(next);
                      }}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{[3, 4, 5].map(p => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" min={1} max={18} value={h.si} onChange={e => {
                        const next = [...newTeeHoles];
                        next[i] = { ...next[i], si: e.target.value };
                        setNewTeeHoles(next);
                      }} className="h-8 text-center" placeholder="-" />
                      <Input type="number" value={h.distance} onChange={e => {
                        const next = [...newTeeHoles];
                        next[i] = { ...next[i], distance: e.target.value };
                        setNewTeeHoles(next);
                      }} className="h-8 text-center" placeholder="-" />
                    </div>
                  ))}
                  <Button onClick={() => addTeeSetMutation.mutate()} disabled={addTeeSetMutation.isPending} className="w-full">
                    {addTeeSetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                    Save Tee Set
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
