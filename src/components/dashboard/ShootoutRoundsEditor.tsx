import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { SHOOTOUT_DEFAULT_ROUNDS, SHOOTOUT_ROUND_FORMATS } from "@/lib/flightPayouts";

export interface ShootoutRound {
  round: number;
  format: string;
  label: string;
  holes: number;
}

interface Props {
  tournamentId: string;
}

const withHoles = (r: { round: number; format: string; label: string; holes?: number }): ShootoutRound => ({
  round: r.round,
  format: r.format,
  label: r.label,
  holes: r.holes ?? 18,
});

export default function ShootoutRoundsEditor({ tournamentId }: Props) {
  const { toast } = useToast();
  const [rounds, setRounds] = useState<ShootoutRound[]>(SHOOTOUT_DEFAULT_ROUNDS.map(withHoles));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("tournaments")
      .select("shootout_rounds")
      .eq("id", tournamentId)
      .maybeSingle();
    const saved = data?.shootout_rounds;
    if (Array.isArray(saved) && saved.length) setRounds(saved.map(withHoles));
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) load();
  }, [tournamentId, load]);

  const update = (i: number, patch: Partial<ShootoutRound>) =>
    setRounds((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addRound = () =>
    setRounds((prev) => [
      ...prev,
      { round: prev.length + 1, format: "scramble", label: `Round ${prev.length + 1} — Scramble`, holes: 18 },
    ]);

  const removeRound = (i: number) =>
    setRounds((prev) => prev.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, round: idx + 1 })));

  const save = async () => {
    setSaving(true);
    const normalized = rounds.map((r, idx) => ({ ...r, round: idx + 1, holes: Number(r.holes) || 18 }));
    const { error } = await (supabase as any)
      .from("tournaments")
      .update({ shootout_rounds: normalized })
      .eq("id", tournamentId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setRounds(normalized);
    toast({ title: "Shootout rounds saved", description: `${normalized.length} rounds, ${totalHoles(normalized)} holes total.` });
  };

  const totalHoles = (rs: ShootoutRound[]) => rs.reduce((s, r) => s + (Number(r.holes) || 0), 0);

  if (loading) return <p className="text-sm text-muted-foreground">Loading shootout setup…</p>;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div>
        <h3 className="font-semibold">Shootout Rounds</h3>
        <p className="text-sm text-muted-foreground">
          Define the format for each round. Team scores from every round are added together for the aggregate
          leaderboard.
        </p>
      </div>

      <div className="space-y-3">
        {rounds.map((r, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_6rem_auto] sm:items-end rounded-md border bg-muted/30 p-3">
            <div className="text-sm font-semibold pb-2">#{i + 1}</div>
            <div>
              <Label className="text-xs">Format</Label>
              <Select
                value={r.format}
                onValueChange={(v) => {
                  const fmt = SHOOTOUT_ROUND_FORMATS.find((f) => f.id === v);
                  update(i, { format: v, label: `Round ${i + 1} — ${fmt?.label ?? v}` });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHOOTOUT_ROUND_FORMATS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Label shown to players</Label>
              <Input value={r.label} onChange={(e) => update(i, { label: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Holes</Label>
              <Input
                type="number"
                min={1}
                max={36}
                value={r.holes}
                onChange={(e) => update(i, { holes: Number(e.target.value) })}
              />
            </div>
            <Button size="sm" variant="ghost" onClick={() => removeRound(i)} disabled={rounds.length <= 1}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={addRound}>
          <Plus className="h-4 w-4 mr-1" /> Add Round
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Rounds
        </Button>
        <span className="text-xs text-muted-foreground">
          Aggregate: {rounds.length} rounds · {totalHoles(rounds)} holes
        </span>
      </div>
    </div>
  );
}
