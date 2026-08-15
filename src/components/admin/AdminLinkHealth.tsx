import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";

type LogRow = {
  id: string;
  tournament_id: string | null;
  tournament_title: string | null;
  url: string;
  status_code: number | null;
  resolved_slug: string | null;
  expected_slug: string | null;
  is_error: boolean;
  skipped: boolean;
  error_message: string | null;
  run_id: string | null;
  checked_at: string;
};

/** Next scheduled run: cron fires daily at 06:00 and 18:00 UTC. */
function nextCheckDate(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  const hour = now.getUTCHours();
  if (hour < 6) next.setUTCHours(6);
  else if (hour < 18) next.setUTCHours(18);
  else {
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(6);
  }
  return next;
}

function fmt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function fetchLinkCheckFailureCount(): Promise<number> {
  const { data } = await (supabase as any)
    .from("link_check_logs")
    .select("run_id, is_error, checked_at")
    .order("checked_at", { ascending: false })
    .limit(600);
  const rows = (data || []) as LogRow[];
  const latestRun = rows[0]?.run_id ?? null;
  if (!latestRun) return 0;
  return rows.filter((r) => r.run_id === latestRun && r.is_error).length;
}

export default function AdminLinkHealth() {
  const { toast } = useToast();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("link_check_logs")
      .select("*")
      .order("checked_at", { ascending: false })
      .limit(600);
    if (error) toast({ title: "Could not load link checks", description: error.message, variant: "destructive" });
    setRows(((data || []) as LogRow[]));
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const latestRun = rows[0]?.run_id ?? null;
  const current = latestRun ? rows.filter((r) => r.run_id === latestRun) : [];
  const passed = current.filter((r) => !r.skipped && !r.is_error).length;
  const failed = current.filter((r) => r.is_error).length;
  const skipped = current.filter((r) => r.skipped).length;
  const lastCheck = rows[0]?.checked_at ? new Date(rows[0].checked_at) : null;

  const runManual = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/public/hooks/check-tournament-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      toast({
        title: "Link check complete",
        description: `${data.passed ?? 0} passed · ${data.failed ?? 0} failed · ${data.skipped ?? 0} skipped`,
      });
      await load();
    } catch (e) {
      toast({
        title: "Link check failed to run",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground space-y-1">
          <div>
            <strong className="text-foreground">Last Check:</strong> {fmt(lastCheck)}
          </div>
          <div>
            <strong className="text-foreground">Next Check:</strong> {fmt(nextCheckDate())} (runs 6:00 AM & 6:00 PM UTC)
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={runManual} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Run Manual Check
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Passed
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{passed}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Failed
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{failed}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-amber-500" /> Skipped
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{skipped}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-semibold text-foreground">
          Failed Checks {failed > 0 && <Badge variant="destructive" className="ml-2">{failed}</Badge>}
        </div>
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">Loading…</div>
        ) : failed === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            {current.length ? "All tournament pages passed the latest check." : "No link checks have run yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tournament</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">URL</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Error</th>
                </tr>
              </thead>
              <tbody>
                {current
                  .filter((r) => r.is_error)
                  .map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">{r.tournament_title || "—"}</td>
                      <td className="px-4 py-2">
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                          {r.url.replace("https://www.teevents.golf", "")}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-destructive">
                        {r.status_code && r.status_code !== 200 ? `${r.status_code} — ` : ""}
                        {r.error_message || "Unknown error"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {current.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-semibold text-foreground">
            Latest Run Detail ({current.length} checks)
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tournament</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">URL</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {current.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">{r.tournament_title || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground break-all">
                      {r.url.replace("https://www.teevents.golf", "")}
                    </td>
                    <td className="px-4 py-2">
                      {r.skipped ? (
                        <span className="text-amber-600">Skipped</span>
                      ) : r.is_error ? (
                        <span className="text-destructive">Failed</span>
                      ) : (
                        <span className="text-emerald-600">Passed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
