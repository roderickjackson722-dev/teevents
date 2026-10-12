import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListFeatureAddonRequests, adminFulfillFeatureAddonRequest } from "@/lib/featureAddonRequests.functions";
import { FEATURE_ADDONS } from "@/lib/featureAddonCatalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function FeatureAddonRequests({ tournaments, onChanged }: { tournaments: { id: string; title: string }[]; onChanged: () => Promise<void> }) {
  const list = useServerFn(adminListFeatureAddonRequests);
  const fulfill = useServerFn(adminFulfillFeatureAddonRequest);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const load = async () => { setLoading(true); try { const result = await list(); setRows(result.requests); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not load purchases"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  return <section className="space-y-4 border-t border-border pt-6">
    <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">Feature Add-On Purchases</h2><Button variant="outline" size="icon" aria-label="Refresh add-on purchases" disabled={loading} onClick={load}><RefreshCw /></Button></div>
    <Input aria-label="Search add-on purchases" placeholder="Search event name or contact email" value={search} onChange={e => setSearch(e.target.value)} />
    {loading ? <Loader2 className="animate-spin" /> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No feature add-on purchases yet.</p> : rows.filter(r => `${r.event_name} ${r.contact_email}`.toLowerCase().includes(search.toLowerCase())).map(r => <article key={r.id} className="space-y-3 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{r.event_name}: {FEATURE_ADDONS[r.addon_key]?.name || r.addon_key}</h3><Badge variant={r.status === "pending" ? "outline" : "secondary"}>{r.status} · ${(r.amount_cents / 100).toFixed(2)}</Badge></div>
      <p className="break-words text-sm">{r.contact_name} · {r.contact_email} · {r.contact_phone}</p>
      {r.contact_notes && <p className="break-words text-sm text-muted-foreground">{r.contact_notes}</p>}
      {r.status === "paid" && <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><Label>Apply to event</Label><Select value={selected[r.id] || ""} onValueChange={id => setSelected(s => ({ ...s, [r.id]: id }))}><SelectTrigger aria-label={`Event for ${r.event_name}`}><SelectValue placeholder="Select the correct event" /></SelectTrigger><SelectContent>{tournaments.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent></Select></div><Button disabled={!selected[r.id] || busy === r.id} onClick={async () => {
        const tournamentId = selected[r.id]; if (!tournamentId) return;
        if (!window.confirm(`Apply ${FEATURE_ADDONS[r.addon_key]?.name || r.addon_key} to ${tournaments.find(t => t.id === tournamentId)?.title}?`)) return;
        setBusy(r.id); try { await fulfill({ data: { requestId: r.id, tournamentId } }); toast.success("Purchase applied to event"); await Promise.all([load(), onChanged()]); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not apply purchase"); } finally { setBusy(""); }
      }}>{busy === r.id && <Loader2 className="animate-spin" />}Apply purchased feature</Button></div>}
      {r.status === "fulfilled" && <p className="text-sm text-muted-foreground">Applied to {tournaments.find(t => t.id === r.tournament_id)?.title || "event"}</p>}
    </article>)}
  </section>;
}