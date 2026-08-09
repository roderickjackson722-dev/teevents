import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LayoutGrid, Loader2, Trash2, Wand2 } from "lucide-react";

export interface TemplateSlot {
  hole: number;
  tee_time: string; // "HH:MM" 24h
}

interface SavedTemplate {
  id: string;
  template_name: string;
  start_type: string;
  slots: TemplateSlot[];
}

interface Props {
  tournamentId: string;
  /** Applies the saved structure to the pairings board (empty holes + tee times). */
  onApply: (slots: TemplateSlot[], startType: "tee_time" | "shotgun") => void;
  disabled?: boolean;
}

const fmt12 = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  if (!m) return t || "";
  let h = parseInt(m[1], 10);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
};

const addMinutes = (t: string, mins: number) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "08:00");
  const base = m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 480;
  const total = ((base + mins) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * Lets organizers build the tee time / shotgun structure (holes + start times)
 * before any players are registered, save it as a reusable template, and later
 * apply it so players can be dragged into the prepared slots.
 */
export default function PairingsTemplateBuilder({ tournamentId, onApply, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [startType, setStartType] = useState<"tee_time" | "shotgun">("tee_time");
  const [groupCount, setGroupCount] = useState(18);
  const [firstTime, setFirstTime] = useState("08:00");
  const [interval, setInterval] = useState(10);
  const [startHole, setStartHole] = useState(1);
  const [slots, setSlots] = useState<TemplateSlot[]>([]);

  const load = async () => {
    if (!tournamentId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("pairings_templates")
      .select("id, template_name, start_type, slots")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: false });
    setSaved(
      ((data as any[]) || []).map((r) => ({
        id: r.id,
        template_name: r.template_name,
        start_type: r.start_type,
        slots: Array.isArray(r.slots) ? r.slots : [],
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tournamentId]);

  const generate = () => {
    const n = Math.max(1, Math.min(60, Math.floor(groupCount) || 1));
    const next: TemplateSlot[] = Array.from({ length: n }, (_, i) => {
      if (startType === "shotgun") {
        const hole = ((startHole - 1 + i) % 18) + 1;
        return { hole, tee_time: firstTime };
      }
      return { hole: startHole, tee_time: addMinutes(firstTime, i * (Math.max(1, interval) || 10)) };
    });
    setSlots(next);
  };

  const patchSlot = (i: number, patch: Partial<TemplateSlot>) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const save = async () => {
    if (!slots.length) {
      toast.error("Generate the slots first");
      return;
    }
    if (!name.trim()) {
      toast.error("Give the template a name");
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("pairings_templates").insert({
      tournament_id: tournamentId,
      template_name: name.trim(),
      start_type: startType,
      slots,
      created_by: auth?.user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Could not save the template");
      return;
    }
    toast.success("Template saved");
    setName("");
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("pairings_templates").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSaved((p) => p.filter((t) => t.id !== id));
  };

  const apply = (t: SavedTemplate) => {
    onApply(t.slots, (t.start_type === "shotgun" ? "shotgun" : "tee_time"));
    setOpen(false);
    toast.success(`Applied "${t.template_name}" — drag players into the slots`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <LayoutGrid className="h-4 w-4 mr-1" /> Pairings Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Pairings Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Build the structure now (holes and start times) — no players needed. Apply it later and drag
            players into the prepared slots.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tmpl-name">Template Name</Label>
              <Input
                id="tmpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Round 1 — Tee Times"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Start Type</Label>
              <div className="flex gap-3 pt-1">
                {(["tee_time", "shotgun"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="tmpl-start"
                      checked={startType === k}
                      onChange={() => setStartType(k)}
                    />
                    {k === "tee_time" ? "Tee Time Start" : "Shotgun Start"}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-count">Number of Groups</Label>
              <Input
                id="tmpl-count"
                type="number"
                min={1}
                max={60}
                value={groupCount}
                onChange={(e) => setGroupCount(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-time">{startType === "shotgun" ? "Shotgun Time" : "First Tee Time"}</Label>
              <Input id="tmpl-time" type="time" value={firstTime} onChange={(e) => setFirstTime(e.target.value)} />
            </div>

            {startType === "tee_time" ? (
              <div className="space-y-1.5">
                <Label htmlFor="tmpl-int">Interval (minutes)</Label>
                <Input
                  id="tmpl-int"
                  type="number"
                  min={1}
                  max={60}
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-hole">{startType === "shotgun" ? "First Hole" : "Starting Hole"}</Label>
              <Input
                id="tmpl-hole"
                type="number"
                min={1}
                max={18}
                value={startHole}
                onChange={(e) => setStartHole(Number(e.target.value))}
              />
            </div>
          </div>

          <Button size="sm" variant="outline" onClick={generate}>
            <Wand2 className="h-4 w-4 mr-1" /> Generate Slots
          </Button>

          {slots.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Group</th>
                    <th className="px-3 py-2 text-left font-semibold">Hole</th>
                    <th className="px-3 py-2 text-left font-semibold">Tee Time</th>
                    <th className="px-3 py-2 text-left font-semibold">Players</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((s, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-8 w-20"
                          type="number"
                          min={1}
                          max={18}
                          value={s.hole}
                          onChange={(e) => patchSlot(i, { hole: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-8 w-32"
                          type="time"
                          value={s.tee_time}
                          onChange={(e) => patchSlot(i, { tee_time: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">Drop players here after applying</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Save Template
            </Button>
            {slots.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onApply(slots, startType);
                  setOpen(false);
                  toast.success("Structure applied — drag players into the slots");
                }}
              >
                Apply to Pairings
              </Button>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground mb-2">Saved Templates</p>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : saved.length === 0 ? (
              <p className="text-xs text-muted-foreground">No templates saved yet for this tournament.</p>
            ) : (
              <div className="space-y-2">
                {saved.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2"
                  >
                    <div className="min-w-[12rem] flex-1">
                      <p className="text-sm font-medium text-foreground">{t.template_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.start_type === "shotgun" ? "Shotgun" : "Tee times"} · {t.slots.length} groups
                        {t.slots.length ? ` · starts ${fmt12(t.slots[0].tee_time)}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => apply(t)}>
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setName(t.template_name);
                        setStartType(t.start_type === "shotgun" ? "shotgun" : "tee_time");
                        setSlots(t.slots);
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
