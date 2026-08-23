import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Pencil, Plus, RotateCcw, Save, Scale, RefreshCw } from "lucide-react";
import { formatCents } from "@/lib/formatCurrency";
import { FLIGHT_METHODS, type FlightMethod } from "@/lib/flightPayouts";

/** Default percentage splits by number of places paid. */
export const DEFAULT_SPLITS: Record<number, number[]> = {
  0: [],
  1: [100],
  2: [70, 30],
  3: [65, 25, 10],
};

/** Places paid suggestion based on how many players are in the flight. */
export function defaultPlacesPaid(players: number): number {
  if (players <= 0) return 0;
  if (players <= 6) return 1;
  if (players <= 10) return 2;
  return 3;
}

const MAX_PLACES = 3;
const PLACE_LABEL = ["1st Place", "2nd Place", "3rd Place"];

export interface SimpleFlightMember {
  id: string;
  name: string;
  /** active | wd | dq | nc — shown as a badge so organizers can spot withdrawals */
  status?: string | null;
}

export interface SimpleFlightInput {
  id: string;
  name: string;
  players: number;
  /** roster of the flight, used for include/exclude control */
  members?: SimpleFlightMember[];
}

interface Props {
  tournamentId: string;
  flights: SimpleFlightInput[];
  /** total money available to pay out, in cents (entry fees collected) */
  defaultPurseCents: number;
  flightMethod: FlightMethod;
  onSaveMethod: (method: FlightMethod) => Promise<void> | void;
  /** names of players with no flight assigned */
  unassignedNames: string[];
  assignedCount: number;
  totalPlayers: number;
  onSync: () => Promise<void> | void;
  syncing?: boolean;
  onAddFlight?: () => void;
  /** scroll target / handler for "Assign Players to Flights" */
  onAssignPlayers?: () => void;
}

interface Row {
  flightId: string;
  name: string;
  /** effective player count used for payout math */
  players: number;
  purseCents: number;
  /** payout amounts in cents, one per paid place */
  amounts: number[];
  /** registration ids the organizer removed from this flight's payout (WD/DQ etc.) */
  excluded: string[];
  /** organizer-entered player count that overrides the roster count */
  countOverride: number | null;
}

const toCents = (dollars: string) => Math.round((parseFloat(dollars) || 0) * 100);
const toDollars = (cents: number) => (cents / 100).toFixed(2);


