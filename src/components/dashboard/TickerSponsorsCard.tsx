import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Source = "sponsor" | "registration";

interface Row {
  key: string;
  id: string;
  source: Source;
  name: string;
  tierLabel: string;
  tierRank: number;
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

const tierRank: Record<string, number> = {
  title: 0, platinum: 1, gold: 2, silver: 3, bronze: 4, hole: 5, inkind: 6,
};

/**
 * Scrolling Ticker Sponsors — combines manually added tournament sponsors with
 * paid/approved public Sponsor Registrations so organizers can pick exactly
 * which logos and names appear in the live leaderboard scrolling ticker.
 */
export default function TickerSponsorsCard({ tournamentId }: { tournamentId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [sponsorsRes, regsRes, tiersRes] = await Promise.all([
        supabase
          .from("tournament_sponsors")
          .select("id, name, tier, show_on_leaderboard")
          .eq("tournament_id", tournamentId),
        supabase
          .from("sponsor_registrations")
          .select("id, company_name, tier_id, payment_status, manually_approved, show_on_public, is_title_sponsor, show_on_leaderboard")
          .eq("tournament_id", tournamentId),
        supabase
          .from("sponsorship_tiers")
          .select("id, name")
          .eq("tournament_id", tournamentId),
      ]);
      if (cancelled) return;

      const tierNames = new Map<string, string>(
        ((tiersRes.data as any[]) || []).map((t) => [t.id, t.name as string]),
      );

      const list: Row[] = [];

      ((sponsorsRes.data as any[]) || []).forEach((s) => {
        list.push({
          key: `sponsor:${s.id}`,
          id: s.id,
          source: "sponsor",
          name: s.name || "Sponsor",
          tierLabel: TIER_LABEL[s.tier] || s.tier || "Sponsor",
          tierRank: tierRank[s.tier] ?? 90,
          visible: s.show_on_leaderboard !== false,
        });
      });

      // Every sponsor submitted through Sponsorship Management is selectable here —
      // including ones still awaiting payment — so the list never silently drops one.
      ((regsRes.data as any[]) || [])
        .forEach((r) => {
          const label = r.is_title_sponsor ? "Title Sponsor" : tierNames.get(r.tier_id) || "Sponsor";
          const unpaid = r.payment_status !== "paid" && r.manually_approved !== true;
          list.push({
            key: `registration:${r.id}`,
            id: r.id,
            source: "registration",
            name: `${r.company_name || "Sponsor"}${unpaid ? " — payment pending" : ""}`,
            tierLabel: label,
            tierRank: r.is_title_sponsor ? 0 : tierRank[String(label).toLowerCase().split(" ")[0]] ?? 91,
            visible: r.show_on_leaderboard !== false,
          });
        });


      list.sort((a, b) => a.tierRank - b.tierRank || a.name.localeCompare(b.name));
      setRows(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tournamentId]);

  const allSelected = useMemo(() => rows.length > 0 && rows.every((r) => r.visible), [rows]);

  const toggleAll = (checked: boolean) => setRows((p) => p.map((r) => ({ ...r, visible: checked })));
  const toggleOne = (key: string, checked: boolean) =>
    setRows((p) => p.map((r) => (r.key === key ? { ...r, visible: checked } : r)));

  const save = async () => {
    setSaving(true);
    const results = await Promise.all(
      rows.map((r) =>
        r.source === "sponsor"
          ? supabase.from("tournament_sponsors").update({ show_on_leaderboard: r.visible } as any).eq("id", r.id)
          : supabase.from("sponsor_registrations").update({ show_on_leaderboard: r.visible } as any).eq("id", r.id),
      ),
    );
    setSaving(false);
    const err = results.find((r) => r.error)?.error;
    if (err) toast({ title: "Save failed", description: err.message, variant: "destructive" });
    else toast({ title: "Ticker sponsors saved" });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> Scrolling Ticker Sponsors
        </CardTitle>
        <CardDescription>
          Select which sponsors appear in the scrolling ticker on the live leaderboard. Includes sponsors you added
          manually plus paid Sponsor Registrations.
          {rows.length > 0 && ` ${rows.length} sponsor${rows.length === 1 ? "" : "s"} available.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sponsors yet. Add sponsors under Sponsorship Management, or wait for paid sponsor registrations.
          </p>
        ) : (
          <>
            <div className="border rounded-lg divide-y max-h-[420px] overflow-y-auto">
              <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer bg-muted/40 sticky top-0">
                <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} />
                <span className="text-sm font-semibold">Select All</span>
              </label>
              {rows.map((r) => (
                <label key={r.key} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer">
                  <Checkbox checked={r.visible} onCheckedChange={(v) => toggleOne(r.key, !!v)} />
                  <span className="text-sm">
                    {r.tierLabel} <span className="text-muted-foreground">– {r.name}</span>
                  </span>
                </label>
              ))}
            </div>
            <Button onClick={save} disabled={saving} style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Ticker Settings"}
            </Button>
            <Label className="block text-xs text-muted-foreground">
              With "Sponsor Display" set to All sponsors, every sponsor above scrolls regardless of these checkboxes.
              Set it to "Selected only" to honor this list.
            </Label>
          </>
        )}
      </CardContent>
    </Card>
  );
}
