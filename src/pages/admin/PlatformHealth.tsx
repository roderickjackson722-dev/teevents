import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity, ArrowLeft, Loader2, RefreshCw, Gauge, HardDrive, Database, Cpu,
  AlertTriangle, Mail, FileCheck2, CalendarClock, CheckCircle2, Play, Square,
  Send, Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  getPlatformHealth, getHealthHistory, getHealthAlerts, saveHealthSettings,
  runHealthCheckNow, sendTestHealthAlert, getWalDiagnostics, generateResizeReport,
  startStabilityRun, stopStabilityRun, getStabilitySummary,
} from "@/lib/platformHealth.functions";

type TabKey = "live" | "wal" | "alerts" | "report" | "stability";

const TABS: Array<[TabKey, string, typeof Activity]> = [
  ["live", "Live Metrics", Activity],
  ["wal", "WAL Diagnostics", Waves],
  ["alerts", "Alerts & Thresholds", AlertTriangle],
  ["report", "Post-Resize Report", FileCheck2],
  ["stability", "7-Day Monitoring", CalendarClock],
];

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";
const mb = (b: any) => Math.round((Number(b) || 0) / 1024 ** 2);
const gbv = (b: any) => Math.round(((Number(b) || 0) / 1024 ** 3) * 100) / 100;
const pctOf = (a: any, b: any) => Math.round(((Number(a) || 0) / (Number(b) || 1)) * 1000) / 10;

