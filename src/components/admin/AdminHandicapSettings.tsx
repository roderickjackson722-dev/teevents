import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ALLOWANCE_OPTIONS } from "@/lib/courseHandicap";
import { syncAllHandicaps } from "@/lib/handicapClient";

const KEY = "handicap_default_allowance";

export default function AdminHandicapSettings() {
  const [events, setEvents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [allowance, setAllowance] = useState("100");
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    const [{ data: ev }, { data: lg }, { data: st }] = await Promise.all([
      (supabase.from("tournaments") as any).select("id, title, date, handicap_sync_enabled, handicap_allowance_percentage, is_enterprise").eq("handicap_enabled", true).order("date", { ascending: false }).limit(200),
      (supabase.from("handicap_sync_logs") as any).select("*").order("created_at", { ascending: false }).limit(100),
      (supabase.from("platform_settings") as any).select("value").eq("key", KEY).maybeSingle(),
    ]);
    setEvents(ev || []);
    setLogs(lg || []);
    if (st?.value?.percentage) setAllowance(String(st.value.percentage));
  };
  useEffect(() => { load(); }, []);

  const lastByTarget = new Map<string, any>();
  logs.forEach((l) => { if (l.target_id && !lastByTarget.has(l.target_id)) lastByTarget.set(l.target_id, l); });
  const errorLogs = logs.filter((l) => (l.errors || []).length > 0);

  const saveAllowance = async (v: string) => {
    setAllowance(v);
    const { error } = await (supabase.from("platform_settings") as any).upsert(
      { key: KEY, value: { percentage: Number(v) }, description: "Default handicap allowance % for new events", is_public: true, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (error) toast.error(error.message); else toast.success("Default allowance saved.");
  };

  const globalSync = async () => {
    setSyncing(true);
    try {
      const r = await syncAllHandicaps();
      toast.success(r.pending ? `GHIN isn't connected yet — ${r.events} events and ${r.leagues} leagues checked, indexes unchanged.` : `Synced ${r.events} events and ${r.leagues} leagues · ${r.updated} players updated.`);
      load();
    } catch (e: any) { toast.error(e.message); }
    setSyncing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">Handicap Settings</h2>
        <Button className="ml-auto" onClick={globalSync} disabled={syncing}>
          {syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />} Run global GHIN sync
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Default handicap allowance</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <Select value={allowance} onValueChange={saveAllowance}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{ALLOWANCE_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}%</SelectItem>)}</SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Organizers can override this per event. GHIN auto-sync runs once a day for events and leagues with auto-sync on.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Events with handicaps enabled ({events.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-1">Event</th><th>Date</th><th>Allowance</th><th>Auto-sync</th><th>Last sync</th></tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const l = lastByTarget.get(e.id);
                return (
                  <tr key={e.id} className="border-t border-border">
                    <td className="py-1.5">{e.title}{e.is_enterprise ? " (Enterprise)" : ""}</td>
                    <td>{e.date || "—"}</td>
                    <td>{e.handicap_allowance_percentage ?? 100}%</td>
                    <td>{e.handicap_sync_enabled ? "On" : "Off"}</td>
                    <td className="text-xs">{l ? `${new Date(l.created_at).toLocaleString()} · ${l.pending ? "pending (GHIN not connected)" : `${l.updated}/${l.total}`}` : "Never"}</td>
                  </tr>
                );
              })}
              {events.length === 0 && <tr><td colSpan={5} className="py-3 text-muted-foreground">No events have handicaps enabled yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">GHIN API error log</CardTitle></CardHeader>
        <CardContent>
          {errorLogs.length === 0 ? <p className="text-sm text-muted-foreground">No errors recorded.</p> : (
            <ul className="space-y-2 text-xs">
              {errorLogs.map((l) => (
                <li key={l.id} className="rounded-md border border-border p-2">
                  <p className="font-semibold">{new Date(l.created_at).toLocaleString()} · {l.scope} {l.target_name ? `— ${l.target_name}` : ""} · by {l.triggered_by}</p>
                  {(l.errors || []).slice(0, 10).map((er: any, i: number) => <p key={i} className="text-muted-foreground">{er.player}: {er.message}</p>)}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
