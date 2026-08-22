import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Save, Coins, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatCents } from "@/lib/formatCurrency";
import { recomputeDivisionSkins, type SkinsGame } from "@/lib/divisionSkins";

type Division = { id: string; tier_name: string; display_order: number };
type WinnerRow = { hole_number: number; score: number | null; amount_cents: number; registration_id: string | null };

export default function DivisionSkinsManager({ tournamentId }: { tournamentId: string }) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [games, setGames] = useState<SkinsGame[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [purse, setPurse] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<"gross" | "net">("gross");
  const [carryover, setCarryover] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});
  const [winners, setWinners] = useState<Record<string, WinnerRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [computing, setComputing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [dRes, gRes, rRes] = await Promise.all([
      supabase
        .from("tournament_tiers")
        .select("id, tier_name, display_order")
        .eq("tournament_id", tournamentId)
        .eq("is_active", true)
        .order("display_order"),
      (supabase as any).from("division_skins_games").select("*").eq("tournament_id", tournamentId),
      supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name")
        .eq("tournament_id", tournamentId),
    ]);

    const divs = (dRes.data as Division[]) || [];
    const gs = ((gRes.data as SkinsGame[]) || []);
    setDivisions(divs);
    setGames(gs);
    setSelected(Object.fromEntries(gs.map((g) => [g.division_id || "__overall", true])));
    setPurse(
      Object.fromEntries(
        gs.map((g) => [g.division_id || "__overall", ((g.total_purse_cents || 0) / 100).toString()]),
      ),
    );
    if (gs[0]) {
      setFormat((gs[0].skin_format === "net" ? "net" : "gross") as "gross" | "net");
      setCarryover(gs[0].carryover !== false);
    }
    const nameMap: Record<string, string> = {};
    ((rRes.data as any[]) || []).forEach((r) => {
      nameMap[r.id] = `${r.first_name || ""} ${r.last_name || ""}`.trim();
    });
    setNames(nameMap);

    if (gs.length > 0) {
      const { data: w } = await (supabase as any)
        .from("division_skin_winners")
        .select("skins_game_id, hole_number, score, amount_cents, registration_id")
        .in("skins_game_id", gs.map((g) => g.id))
        .order("hole_number");
      const byGame: Record<string, WinnerRow[]> = {};
      ((w as any[]) || []).forEach((row) => {
        (byGame[row.skins_game_id] ||= []).push(row);
      });
      setWinners(byGame);
    } else {
      setWinners({});
    }
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const keys = divisions.length > 0 ? divisions.map((d) => d.id) : ["__overall"];
  const labelFor = (key: string) =>
    key === "__overall" ? "Whole field" : divisions.find((d) => d.id === key)?.tier_name || "Division";

  async function save() {
    setSaving(true);
    try {
      for (const key of keys) {
        const divisionId = key === "__overall" ? null : key;
        const existing = games.find((g) => (g.division_id || "__overall") === key);
        if (!selected[key]) {
          if (existing) await (supabase as any).from("division_skins_games").delete().eq("id", existing.id);
          continue;
        }
        const cents = Math.round((parseFloat(purse[key] || "0") || 0) * 100);
        const payload = {
          tournament_id: tournamentId,
          division_id: divisionId,
          name: `${labelFor(key)} Skins`,
          total_purse_cents: cents,
          skin_format: format,
          carryover,
          status: "active",
        };
        if (existing) {
          await (supabase as any).from("division_skins_games").update(payload).eq("id", existing.id);
        } else {
          await (supabase as any).from("division_skins_games").insert(payload);
        }
      }
      toast.success("Skins settings saved");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not save skins settings");
    } finally {
      setSaving(false);
    }
  }

  async function recompute() {
    setComputing(true);
    try {
      const { data } = await (supabase as any)
        .from("division_skins_games")
        .select("*")
        .eq("tournament_id", tournamentId);
      const gs = ((data as SkinsGame[]) || []).filter((g) => g.status === "active");
      if (gs.length === 0) {
        toast.error("Save a skins game first");
        return;
      }
      for (const g of gs) await recomputeDivisionSkins(g);
      toast.success("Skin winners and payouts recalculated");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not calculate payouts");
    } finally {
      setComputing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5 text-primary" /> Division Skins &amp; Payouts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Pick which divisions play a skins game and set each purse. Withdrawn (WD) players are never eligible.
          </p>
          <div className="rounded-md border divide-y">
            {keys.map((key) => (
              <div key={key} className="p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                  <Checkbox
                    checked={!!selected[key]}
                    onCheckedChange={(v) => setSelected((s) => ({ ...s, [key]: !!v }))}
                  />
                  {labelFor(key)}
                </label>
                {selected[key] && (
                  <div className="pl-6 max-w-xs">
                    <Label htmlFor={`purse-${key}`} className="text-xs">Total Purse (USD)</Label>
                    <Input
                      id={`purse-${key}`}
                      type="number"
                      min="0"
                      step="1"
                      value={purse[key] || ""}
                      onChange={(e) => setPurse((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder="2000"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Skins Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as "gross" | "net")} className="mt-2 space-y-2">
              {[["gross", "Gross Skins"], ["net", "Net Skins"]].map(([v, label]) => (
                <div key={v} className="flex items-center gap-2">
                  <RadioGroupItem value={v} id={`dskins-${v}`} />
                  <Label htmlFor={`dskins-${v}`} className="font-normal cursor-pointer">{label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label>Carryover</Label>
            <label className="flex items-start gap-2 mt-2 cursor-pointer text-sm">
              <Checkbox checked={carryover} onCheckedChange={(v) => setCarryover(!!v)} className="mt-0.5" />
              <span className="text-muted-foreground">
                Carryover skins — if no one wins a hole outright, that hole's share rolls to the next hole.
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Skins Settings
          </Button>
          <Button variant="outline" onClick={recompute} disabled={computing}>
            {computing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Calculate Skin Payouts
          </Button>
        </div>

        {games.filter((g) => g.status === "active").map((g) => {
          const rows = winners[g.id] || [];
          return (
            <div key={g.id} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h4 className="font-semibold">{g.name}</h4>
                <span className="text-sm text-muted-foreground">
                  Total Purse: {formatCents(g.total_purse_cents)}
                </span>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No skins calculated yet — enter scores, then choose “Calculate Skin Payouts”.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Hole</th>
                        <th className="px-3 py-2 text-left">Player</th>
                        <th className="px-3 py-2 text-center">Score</th>
                        <th className="px-3 py-2 text-right">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((r) => (
                        <tr key={`${g.id}-${r.hole_number}`}>
                          <td className="px-3 py-2">{r.hole_number}</td>
                          <td className="px-3 py-2">{names[r.registration_id || ""] || "—"}</td>
                          <td className="px-3 py-2 text-center">{r.score ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCents(r.amount_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
