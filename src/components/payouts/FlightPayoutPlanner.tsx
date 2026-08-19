import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Scale, Info, Loader2, Save, ClipboardCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  FLIGHT_METHODS,
  flightsForMethod,
  flightLabel,
  buildPayoutPlan,
  placesPaidFor,
  money,
  type FlightMethod,
  type FlightBasis,
} from "@/lib/flightPayouts";


interface Props {
  /** number of players/teams in the field */
  defaultFieldSize?: number;
  /** money collected so far, in cents — used to prefill the purse */
  defaultPurseCents?: number;
  potSourceLabel?: string;
  /** persisted settings */
  flightsEnabled?: boolean;
  flightMethod?: FlightMethod;
  flightBasedOn?: FlightBasis;
  /** save the flight settings back to the tournament / league / event */
  onSaveSettings?: (s: { flights_enabled: boolean; flight_method: FlightMethod; flight_based_on: FlightBasis }) => Promise<void> | void;
  /** optional: apply the flights to the field (create flights + assign players) */
  onApplyFlights?: (opts: { flights: number; names: string[]; basedOn: FlightBasis }) => Promise<void> | void;
  /** scope used when saving the financial breakdown */
  scope?: { tournament_id?: string; league_id?: string; league_event_id?: string };
  /** real, manually-assigned flight sizes — drives the payout validation view */
  actualFlights?: { name: string; players: number }[];
  /** players in the field with no flight assigned yet */
  unassignedCount?: number;
}


