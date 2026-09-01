import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import PairingsTemplateBuilder, { type TemplateSlot } from "@/components/dashboard/PairingsTemplateBuilder";
import {
  dayCfgOf, defaultPairingsDayCfg, parsePairingsConfig, type PairingsConfig,
} from "@/lib/pairingsConfig";
import type { ScoringEvent } from "@/lib/collegeScoringAdapter";

const FORMATS = [
  "Stroke Play",
  "Stableford",
  "Match Play",
  "Best Ball",
  "Scramble",
  "Shamble",
  "Modified Stableford",
];

/**
 * College pairings setup: reusable tee-time / shotgun templates, group size
 * (threesomes or foursomes) and a per-round format so a multi-round college
 * event can change format between rounds.
 */
export function CollegePairingsCard({ event }: { event: ScoringEvent }) {
  const [cfg, setCfg] = useState<PairingsConfig | null>(null);
  const [groupSize, setGroupSize] = useState(4);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("tournaments")
      .select("pairings_config, pairings_group_size")
      .eq("id", event.id)
      .maybeSingle();
    setCfg(parsePairingsConfig(data?.pairings_config));
    setGroupSize(Number(data?.pairings_group_size) === 3 ? 3 : 4);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const persist = async (next: PairingsConfig, size = groupSize) => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("tournaments")
      .update({ pairings_config: next as any, pairings_group_size: size })
      .eq("id", event.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCfg(next);
    toast.success("Pairings setup saved");
  };

  /** Turns a saved template into empty starting-hole slots + tee times. */
  const applyTemplate = async (slots: TemplateSlot[], startType: "tee_time" | "shotgun") => {
    if (!cfg) return;
    const labels: Record<string, string> = { ...cfg.labels };
    const teeTimes: Record<string, string> = {};
    const emptyGroups: number[] = [];
    slots.forEach((s, i) => {
      const g = i + 1;
      labels[String(g)] = String(s.hole);
      if (s.tee_time) teeTimes[String(g)] = s.tee_time;
      emptyGroups.push(g);
    });
    const day = cfg.activeRound || 0;
    const next: PairingsConfig = {
      ...cfg,
      labels,
      teeTimesByDay: { ...cfg.teeTimesByDay, [String(day)]: teeTimes },
      byDay: {
        ...cfg.byDay,
        [String(day)]: {
          ...dayCfgOf(cfg, day),
          startFormat: startType === "shotgun" ? "shotgun" : "tee_times",
          sameStartHole: startType !== "shotgun",
        },
      },
      emptyGroups,
    };
    await persist(next);
  };

  const setRoundFormat = async (round: number, value: string) => {
    if (!cfg) return;
    const key = String(round);
    const next: PairingsConfig = {
      ...cfg,
      rounds: Math.max(cfg.rounds, event.rounds),
      byDay: {
        ...cfg.byDay,
        [key]: { ...defaultPairingsDayCfg(), ...(cfg.byDay[key] || {}), roundFormat: value },
      },
    };
    await persist(next);
  };

  if (!cfg) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const roundList = Array.from({ length: Math.max(1, event.rounds) }, (_, i) => i);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pairings templates &amp; group size</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Group size</Label>
              <Select
                value={String(groupSize)}
                onValueChange={(v) => {
                  setGroupSize(Number(v));
                  persist(cfg, Number(v));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Threesomes (3 per group)</SelectItem>
                  <SelectItem value="4">Foursomes (4 per group)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Starting-hole template</Label>
              <PairingsTemplateBuilder
                tournamentId={event.id}
                onApply={applyTemplate}
                disabled={saving}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Build and save a tee-time or shotgun structure, then apply it to create the starting-hole slots.
            Drag players onto those holes on the Players &amp; Pairings board.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to={`/dashboard/players?tournament=${event.id}#pairings`}>
              <Users className="h-3.5 w-3.5 mr-1.5" /> Open pairings board
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Format per round</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {roundList.map((day) => (
            <div key={day} className="space-y-1">
              <Label>Round {day + 1}</Label>
              <Select
                value={dayCfgOf(cfg, day).roundFormat || "Stroke Play"}
                onValueChange={(v) => setRoundFormat(day, v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default CollegePairingsCard;
