import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, MonitorSmartphone, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type VisibilityField = "show_on_scoring_page" | "show_on_leaderboard";

interface Row {
  id: string;
  name: string;
  tier: string;
  visible: boolean;
}

const TIER_LABEL: Record<string, string> = {
  title: "Title Sponsor",
  platinum: "Platinum Sponsor",
  gold: "Gold Sponsor",
  silver: "Silver Sponsor",
  bronze: "Bronze Sponsor",
  hole: "Hole Sponsor",
  inkind: "In-Kind Sponsor",
};

const tierOrder: Record<string, number> = {
  title: 0, platinum: 1, gold: 2, silver: 3, bronze: 4, hole: 5, inkind: 6,
};

/**
 * Lets organizers choose which sponsors appear on a player-facing surface —
 * either the scoring page or the live leaderboard.
 */
export default function ScoringPageSponsorsCard({
  tournamentId,
  field = "show_on_scoring_page",
}: {
  tournamentId: string;
  field?: VisibilityField;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isLeaderboard = field === "show_on_leaderboard";
  const surface = isLeaderboard ? "live leaderboard" : "scoring page";

  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("tournament_sponsors")
        .select("id, name, tier, show_on_scoring_page, show_on_leaderboard")
        .eq("tournament_id", tournamentId);
      if (cancelled) return;
      const list: Row[] = ((data as any[]) || []).map((r) => ({
        id: r.id,
        name: r.name,
        tier: r.tier,
        visible: r[field] !== false,
      }));
      list.sort(
        (a, b) =>
          (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99) ||
          (a.name || "").localeCompare(b.name || ""),
      );
      setRows(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tournamentId, field]);

  const allSelected = rows.length > 0 && rows.every((r) => r.visible);

  const toggleAll = (checked: boolean) =>
    setRows((prev) => prev.map((r) => ({ ...r, visible: checked })));

  const toggleOne = (id: string, checked: boolean) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, visible: checked } : r)));

  const save = async () => {
    setSaving(true);
    const results = await Promise.all(
      rows.map((r) =>
        supabase
          .from("tournament_sponsors")
          .update({ [field]: r.visible } as any)
          .eq("id", r.id)
      )
    );
    setSaving(false);
    const err = results.find((r) => r.error)?.error;
    if (err) toast({ title: "Save failed", description: err.message, variant: "destructive" });
    else toast({ title: "Sponsor display settings saved" });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isLeaderboard ? <Trophy className="h-5 w-5" /> : <MonitorSmartphone className="h-5 w-5" />}
          {isLeaderboard ? "Sponsors on Live Leaderboard" : "Display on Scoring Page"}
        </CardTitle>
        <CardDescription>
          Select which sponsors to display on the {surface}.
          {rows.length > 0 && ` ${rows.length} sponsor${rows.length === 1 ? "" : "s"} added.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sponsors added yet.</p>
        ) : (
          <>
            <div className="border rounded-lg divide-y">
              <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer">
                <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} />
                <span className="text-sm font-semibold">Select All</span>
              </label>
              {rows.map((r) => (
                <label key={r.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer">
                  <Checkbox
                    checked={r.visible}
                    onCheckedChange={(v) => toggleOne(r.id, !!v)}
                  />
                  <span className="text-sm">
                    {TIER_LABEL[r.tier] || r.tier} <span className="text-muted-foreground">({r.name})</span>
                  </span>
                </label>
              ))}
            </div>
            <Button onClick={save} disabled={saving} style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Sponsor Display Settings"}
            </Button>
            <Label className="block text-xs text-muted-foreground">
              Sponsors you unselect stay on your public page — they just won't appear on the {surface}.
            </Label>
          </>
        )}
      </CardContent>
    </Card>
  );
}
