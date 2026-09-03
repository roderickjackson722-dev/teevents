import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, Link2, Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import RfpAdminGate from "@/components/admin/RfpAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  exportClippdResults,
  listClippdTournaments,
  saveClippdIntegration,
  syncClippdScores,
  type ClippdTournament,
} from "@/lib/rfp.functions";

const defaultOptions = {
  includeNames: true,
  includeRounds: true,
  includeTotals: true,
  includeHandicaps: true,
  includeTeams: true,
};

export default function ClippdIntegration() {
  const [tournaments, setTournaments] = useState<ClippdTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [ids, setIds] = useState<Record<string, string>>({});
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [options, setOptions] = useState(defaultOptions);

  const load = async () => {
    setLoading(true);
    try {
      const result: any = await listClippdTournaments({ data: {} } as any);
      const rows = (result.tournaments || []) as ClippdTournament[];
      setTournaments(rows);
      setSelectedId((current) => current || rows[0]?.id || "");
      setIds(Object.fromEntries(rows.map((row) => [row.id, row.clippd_tournament_id || ""])));
      setEnabled(Object.fromEntries(rows.map((row) => [row.id, row.clippd_integration_enabled])));
    } catch (error: any) {
      toast.error(error?.message || "Could not load Clippd settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selected = useMemo(() => tournaments.find((row) => row.id === selectedId), [selectedId, tournaments]);

  const save = async (row: ClippdTournament) => {
    setSavingId(row.id);
    try {
      await saveClippdIntegration({
        data: {
          tournamentId: row.id,
          clippdTournamentId: ids[row.id] || "",
          apiKey: keys[row.id] || undefined,
          enabled: !!enabled[row.id],
        },
      } as any);
      setKeys((current) => ({ ...current, [row.id]: "" }));
      toast.success("Clippd settings saved");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not save Clippd settings");
    } finally {
      setSavingId(null);
    }
  };

  const sync = async (row: ClippdTournament) => {
    setSyncingId(row.id);
    try {
      const result: any = await syncClippdScores({ data: { tournamentId: row.id } } as any);
      toast.success(`Imported ${result.imported_scores} scores from Clippd`);
      if (result.unmatched_players?.length) toast.warning(`${result.unmatched_players.length} player names were not matched`);
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not sync Clippd scores");
    } finally {
      setSyncingId(null);
    }
  };

  const exportResults = async (format: "csv" | "json") => {
    if (!selected) return toast.error("Select a tournament first");
    try {
      const result: any = await exportClippdResults({ data: { tournamentId: selected.id, format, ...options } } as any);
      const url = URL.createObjectURL(new Blob([result.content], { type: result.mime }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${result.count} player results`);
    } catch (error: any) {
      toast.error(error?.message || "Could not export results");
    }
  };

  return (
    <RfpAdminGate
      title="Scoreboard / Clippd Integration"
      subtitle="Private administrator controls for approved college golf events, score sync, and results exports."
    >
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          <Card className="p-4 flex gap-3 items-start border-primary/30 bg-primary/5">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm text-muted-foreground"><p className="font-medium text-foreground">Admin-only integration</p><p>API keys are encrypted before storage and are never returned to the browser. Only platform administrators can configure, sync, or export results.</p></div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3"><div><h2 className="font-semibold text-foreground">Approved tournament connections</h2><p className="text-sm text-muted-foreground mt-1">Enable Clippd only for tournaments approved for the RFP integration.</p></div><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Refresh</Button></div>
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tournament</TableHead><TableHead>Clippd Tournament ID</TableHead><TableHead>API key</TableHead><TableHead>Enabled</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
              {tournaments.map((row) => <TableRow key={row.id}>
                <TableCell><button type="button" className="text-left font-medium hover:underline" onClick={() => setSelectedId(row.id)}>{row.title}</button><div className="text-xs text-muted-foreground">{row.date || "No date"}</div></TableCell>
                <TableCell><Input value={ids[row.id] || ""} onChange={(event) => setIds((current) => ({ ...current, [row.id]: event.target.value }))} placeholder="event identifier" className="min-w-44" /></TableCell>
                <TableCell><Input type="password" value={keys[row.id] || ""} onChange={(event) => setKeys((current) => ({ ...current, [row.id]: event.target.value }))} placeholder={row.has_api_key ? "•••••••• (saved)" : "Paste API key"} className="min-w-44" autoComplete="new-password" /></TableCell>
                <TableCell><Switch checked={!!enabled[row.id]} onCheckedChange={(value) => setEnabled((current) => ({ ...current, [row.id]: value }))} /></TableCell>
                <TableCell className="text-right"><Button size="sm" onClick={() => void save(row)} disabled={savingId === row.id}><Save className="h-4 w-4" />{savingId === row.id ? "Saving" : "Save"}</Button></TableCell>
              </TableRow>)}
              {tournaments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No tournaments available.</TableCell></TableRow>}
            </TableBody></Table></div>
          </Card>

          {selected && <Card className="p-4 space-y-5">
            <div><h2 className="font-semibold text-foreground">Manual sync</h2><p className="text-sm text-muted-foreground mt-1">Pull the approved Clippd match results into this tournament&apos;s score records with up to three retry attempts.</p></div>
            <div className="flex flex-wrap items-center gap-3"><Button onClick={() => void sync(selected)} disabled={!selected.clippd_integration_enabled || syncingId === selected.id}><Link2 className="h-4 w-4" />{syncingId === selected.id ? "Syncing" : "Sync scores"}</Button><span className="text-sm text-muted-foreground">{selected.clippd_last_sync ? `Last sync ${new Date(selected.clippd_last_sync).toLocaleString()}` : "Not synced yet"}</span></div>
            <div className="border-t border-border pt-5 space-y-3"><div><h2 className="font-semibold text-foreground">Clippd-compatible results export</h2><p className="text-sm text-muted-foreground mt-1">Choose the fields to include, then download CSV or JSON for the selected tournament.</p></div><div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">{Object.entries(options).map(([key, value]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value} onChange={(event) => setOptions((current) => ({ ...current, [key]: event.target.checked }))} />{key.replace(/^include/, "Include ").replace(/([A-Z])/g, " $1")}</label>)}</div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void exportResults("csv")}><Download className="h-4 w-4" />Download CSV</Button><Button variant="outline" onClick={() => void exportResults("json")}><Download className="h-4 w-4" />Download JSON</Button></div></div>
          </Card>}
        </div>
      )}
    </RfpAdminGate>
  );
}
