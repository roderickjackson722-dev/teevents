import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";
import { validateMinimumDrives } from "@/lib/flightPayouts";

interface Row {
  id: string;
  first_name: string;
  last_name: string;
  group_number: number | null;
  drives_used: number | null;
}

interface Props {
  tournamentId: string;
  /** holes in the round, used to warn when the minimum can no longer be met */
  holes?: number;
}

export default function MinimumDrivesTracker({ tournamentId, holes = 18 }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [required, setRequired] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes, pRes] = await Promise.all([
      (supabase as any).from("tournaments").select("min_drives_per_player").eq("id", tournamentId).maybeSingle(),
      (supabase as any)
        .from("tournament_registrations")
        .select("id, first_name, last_name, group_number, drives_used")
        .eq("tournament_id", tournamentId)
        .order("group_number", { ascending: true }),
    ]);
    setRequired(Number(tRes.data?.min_drives_per_player) || 0);
    setRows(pRes.data || []);
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) load();
  }, [tournamentId, load]);

  const groups = useMemo(() => {
    const map = new Map<number | "unassigned", Row[]>();
    for (const r of rows) {
      const key = r.group_number ?? "unassigned";
      map.set(key, [...(map.get(key) || []), r]);
    }
    return [...map.entries()];
  }, [rows]);

  const setDrives = (id: string, v: number) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, drives_used: v } : r)));

  const saveAll = async () => {
    setSaving(true);
    try {
      const { error: tErr } = await (supabase as any)
        .from("tournaments")
        .update({ min_drives_per_player: Math.max(0, Math.floor(required) || 0) })
        .eq("id", tournamentId);
      if (tErr) throw tErr;
      for (const r of rows) {
        const { error } = await (supabase as any)
          .from("tournament_registrations")
          .update({ drives_used: Math.max(0, Math.floor(r.drives_used || 0)) })
          .eq("id", r.id);
        if (error) throw error;
      }
      toast({ title: "Drive counts saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading drive tracking…</p>;

  const anyInvalid = groups.some(([key, members]) => {
    if (key === "unassigned") return false;
    return !validateMinimumDrives(members, (m) => m.drives_used, required, holes).valid;
  });

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold">Minimum Drives per Player</h3>
          <p className="text-sm text-muted-foreground">
            Every player's tee shot must be used at least this many times. Teams that fall short are flagged before
            results are posted.
          </p>
        </div>
        <div className="w-40">
          <Label className="text-xs">Required drives</Label>
          <Input type="number" min={0} max={holes} value={required} onChange={(e) => setRequired(Number(e.target.value))} />
        </div>
      </div>

      {required === 0 ? (
        <p className="text-sm text-muted-foreground">Set a number above 0 to enforce a minimum-drive rule.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(([key, members]) => {
            const result = validateMinimumDrives(members, (m) => m.drives_used, required, holes);
            const isGroup = key !== "unassigned";
            return (
              <div key={String(key)} className="rounded-md border bg-card p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{isGroup ? `Group ${key}` : "Unassigned players"}</span>
                  {isGroup && (
                    result.valid ? (
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Minimum met
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {result.totalShort} drive{result.totalShort === 1 ? "" : "s"} short
                      </Badge>
                    )
                  )}
                  {isGroup && (
                    <span className="text-xs text-muted-foreground">
                      {result.totalDrives}/{holes} drives recorded · {result.drivesRemaining} left
                    </span>
                  )}
                  {isGroup && result.impossible && (
                    <Badge variant="destructive" className="text-xs">Cannot be met with holes remaining</Badge>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {result.rows.map(({ player, drivesUsed, short, meetsRequirement }) => (
                    <div key={player.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 text-sm truncate">
                        {player.first_name} {player.last_name}
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={holes}
                        className={`h-8 w-20 ${!meetsRequirement && isGroup ? "border-destructive" : ""}`}
                        value={drivesUsed}
                        onChange={(e) => setDrives(player.id, Number(e.target.value))}
                      />
                      {isGroup && !meetsRequirement && (
                        <span className="text-xs text-destructive whitespace-nowrap">need {short}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={saveAll} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Drive Counts
        </Button>
        {required > 0 && anyInvalid && (
          <span className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> One or more teams do not meet the minimum-drive rule.
          </span>
        )}
      </div>
    </div>
  );
}
