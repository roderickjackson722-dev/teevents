import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Library, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { US_STATES } from "@/lib/usStates";

type CourseRow = {
  id: string;
  course_name: string;
  city: string | null;
  state: string | null;
  tee_name: string | null;
  par_total: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  is_verified: boolean;
  is_public: boolean;
  use_count: number;
};

const emptyForm = {
  course_name: "",
  city: "",
  state: "",
  tee_name: "Blue",
  par_total: "72",
  course_rating: "72.0",
  slope_rating: "113",
  is_verified: true,
  is_public: true,
};

export default function AdminCourseDatabase() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-course-database"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_database" as any)
        .select("id, course_name, city, state, tee_name, par_total, course_rating, slope_rating, is_verified, is_public, use_count")
        .order("course_name");
      if (error) throw error;
      return (data as unknown as CourseRow[]) || [];
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return courses;
    return courses.filter(
      (c) =>
        c.course_name.toLowerCase().includes(s) ||
        (c.city || "").toLowerCase().includes(s) ||
        (c.state || "").toLowerCase().includes(s),
    );
  }, [courses, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: CourseRow) => {
    setEditing(c);
    setForm({
      course_name: c.course_name,
      city: c.city || "",
      state: c.state || "",
      tee_name: c.tee_name || "Blue",
      par_total: String(c.par_total ?? 72),
      course_rating: String(c.course_rating ?? 72.0),
      slope_rating: String(c.slope_rating ?? 113),
      is_verified: c.is_verified,
      is_public: c.is_public,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.course_name.trim()) throw new Error("Course name required");
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        course_name: form.course_name.trim(),
        city: form.city.trim() || null,
        state: form.state || null,
        tee_name: form.tee_name || null,
        par_total: parseInt(form.par_total) || null,
        course_rating: parseFloat(form.course_rating) || null,
        slope_rating: parseInt(form.slope_rating) || null,
        is_verified: form.is_verified,
        is_public: form.is_public,
      };
      if (editing) {
        const { error } = await supabase.from("course_database" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from("course_database" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Course updated" : "Course added" });
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-course-database"] });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_database" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Course removed" });
      qc.invalidateQueries({ queryKey: ["admin-course-database"] });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const handleDelete = (c: CourseRow) => {
    if (!confirm(`Delete "${c.course_name}" from the course library? This cannot be undone.`)) return;
    deleteMutation.mutate(c.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Admin · Course Database" description="Manage the shared golf course library." />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
        </Button>

        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5 text-primary" /> Golf Course Database
              </CardTitle>
              <CardDescription>
                Shared library used by organizers. Add, edit, and remove courses available across the platform.
              </CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Course
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search courses by name, city, or state…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />

            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline" /> Loading…
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Tees</TableHead>
                      <TableHead className="text-right">Par</TableHead>
                      <TableHead className="text-right">CR / SR</TableHead>
                      <TableHead className="text-right">Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No courses found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.course_name}</TableCell>
                          <TableCell>{[c.city, c.state].filter(Boolean).join(", ") || "—"}</TableCell>
                          <TableCell>{c.tee_name || "—"}</TableCell>
                          <TableCell className="text-right">{c.par_total ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">
                            {c.course_rating ?? "—"} / {c.slope_rating ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">{c.use_count}</TableCell>
                          <TableCell>
                            {c.is_verified && (
                              <span className="inline-flex items-center text-xs text-primary">
                                <CheckCircle2 className="h-3 w-3 mr-0.5" /> Verified
                              </span>
                            )}
                            {!c.is_public && <span className="text-xs text-muted-foreground ml-2">Private</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Course" : "Add Course"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Course Name</Label>
                <Input value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label>State</Label>
                  <Select value={form.state || "none"} onValueChange={(v) => setForm({ ...form, state: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="none">—</SelectItem>
                      {US_STATES.map((s) => (
                        <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tee Name</Label>
                  <Input value={form.tee_name} onChange={(e) => setForm({ ...form, tee_name: e.target.value })} />
                </div>
                <div>
                  <Label>Par Total</Label>
                  <Input type="number" value={form.par_total} onChange={(e) => setForm({ ...form, par_total: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Course Rating</Label>
                  <Input type="number" step="0.1" value={form.course_rating} onChange={(e) => setForm({ ...form, course_rating: e.target.value })} />
                </div>
                <div>
                  <Label>Slope Rating</Label>
                  <Input type="number" value={form.slope_rating} onChange={(e) => setForm({ ...form, slope_rating: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <Label className="text-sm">Verified</Label>
                  <p className="text-xs text-muted-foreground">Curated by TeeVents staff.</p>
                </div>
                <Switch checked={form.is_verified} onCheckedChange={(v) => setForm({ ...form, is_verified: v })} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <Label className="text-sm">Public in library</Label>
                  <p className="text-xs text-muted-foreground">Show in organizer search results.</p>
                </div>
                <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editing ? "Save changes" : "Add course"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
