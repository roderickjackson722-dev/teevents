import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PHASE_LABELS, PHASE_ORDER, type ChecklistPhase } from "@/hooks/useSetupChecklist";

interface Task {
  id: string;
  task_key: string;
  task_name: string;
  description: string | null;
  phase: ChecklistPhase;
  required: boolean;
  link: string | null;
  display_order: number;
  auto_complete: boolean;
}

const BLANK: Omit<Task, "id"> = {
  task_key: "",
  task_name: "",
  description: "",
  phase: "tournament",
  required: true,
  link: "",
  display_order: 999,
  auto_complete: false,
};

export default function AdminSetupChecklist() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<Task, "id">>(BLANK);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("setup_checklist_tasks")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) {
      toast({ title: "Failed to load tasks", description: error.message, variant: "destructive" });
    } else {
      setTasks((data ?? []) as Task[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateTask = async (id: string, patch: Partial<Task>) => {
    setSavingId(id);
    const { error } = await supabase
      .from("setup_checklist_tasks")
      .update(patch as any)
      .eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } as Task : t)));
      toast({ title: "Saved" });
    }
    setSavingId(null);
  };

  const reorder = async (id: string, dir: -1 | 1) => {
    const idx = tasks.findIndex((t) => t.id === id);
    const swapWith = tasks[idx + dir];
    if (!swapWith) return;
    const a = tasks[idx];
    await Promise.all([
      supabase.from("setup_checklist_tasks").update({ display_order: swapWith.display_order } as any).eq("id", a.id),
      supabase.from("setup_checklist_tasks").update({ display_order: a.display_order } as any).eq("id", swapWith.id),
    ]);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this checklist task? Existing per-tournament progress for it will also be removed.")) return;
    const { error } = await supabase.from("setup_checklist_tasks").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Task deleted" });
      load();
    }
  };

  const addTask = async () => {
    if (!draft.task_key.trim() || !draft.task_name.trim()) {
      toast({ title: "Task key and name are required", variant: "destructive" });
      return;
    }
    setAdding(true);
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.display_order)) : 0;
    const { error } = await supabase.from("setup_checklist_tasks").insert({
      ...draft,
      display_order: draft.display_order || maxOrder + 10,
    } as any);
    if (error) toast({ title: "Add failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Task added" });
      setDraft(BLANK);
      load();
    }
    setAdding(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Group by phase for visual clarity
  const grouped = PHASE_ORDER.map((phase) => ({
    phase,
    tasks: tasks.filter((t) => t.phase === phase),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">Setup Checklist Manager</h2>
        <p className="text-sm text-muted-foreground">
          Add, remove, and reorder checklist tasks shown to organizers in their tournament dashboard.
          Changes apply to every tournament.
        </p>
      </div>

      {/* Add new task */}
      <Card className="p-4 border-dashed">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add a task
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Task key (machine name)</Label>
            <Input
              value={draft.task_key}
              onChange={(e) => setDraft({ ...draft, task_key: e.target.value })}
              placeholder="e.g. confirm_sponsors"
            />
          </div>
          <div>
            <Label className="text-xs">Task name</Label>
            <Input
              value={draft.task_name}
              onChange={(e) => setDraft({ ...draft, task_name: e.target.value })}
              placeholder="e.g. Confirm sponsor logos"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Description (optional)</Label>
            <Textarea
              rows={2}
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Phase</Label>
            <Select
              value={draft.phase}
              onValueChange={(v) => setDraft({ ...draft, phase: v as ChecklistPhase })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PHASE_ORDER.map((p) => (
                  <SelectItem key={p} value={p}>{PHASE_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Link URL</Label>
            <Input
              value={draft.link ?? ""}
              onChange={(e) => setDraft({ ...draft, link: e.target.value })}
              placeholder="/dashboard/..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.required}
              onCheckedChange={(v) => setDraft({ ...draft, required: v })}
            />
            <Label className="text-xs">Required</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.auto_complete}
              onCheckedChange={(v) => setDraft({ ...draft, auto_complete: v })}
            />
            <Label className="text-xs">Auto-completes on save</Label>
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={addTask} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add task
          </Button>
        </div>
      </Card>

      {/* Tasks grouped by phase */}
      {grouped.map(({ phase, tasks: phaseTasks }) => (
        <div key={phase}>
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">
            {PHASE_LABELS[phase]} <span className="text-xs">({phaseTasks.length})</span>
          </h3>
          <div className="space-y-2">
            {phaseTasks.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No tasks in this phase.</p>
            )}
            {phaseTasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => reorder(task.id, -1)}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => reorder(task.id, 1)}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex-1 grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={task.task_name}
                        onChange={(e) =>
                          setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, task_name: e.target.value } : t))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Link URL</Label>
                      <Input
                        value={task.link ?? ""}
                        onChange={(e) =>
                          setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, link: e.target.value } : t))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        rows={2}
                        value={task.description ?? ""}
                        onChange={(e) =>
                          setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, description: e.target.value } : t))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Phase</Label>
                      <Select
                        value={task.phase}
                        onValueChange={(v) =>
                          setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, phase: v as ChecklistPhase } : t))
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PHASE_ORDER.map((p) => (
                            <SelectItem key={p} value={p}>{PHASE_LABELS[p]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={task.required}
                          onCheckedChange={(v) =>
                            setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, required: v } : t))
                          }
                        />
                        <Label className="text-xs">Required</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={task.auto_complete}
                          onCheckedChange={(v) =>
                            setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, auto_complete: v } : t))
                          }
                        />
                        <Label className="text-xs">Auto</Label>
                      </div>
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between gap-2 pt-2 border-t">
                      <Badge variant="outline" className="text-[10px]">key: {task.task_key}</Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTask(task.id, {
                              task_name: task.task_name,
                              description: task.description,
                              phase: task.phase,
                              required: task.required,
                              auto_complete: task.auto_complete,
                              link: task.link,
                            })
                          }
                          disabled={savingId === task.id}
                        >
                          {savingId === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                          Save
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(task.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