export default function FlightPayoutPlanner({
  defaultFieldSize = 0,
  defaultPurseCents = 0,
  potSourceLabel = "collected so far",
  flightsEnabled = false,
  flightMethod = "half",
  flightBasedOn = "score",
  onSaveSettings,
  onApplyFlights,
  scope,
  actualFlights,
  unassignedCount = 0,
}: Props) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(flightsEnabled);
  const [method, setMethod] = useState<FlightMethod>(flightMethod === "none" ? "half" : flightMethod);
  const [basis, setBasis] = useState<FlightBasis>(flightBasedOn);
  const [customFlights, setCustomFlights] = useState("3");
  const [fieldSize, setFieldSize] = useState(String(defaultFieldSize || 0));
  const [purseDollars, setPurseDollars] = useState(((defaultPurseCents || 0) / 100).toFixed(2));
  const [sponsorDollars, setSponsorDollars] = useState("0");
  const [busy, setBusy] = useState<null | "settings" | "apply" | "save">(null);

  useEffect(() => { setEnabled(flightsEnabled); }, [flightsEnabled]);
  useEffect(() => { if (flightMethod && flightMethod !== "none") setMethod(flightMethod); }, [flightMethod]);
  useEffect(() => { setBasis(flightBasedOn); }, [flightBasedOn]);
  useEffect(() => { if (defaultFieldSize) setFieldSize(String(defaultFieldSize)); }, [defaultFieldSize]);
  useEffect(() => { if (defaultPurseCents) setPurseDollars((defaultPurseCents / 100).toFixed(2)); }, [defaultPurseCents]);

  const flights = flightsForMethod(method, parseInt(customFlights) || 1);
  const totalPurseCents =
    Math.round((parseFloat(purseDollars) || 0) * 100) + Math.round((parseFloat(sponsorDollars) || 0) * 100);

  /** use the real, manually-assigned flights when the organizer picked "custom" */
  const useActual = method === "custom" && enabled && !!actualFlights?.length;

  const flightNames = useMemo(
    () =>
      useActual
        ? actualFlights!.map((f) => f.name)
        : Array.from({ length: enabled ? flights : 1 }, (_, i) => flightLabel(i)),
    [useActual, actualFlights, enabled, flights],
  );

  /** flight names the organizer excluded from the purse (e.g. junior flight) */
  const [excluded, setExcluded] = useState<string[]>([]);
  const isPaid = (name: string) => !excluded.includes(name);
  const toggleFlightPaid = (name: string, paid: boolean) =>
    setExcluded((prev) => (paid ? prev.filter((n) => n !== name) : prev.includes(name) ? prev : [...prev, name]));

  const plan = useMemo(
    () =>
      buildPayoutPlan({
        fieldSize: Math.max(0, parseInt(fieldSize) || 0),
        purseCents: totalPurseCents,
        flights: enabled ? flights : 1,
        flightSizes: useActual ? actualFlights!.map((f) => f.players) : null,
        names: useActual ? actualFlights!.map((f) => f.name) : null,
        paidFlights: flightNames.map((n) => isPaid(n)),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fieldSize, totalPurseCents, flights, enabled, useActual, actualFlights, flightNames, excluded],
  );

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (totalPurseCents <= 0) issues.push("No purse entered — add entry fee or sponsor money before publishing payouts.");
    const assigned = plan.flights.reduce((s, f) => s + f.players, 0);
    if (assigned === 0) issues.push("No players in the field yet, so no payouts can be calculated.");
    if (unassignedCount > 0)
      issues.push(`${unassignedCount} player${unassignedCount === 1 ? " is" : "s are"} not assigned to a flight and will not be paid.`);
    if (plan.flights.every((f) => !f.paid) && totalPurseCents > 0)
      issues.push("Every flight is excluded from the purse — no payouts will be made.");
    plan.flights.forEach((f) => {
      if (!f.paid) return;
      if (f.players === 0) issues.push(`${f.name} has no players — it will receive no purse.`);
      const paid = f.places.reduce((s, p) => s + p.amountCents, 0);
      if (f.players > 0 && Math.abs(paid - f.purseCents) > 5)
        issues.push(`${f.name}: payouts (${money(paid)}) do not match its purse (${money(f.purseCents)}).`);
    });
    if (Math.abs(plan.remainderCents) > 5)
      issues.push(`Rounding remainder of ${money(plan.remainderCents)} will stay with the organizer.`);
    return issues;
  }, [plan, totalPurseCents, unassignedCount]);



  const maxPlaces = Math.max(1, ...plan.flights.map((f) => f.places.length));
  const activeMethod = FLIGHT_METHODS.find((m) => m.id === method);

  const saveSettings = async () => {
    if (!onSaveSettings) return;
    setBusy("settings");
    try {
      await onSaveSettings({
        flights_enabled: enabled,
        flight_method: enabled ? method : "none",
        flight_based_on: basis,
      });
      toast({ title: "Flight settings saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const applyFlights = async () => {
    if (!onApplyFlights) return;
    setBusy("apply");
    try {
      await onApplyFlights({ flights, names: plan.flights.map((f) => f.name), basedOn: basis });
      toast({ title: "Flights applied" });
    } catch (e: any) {
      toast({ title: "Could not apply flights", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const saveBreakdown = async () => {
    if (!scope) return;
    setBusy("save");
    try {
      let del = (supabase as any).from("flight_payouts").delete();
      if (scope.league_event_id) del = del.eq("league_event_id", scope.league_event_id);
      else if (scope.tournament_id) del = del.eq("tournament_id", scope.tournament_id);
      else if (scope.league_id) del = del.eq("league_id", scope.league_id).is("league_event_id", null);
      await del;

      const rows = plan.flights.map((f, i) => ({
        ...scope,
        flight_name: f.name,
        display_order: i,
        player_count: f.players,
        total_purse_cents: f.purseCents,
        first_place_cents: f.places[0]?.amountCents ?? 0,
        second_place_cents: f.places[1]?.amountCents ?? 0,
        third_place_cents: f.places[2]?.amountCents ?? 0,
      }));
      const { error } = await (supabase as any).from("flight_payouts").insert(rows);
      if (error) throw error;
      toast({ title: "Financial breakdown saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-primary" /> Flight Settings &amp; Payout Breakdown
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Rank the field by score or handicap, split it into flights, and see exactly how the purse is divided.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          <Switch id="flights-enabled" checked={enabled} onCheckedChange={setEnabled} />
          <Label htmlFor="flights-enabled">Flight this field</Label>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label className="text-sm font-semibold">Flight Method</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as FlightMethod)} className="mt-2 space-y-2">
              {FLIGHT_METHODS.filter((m) => m.id !== "none").map((m) => (
                <div key={m.id} className="flex items-start gap-2">
                  <RadioGroupItem value={m.id} id={`fm-${m.id}`} className="mt-1" disabled={!enabled} />
                  <div>
                    <Label htmlFor={`fm-${m.id}`} className="font-normal">{m.label}</Label>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
            {method === "custom" && (
              <div className="mt-2">
                <Label className="text-xs">Number of flights (for the breakdown below)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={customFlights}
                  onChange={(e) => setCustomFlights(e.target.value)}
                  disabled={!enabled}
                />
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-semibold">Based on</Label>
            <RadioGroup value={basis} onValueChange={(v) => setBasis(v as FlightBasis)} className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="score" id="fb-score" disabled={!enabled} />
                <Label htmlFor="fb-score" className="font-normal">Total Score</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="handicap" id="fb-hcp" disabled={!enabled} />
                <Label htmlFor="fb-hcp" className="font-normal">Handicap</Label>
              </div>
            </RadioGroup>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <Label className="text-xs">Field size</Label>
                <Input type="number" min="0" value={fieldSize} onChange={(e) => setFieldSize(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Entry fees ($)</Label>
                <Input type="number" min="0" step="0.01" value={purseDollars} onChange={(e) => setPurseDollars(e.target.value)} />
                {defaultPurseCents > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">{money(defaultPurseCents)} {potSourceLabel}</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Sponsor contributions ($)</Label>
                <Input type="number" min="0" step="0.01" value={sponsorDollars} onChange={(e) => setSponsorDollars(e.target.value)} />
              </div>
              <div className="flex items-end">
                <p className="text-sm"><span className="text-muted-foreground">Total purse: </span><span className="font-semibold">{money(totalPurseCents)}</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {onSaveSettings && (
            <Button size="sm" onClick={saveSettings} disabled={busy !== null}>
              {busy === "settings" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save Flight Settings
            </Button>
          )}
          {onApplyFlights && enabled && method !== "custom" && (
            <Button size="sm" variant="outline" onClick={applyFlights} disabled={busy !== null}>
              {busy === "apply" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Apply Flights
            </Button>
          )}
          {scope && (
            <Button size="sm" variant="outline" onClick={saveBreakdown} disabled={busy !== null}>
              {busy === "save" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Financial Breakdown
            </Button>
          )}
        </div>

        {activeMethod && (
          <div className="flex gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {activeMethod.description} Each flight's purse is its share of the field
              (players in flight ÷ total players × total purse). Places paid follow flight size:
              1–6 players pay 1 place (100%), 7–10 pay 2 (70/30), 11+ pay 3 (65/25/10).
            </span>
          </div>
        )}

        <div>
          <h4 className="font-semibold mb-2 text-sm">Financial Breakdown</h4>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flight</TableHead>
                  <TableHead>Positions</TableHead>
                  <TableHead className="text-right">Players</TableHead>
                  <TableHead className="text-right">Purse</TableHead>
                  {Array.from({ length: maxPlaces }, (_, i) => (
                    <TableHead key={i} className="text-right">
                      {i + 1}{["st", "nd", "rd"][i] ?? "th"}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.flights.map((f) => (
                  <TableRow key={f.name}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-muted-foreground">{f.range}</TableCell>
                    <TableCell className="text-right">{f.players}</TableCell>
                    <TableCell className="text-right font-medium">{money(f.purseCents)}</TableCell>
                    {Array.from({ length: maxPlaces }, (_, i) => (
                      <TableCell key={i} className="text-right">
                        {f.places[i] ? money(f.places[i].amountCents) : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="outline">Total purse: {money(totalPurseCents)}</Badge>
          <Badge variant="outline">Total paid out: {money(plan.totalPaidCents)}</Badge>
          <Badge variant="outline">Rounding remainder: {money(plan.remainderCents)}</Badge>
          <Badge variant="outline">
            Places paid (largest flight): {placesPaidFor(Math.max(0, ...plan.flights.map((f) => f.players))).length}
          </Badge>
        </div>

        {/* Payout validation — confirm every flight before publishing */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <h4 className="font-semibold text-sm">Payout Validation — review before publishing</h4>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plan.flights.map((f) => (
              <div key={`v-${f.name}`} className="rounded-md border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{f.name}</span>
                  <Badge variant="outline" className="text-xs">{f.players} players</Badge>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Flight purse: </span>
                  <span className="font-semibold">{money(f.purseCents)}</span>
                </div>
                <ul className="text-sm space-y-0.5">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex justify-between">
                      <span className="text-muted-foreground">{["1st", "2nd", "3rd"][i]} place</span>
                      <span className={f.places[i] ? "font-medium" : "text-muted-foreground"}>
                        {f.places[i] ? `${money(f.places[i].amountCents)} (${f.places[i].percent}%)` : "not paid"}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-muted-foreground pt-1 border-t">
                  Paid out: {money(f.places.reduce((s, p) => s + p.amountCents, 0))} of {money(f.purseCents)}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-sm">
            {validationIssues.length === 0 ? (
              <p className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Everything adds up — {money(plan.totalPaidCents)} across {plan.flights.length} flight
                {plan.flights.length === 1 ? "" : "s"} is ready to publish.
              </p>
            ) : (
              validationIssues.map((issue) => (
                <p key={issue} className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  {issue}
                </p>
              ))
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