export default function SimpleFlightPayouts({
  tournamentId,
  flights,
  defaultPurseCents,
  flightMethod,
  onSaveMethod,
  unassignedNames,
  assignedCount,
  totalPlayers,
  onSync,
  syncing,
  onAddFlight,
  onAssignPlayers,
}: Props) {
  const { toast } = useToast();
  const [method, setMethod] = useState<FlightMethod>(flightMethod === "none" ? "custom" : flightMethod);
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "method">(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPurse, setDraftPurse] = useState("0.00");
  const [draftAmounts, setDraftAmounts] = useState<string[]>([]);
  const [draftExcluded, setDraftExcluded] = useState<string[]>([]);
  const [draftCount, setDraftCount] = useState("0");
  const [draftCountManual, setDraftCountManual] = useState(false);

  useEffect(() => { if (flightMethod && flightMethod !== "none") setMethod(flightMethod); }, [flightMethod]);

  const membersOf = useCallback(
    (flightId: string) => flights.find((f) => f.id === flightId)?.members ?? [],
    [flights],
  );

  /** Roster count minus excluded players, unless the organizer typed an override. */
  const effectiveCount = useCallback(
    (flightId: string, rosterCount: number, excluded: string[], override: number | null) => {
      if (override != null) return Math.max(0, override);
      const members = flights.find((f) => f.id === flightId)?.members;
      const total = members ? members.length : rosterCount;
      const excludedInFlight = members
        ? members.filter((m) => excluded.includes(m.id)).length
        : excluded.length;
      return Math.max(0, total - excludedInFlight);
    },
    [flights],
  );

  /** Build default rows: purse split by player share, default places + percentages. */
  const buildDefaults = useCallback((): Row[] => {
    const payable = flights.filter((f) => f.players > 0 && defaultPlacesPaid(f.players) > 0);
    const totalPayable = payable.reduce((s, f) => s + f.players, 0);
    let allocated = 0;
    return flights.map((f) => {
      const isPayable = payable.some((p) => p.id === f.id);
      const last = isPayable && payable[payable.length - 1]?.id === f.id;
      let purse = 0;
      if (isPayable && totalPayable > 0) {
        purse = last
          ? Math.max(0, defaultPurseCents - allocated)
          : Math.round((defaultPurseCents * f.players) / totalPayable);
        allocated += purse;
      }
      const places = defaultPlacesPaid(f.players);
      const pcts = DEFAULT_SPLITS[places] || [];
      let used = 0;
      const amounts = pcts.map((p, idx) => {
        const amt = idx === pcts.length - 1 ? Math.max(0, purse - used) : Math.round((purse * p) / 100);
        used += amt;
        return amt;
      });
      return {
        flightId: f.id,
        name: f.name,
        players: f.players,
        purseCents: purse,
        amounts,
        excluded: [],
        countOverride: null,
      };
    });
  }, [flights, defaultPurseCents]);

  /** Load saved payouts, falling back to defaults for any flight without a saved row. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("flight_payouts")
        .select(
          "flight_name, total_purse_cents, first_place_cents, second_place_cents, third_place_cents, excluded_registration_ids, player_count_override",
        )
        .eq("tournament_id", tournamentId);
      if (cancelled) return;
      const saved = new Map<string, any>(((data as any[]) || []).map((r) => [String(r.flight_name), r]));
      const defaults = buildDefaults();
      setRows(
        defaults.map((d) => {
          const s = saved.get(d.name);
          if (!s) return d;
          const amounts = [s.first_place_cents || 0, s.second_place_cents || 0, s.third_place_cents || 0]
            .filter((c, i, arr) => arr.slice(i).some((v) => v > 0));
          const excluded = (s.excluded_registration_ids || []) as string[];
          const countOverride = s.player_count_override == null ? null : Number(s.player_count_override);
          return {
            ...d,
            purseCents: s.total_purse_cents || 0,
            amounts: amounts.length ? amounts : [],
            excluded,
            countOverride,
            players: effectiveCount(d.flightId, d.players, excluded, countOverride),
          };
        }),
      );
      setLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, flights.map((f) => `${f.id}:${f.players}`).join("|"), defaultPurseCents]);

  const totalPurse = rows.reduce((s, r) => s + r.purseCents, 0);
  const totalPaid = rows.reduce((s, r) => s + r.amounts.reduce((a, b) => a + b, 0), 0);

  const editingRow = rows.find((r) => r.flightId === editingId) || null;
  const draftPurseCents = toCents(draftPurse);
  const draftTotal = draftAmounts.reduce((s, d) => s + toCents(d), 0);
  const draftMembers = editingRow ? membersOf(editingRow.flightId) : [];
  const draftIncludedCount = draftCountManual
    ? Math.max(0, parseInt(draftCount, 10) || 0)
    : draftMembers.length
      ? draftMembers.filter((m) => !draftExcluded.includes(m.id)).length
      : Math.max(0, parseInt(draftCount, 10) || 0);

  const openEdit = (row: Row) => {
    setEditingId(row.flightId);
    setDraftPurse(toDollars(row.purseCents));
    setDraftAmounts(row.amounts.map(toDollars));
    setDraftExcluded(row.excluded);
    setDraftCountManual(row.countOverride != null);
    setDraftCount(String(row.countOverride ?? row.players));

  };

  const setPlacesPaid = (places: number) => {
    const pcts = DEFAULT_SPLITS[places] || [];
    let used = 0;
    const next = pcts.map((p, idx) => {
      const amt = idx === pcts.length - 1 ? Math.max(0, draftPurseCents - used) : Math.round((draftPurseCents * p) / 100);
      used += amt;
      return toDollars(amt);
    });
    setDraftAmounts(next);
  };

  /** Move one place's percentage; the remaining places absorb the difference proportionally. */
  const setPercent = (index: number, pct: number) => {
    const purse = draftPurseCents;
    if (purse <= 0) return;
    const current = draftAmounts.map(toCents);
    const target = Math.round((purse * pct) / 100);
    const others = current.filter((_, i) => i !== index);
    const othersTotal = others.reduce((s, c) => s + c, 0);
    const remaining = Math.max(0, purse - target);
    const next = current.map((c, i) => {
      if (i === index) return target;
      if (othersTotal <= 0) return Math.round(remaining / Math.max(1, others.length));
      return Math.round((remaining * c) / othersTotal);
    });
    setDraftAmounts(next.map(toDollars));
  };

  const savePayout = () => {
    if (!editingRow) return;
    setRows((prev) =>
      prev.map((r) =>
        r.flightId === editingRow.flightId
          ? {
              ...r,
              purseCents: draftPurseCents,
              amounts: draftAmounts.map(toCents),
              excluded: draftExcluded,
              countOverride: draftCountManual ? draftIncludedCount : null,
              players: draftIncludedCount,
            }
          : r,
      ),
    );
    setEditingId(null);
  };


  /**
   * Re-splits the current total purse across flights using each flight's
   * effective player count (roster minus removed players / manual count),
   * then redistributes each flight's places by the saved percentages.
   */
  const rebalanceByPlayers = () => {
    const pool = rows.reduce((s, r) => s + r.purseCents, 0) || defaultPurseCents;
    const payable = rows.filter((r) => r.players > 0 && r.amounts.length > 0);
    const totalPlayersPayable = payable.reduce((s, r) => s + r.players, 0);
    if (totalPlayersPayable === 0) {
      toast({ title: "Nothing to rebalance", description: "No flight has players and places paid.", variant: "destructive" });
      return;
    }
    let allocated = 0;
    setRows((prev) =>
      prev.map((r) => {
        const isPayable = payable.some((p) => p.flightId === r.flightId);
        if (!isPayable) return { ...r, purseCents: 0, amounts: r.amounts.map(() => 0) };
        const last = payable[payable.length - 1]?.flightId === r.flightId;
        const purse = last ? Math.max(0, pool - allocated) : Math.round((pool * r.players) / totalPlayersPayable);
        allocated += purse;
        const prevTotal = r.amounts.reduce((s, a) => s + a, 0);
        const pcts = r.amounts.length
          ? prevTotal > 0
            ? r.amounts.map((a) => (a / prevTotal) * 100)
            : DEFAULT_SPLITS[r.amounts.length] || []
          : [];
        let used = 0;
        const amounts = pcts.map((p, i) => {
          const amt = i === pcts.length - 1 ? Math.max(0, purse - used) : Math.round((purse * p) / 100);
          used += amt;
          return amt;
        });
        return { ...r, purseCents: purse, amounts };
      }),
    );
    toast({ title: "Purses rebalanced", description: "Prize money re-split by the current player counts." });
  };


  const saveAll = async () => {
    setBusy("save");
    try {
      await (supabase as any).from("flight_payouts").delete().eq("tournament_id", tournamentId);
      const payload = rows.map((r, i) => ({
        tournament_id: tournamentId,
        flight_name: r.name,
        display_order: i,
        player_count: r.players,
        total_purse_cents: r.purseCents,
        first_place_cents: r.amounts[0] || 0,
        second_place_cents: r.amounts[1] || 0,
        third_place_cents: r.amounts[2] || 0,
        excluded_registration_ids: r.excluded,
        player_count_override: r.countOverride,

      }));
      if (payload.length) {
        const { error } = await (supabase as any).from("flight_payouts").insert(payload);
        if (error) throw error;
      }
      toast({ title: "Payouts saved", description: `${rows.length} flight${rows.length === 1 ? "" : "s"} updated.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const changeMethod = async (v: FlightMethod) => {
    setMethod(v);
    setBusy("method");
    try {
      await onSaveMethod(v);
    } finally {
      setBusy(null);
    }
  };

  const warnings = useMemo(() => {
    const out: string[] = [];
    rows.forEach((r) => {
      const paid = r.amounts.reduce((s, a) => s + a, 0);
      if (r.purseCents > 0 && Math.abs(paid - r.purseCents) > 5) {
        out.push(`${r.name}: payouts (${formatCents(paid)}) don't match the flight purse (${formatCents(r.purseCents)}).`);
      }
    });
    return out;
  }, [rows]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-primary" /> Flights &amp; Payouts
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Set your flights, enter the prize money for each one, and we'll do the math for 1st, 2nd and 3rd place.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Flight method */}
        <div>
          <Label className="text-sm font-semibold">Flight Method</Label>
          <RadioGroup value={method} onValueChange={(v) => changeMethod(v as FlightMethod)} className="mt-2 space-y-2">
            {FLIGHT_METHODS.filter((m) => m.id !== "none").map((m) => (
              <div key={m.id} className="flex items-start gap-2">
                <RadioGroupItem value={m.id} id={`sfp-${m.id}`} className="mt-1" />
                <div>
                  <Label htmlFor={`sfp-${m.id}`} className="font-normal cursor-pointer">{m.label}</Label>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
          {busy === "method" && <p className="text-xs text-muted-foreground mt-2">Saving…</p>}
        </div>

        {/* Unassigned warning */}
        {unassignedNames.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {unassignedNames.length} player{unassignedNames.length === 1 ? " is" : "s are"} not assigned to a flight
            </div>
            <p className="text-xs text-muted-foreground">
              These players will not receive payouts until they're assigned to a flight:
            </p>
            <p className="text-xs">{unassignedNames.join(", ")}</p>
            {onAssignPlayers && (
              <Button size="sm" variant="outline" onClick={onAssignPlayers}>
                Assign Players to Flights →
              </Button>
            )}
          </div>
        )}

        {/* Sync from registration divisions */}
        <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm">Sync from Registration Divisions</h4>
              <p className="text-xs text-muted-foreground">
                {assignedCount} of {totalPlayers} players are already assigned to flights. This pulls divisions/tiers
                from registration and creates flights automatically.
              </p>
            </div>
            <Button size="sm" onClick={() => onSync()} disabled={!!syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Sync Now
            </Button>
          </div>
        </div>

        {/* Flights table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Flights</h4>
            {onAddFlight && (
              <Button size="sm" variant="outline" onClick={onAddFlight}>
                <Plus className="h-4 w-4 mr-1" /> Add Flight
              </Button>
            )}
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flight Name</TableHead>
                  <TableHead className="text-right">Players</TableHead>
                  <TableHead className="text-right">Prize Money</TableHead>
                  <TableHead className="text-right">Places Paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      {loaded ? "No flights yet — add one or sync from registration divisions." : "Loading…"}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.flightId}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">
                        {r.players}
                        {r.countOverride != null && (
                          <Badge variant="outline" className="ml-2 text-[10px]">manual</Badge>
                        )}
                        {r.excluded.length > 0 && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            {r.excluded.length} removed
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">{formatCents(r.purseCents)}</TableCell>
                      <TableCell className="text-right">{r.amounts.filter((a) => a > 0).length}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Payout summary */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Payout Summary</h4>
          <div className="flex flex-wrap gap-6 text-sm mb-3">
            <p><span className="text-muted-foreground">Total Purse: </span><span className="font-semibold">{formatCents(totalPurse)}</span></p>
            <p><span className="text-muted-foreground">Total Paid Out: </span><span className="font-semibold">{formatCents(totalPaid)}</span></p>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flight</TableHead>
                  <TableHead className="text-right">Purse</TableHead>
                  {PLACE_LABEL.map((l, i) => (
                    <TableHead key={i} className="text-right">{l.replace(" Place", "")}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`sum-${r.flightId}`} className={r.purseCents > 0 ? undefined : "opacity-60"}>
                    <TableCell className="font-medium">
                      {r.name}
                      {r.purseCents === 0 && <Badge variant="outline" className="ml-2 text-[10px]">No purse</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{formatCents(r.purseCents)}</TableCell>
                    {[0, 1, 2].map((i) => (
                      <TableCell key={i} className="text-right">
                        {r.amounts[i] ? formatCents(r.amounts[i]) : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {warnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-amber-700">
              {warnings.map((w) => <li key={w}>⚠️ {w}</li>)}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" onClick={saveAll} disabled={busy !== null || rows.length === 0}>
              {busy === "save" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save All Payouts
            </Button>
            <Button size="sm" variant="outline" onClick={rebalanceByPlayers} disabled={busy !== null || rows.length === 0}>
              <Scale className="h-4 w-4 mr-1" /> Rebalance Purse by Players
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRows(buildDefaults())} disabled={busy !== null}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset to Defaults
            </Button>

          </div>
        </div>
      </CardContent>

      {/* Edit payout modal */}
      <Dialog open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payout — {editingRow?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sfp-purse">Flight Purse ($)</Label>
                <Input
                  id="sfp-purse"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftPurse}
                  onChange={(e) => setDraftPurse(e.target.value)}
                />
              </div>
              <div>
                <Label>Places Paid</Label>
                <Select value={String(draftAmounts.length)} onValueChange={(v) => setPlacesPaid(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n === 0 ? "None (trophies only)" : n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Players in this flight — remove WD/DQ so the payout math adds up */}
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Players in This Flight</p>
                  <p className="text-xs text-muted-foreground">
                    Uncheck anyone who withdrew or was disqualified — they're removed from the payout count.
                  </p>
                </div>
                <div className="w-28 shrink-0">
                  <Label htmlFor="sfp-count" className="text-xs">Player count</Label>
                  <Input
                    id="sfp-count"
                    type="number"
                    min="0"
                    step="1"
                    value={draftCountManual ? draftCount : String(draftIncludedCount)}
                    onChange={(e) => {
                      setDraftCountManual(true);
                      setDraftCount(e.target.value);
                    }}
                  />
                </div>
              </div>
              {draftCountManual && (
                <button
                  type="button"
                  className="text-xs underline text-muted-foreground"
                  onClick={() => setDraftCountManual(false)}
                >
                  Use the roster count instead
                </button>
              )}
              {draftMembers.length > 0 ? (
                <div className="rounded-md border divide-y max-h-60 overflow-y-auto">
                  {draftMembers.map((m) => {
                    const included = !draftExcluded.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={included}
                          onCheckedChange={(v: boolean | "indeterminate") =>
                            setDraftExcluded((prev) =>
                              v ? prev.filter((id) => id !== m.id) : [...new Set([...prev, m.id])],
                            )
                          }
                        />
                        <span className={included ? "" : "line-through text-muted-foreground"}>{m.name}</span>
                        {m.status && m.status !== "active" && (
                          <Badge variant="secondary" className="text-[10px] uppercase">{m.status}</Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No roster loaded for this flight — set the player count manually above.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Counting <span className="font-semibold text-foreground">{draftIncludedCount}</span> player
                {draftIncludedCount === 1 ? "" : "s"} for this flight's payout.
              </p>
            </div>



            {draftAmounts.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm font-semibold">Payout Distribution</p>
                {draftAmounts.slice(0, MAX_PLACES).map((amt, i) => {
                  const cents = toCents(amt);
                  const pct = draftPurseCents > 0 ? Math.round((cents / draftPurseCents) * 100) : 0;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium w-24">{PLACE_LABEL[i]}</span>
                        <span className="text-sm text-muted-foreground w-28">{pct}% → {formatCents(cents)}</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-32"
                          value={amt}
                          onChange={(e) =>
                            setDraftAmounts((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                          }
                        />
                      </div>
                      <Slider
                        value={[pct]}
                        max={100}
                        step={1}
                        onValueChange={([v]) => setPercent(i, v)}
                        aria-label={`${PLACE_LABEL[i]} percentage`}
                      />
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  💡 Percentages adjust automatically when you edit an amount or drag a slider.
                </p>
                {Math.abs(draftTotal - draftPurseCents) > 5 && (
                  <p className="text-xs text-amber-700">
                    ⚠️ Payouts total {formatCents(draftTotal)} but the flight purse is {formatCents(draftPurseCents)}.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={savePayout}>Save Payout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
