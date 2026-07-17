import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, PenLine } from "lucide-react";

export default function LeagueScoringTab({ leagueId }: { leagueId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [players, setPlayers] = useState<any[]>([]);
  // scores[memberId][hole] = { gross, net }
  const [scores, setScores] = useState<Record<string, Record<number, { gross: string; net: string }>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    const { data: regs } = await (supabase as any)
      .from("league_event_registrations")
      .select("member_id, pairing_group, pairing_position, league_members!inner(member_name, handicap_index)")
      .eq("event_id", eventId);
    const list = (regs || []).map((r: any) => ({
      member_id: r.member_id,
      member_name: r.league_members.member_name,
      handicap_index: r.league_members.handicap_index,
      pairing_group: r.pairing_group,
    })).sort((a: any, b: any) => (a.pairing_group ?? 99) - (b.pairing_group ?? 99));
    setPlayers(list);

    const { data: existing } = await (supabase as any)
      .from("league_event_scores")
      .select("member_id, hole_number, gross_score, net_score")
      .eq("event_id", eventId);
    const map: Record<string, Record<number, { gross: string; net: string }>> = {};
    (existing || []).forEach((s: any) => {
      if (!map[s.member_id]) map[s.member_id] = {};
      map[s.member_id][s.hole_number] = { gross: String(s.gross_score ?? ""), net: String(s.net_score ?? "") };
    });
    setScores(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, [eventId]);

  const setGross = (mid: string, hole: number, val: string, handicap: number | null) => {
    const gross = val;
    const net = gross && handicap != null ? String(Math.max(1, Number(gross) - Math.round(handicap / 18))) : "";
    setScores((prev) => ({
      ...prev,
      [mid]: { ...(prev[mid] || {}), [hole]: { gross, net } },
    }));
  };

  const save = async () => {
    if (!eventId) return;
    setSaving(true);
    const rows: any[] = [];
    Object.entries(scores).forEach(([mid, holes]) => {
      Object.entries(holes).forEach(([h, v]) => {
        if (v.gross !== "" && !isNaN(Number(v.gross))) {
          rows.push({
            event_id: eventId,
            member_id: mid,
            hole_number: Number(h),
            gross_score: Number(v.gross),
            net_score: v.net !== "" ? Number(v.net) : null,
          });
        }
      });
    });
    if (rows.length === 0) {
      toast({ title: "No scores to save" });
      setSaving(false);
      return;
    }
    const { error } = await (supabase as any)
      .from("league_event_scores")
      .upsert(rows, { onConflict: "event_id,member_id,hole_number" });
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: `Saved ${rows.length} scores` });
    setSaving(false);
  };

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <PenLine className="h-5 w-5" />
          <div className="flex-1 max-w-xs">
            <Label className="sr-only">Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger><SelectValue placeholder="Choose an event" /></SelectTrigger>
              <SelectContent>
                {events.map(e => <SelectItem key={e.id} value={e.id}>{e.event_name} — {e.event_date}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {eventId && (
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Scores
            </Button>
          )}
        </div>

        {!eventId ? (
          <p className="text-muted-foreground text-sm py-6 text-center">Choose an event to enter scores.</p>
        ) : loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : players.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No players registered for this event yet. Add pairings first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left sticky left-0 bg-background z-10 min-w-[180px]">Player</th>
                  <th className="p-2">HCP</th>
                  {holes.map(h => <th key={h} className="p-1 min-w-[52px]">H{h}</th>)}
                  <th className="p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {players.map(p => {
                  const total = holes.reduce((sum, h) => sum + Number(scores[p.member_id]?.[h]?.gross || 0), 0);
                  return (
                    <tr key={p.member_id} className="border-b">
                      <td className="p-2 sticky left-0 bg-background z-10 font-medium">
                        {p.member_name}
                        {p.pairing_group && <span className="text-muted-foreground text-[10px] ml-1">G{p.pairing_group}</span>}
                      </td>
                      <td className="p-2 text-center">{p.handicap_index ?? "—"}</td>
                      {holes.map(h => (
                        <td key={h} className="p-1">
                          <Input
                            type="number"
                            value={scores[p.member_id]?.[h]?.gross ?? ""}
                            onChange={(e) => setGross(p.member_id, h, e.target.value, p.handicap_index)}
                            className="h-8 w-12 px-1 text-center"
                          />
                        </td>
                      ))}
                      <td className="p-2 font-semibold text-center">{total || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">Net score is auto-calculated as gross − round(handicap ÷ 18) per hole. Editable formula in later phase.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
