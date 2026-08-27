import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trophy, Save, Wand2, Trash2, Plus } from "lucide-react";
import { formatCents } from "@/lib/formatCurrency";
import { recomputeLeagueStandings } from "@/lib/leagueStandings";
import { isHolePlayed } from "@/lib/leagueHoles";

interface EarningRow {
  id?: string;
  member_id: string;
  member_name: string;
  position: number | null;
  amount: string;
  note: string;
}

/**
 * Event Earnings — payouts that are NOT skins (overall winners, closest to pin
 * cash, flight money, etc.). Top finishers auto-fill from the event results and
 * every amount stays editable by the league manager.
 */
export default function LeagueEarningsTab({ leagueId }: { leagueId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState("");
  const [rows, setRows] = useState<EarningRow[]>([]);
  const [members, setMembers] = useState<{ id: string; member_name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [places, setPlaces] = useState("3");
  const [purse, setPurse] = useState("300");

  useEffect(() => {
    (async () => {
      const [{ data: evs }, { data: mems }] = await Promise.all([
        (supabase as any)
          .from("league_events")
          .select("id, event_name, event_date, holes, start_hole")
          .eq("league_id", leagueId)
          .order("event_date"),
        (supabase as any)
          .from("league_members")
          .select("id, member_name")
          .eq("league_id", leagueId)
          .order("member_name"),
      ]);
      setEvents(evs || []);
      setMembers(mems || []);
      if (evs?.[0]) setEventId(evs[0].id);
    })();
  }, [leagueId]);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("league_event_earnings")
      .select("id, member_id, position, amount_cents, note, league_members!inner(member_name)")
      .eq("event_id", eventId)
      .order("position", { nullsFirst: false });
    setRows(
      (data || []).map((r: any) => ({
        id: r.id,
        member_id: r.member_id,
        member_name: r.league_members?.member_name || "—",
        position: r.position,
        amount: ((r.amount_cents || 0) / 100).toFixed(2),
        note: r.note || "",
      })),
    );
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  /** Ranks the event's finishers (team card or individual scores) and seeds payouts. */
  const autoFill = async () => {
    if (!eventId) return;
    setLoading(true);
    const ev = events.find((e) => e.id === eventId);
    const holePlayed = (hole: unknown) => isHolePlayed(ev, Number(hole));

    const [{ data: pairings }, { data: indScores }] = await Promise.all([
      (supabase as any)
        .from("league_team_pairings")
        .select("id, team_name, player1_id, player2_id, p1:league_members!league_team_pairings_player1_id_fkey(member_name), p2:league_members!league_team_pairings_player2_id_fkey(member_name)")
        .eq("event_id", eventId),
      (supabase as any)
        .from("league_event_scores")
        .select("member_id, hole_number, gross_score, league_members!inner(member_name)")
        .eq("event_id", eventId),
    ]);

    const totals: { member_id: string; member_name: string; gross: number; groupKey: string }[] = [];
    const pairingIds = (pairings || []).map((p: any) => p.id);
    if (pairingIds.length > 0) {
      const { data: teamScores } = await (supabase as any)
        .from("league_team_scores")
        .select("pairing_id, hole_number, gross_score")
        .in("pairing_id", pairingIds);
      const sums: Record<string, number> = {};
      (teamScores || []).forEach((s: any) => {
        if (!holePlayed(s.hole_number)) return;
        sums[s.pairing_id] = (sums[s.pairing_id] || 0) + (Number(s.gross_score) || 0);
      });
      (pairings || []).forEach((p: any) => {
        if (!sums[p.id]) return;
        ([[p.player1_id, p.p1], [p.player2_id, p.p2]] as [string | null, any][]).forEach(([mid, m]) => {
          if (!mid) return;
          totals.push({ member_id: mid, member_name: m?.member_name || p.team_name, gross: sums[p.id], groupKey: p.id });
        });
      });
    }
    const pairedMembers = new Set(totals.map((t) => t.member_id));
    const indSums: Record<string, { name: string; gross: number }> = {};
    (indScores || []).forEach((s: any) => {
      if (!holePlayed(s.hole_number)) return;
      if (pairedMembers.has(s.member_id)) return;
      const e = (indSums[s.member_id] ||= { name: s.league_members?.member_name || "—", gross: 0 });
      e.gross += Number(s.gross_score) || 0;
    });
    Object.entries(indSums).forEach(([mid, v]) => {
      totals.push({ member_id: mid, member_name: v.name, gross: v.gross, groupKey: mid });
    });

    if (totals.length === 0) {
      setLoading(false);
      toast({ title: "No scores yet", description: "Enter event scores first, then auto-fill earnings." });
      return;
    }

    // Rank by gross; tied scores (teammates included) share the same position
    const sorted = [...totals].sort((a, b) => a.gross - b.gross);
    const placeCount = Math.max(1, Number(places) || 1);
    const totalPurse = Math.round((Number(purse) || 0) * 100);
    // Standard descending split across the paid positions
    const weights = Array.from({ length: placeCount }, (_, i) => placeCount - i);
    const weightSum = weights.reduce((a, b) => a + b, 0);

    const distinct = Array.from(new Set(sorted.map((t) => t.gross))).slice(0, placeCount);
    const next: EarningRow[] = [];
    distinct.forEach((gross, idx) => {
      const tied = sorted.filter((t) => t.gross === gross);
      const share = weightSum > 0 ? Math.floor((totalPurse * weights[idx]) / weightSum / tied.length) : 0;
      tied.forEach((t) => {
        next.push({
          id: rows.find((r) => r.member_id === t.member_id)?.id,
          member_id: t.member_id,
          member_name: t.member_name,
          position: idx + 1,
          amount: (share / 100).toFixed(2),
          note: `${idx + 1}${["st", "nd", "rd"][idx] || "th"} place — ${gross} gross`,
        });
      });
    });
    setRows(next);
    setLoading(false);
    toast({ title: `Auto-filled ${next.length} finishers`, description: "Adjust any amount, then Save Earnings." });
  };

  const addRow = () => {
    const used = new Set(rows.map((r) => r.member_id));
    const m = members.find((x) => !used.has(x.id));
    if (!m) return;
    setRows((prev) => [...prev, { member_id: m.id, member_name: m.member_name, position: null, amount: "0.00", note: "" }]);
  };

  const removeRow = async (idx: number) => {
    const row = rows[idx];
    setRows((prev) => prev.filter((_, i) => i !== idx));
    if (row.id) {
      await (supabase as any).from("league_event_earnings").delete().eq("id", row.id);
    }
  };

  const save = async () => {
    if (!eventId) return;
    setSaving(true);
    const payload = rows.map((r) => ({
      league_id: leagueId,
      event_id: eventId,
      member_id: r.member_id,
      position: r.position,
      amount_cents: Math.round((Number(r.amount) || 0) * 100),
      note: r.note || null,
    }));
    // Replace this event's earnings with what's on screen
    const keep = new Set(rows.map((r) => r.member_id));
    const { data: existing } = await (supabase as any)
      .from("league_event_earnings")
      .select("id, member_id")
      .eq("event_id", eventId);
    const stale = (existing || []).filter((e: any) => !keep.has(e.member_id)).map((e: any) => e.id);
    if (stale.length > 0) {
      await (supabase as any).from("league_event_earnings").delete().in("id", stale);
    }
    if (payload.length > 0) {
      const { error } = await (supabase as any)
        .from("league_event_earnings")
        .upsert(payload, { onConflict: "event_id,member_id" });
      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }
    try {
      await recomputeLeagueStandings(leagueId);
    } catch { /* best-effort */ }
    toast({ title: "Earnings saved", description: "Season standings prize money updated." });
    setSaving(false);
    await load();
  };

  const total = rows.reduce((s, r) => s + Math.round((Number(r.amount) || 0) * 100), 0);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Earnings</h2>
          <span className="text-xs text-muted-foreground">Non-skins payouts for top finishers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <Label>Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger><SelectValue placeholder="Choose event" /></SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.event_name} — {e.event_date}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Places paid</Label>
            <Input type="number" min={1} max={10} value={places} onChange={(e) => setPlaces(e.target.value)} />
          </div>
          <div>
            <Label>Total purse ($)</Label>
            <Input type="number" step="0.01" value={purse} onChange={(e) => setPurse(e.target.value)} />
          </div>
          <Button variant="outline" onClick={autoFill} disabled={!eventId || loading}>
            <Wand2 className="h-4 w-4 mr-2" /> Auto-fill finishers
          </Button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Place</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right w-32">Amount ($)</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No earnings recorded. Set the purse and click <b>Auto-fill finishers</b>, or add a player manually.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => (
                    <TableRow key={`${r.member_id}-${i}`}>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-16"
                          value={r.position == null ? "" : String(r.position)}
                          onChange={(e) =>
                            setRows((prev) => prev.map((x, xi) => (xi === i ? { ...x, position: e.target.value === "" ? null : Number(e.target.value) } : x)))
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Select
                          value={r.member_id}
                          onValueChange={(v) =>
                            setRows((prev) => prev.map((x, xi) => (xi === i ? { ...x, member_id: v, member_name: members.find((m) => m.id === v)?.member_name || x.member_name } : x)))
                          }
                        >
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.member_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={r.note}
                          placeholder="e.g. Low gross, CTP hole 5"
                          onChange={(e) => setRows((prev) => prev.map((x, xi) => (xi === i ? { ...x, note: e.target.value } : x)))}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-right"
                          value={r.amount}
                          onChange={(e) => setRows((prev) => prev.map((x, xi) => (xi === i ? { ...x, amount: e.target.value } : x)))}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus className="h-4 w-4 mr-1" /> Add player
                </Button>
                <span className="text-sm text-muted-foreground">
                  Total earnings: <b className="text-foreground">{formatCents(total)}</b>
                </span>
              </div>
              <Button onClick={save} disabled={saving || !eventId}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Earnings
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
