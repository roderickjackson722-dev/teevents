import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Plus, Pencil, Trash2, Search, Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";

interface Note {
  id: string;
  tournament_id: string;
  user_id: string;
  title: string;
  content: string | null;
  due_date: string | null;
  is_completed: boolean;
  priority: "low" | "medium" | "high";
  category: string;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "vendors", label: "Vendors" },
  { value: "sponsors", label: "Sponsors" },
  { value: "scoring", label: "Scoring" },
  { value: "check-in", label: "Check-In" },
  { value: "day-of", label: "Day-Of" },
  { value: "post-event", label: "Post-Event" },
];

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  medium: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
  low: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface EditorState {
  open: boolean;
  editing: Note | null;
}

const emptyForm = {
  title: "",
  content: "",
  due_date: "",
  category: "general",
  priority: "medium" as "low" | "medium" | "high",
  reminder_enabled: false,
};

export default function OrganizerNotes() {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<{ id: string; title: string }[]>([]);
  const [tournamentId, setTournamentId] = useState<string>("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [editor, setEditor] = useState<EditorState>({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load tournaments for the org
  useEffect(() => {
    if (!org) return;
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false });
      const list = (data || []) as { id: string; title: string }[];
      setTournaments(list);
      if (list.length) setTournamentId(pickTournamentId(list, tournamentId));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  const loadNotes = async () => {
    if (!tournamentId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("organizer_notes")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("is_completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Failed to load notes: " + error.message);
      return;
    }
    setNotes((data as Note[]) || []);
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditor({ open: true, editing: null });
  };
  const openEdit = (n: Note) => {
    setForm({
      title: n.title,
      content: n.content || "",
      due_date: n.due_date || "",
      category: n.category || "general",
      priority: n.priority,
      reminder_enabled: n.reminder_enabled,
    });
    setEditor({ open: true, editing: n });
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!tournamentId) return;
    setSaving(true);
    const payload = {
      tournament_id: tournamentId,
      title: form.title.trim(),
      content: form.content.trim() || null,
      due_date: form.due_date || null,
      category: form.category,
      priority: form.priority,
      reminder_enabled: form.reminder_enabled,
    };
    let error;
    if (editor.editing) {
      ({ error } = await (supabase as any)
        .from("organizer_notes")
        .update(payload)
        .eq("id", editor.editing.id));
    } else {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) {
        setSaving(false);
        toast.error("You must be signed in");
        return;
      }
      ({ error } = await (supabase as any)
        .from("organizer_notes")
        .insert({ ...payload, user_id }));
    }
    setSaving(false);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    toast.success(editor.editing ? "Note updated" : "Note added");
    setEditor({ open: false, editing: null });
    loadNotes();
  };

  const toggleComplete = async (n: Note) => {
    const { error } = await (supabase as any)
      .from("organizer_notes")
      .update({ is_completed: !n.is_completed })
      .eq("id", n.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_completed: !x.is_completed } : x)));
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any)
      .from("organizer_notes")
      .delete()
      .eq("id", deleteId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Note deleted");
    setDeleteId(null);
    loadNotes();
  };

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (!showCompleted && n.is_completed) return false;
      if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
      if (priorityFilter !== "all" && n.priority !== priorityFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !(n.content || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [notes, search, categoryFilter, priorityFilter, showCompleted]);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Notes & Reminders
          </h1>
          <p className="text-muted-foreground mt-1">
            Keep track of tasks, reminders, and notes for your event.
          </p>
        </div>
        <Button onClick={openAdd} disabled={!tournamentId}>
          <Plus className="h-4 w-4 mr-1" /> Add Note
        </Button>
      </div>

      {tournaments.length > 1 && (
        <div className="max-w-sm">
          <Label className="text-xs text-muted-foreground">Tournament</Label>
          <Select value={tournamentId} onValueChange={setTournamentId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
          Show completed
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !tournamentId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Create a tournament first to start adding notes.
        </CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {notes.length === 0 ? "No notes yet — add your first one!" : "No notes match your filters."}
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((n) => {
            const dLeft = daysUntil(n.due_date);
            const overdue = dLeft !== null && dLeft < 0 && !n.is_completed;
            const soon = dLeft !== null && dLeft >= 0 && dLeft <= 3 && !n.is_completed;
            return (
              <Card key={n.id} className={n.is_completed ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={n.is_completed}
                      onCheckedChange={() => toggleComplete(n)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-semibold ${n.is_completed ? "line-through" : ""}`}>
                          {n.title}
                        </h3>
                        <Badge variant="outline" className={PRIORITY_STYLES[n.priority]}>
                          {n.priority}
                        </Badge>
                        <Badge variant="secondary">
                          {CATEGORIES.find((c) => c.value === n.category)?.label || n.category}
                        </Badge>
                        {n.reminder_enabled && (
                          <Badge variant="outline" className="gap-1"><CalendarClock className="h-3 w-3" />Reminder</Badge>
                        )}
                      </div>
                      {n.content && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.content}</p>
                      )}
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {n.due_date && <span>Due: {new Date(n.due_date + "T00:00:00").toLocaleDateString()}</span>}
                        <span>Created: {new Date(n.created_at).toLocaleDateString()}</span>
                        {overdue && <span className="text-red-600 font-medium">⚠️ Overdue by {Math.abs(dLeft!)} day{Math.abs(dLeft!) === 1 ? "" : "s"}</span>}
                        {soon && <span className="text-orange-600 font-medium">⚠️ {dLeft === 0 ? "Due today" : `${dLeft} day${dLeft === 1 ? "" : "s"} remaining`}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(n)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(n.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editor.open} onOpenChange={(o) => setEditor({ open: o, editing: o ? editor.editing : null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editor.editing ? "Edit Note" : "Add Note / Reminder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Order trophies and awards"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                placeholder="Details, links, contacts…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.reminder_enabled}
                onCheckedChange={(v) => setForm({ ...form, reminder_enabled: !!v })}
              />
              Set reminder notification
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor({ open: false, editing: null })} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
