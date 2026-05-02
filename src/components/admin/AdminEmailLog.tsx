import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Mail, AlertCircle, X } from "lucide-react";

type LogRow = {
  id: string;
  message_id: string;
  template_name: string;
  recipient_email: string;
  subject: string | null;
  status: "pending" | "sent" | "failed" | "bounced" | "complained" | "suppressed";
  source: string | null;
  resend_id: string | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
};

const statusBadge = (s: string) => {
  if (s === "sent") return <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Sent</Badge>;
  if (s === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (s === "pending") return <Badge variant="outline">Pending</Badge>;
  if (s === "bounced") return <Badge variant="destructive">Bounced</Badge>;
  if (s === "complained") return <Badge variant="destructive">Complaint</Badge>;
  if (s === "suppressed") return <Badge className="bg-yellow-100 text-yellow-900 hover:bg-yellow-100">Suppressed</Badge>;
  return <Badge variant="outline">{s}</Badge>;
};

const RANGE_PRESETS = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
  { label: "All", hours: 0 },
];

export default function AdminEmailLog() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [hours, setHours] = useState<number>(24 * 7);
  const [selected, setSelected] = useState<LogRow | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("email_send_log").select("*").order("created_at", { ascending: false }).limit(1000);
    if (hours > 0) {
      q = q.gte("created_at", new Date(Date.now() - hours * 3600 * 1000).toISOString());
    }
    const { data } = await q;
    setRows((data as LogRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hours]);

  // Deduplicate by message_id, keeping latest status (rows are already DESC by created_at)
  const dedupedRows = useMemo(() => {
    const seen = new Set<string>();
    const out: LogRow[] = [];
    for (const r of rows) {
      if (seen.has(r.message_id)) continue;
      seen.add(r.message_id);
      out.push(r);
    }
    return out;
  }, [rows]);

  const templates = useMemo(() => {
    const set = new Set<string>();
    dedupedRows.forEach(r => set.add(r.template_name));
    return Array.from(set).sort();
  }, [dedupedRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dedupedRows.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
      if (q && !r.recipient_email.toLowerCase().includes(q) &&
          !(r.subject || "").toLowerCase().includes(q) &&
          !(r.template_name || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [dedupedRows, search, statusFilter, templateFilter]);

  const stats = useMemo(() => ({
    total: dedupedRows.length,
    sent: dedupedRows.filter(r => r.status === "sent").length,
    failed: dedupedRows.filter(r => ["failed", "bounced", "complained"].includes(r.status)).length,
    pending: dedupedRows.filter(r => r.status === "pending").length,
  }), [dedupedRows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6" /> Email Activity Log
          </h2>
          <p className="text-muted-foreground mt-1">
            Every welcome email, invitation, registration receipt, and notification sent by the platform — recipient, time, status, and any error.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Unique emails</div><div className="text-2xl font-bold">{stats.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Delivered</div><div className="text-2xl font-bold text-emerald-700">{stats.sent}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Failed / bounced</div><div className={`text-2xl font-bold ${stats.failed > 0 ? "text-destructive" : ""}`}>{stats.failed}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Pending</div><div className="text-2xl font-bold text-yellow-700">{stats.pending}</div></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {RANGE_PRESETS.map(p => (
            <Button key={p.label} size="sm" variant={hours === p.hours ? "default" : "outline"} onClick={() => setHours(p.hours)}>{p.label}</Button>
          ))}
        </div>
        <Input placeholder="Search recipient, subject, template…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <select className="border rounded px-2 py-1 text-sm bg-background" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="bounced">Bounced</option>
          <option value="suppressed">Suppressed</option>
        </select>
        <select className="border rounded px-2 py-1 text-sm bg-background" value={templateFilter} onChange={e => setTemplateFilter(e.target.value)}>
          <option value="all">All templates</option>
          {templates.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="text-xs text-muted-foreground ml-auto">{filtered.length} of {dedupedRows.length}</div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(r)}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs"><Badge variant="outline">{r.template_name}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">{r.recipient_email}</TableCell>
                  <TableCell className="text-sm max-w-[240px] truncate" title={r.subject || ""}>{r.subject || <span className="text-muted-foreground italic">—</span>}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.source || "—"}</TableCell>
                  <TableCell><Button size="sm" variant="ghost">Details</Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No emails match your filters</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-background rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Email details</h3>
                <p className="text-sm text-muted-foreground mt-1">Sent {new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Status: </span>{statusBadge(selected.status)}</div>
              <div><span className="text-muted-foreground">Template: </span><Badge variant="outline">{selected.template_name}</Badge></div>
              <div className="col-span-2"><span className="text-muted-foreground">To: </span><span className="font-medium">{selected.recipient_email}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Subject: </span>{selected.subject || "—"}</div>
              <div><span className="text-muted-foreground">Source function: </span>{selected.source || "—"}</div>
              <div><span className="text-muted-foreground">Resend ID: </span><code className="text-xs">{selected.resend_id || "—"}</code></div>
            </div>
            {selected.error_message && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-destructive font-semibold text-sm mb-1"><AlertCircle className="h-4 w-4" /> Error</div>
                <div className="text-sm text-destructive">{selected.error_message}</div>
              </div>
            )}
            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Metadata</div>
                <pre className="text-xs bg-muted/40 rounded p-3 overflow-auto">{JSON.stringify(selected.metadata, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
