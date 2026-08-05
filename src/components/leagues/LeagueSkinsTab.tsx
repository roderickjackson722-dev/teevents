import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Coins, Play } from "lucide-react";
import { computeEventSkins } from "@/lib/leagueSkins";

export default function LeagueSkinsTab({ leagueId }: { leagueId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [mode, setMode] = useState<"gross" | "net">("gross");
  const [skinValue, setSkinValue] = useState("5");
  const [carryover, setCarryover] = useState(true);
  const [skins, setSkins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("league_events").select("id, event_name, event_date").eq("league_id", leagueId).order("event_date");
      setEvents(data || []);
      if (data?.[0]) setEventId(data[0].id);
    })();
  }, [leagueId]);

  const load = async () => {
    if (!eventId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("league_skins")
      .select("*, league_members!inner(member_name)")
      .eq("event_id", eventId)
      .order("hole_number");
    setSkins(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [eventId]);

  const run = async () => {
    if (!eventId) return;
    setRunning(true);
    try {
      const res = await computeEventSkins(eventId, mode, Math.round(Number(skinValue) * 100), carryover);
      toast({ title: `Skins computed: ${res.winners} winners`, description: res.carriedOver > 0 ? `Carryover unclaimed: $${(res.carriedOver / 100).toFixed(2)}` : undefined });
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
    setRunning(false);
  };

  const totalPot = skins.reduce((s, r) => s + Number(r.skin_amount_cents || 0), 0);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Prize Money</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <Label>Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger><SelectValue placeholder="Choose event" /></SelectTrigger>
              <SelectContent>
                {events.map(e => <SelectItem key={e.id} value={e.id}>{e.event_name} — {e.event_date}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v: any) => setMode(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gross">Gross</SelectItem>
                <SelectItem value="net">Net</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Skin Value ($)</Label>
            <Input type="number" step="0.01" value={skinValue} onChange={(e) => setSkinValue(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 border rounded-md h-10 px-3">
            <Switch checked={carryover} onCheckedChange={setCarryover} />
            <Label className="cursor-pointer">Carryover</Label>
          </div>
        </div>

        <Button onClick={run} disabled={!eventId || running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Compute Skins
        </Button>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : skins.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No prize money yet. Set the value and click <b>Compute Skins</b>.</p>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">Total paid: <b className="text-foreground">${(totalPot / 100).toFixed(2)}</b> across {skins.length} skins</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hole</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skins.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono">#{s.hole_number}</TableCell>
                    <TableCell className="font-medium">{s.league_members?.member_name || "—"}</TableCell>
                    <TableCell>{s.is_gross ? "Gross" : "Net"}</TableCell>
                    <TableCell className="text-right font-semibold">${(s.skin_amount_cents / 100).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
