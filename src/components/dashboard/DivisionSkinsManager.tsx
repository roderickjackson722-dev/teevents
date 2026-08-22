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
type PlayerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  flight_id: string | null;
  tier_id: string | null;
  status: string | null;
  skins_opt_in: boolean | null;
};



export default function DivisionSkinsManager({ tournamentId }: { tournamentId: string }) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [games, setGames] = useState<SkinsGame[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [purse, setPurse] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<"gross" | "net">("gross");
  const [potMode, setPotMode] = useState<"total" | "division">("total");
  const [carryover, setCarryover] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [openPot, setOpenPot] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState<Record<string, string>>({});

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
        .select("id, first_name, last_name, flight_id, tier_id, status, skins_opt_in")
        .eq("tournament_id", tournamentId)
        .order("last_name"),

    ]);

    const divs = (dRes.data as Division[]) || [];
    const gs = ((gRes.data as SkinsGame[]) || []);
    setDivisions(divs);
    setGames(gs);
    setSelected(
      gs.length === 0
        ? { __overall: true }
        : Object.fromEntries(gs.map((g) => [g.division_id || "__overall", true])),
    );
    setPurse(
      Object.fromEntries(
        gs.map((g) => [g.division_id || "__overall", ((g.total_purse_cents || 0) / 100).toString()]),
      ),
    );
    // One total pot for the whole field = a single game with no division.
    if (gs.length > 0) setPotMode(gs.some((g) => g.division_id) ? "division" : "total");
    if (gs[0]) {
      setFormat((gs[0].skin_format === "net" ? "net" : "gross") as "gross" | "net");
      setCarryover(gs[0].carryover !== false);
    }
    const nameMap: Record<string, string> = {};
    ((rRes.data as any[]) || []).forEach((r) => {
      nameMap[r.id] = `${r.first_name || ""} ${r.last_name || ""}`.trim();
    });
    setNames(nameMap);
    setPlayers(((rRes.data as PlayerRow[]) || []).filter((p) => String(p.status || "active").toLowerCase() !== "wd"));


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

  const keys =
    potMode === "total" || divisions.length === 0 ? ["__overall"] : divisions.map((d) => d.id);
  const labelFor = (key: string) =>
    key === "__overall" ? "Whole field" : divisions.find((d) => d.id === key)?.tier_name || "Division";

  /** A player's division: the flight they picked, falling back to their price tier. */
  const divisionOf = (p: PlayerRow) => p.flight_id || p.tier_id || null;
  const divisionLabelFor = (p: PlayerRow) => {
    const id = divisionOf(p);
    return (id && divisions.find((d) => d.id === id)?.tier_name) || "No division";
  };

  /** Players shown for a division key — optionally the whole field, with a name search. */
  const playersFor = (key: string) => {
    const base =
      key === "__overall" || showAll[key] ? players : players.filter((p) => divisionOf(p) === key);
    const q = (search[key] || "").trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) => `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase().includes(q));
  };

  const inPot = (p: PlayerRow) => p.skins_opt_in !== false;

  /** Manually add or remove a player from the skins pot. */
  async function setInPot(ids: string[], value: boolean) {
    if (ids.length === 0) return;
    setPlayers((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, skins_opt_in: value } : p)));
    const { error } = await (supabase as any)
      .from("tournament_registrations")
      .update({ skins_opt_in: value })
      .in("id", ids);
    if (error) {
      toast.error(error.message);
      await load();
    }
  }


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
      // Remove games that no longer belong to the chosen pot mode.
      const stale = games.filter((g) => !keys.includes(g.division_id || "__overall"));
      for (const g of stale) {
        await (supabase as any).from("division_skins_games").delete().eq("id", g.id);
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
          <Label>Skins Pot</Label>
          <RadioGroup
            value={potMode}
            onValueChange={(v) => setPotMode(v as "total" | "division")}
            className="mt-2 mb-4 space-y-2"
          >
            {[
              ["total", "One total pot for the entire field"],
              ["division", "A separate pot for each division"],
            ].map(([v, label]) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem value={v} id={`potmode-${v}`} disabled={v === "division" && divisions.length === 0} />
                <Label htmlFor={`potmode-${v}`} className="font-normal cursor-pointer">{label}</Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-sm text-muted-foreground mb-3">
            {potMode === "total"
              ? "Set one purse for the whole field, then choose which players are in the pot. Withdrawn (WD) players are never eligible."
              : "Pick which divisions play a skins game and set each purse. Withdrawn (WD) players are never eligible."}
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
                  <>
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
                    {(() => {
                      const list = playersFor(key);
                      const open = !!openPot[key];
                      const count = list.filter(inPot).length;
                      return (
                        <div className="pl-6 mt-3">
                          <button
                            type="button"
                            className="text-xs font-medium text-primary hover:underline"
                            onClick={() => setOpenPot((o) => ({ ...o, [key]: !open }))}
                          >
                            {open ? "Hide players in the pot" : `Choose players in the pot (${count} of ${list.length})`}
                          </button>
                          {open && (
                            <div className="mt-2 rounded-md border">
                              {key !== "__overall" && (
                                <label className="flex items-center gap-2 px-3 py-2 border-b text-xs cursor-pointer">
                                  <Checkbox
                                    checked={!!showAll[key]}
                                    onCheckedChange={(v) => setShowAll((s) => ({ ...s, [key]: !!v }))}
                                  />
                                  Show every player in the tournament (all divisions)
                                </label>
                              )}
                              <div className="px-3 py-2 border-b">
                                <Input
                                  value={search[key] || ""}
                                  onChange={(e) => setSearch((s) => ({ ...s, [key]: e.target.value }))}
                                  placeholder="Search players by name"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="flex gap-3 px-3 py-2 border-b bg-muted/40 text-xs">
                                <button type="button" className="text-primary hover:underline"
                                  onClick={() => setInPot(list.map((p) => p.id), true)}>
                                  Add everyone
                                </button>
                                <button type="button" className="text-primary hover:underline"
                                  onClick={() => setInPot(list.map((p) => p.id), false)}>
                                  Remove everyone
                                </button>
                              </div>
                              <div className="max-h-56 overflow-y-auto divide-y">
                                {list.length === 0 ? (
                                  <p className="px-3 py-3 text-xs text-muted-foreground">No players match. Turn on “Show every player” or clear the search.</p>
                                ) : list.map((p) => (
                                  <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                                    <Checkbox
                                      checked={inPot(p)}
                                      onCheckedChange={(v) => setInPot([p.id], !!v)}
                                    />
                                    <span>{`${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unnamed player"}</span>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                      {divisionLabelFor(p)}
                                    </span>
                                    {!inPot(p) && (
                                      <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                                        Not in pot
                                      </span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
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
          const skinValueCents = rows.length > 0 ? Math.round(g.total_purse_cents / rows.length) : 0;
          return (
            <div key={g.id} className="space-y-3">
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
                <>
                  <div className="rounded-md border bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Skins won</p>
                      <p className="text-2xl font-bold">{rows.length}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm text-muted-foreground">Each skin is worth</p>
                      <p className="text-2xl font-bold text-primary">{formatCents(skinValueCents)}</p>
                    </div>
                  </div>
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
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
