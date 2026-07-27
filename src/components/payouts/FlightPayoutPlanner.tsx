import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale, Info, Loader2 } from "lucide-react";
import {
  SPLIT_OPTIONS,
  PAYOUT_TEMPLATES,
  buildPayoutPlan,
  money,
  type SplitMode,
  type PotSplitMode,
} from "@/lib/flightPayouts";

interface Props {
  /** number of players/teams in the field */
  defaultFieldSize?: number;
  /** money collected, in cents — used to prefill the pot */
  defaultPotCents?: number;
  /** label describing where the money came from */
  potSourceLabel?: string;
  /** optional: create the flights in the database */
  onCreateFlights?: (names: string[]) => Promise<void> | void;
  creating?: boolean;
}

export default function FlightPayoutPlanner({
  defaultFieldSize = 0,
  defaultPotCents = 0,
  potSourceLabel = "collected",
  onCreateFlights,
  creating,
}: Props) {
  const [fieldSize, setFieldSize] = useState(String(defaultFieldSize || 0));
  const [potDollars, setPotDollars] = useState(((defaultPotCents || 0) / 100).toFixed(2));
  const [splitMode, setSplitMode] = useState<SplitMode>("half");
  const [customFlights, setCustomFlights] = useState("5");
  const [potSplit, setPotSplit] = useState<PotSplitMode>("even");
  const [templateId, setTemplateId] = useState("top3");

  const flights =
    splitMode === "custom"
      ? Math.min(10, Math.max(1, parseInt(customFlights) || 1))
      : SPLIT_OPTIONS.find((o) => o.id === splitMode)?.flights ?? 1;

  const percents = PAYOUT_TEMPLATES.find((t) => t.id === templateId)?.percents ?? [100];

  const plan = useMemo(
    () =>
      buildPayoutPlan({
        fieldSize: Math.max(0, parseInt(fieldSize) || 0),
        potCents: Math.round((parseFloat(potDollars) || 0) * 100),
        flights,
        potSplit,
        percents,
      }),
    [fieldSize, potDollars, flights, potSplit, percents],
  );

  const activeOption = SPLIT_OPTIONS.find((o) => o.id === splitMode);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-primary" /> Flighting &amp; Payout Breakdown
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sort the field by score, split it into flights, and see exactly how the pot is divided.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label>Field size (players/teams)</Label>
            <Input type="number" min="0" value={fieldSize} onChange={(e) => setFieldSize(e.target.value)} />
          </div>
          <div>
            <Label>Total pot ($)</Label>
            <Input type="number" min="0" step="0.01" value={potDollars} onChange={(e) => setPotDollars(e.target.value)} />
            {defaultPotCents > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {money(defaultPotCents)} {potSourceLabel}
              </p>
            )}
          </div>
          <div>
            <Label>How to flight the field</Label>
            <Select value={splitMode} onValueChange={(v) => setSplitMode(v as SplitMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPLIT_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {splitMode === "custom" && (
              <Input
                className="mt-2"
                type="number"
                min="1"
                max="10"
                value={customFlights}
                onChange={(e) => setCustomFlights(e.target.value)}
              />
            )}
          </div>
          <div>
            <Label>Places paid per flight</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYOUT_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm">Divide the pot</Label>
          <Select value={potSplit} onValueChange={(v) => setPotSplit(v as PotSplitMode)}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="even">Evenly between flights</SelectItem>
              <SelectItem value="by_size">Proportional to flight size</SelectItem>
            </SelectContent>
          </Select>
          {onCreateFlights && flights > 1 && (
            <Button
              variant="outline"
              size="sm"
              disabled={creating}
              onClick={() => onCreateFlights(plan.flights.map((f) => f.name))}
            >
              {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create these {flights} flights
            </Button>
          )}
        </div>

        {activeOption && (
          <div className="flex gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {activeOption.description} Rank every player by total score (gross or net), then assign the
              top finishers to Flight A, the next group to Flight B, and so on. Each flight is paid from its
              own share of the pot.
            </span>
          </div>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flight</TableHead>
                <TableHead>Field positions</TableHead>
                <TableHead className="text-right">Players</TableHead>
                <TableHead className="text-right">Flight pot</TableHead>
                {percents.map((_, i) => (
                  <TableHead key={i} className="text-right">
                    {i + 1}
                    {["st", "nd", "rd"][i] ?? "th"}
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
                  <TableCell className="text-right font-medium">{money(f.potCents)}</TableCell>
                  {f.places.map((p) => (
                    <TableCell key={p.place} className="text-right">{money(p.amountCents)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <Badge variant="outline">Total paid out: {money(plan.totalPaidCents)}</Badge>
          <Badge variant="outline">
            Rounding remainder: {money(plan.remainderCents)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
