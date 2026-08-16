import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Trash2, FileImage, ExternalLink, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SampleRequest = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  organization_name: string | null;
  tournament_name: string;
  tournament_date: string | null;
  expected_players: number | null;
  current_tools: string | null;
  challenge: string | null;
  flyer_url: string | null;
  logo_url: string | null;
  status: string;
  sample_created: boolean;
  sample_url: string | null;
  notes: string | null;
  created_at: string;
};

const STATUSES = ["pending", "in_progress", "sample_sent", "converted", "lost"] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "Building Sample",
  sample_sent: "Sample Sent",
  converted: "Converted",
  lost: "Lost",
};

export default function AdminSampleRequests() {
  const [rows, setRows] = useState<SampleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ sample_url: string; notes: string }>({ sample_url: "", notes: "" });
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sample_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setRows((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = async (id: string, updates: Record<string, unknown>) => {
    const { error } = await supabase.from("sample_requests" as any).update(updates).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
    await load();
    return true;
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this sample request?")) return;
    const { error } = await supabase.from("sample_requests" as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else load();
  };

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("sample-requests").createSignedUrl(path, 600);
    if (error || !data?.signedUrl) {
      toast({ title: "Could not open file", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const startEdit = (r: SampleRequest) => {
    setExpanded(expanded === r.id ? null : r.id);
    setDraft({ sample_url: r.sample_url ?? "", notes: r.notes ?? "" });
  };

  const saveDraft = async (r: SampleRequest) => {
    setSavingId(r.id);
    await patch(r.id, {
      sample_url: draft.sample_url || null,
      notes: draft.notes || null,
      sample_created: !!draft.sample_url,
    });
    setSavingId(null);
  };

  if (loading) {
    return <div className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Sample Requests</h2>
          <p className="text-sm text-muted-foreground">
            Prospects who asked for a personalized sample. {pending} pending.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">No sample requests yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Prospect</th>
                <th className="p-3">Tournament</th>
                <th className="p-3">Players</th>
                <th className="p-3">Using today</th>
                <th className="p-3">Files</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-t border-border align-top">
                    <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="font-medium">{r.full_name}</div>
                      <a href={`mailto:${r.email}`} className="text-xs text-primary hover:underline">{r.email}</a>
                      {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
                      {r.organization_name && <div className="text-xs text-muted-foreground">{r.organization_name}</div>}
                    </td>
                    <td className="p-3">
                      <div>{r.tournament_name}</div>
                      {r.tournament_date && (
                        <div className="text-xs text-muted-foreground">{r.tournament_date}</div>
                      )}
                    </td>
                    <td className="p-3">{r.expected_players ?? "—"}</td>
                    <td className="p-3">{r.current_tools ?? "—"}</td>
                    <td className="p-3 space-y-1">
                      {r.flyer_url && (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => openFile(r.flyer_url!)}>
                          <FileImage className="h-3 w-3 mr-1" /> Flyer
                        </Button>
                      )}
                      {r.logo_url && (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => openFile(r.logo_url!)}>
                          <FileImage className="h-3 w-3 mr-1" /> Logo
                        </Button>
                      )}
                      {!r.flyer_url && !r.logo_url && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3">
                      <Select value={r.status} onValueChange={(v) => patch(r.id, { status: v })}>
                        <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {r.sample_created && <Badge className="mt-1" variant="secondary">Sample built</Badge>}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                        {expanded === r.id ? "Close" : "Details"}
                      </Button>
                      {r.sample_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={r.sample_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr className="border-t border-border bg-muted/30">
                      <td colSpan={8} className="p-4 space-y-3">
                        {r.challenge && (
                          <div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground">Biggest challenge</div>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{r.challenge}</p>
                          </div>
                        )}
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Sample link</label>
                            <Input
                              placeholder="https://www.teevents.golf/sample/..."
                              value={draft.sample_url}
                              onChange={(e) => setDraft((d) => ({ ...d, sample_url: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Internal notes</label>
                            <Textarea
                              rows={3}
                              value={draft.notes}
                              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                            />
                          </div>
                        </div>
                        <Button size="sm" onClick={() => saveDraft(r)} disabled={savingId === r.id}>
                          {savingId === r.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          Save
                        </Button>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
