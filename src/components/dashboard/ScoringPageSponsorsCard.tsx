import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, MonitorSmartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id: string;
  name: string;
  tier: string;
  show_on_scoring_page: boolean;
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
 * Lets organizers choose which sponsors appear on the player-facing scoring page.
 */
export default function ScoringPageSponsorsCard({ tournamentId }: { tournamentId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    supabase
      .from("tournament_sponsors")
      .select("id, name, tier, show_on_scoring_page")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        const list = ((data as any[]) || []).map((r) => ({
          id: r.id,
          name: r.name,
          tier: r.tier,
          show_on_scoring_page: r.show_on_scoring_page !== false,
        }));
        list.sort((a, b) => (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99));
        setRows(list);
        setLoading(false);
      });
  }, [tournamentId]);

  const allSelected = rows.length > 0 && rows.every((r) => r.show_on_scoring_page);

  const toggleAll = (checked: boolean) =>
    setRows((prev) => prev.map((r) => ({ ...r, show_on_scoring_page: checked })));

  const toggleOne = (id: string, checked: boolean) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, show_on_scoring_page: checked } : r)));

  const save = async () => {
    setSaving(true);
    const results = await Promise.all(
      rows.map((r) =>
        supabase
          .from("tournament_sponsors")
          .update({ show_on_scoring_page: r.show_on_scoring_page } as any)
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
          <MonitorSmartphone className="h-5 w-5" /> Display on Scoring Page
        </CardTitle>
        <CardDescription>Select which sponsors to display on the scoring page.</CardDescription>
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
                    checked={r.show_on_scoring_page}
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
              Sponsors you unselect stay on your public page — they just won't appear on the scoring page.
            </Label>
          </>
        )}
      </CardContent>
    </Card>
  );
}
