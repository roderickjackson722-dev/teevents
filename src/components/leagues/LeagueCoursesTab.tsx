import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react";
import CourseDatabaseSearch, { CourseDBResult } from "@/components/dashboard/CourseDatabaseSearch";

interface LeagueCourse {
  id: string;
  course_name: string;
  tee_name: string;
  par_total: number;
  course_rating: number;
  slope_rating: number;
  hole_pars: number[] | null;
  hole_stroke_indexes: number[] | null;
  hole_distances: number[] | null;
}

const emptyHoles = (v: number) => Array.from({ length: 18 }, (_, i) => (v === 0 ? i + 1 : v));

const emptyCourse = {
  course_name: "",
  tee_name: "Blue",
  par_total: 72,
  course_rating: 72.0,
  slope_rating: 113,
  hole_pars: emptyHoles(4),
  hole_stroke_indexes: emptyHoles(0),
  hole_distances: emptyHoles(0),
};

export default function LeagueCoursesTab({ leagueId }: { leagueId: string }) {
  const [courses, setCourses] = useState<LeagueCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("league_courses")
      .select("*")
      .eq("league_id", leagueId)
      .order("course_name");
    setCourses((data as LeagueCourse[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [leagueId]);

  const save = async () => {
    if (!editing.course_name.trim()) {
      toast({ title: "Course name required", variant: "destructive" });
      return;
    }
    // Validate stroke indexes are 1-18 unique when all filled
    const sis = editing.hole_stroke_indexes.map(Number);
    if (sis.every((v: number) => v >= 1 && v <= 18)) {
      const set = new Set(sis);
      if (set.size !== 18) {
        toast({ title: "Stroke Indexes must be unique 1–18", variant: "destructive" });
        return;
      }
    }
    const payload = {
      league_id: leagueId,
      course_name: editing.course_name.trim(),
      tee_name: editing.tee_name || "Blue",
      par_total: Number(editing.par_total) || 72,
      course_rating: Number(editing.course_rating) || 72.0,
      slope_rating: Number(editing.slope_rating) || 113,
      hole_pars: editing.hole_pars.map(Number),
      hole_stroke_indexes: editing.hole_stroke_indexes.map(Number),
      hole_distances: editing.hole_distances.map(Number),
    };
    const q = editing.id
      ? (supabase as any).from("league_courses").update(payload).eq("id", editing.id)
      : (supabase as any).from("league_courses").insert(payload);
    const { error } = await q;
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editing.id ? "Course updated" : "Course added" });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    const { error } = await (supabase as any).from("league_courses").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  };

  const updateHole = (field: "hole_pars" | "hole_stroke_indexes" | "hole_distances", holeIdx: number, value: string) => {
    const arr = [...editing[field]];
    arr[holeIdx] = value === "" ? 0 : Number(value);
    setEditing({ ...editing, [field]: arr });
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Courses ({courses.length})
          </h2>
          <Button onClick={() => setEditing({ ...emptyCourse })}>
            <Plus className="h-4 w-4 mr-2" /> Add Course
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Set up par, slope, course rating, and hole-by-hole data. Attach a course to an event to enable
          automatic handicap stroke allocation (pops) and net scoring for players.
        </p>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : courses.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No courses set up yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Tee</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Slope</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.course_name}</TableCell>
                    <TableCell>{c.tee_name}</TableCell>
                    <TableCell>{c.par_total}</TableCell>
                    <TableCell>{c.course_rating}</TableCell>
                    <TableCell>{c.slope_rating}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({
                        ...c,
                        hole_pars: c.hole_pars || emptyHoles(4),
                        hole_stroke_indexes: c.hole_stroke_indexes || emptyHoles(0),
                        hole_distances: c.hole_distances || emptyHoles(0),
                      })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {editing && (
          <Dialog open onOpenChange={() => setEditing(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit Course" : "Add Course"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <CourseDatabaseSearch
                  onSelect={(c: CourseDBResult) => {
                    const pars = (c.hole_pars && c.hole_pars.length === 18) ? c.hole_pars : emptyHoles(4);
                    const sis = (c.hole_stroke_indexes && c.hole_stroke_indexes.length === 18) ? c.hole_stroke_indexes : emptyHoles(0);
                    const dists = (c.hole_distances && c.hole_distances.length === 18) ? c.hole_distances : emptyHoles(0);
                    setEditing({
                      ...editing,
                      course_name: c.course_name || editing.course_name,
                      tee_name: c.tee_name || editing.tee_name || "Blue",
                      par_total: c.par_total ?? pars.reduce((a, b) => a + b, 0) ?? 72,
                      course_rating: c.course_rating ?? 72.0,
                      slope_rating: c.slope_rating ?? 113,
                      hole_pars: pars,
                      hole_stroke_indexes: sis,
                      hole_distances: dists,
                    });
                  }}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Course Name *</Label>
                    <Input value={editing.course_name} onChange={(e) => setEditing({ ...editing, course_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tee Set</Label>
                    <Input value={editing.tee_name} onChange={(e) => setEditing({ ...editing, tee_name: e.target.value })} placeholder="Blue" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Par</Label>
                    <Input type="number" value={editing.par_total} onChange={(e) => setEditing({ ...editing, par_total: e.target.value })} />
                  </div>
                  <div>
                    <Label>Course Rating</Label>
                    <Input type="number" step="0.1" value={editing.course_rating} onChange={(e) => setEditing({ ...editing, course_rating: e.target.value })} />
                  </div>
                  <div>
                    <Label>Slope Rating</Label>
                    <Input type="number" value={editing.slope_rating} onChange={(e) => setEditing({ ...editing, slope_rating: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label>Hole-by-Hole Data</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Stroke Index: 1 = hardest hole, 18 = easiest. Used to allocate handicap strokes ("pops").
                  </p>
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="p-1 text-left">Hole</th>
                          {Array.from({ length: 18 }, (_, i) => (
                            <th key={i} className="p-1 min-w-[50px] text-center">{i + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-1 font-medium">Par</td>
                          {editing.hole_pars.map((v: number, i: number) => (
                            <td key={i} className="p-1">
                              <Input type="number" value={v || ""} className="h-7 w-12 px-1 text-center"
                                onChange={(e) => updateHole("hole_pars", i, e.target.value)} />
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-1 font-medium">SI</td>
                          {editing.hole_stroke_indexes.map((v: number, i: number) => (
                            <td key={i} className="p-1">
                              <Input type="number" min={1} max={18} value={v || ""} className="h-7 w-12 px-1 text-center"
                                onChange={(e) => updateHole("hole_stroke_indexes", i, e.target.value)} />
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-1 font-medium">Yds</td>
                          {editing.hole_distances.map((v: number, i: number) => (
                            <td key={i} className="p-1">
                              <Input type="number" value={v || ""} className="h-7 w-14 px-1 text-center"
                                onChange={(e) => updateHole("hole_distances", i, e.target.value)} />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save}>{editing.id ? "Save" : "Add Course"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