const Card = ({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-lg overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
      <h2 className="font-display font-bold text-foreground">{title}</h2>
      {right}
    </div>
    {children}
  </div>
);

const Stat = ({
  icon: Icon, label, value, sub, tone = "ok",
}: { icon: typeof Gauge; label: string; value: string; sub?: string; tone?: "ok" | "warn" | "bad" }) => {
  const toneCls =
    tone === "bad" ? "text-red-700 bg-red-50 border-red-200"
      : tone === "warn" ? "text-amber-800 bg-amber-50 border-amber-200"
      : "text-emerald-800 bg-emerald-50 border-emerald-200";
  return (
    <div className={`rounded-lg border p-4 ${toneCls}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-bold opacity-80">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 text-2xl font-display font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs opacity-80">{sub}</div>}
    </div>
  );
};

const Bar = ({ value }: { value: number }) => (
  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
    <div
      className={`h-full ${value >= 90 ? "bg-red-500" : value >= 75 ? "bg-amber-500" : "bg-emerald-500"}`}
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
    />
  </div>
);

const AdminPlatformHealth = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("live");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const healthQ = useQuery({
    queryKey: ["platform-health"],
    queryFn: () => getPlatformHealth({ data: {} } as any),
    refetchInterval: autoRefresh ? 15000 : false,
  });
  const historyQ = useQuery({
    queryKey: ["platform-health-history"],
    queryFn: () => getHealthHistory({ data: { hours: 168 } }),
    refetchInterval: autoRefresh ? 60000 : false,
  });
  const alertsQ = useQuery({ queryKey: ["platform-health-alerts"], queryFn: () => getHealthAlerts({ data: {} } as any) });
  const walQ = useQuery({
    queryKey: ["platform-health-wal"],
    queryFn: () => getWalDiagnostics({ data: {} } as any),
    enabled: tab === "wal",
  });

  const m: any = healthQ.data?.metrics ?? {};
  const settings: any = healthQ.data?.settings ?? {};
  const breaches: any[] = healthQ.data?.breaches ?? [];

  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (settings && !form) setForm({ ...settings });
  }, [settings, form]);

  const saveM = useMutation({
    mutationFn: (patch: any) => saveHealthSettings({ data: patch }),
    onSuccess: () => { toast.success("Alert settings saved"); qc.invalidateQueries({ queryKey: ["platform-health"] }); },
    onError: (e: any) => toast.error(e?.message || "Could not save settings"),
  });
  const runM = useMutation({
    mutationFn: () => runHealthCheckNow({ data: { force: false } }),
    onSuccess: (r: any) => {
      toast.success(r?.alerted?.length ? `Snapshot saved — ${r.alerted.length} alert(s) sent` : "Snapshot saved — all metrics within thresholds");
      qc.invalidateQueries({ queryKey: ["platform-health-history"] });
      qc.invalidateQueries({ queryKey: ["platform-health-alerts"] });
    },
    onError: (e: any) => toast.error(e?.message || "Health check failed"),
  });
  const testM = useMutation({
    mutationFn: () => sendTestHealthAlert({ data: {} } as any),
    onSuccess: (r: any) => toast.success(`Test alert sent to ${r.to}`),
    onError: (e: any) => toast.error(e?.message || "Could not send test alert"),
  });
  const [report, setReport] = useState<any>(null);
  const reportM = useMutation({
    mutationFn: (email: boolean) => generateResizeReport({ data: { email } }),
    onSuccess: (r: any, email) => { setReport(r); toast.success(email ? "Report generated and emailed" : "Report generated"); },
    onError: (e: any) => toast.error(e?.message || "Could not build report"),
  });
  const startM = useMutation({
    mutationFn: () => startStabilityRun({ data: { days: 7 } }),
    onSuccess: () => { toast.success("7-day stability monitoring started"); setForm(null); qc.invalidateQueries({ queryKey: ["platform-health"] }); },
    onError: (e: any) => toast.error(e?.message || "Could not start monitoring"),
  });
  const stopM = useMutation({
    mutationFn: () => stopStabilityRun({ data: {} } as any),
    onSuccess: () => { toast.success("Monitoring run stopped"); setForm(null); qc.invalidateQueries({ queryKey: ["platform-health"] }); },
    onError: (e: any) => toast.error(e?.message || "Could not stop monitoring"),
  });
  const summaryM = useMutation({
    mutationFn: (email: boolean) => getStabilitySummary({ data: { email } }),
    onSuccess: (r: any, email) =>
      toast.success(
        `${r.stable ? "Stable" : "Needs review"} — ${r.stats.readings} readings, peak ${r.stats.conn.max}% connections${email ? " (emailed)" : ""}`,
      ),
    onError: (e: any) => toast.error(e?.message || "Could not build summary"),
  });

  const connPct = pctOf(m.connections, m.max_connections);
  const walPct = pctOf(m.wal_bytes, m.max_wal_bytes);
  const cache = Number(m.cache_hit_pct) || 0;

  const history: any[] = historyQ.data?.rows ?? [];
  const peaks = useMemo(() => {
    if (!history.length) return null;
    const max = (k: string) => Math.max(...history.map((r) => Number(r[k]) || 0));
    const min = (k: string) => Math.min(...history.map((r) => Number(r[k]) || 0));
    return {
      readings: history.length,
      conn: Math.round(max("connections_pct") * 10) / 10,
      wal: Math.round(max("wal_pct") * 10) / 10,
      cache: Math.round(min("cache_hit_pct") * 10) / 10,
      disk: gbv(max("db_bytes")),
      first: history[0]?.captured_at,
    };
  }, [history]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Admin
            </Button>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" /> Platform Health
              </h1>
              <p className="text-xs text-muted-foreground">
                Live backend metrics, alerting and stability monitoring for your events
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} id="auto" />
              <Label htmlFor="auto" className="text-xs">Auto-refresh 15s</Label>
            </div>
            <Button size="sm" variant="outline" onClick={() => { healthQ.refetch(); historyQ.refetch(); }}>
              <RefreshCw className={`h-4 w-4 mr-1 ${healthQ.isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => runM.mutate()} disabled={runM.isPending}>
              {runM.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Run check now
            </Button>
          </div>
        </div>
        <div className="container mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium whitespace-nowrap transition-colors ${
                tab === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {breaches.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4" /> {breaches.length} metric(s) above your safe threshold
            </div>
            <ul className="mt-2 space-y-1 text-sm text-amber-900">
              {breaches.map((b) => <li key={b.metric}>• {b.message}</li>)}
            </ul>
          </div>
        )}

        {/* ---------------- LIVE ---------------- */}
        {tab === "live" && (
          healthQ.isLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  icon={Cpu} label="Memory / cache hit"
                  value={`${cache}%`}
                  sub={`${mb(m.temp_bytes)} MB spilled to disk • ${mb(m.shared_buffers_bytes)} MB buffer cache`}
                  tone={cache < 90 ? "bad" : cache < 95 ? "warn" : "ok"}
                />
                <Stat
                  icon={Activity} label="Connections"
                  value={`${m.connections ?? 0} / ${m.max_connections ?? 0}`}
                  sub={`${connPct}% used • ${m.active_queries ?? 0} active queries`}
                  tone={connPct >= 90 ? "bad" : connPct >= 80 ? "warn" : "ok"}
                />
                <Stat
                  icon={Waves} label="Write-ahead log (WAL)"
                  value={`${mb(m.wal_bytes)} MB`}
                  sub={`${walPct}% of ${mb(m.max_wal_bytes)} MB limit • ${m.wal_files ?? 0} files`}
                  tone={walPct >= 95 ? "bad" : walPct >= 75 ? "warn" : "ok"}
                />
                <Stat
                  icon={HardDrive} label="Database size"
                  value={`${gbv(m.db_bytes)} GB`}
                  sub={`${m.deadlocks ?? 0} deadlocks • ${m.rolled_back ?? 0} rollbacks since boot`}
                  tone={gbv(m.db_bytes) >= Number(settings.disk_gb_threshold || 6) ? "warn" : "ok"}
                />
              </div>

              <Card title="Capacity" right={<span className="text-xs text-muted-foreground">Read at {fmt(m.captured_at)}</span>}>
                <div className="p-4 space-y-4">
                  {[
                    ["Connections used", connPct],
                    ["WAL of limit", walPct],
                    ["Cache hit rate", cache],
                  ].map(([label, v]: any) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold">{v}%</span>
                      </div>
                      <Bar value={label === "Cache hit rate" ? 100 - v : v} />
                    </div>
                  ))}
                  <div className="grid gap-3 sm:grid-cols-3 pt-2 text-sm">
                    <div><span className="text-muted-foreground">Backend up since</span><div className="font-semibold">{fmt(m.postgres_started_at)}</div></div>
                    <div><span className="text-muted-foreground">Checkpoints (timed / forced)</span><div className="font-semibold">{m.checkpoints_timed ?? 0} / {m.checkpoints_requested ?? 0}</div></div>
                    <div><span className="text-muted-foreground">Postgres</span><div className="font-semibold">{m.version ?? "—"}</div></div>
                  </div>
                </div>
              </Card>

              <Card title="Recorded history (last 7 days)">
                <div className="p-4">
                  {historyQ.isLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : !peaks ? (
                    <p className="text-sm text-muted-foreground">
                      No snapshots recorded yet. The monitor records one every 5 minutes — or hit “Run check now”.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-4 text-sm">
                      <div><span className="text-muted-foreground">Readings</span><div className="text-xl font-bold">{peaks.readings}</div><div className="text-xs text-muted-foreground">since {fmt(peaks.first)}</div></div>
                      <div><span className="text-muted-foreground">Peak connections</span><div className="text-xl font-bold">{peaks.conn}%</div></div>
                      <div><span className="text-muted-foreground">Peak WAL</span><div className="text-xl font-bold">{peaks.wal}%</div></div>
                      <div><span className="text-muted-foreground">Lowest cache hit</span><div className="text-xl font-bold">{peaks.cache}%</div></div>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )
        )}

        {/* ---------------- WAL ---------------- */}
        {tab === "wal" && (
          walQ.isLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
              <Card title="Why WAL is elevated">
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    The write-ahead log is the running journal of every change to your database. Postgres keeps
                    and <strong>recycles</strong> these files up to a configured ceiling, so a steady size is normal —
                    it only matters when it approaches that ceiling or never gets recycled.
                  </p>
                  {(walQ.data?.causes ?? []).map((c: any) => (
                    <div key={c.title} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm">{c.title}</span>
                        <Badge
                          variant="outline"
                          className={
                            c.verdict === "likely" ? "border-amber-300 bg-amber-50 text-amber-800"
                              : c.verdict === "watch" ? "border-slate-300 bg-slate-50 text-slate-700"
                              : "border-emerald-300 bg-emerald-50 text-emerald-800"
                          }
                        >
                          {c.verdict === "likely" ? "Likely cause" : c.verdict === "watch" ? "Worth watching" : "Ruled out"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{c.detail}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Checkpoint timing">
                <div className="grid gap-4 sm:grid-cols-4 p-4 text-sm">
                  <div><span className="text-muted-foreground">Scheduled checkpoints</span><div className="text-xl font-bold">{walQ.data?.diagnostics?.checkpointer?.num_timed ?? 0}</div></div>
                  <div><span className="text-muted-foreground">Forced checkpoints</span><div className="text-xl font-bold">{walQ.data?.diagnostics?.checkpointer?.num_requested ?? 0}</div></div>
                  <div><span className="text-muted-foreground">Checkpoint write time</span><div className="text-xl font-bold">{Math.round((Number(walQ.data?.diagnostics?.checkpointer?.write_time_ms) || 0) / 1000)}s</div></div>
                  <div><span className="text-muted-foreground">Stats window</span><div className="text-xl font-bold">{walQ.data?.diagnostics?.checkpointer?.minutes_since_reset ?? 0} min</div></div>
                </div>
                <div className="px-4 pb-4 grid gap-2 sm:grid-cols-2 text-sm">
                  {Object.entries(walQ.data?.diagnostics?.settings ?? {}).map(([k, v]: any) => (
                    <div key={k} className="flex justify-between border-b border-border py-1">
                      <span className="text-muted-foreground font-mono text-xs">{k}</span>
                      <span className="font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Replication slots (the classic WAL leak)">
                <div className="p-4 text-sm">
                  {(walQ.data?.diagnostics?.replication_slots ?? []).length === 0 ? (
                    <p className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> No replication slots — nothing is pinning old WAL files.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {(walQ.data?.diagnostics?.replication_slots ?? []).map((s: any) => (
                        <li key={s.slot_name}>
                          <span className="font-mono">{s.slot_name}</span> — {s.active ? "active" : "INACTIVE"} • retaining {mb(s.retained_bytes)} MB
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>

              <Card title="Heaviest write tables (WAL producers)">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2">Table</th><th className="px-3 py-2">Inserts</th>
                        <th className="px-3 py-2">Updates</th><th className="px-3 py-2">Deletes</th>
                        <th className="px-3 py-2">Dead rows</th><th className="px-3 py-2">Last autovacuum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(walQ.data?.diagnostics?.top_write_tables ?? []).map((t: any) => (
                        <tr key={t.table_name}>
                          <td className="px-3 py-2 font-mono text-xs">{t.table_name}</td>
                          <td className="px-3 py-2">{t.inserts}</td>
                          <td className="px-3 py-2">{t.updates}</td>
                          <td className="px-3 py-2">{t.deletes}</td>
                          <td className="px-3 py-2">{t.dead_rows}</td>
                          <td className="px-3 py-2 text-muted-foreground">{fmt(t.last_autovacuum)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )
        )}

        {/* ---------------- ALERTS ---------------- */}
        {tab === "alerts" && form && (
          <>
            <Card
              title="Alert thresholds"
              right={
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => testM.mutate()} disabled={testM.isPending}>
                    {testM.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                    Send test alert
                  </Button>
                  <Button size="sm" onClick={() => saveM.mutate(form)} disabled={saveM.isPending}>
                    {saveM.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Save
                  </Button>
                </div>
              }
            >
              <div className="p-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <Label className="font-semibold">Email me when a metric crosses a threshold</Label>
                    <p className="text-xs text-muted-foreground">Checked every 5 minutes; at most one email per metric per hour.</p>
                  </div>
                  <Switch
                    checked={!!form.alerts_enabled}
                    onCheckedChange={(v) => setForm({ ...form, alerts_enabled: v })}
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Alert email</Label>
                  <Input value={form.alert_email ?? ""} onChange={(e) => setForm({ ...form, alert_email: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Connections used (%)</Label>
                  <Input type="number" value={form.connections_pct_threshold ?? 80}
                    onChange={(e) => setForm({ ...form, connections_pct_threshold: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">WAL of limit (%)</Label>
                  <Input type="number" value={form.wal_pct_threshold ?? 75}
                    onChange={(e) => setForm({ ...form, wal_pct_threshold: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Database size (GB)</Label>
                  <Input type="number" step="0.5" value={form.disk_gb_threshold ?? 6}
                    onChange={(e) => setForm({ ...form, disk_gb_threshold: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Minimum cache hit rate (%) — memory pressure</Label>
                  <Input type="number" value={form.cache_hit_pct_floor ?? 95}
                    onChange={(e) => setForm({ ...form, cache_hit_pct_floor: Number(e.target.value) })} />
                </div>
              </div>
            </Card>

            <Card title="Alert history">
              {alertsQ.isLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (alertsQ.data?.rows ?? []).length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No alerts have been raised. Everything has stayed within your thresholds.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2">When</th><th className="px-3 py-2">Metric</th>
                        <th className="px-3 py-2">Severity</th><th className="px-3 py-2">Value</th>
                        <th className="px-3 py-2">Emailed</th><th className="px-3 py-2">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(alertsQ.data!.rows as any[]).map((a) => (
                        <tr key={a.id}>
                          <td className="px-3 py-2 whitespace-nowrap">{fmt(a.created_at)}</td>
                          <td className="px-3 py-2 capitalize">{a.metric}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={a.severity === "critical" ? "border-red-300 bg-red-50 text-red-800" : "border-amber-300 bg-amber-50 text-amber-800"}>
                              {a.severity}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{a.value} / {a.threshold}</td>
                          <td className="px-3 py-2 text-xs">{a.emailed_at ? fmt(a.emailed_at) : (a.email_error || "not sent")}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground max-w-[340px]">{a.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ---------------- REPORT ---------------- */}
        {tab === "report" && (
          <Card
            title="Post-resize verification report"
            right={
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => reportM.mutate(false)} disabled={reportM.isPending}>
                  {reportM.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileCheck2 className="h-4 w-4 mr-1" />}
                  Generate
                </Button>
                <Button size="sm" onClick={() => reportM.mutate(true)} disabled={reportM.isPending}>
                  <Mail className="h-4 w-4 mr-1" /> Generate & email
                </Button>
                {report && (
                  <Button size="sm" variant="outline" onClick={() => window.print()}>Print / Save PDF</Button>
                )}
              </div>
            }
          >
            <div className="p-4">
              {!report ? (
                <p className="text-sm text-muted-foreground">
                  Generate a timestamped report of every check run after the Tiny → Small resize, including confirmation
                  that live events kept being served.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3 text-sm">
                    <div><span className="text-muted-foreground">Generated</span><div className="font-semibold">{fmt(report.generated_at)}</div></div>
                    <div><span className="text-muted-foreground">Resize</span><div className="font-semibold">{report.resize.from} → {report.resize.to}</div></div>
                    <div><span className="text-muted-foreground">Backend up since</span><div className="font-semibold">{fmt(report.resize.backend_up_since)}</div></div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4 text-sm">
                    <div><span className="text-muted-foreground">Events in window</span><div className="text-xl font-bold">{report.events.upcoming_or_recent_events}</div></div>
                    <div><span className="text-muted-foreground">Registrations served</span><div className="text-xl font-bold">{report.events.registrations}</div></div>
                    <div><span className="text-muted-foreground">Transactions</span><div className="text-xl font-bold">{report.events.transactions}</div></div>
                    <div><span className="text-muted-foreground">Emails processed</span><div className="text-xl font-bold">{report.events.emails}</div></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 border-b border-border">
                        <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2">Check</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {report.checks.map((c: any) => (
                          <tr key={c.name}>
                            <td className="px-3 py-2 font-medium">{c.name}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className={c.result === "Pass" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}>
                                {c.result}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{c.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                    <strong>Conclusion: </strong>{report.conclusion}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ---------------- STABILITY ---------------- */}
        {tab === "stability" && (
          <Card
            title="7-day stability monitoring"
            right={
              <div className="flex items-center gap-2">
                {settings.monitoring_ends_at ? (
                  <Button size="sm" variant="outline" onClick={() => stopM.mutate()} disabled={stopM.isPending}>
                    <Square className="h-4 w-4 mr-1" /> Stop run
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => startM.mutate()} disabled={startM.isPending}>
                    {startM.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                    Start 7-day run
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => summaryM.mutate(false)} disabled={summaryM.isPending}>
                  Preview summary
                </Button>
                <Button size="sm" variant="outline" onClick={() => summaryM.mutate(true)} disabled={summaryM.isPending}>
                  <Mail className="h-4 w-4 mr-1" /> Email me now
                </Button>
              </div>
            }
          >
            <div className="p-4 space-y-4 text-sm">
              {settings.monitoring_ends_at ? (
                <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
                  <div className="font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Monitoring active</div>
                  <p className="mt-1">
                    {settings.monitoring_label} — started {fmt(settings.monitoring_started_at)}, ends {fmt(settings.monitoring_ends_at)}.
                    Metrics are recorded every 5 minutes and a summary is emailed to {settings.alert_email} daily, with a final
                    verdict on whether the Small size stayed stable.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Start a run to record metrics every 5 minutes for 7 days and email {settings.alert_email || "your alert address"} a
                  daily summary plus a final stable / needs-review verdict for the Small instance size.
                </p>
              )}
              {peaks && (
                <div className="grid gap-4 sm:grid-cols-4">
                  <div><span className="text-muted-foreground">Readings collected</span><div className="text-xl font-bold">{peaks.readings}</div></div>
                  <div><span className="text-muted-foreground">Peak connections</span><div className="text-xl font-bold">{peaks.conn}%</div></div>
                  <div><span className="text-muted-foreground">Peak WAL</span><div className="text-xl font-bold">{peaks.wal}%</div></div>
                  <div><span className="text-muted-foreground">Database size</span><div className="text-xl font-bold">{peaks.disk} GB</div></div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Last summary sent: {fmt(settings.last_summary_sent_at)}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminPlatformHealth;
