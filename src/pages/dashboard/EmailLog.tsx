import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Mail, RefreshCw, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface LogRow {
  id: string;
  template_name: string;
  recipient_email: string;
  subject: string | null;
  status: string;
  error_message: string | null;
  metadata: any;
  tournament_id: string | null;
  created_at: string;
}

interface AlertRow {
  id: string;
  title: string;
  message: string;
  severity: string;
  tournament_id: string | null;
  is_read: boolean;
  created_at: string;
}

const RANGES = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
  { label: "All", hours: 0 },
];

const statusBadge = (s: string) => {
  if (s === "sent") return <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Sent</Badge>;
  if (s === "pending") return <Badge variant="outline">Queued</Badge>;
  if (s === "suppressed") return <Badge className="bg-yellow-100 text-yellow-900 hover:bg-yellow-100">Suppressed</Badge>;
  return <Badge variant="destructive">{s === "failed" ? "Failed" : s}</Badge>;
};

/**
 * Organizer-facing record of every email the platform sent for their events:
 * recipient, template, tee time, timestamp, and delivery result. Also surfaces
 * reminder-function alerts so a failed send is never silent, with a one-click
 * resend for the day-before reminder.
 */
export default function EmailLog() {
  const { org } = useOrgContext();
  const organizationId = org?.orgId;

  const [rows, setRows] = useState<LogRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [tournaments, setTournaments] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24 * 7);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [resending, setResending] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    let q = supabase
      .from("email_send_log")
      .select("id, template_name, recipient_email, subject, status, error_message, metadata, tournament_id, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (hours > 0) q = q.gte("created_at", new Date(Date.now() - hours * 3600 * 1000).toISOString());

    const [logRes, alertRes, tRes] = await Promise.all([
      q,
      supabase
        .from("organizer_notifications")
        .select("id, title, message, severity, tournament_id, is_read, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase.from("tournaments").select("id, title").eq("organization_id", organizationId),
    ]);
    setRows((logRes.data as LogRow[]) || []);
    setAlerts((alertRes.data as AlertRow[]) || []);
    setTournaments((tRes.data as any[]) || []);
    setLoading(false);
  }, [organizationId, hours]);

  useEffect(() => { load(); }, [load]);

  const titleFor = (id: string | null) =>
    tournaments.find((t) => t.id === id)?.title || "—";

  const templates = useMemo(
    () => Array.from(new Set(rows.map((r) => r.template_name))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "failed" ? !["failed", "bounced", "complained"].includes(r.status) : statusFilter !== "all" && r.status !== statusFilter) return false;
      if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
      if (q && !r.recipient_email.toLowerCase().includes(q) && !(r.subject || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, statusFilter, templateFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    sent: rows.filter((r) => r.status === "sent").length,
    failed: rows.filter((r) => ["failed", "bounced", "complained"].includes(r.status)).length,
  }), [rows]);

  const dismissAlert = async (id: string) => {
    await supabase.from("organizer_notifications").update({ is_read: true }).eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const resendReminder = async (tournamentId: string | null) => {
    if (!tournamentId) return;
    setResending(tournamentId);
    const { data, error } = await supabase.functions.invoke("send-day-before-reminder", {
      body: { tournament_id: tournamentId },
    });
    setResending(null);
    if (error) {
      toast.error("Resend failed", { description: error.message });
      return;
    }
    const res = data as { sent?: number; failed?: number };
    toast.success(`Reminder resent: ${res?.sent || 0} delivered, ${res?.failed || 0} failed`);
    load();
  };

  const unreadAlerts = alerts.filter((a) => !a.is_read);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6" /> Email Send Log</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every confirmation and reminder email sent for your events — recipient, tee time, time sent, and result.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
      </div>

      {unreadAlerts.length > 0 && (
        <div className="space-y-3">
          {unreadAlerts.map((a) => (
            <Card key={a.id} className="border-destructive/40 bg-destructive/5">
              <CardContent className="pt-6 flex flex-wrap items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1 min-w-[240px]">
                  <div className="font-semibold text-sm">{a.title}</div>
                  <div className="text-sm text-muted-foreground">{a.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {titleFor(a.tournament_id)} · {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  {a.tournament_id && (
                    <Button
                      size="sm"
                      onClick={() => resendReminder(a.tournament_id)}
                      disabled={resending === a.tournament_id}
                      style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}
                    >
                      {resending === a.tournament_id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><Send className="h-4 w-4 mr-1" /> Resend reminder</>}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => dismissAlert(a.id)}>Dismiss</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Emails logged</div><div className="text-2xl font-bold">{stats.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Delivered</div><div className="text-2xl font-bold text-emerald-700">{stats.sent}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Failed</div><div className={`text-2xl font-bold ${stats.failed ? "text-destructive" : ""}`}>{stats.failed}</div></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button key={r.label} size="sm" variant={hours === r.hours ? "default" : "outline"} onClick={() => setHours(r.hours)}>{r.label}</Button>
          ))}
        </div>
        <Input placeholder="Search recipient or subject…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select className="border rounded px-2 py-1 text-sm bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Queued</option>
        </select>
        <select className="border rounded px-2 py-1 text-sm bg-background" value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)}>
          <option value="all">All emails</option>
          {templates.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="text-xs text-muted-foreground ml-auto">{filtered.length} of {rows.length}</div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Send history</CardTitle>
          <CardDescription>Newest first. Failed rows show the exact error returned by the email provider.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Tee time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline">{r.template_name}</Badge></TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.metadata?.name || r.recipient_email}</div>
                      <div className="text-xs text-muted-foreground">{r.recipient_email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.metadata?.tee_time || "—"}</TableCell>
                    <TableCell className="text-xs">{titleFor(r.tournament_id)}</TableCell>
                    <TableCell>
                      {statusBadge(r.status)}
                      {r.error_message && (
                        <div className="text-xs text-destructive mt-1 max-w-[280px] break-words">{r.error_message}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {["failed", "bounced"].includes(r.status) && r.tournament_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resendReminder(r.tournament_id)}
                          disabled={resending === r.tournament_id}
                        >
                          {resending === r.tournament_id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      <CheckCircle2 className="h-5 w-5 mx-auto mb-2 opacity-50" />
                      No emails logged for this filter yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
