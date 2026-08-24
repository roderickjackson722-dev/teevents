// Server-only helpers for the admin Platform Health dashboard.
// Never import from client code — this file is blocked from client bundles.

const SENDER = "TeeVents Platform Health <info@notifications.teevents.golf>";
const DEFAULT_TO = "info@teevents.golf";

export type Metrics = Record<string, any>;

export interface HealthSettings {
  alert_email: string;
  alerts_enabled: boolean;
  connections_pct_threshold: number;
  wal_pct_threshold: number;
  disk_gb_threshold: number;
  cache_hit_pct_floor: number;
  monitoring_started_at: string | null;
  monitoring_ends_at: string | null;
  monitoring_label: string | null;
  last_summary_sent_at: string | null;
}

export async function getAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Throws when the caller is not a platform admin. */
export async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden: admin access required");
}

export function gb(bytes: number | null | undefined) {
  return Math.round(((Number(bytes) || 0) / 1024 ** 3) * 100) / 100;
}

export function mb(bytes: number | null | undefined) {
  return Math.round((Number(bytes) || 0) / 1024 ** 2);
}

export function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  }) + " ET";
}

export async function loadSettings(admin: any): Promise<HealthSettings> {
  const { data } = await admin.from("platform_health_settings").select("*").eq("id", true).maybeSingle();
  return (data ?? {
    alert_email: DEFAULT_TO,
    alerts_enabled: true,
    connections_pct_threshold: 80,
    wal_pct_threshold: 75,
    disk_gb_threshold: 6,
    cache_hit_pct_floor: 95,
    monitoring_started_at: null,
    monitoring_ends_at: null,
    monitoring_label: null,
    last_summary_sent_at: null,
  }) as HealthSettings;
}

export async function sendHealthEmail(to: string, subject: string, html: string) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return { ok: false, error: "RESEND_API_KEY is not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: SENDER,
        to: [to || DEFAULT_TO],
        reply_to: DEFAULT_TO,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body: any = await res.json().catch(() => ({}));
      return { ok: false, error: body?.message || `Resend HTTP ${res.status}` };
    }
    return { ok: true, error: null as string | null };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Email delivery failed" };
  }
}

export function shell(title: string, bodyHtml: string, accent = "#1a5c38") {
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;padding:24px;margin:0;">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;max-width:640px;margin:auto;">
<tr><td style="background:${accent};padding:20px;color:#fff;font-size:18px;font-weight:700;">${esc(title)}</td></tr>
<tr><td style="padding:20px;">${bodyHtml}
<p style="color:#6b7280;font-size:12px;margin:20px 0 0;">Automated message from the TeeVents platform health monitor.</p>
</td></tr></table></body></html>`;
}

export function metricRows(m: Metrics) {
  const rows: Array<[string, string]> = [
    ["Connections", `${m.connections} of ${m.max_connections} (${pct(m.connections, m.max_connections)}%)`],
    ["Active queries", String(m.active_queries ?? 0)],
    ["WAL size", `${mb(m.wal_bytes)} MB across ${m.wal_files} files (limit ${mb(m.max_wal_bytes)} MB)`],
    ["Database size", `${gb(m.db_bytes)} GB`],
    ["Cache hit rate (memory)", `${m.cache_hit_pct}%`],
    ["Temp spill to disk", `${mb(m.temp_bytes)} MB in ${m.temp_files ?? 0} files`],
    ["Deadlocks / rollbacks", `${m.deadlocks ?? 0} / ${m.rolled_back ?? 0}`],
    ["Checkpoints (timed / forced)", `${m.checkpoints_timed ?? 0} / ${m.checkpoints_requested ?? 0}`],
  ];
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #eef0f2;color:#6b7280;">${esc(k)}</td><td style="padding:7px 0;border-bottom:1px solid #eef0f2;font-weight:600;" align="right">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

export function pct(a: any, b: any) {
  const n = Number(a) || 0;
  const d = Number(b) || 1;
  return Math.round((n / d) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Threshold evaluation
// ---------------------------------------------------------------------------
export interface Breach {
  metric: string;
  label: string;
  severity: "warning" | "critical";
  value: number;
  threshold: number;
  message: string;
}

export function evaluate(m: Metrics, s: HealthSettings): Breach[] {
  const out: Breach[] = [];
  const connPct = pct(m.connections, m.max_connections);
  const walPct = pct(m.wal_bytes, m.max_wal_bytes);
  const diskGb = gb(m.db_bytes);
  const cache = Number(m.cache_hit_pct) || 0;

  if (connPct >= Number(s.connections_pct_threshold)) {
    out.push({
      metric: "connections",
      label: "Database connections",
      severity: connPct >= 92 ? "critical" : "warning",
      value: connPct,
      threshold: Number(s.connections_pct_threshold),
      message: `${m.connections} of ${m.max_connections} connections in use (${connPct}%). New event traffic may start failing to connect.`,
    });
  }
  if (walPct >= Number(s.wal_pct_threshold)) {
    out.push({
      metric: "wal",
      label: "Write-ahead log (WAL)",
      severity: walPct >= 95 ? "critical" : "warning",
      value: walPct,
      threshold: Number(s.wal_pct_threshold),
      message: `WAL is holding ${mb(m.wal_bytes)} MB (${walPct}% of the ${mb(m.max_wal_bytes)} MB limit). Checkpoints may be lagging behind write volume.`,
    });
  }
  if (diskGb >= Number(s.disk_gb_threshold)) {
    out.push({
      metric: "disk",
      label: "Database disk usage",
      severity: "warning",
      value: diskGb,
      threshold: Number(s.disk_gb_threshold),
      message: `Database has grown to ${diskGb} GB, above the ${s.disk_gb_threshold} GB alert level.`,
    });
  }
  if (cache > 0 && cache < Number(s.cache_hit_pct_floor)) {
    out.push({
      metric: "memory",
      label: "Memory / cache pressure",
      severity: cache < 90 ? "critical" : "warning",
      value: cache,
      threshold: Number(s.cache_hit_pct_floor),
      message: `Cache hit rate is ${cache}% (below ${s.cache_hit_pct_floor}%) with ${mb(m.temp_bytes)} MB spilled to disk — the instance is reading from disk more than it should, a sign of memory pressure.`,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// One monitor cycle: capture, alert, summarize
// ---------------------------------------------------------------------------
export async function runMonitorCycle(opts: { force?: boolean } = {}) {
  const admin = await getAdminClient();
  const { data: captured, error } = await admin.rpc("platform_health_capture");
  if (error) throw new Error(error.message);
  const m = captured as Metrics;
  const s = await loadSettings(admin);
  const breaches = evaluate(m, s);
  const alerted: string[] = [];
  const suppressed: string[] = [];

  for (const b of breaches) {
    // Don't re-email the same metric more often than once an hour.
    if (!opts.force) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await admin
        .from("platform_health_alerts")
        .select("id")
        .eq("metric", b.metric)
        .gte("created_at", since)
        .limit(1);
      if (recent && recent.length > 0) {
        suppressed.push(b.metric);
        continue;
      }
    }

    let emailed: string | null = null;
    let emailError: string | null = null;
    if (s.alerts_enabled) {
      const subject = `${b.severity === "critical" ? "🚨" : "⚠️"} TeeVents backend alert – ${b.label} at ${b.value}%`;
      const html = shell(
        `${b.label} above safe level`,
        `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">${esc(b.message)}</p>
         <p style="color:#374151;font-size:15px;margin:0 0 16px;"><strong>Threshold:</strong> ${esc(b.threshold)} &nbsp;•&nbsp; <strong>Current:</strong> ${esc(b.value)}</p>
         ${metricRows(m)}
         <p style="margin:20px 0 0;"><a href="https://www.teevents.golf/admin/platform-health" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:13px 26px;border-radius:6px;text-decoration:none;font-weight:bold;">Open Platform Health</a></p>`,
        b.severity === "critical" ? "#b91c1c" : "#b45309",
      );
      const res = await sendHealthEmail(s.alert_email, subject, html);
      emailed = res.ok ? new Date().toISOString() : null;
      emailError = res.error;
    }

    await admin.from("platform_health_alerts").insert({
      metric: b.metric,
      severity: b.severity,
      value: b.value,
      threshold: b.threshold,
      message: b.message,
      emailed_at: emailed,
      email_error: emailError,
    });
    alerted.push(b.metric);
  }

  // Stability monitoring run summaries (daily + final).
  let summary: string | null = null;
  if (s.monitoring_ends_at) {
    const now = Date.now();
    const ends = new Date(s.monitoring_ends_at).getTime();
    const lastSent = s.last_summary_sent_at ? new Date(s.last_summary_sent_at).getTime() : 0;
    const dueDaily = now - lastSent >= 23.5 * 60 * 60 * 1000;
    const finished = now >= ends;
    if (finished || dueDaily) {
      const sum = await buildStabilitySummary(admin, s, finished);
      if (s.alerts_enabled) await sendHealthEmail(s.alert_email, sum.subject, sum.html);
      await admin
        .from("platform_health_settings")
        .update({
          last_summary_sent_at: new Date().toISOString(),
          ...(finished ? { monitoring_ends_at: null } : {}),
        })
        .eq("id", true);
      summary = finished ? "final" : "daily";
    }
  }

  await admin.rpc("prune_platform_health_snapshots");

  return {
    ok: true,
    captured_at: m.captured_at,
    breaches: breaches.map((b) => b.metric),
    alerted,
    suppressed,
    summary,
    metrics: m,
  };
}

// ---------------------------------------------------------------------------
// 7-day stability summary
// ---------------------------------------------------------------------------
export async function buildStabilitySummary(admin: any, s: HealthSettings, final: boolean) {
  const start = s.monitoring_started_at ?? new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: snaps } = await admin
    .from("platform_health_snapshots")
    .select("*")
    .gte("captured_at", start)
    .order("captured_at", { ascending: true })
    .limit(5000);
  const rows = (snaps ?? []) as any[];
  const { data: alerts } = await admin
    .from("platform_health_alerts")
    .select("metric, severity, message, created_at")
    .gte("created_at", start)
    .order("created_at", { ascending: false })
    .limit(50);

  const nums = (k: string) => rows.map((r) => Number(r[k]) || 0);
  const stat = (k: string) => {
    const v = nums(k);
    if (!v.length) return { min: 0, max: 0, avg: 0 };
    const sum = v.reduce((a, b) => a + b, 0);
    return {
      min: Math.round(Math.min(...v) * 10) / 10,
      max: Math.round(Math.max(...v) * 10) / 10,
      avg: Math.round((sum / v.length) * 10) / 10,
    };
  };

  const conn = stat("connections_pct");
  const wal = stat("wal_pct");
  const cache = stat("cache_hit_pct");
  const disk = stat("db_bytes");
  const alertRows = (alerts ?? []) as any[];
  const critical = alertRows.filter((a) => a.severity === "critical").length;
  const stable = critical === 0 && conn.max < Number(s.connections_pct_threshold) && wal.max < 100;

  const table = `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
  <tr><th align="left" style="padding:7px 0;font-size:12px;text-transform:uppercase;color:#6b7280;">Metric</th>
  <th align="right" style="padding:7px 0;font-size:12px;text-transform:uppercase;color:#6b7280;">Avg</th>
  <th align="right" style="padding:7px 0;font-size:12px;text-transform:uppercase;color:#6b7280;">Peak</th></tr>
  <tr><td style="padding:7px 0;border-top:1px solid #eef0f2;">Connections used</td><td align="right" style="padding:7px 0;border-top:1px solid #eef0f2;">${conn.avg}%</td><td align="right" style="padding:7px 0;border-top:1px solid #eef0f2;font-weight:700;">${conn.max}%</td></tr>
  <tr><td style="padding:7px 0;border-top:1px solid #eef0f2;">WAL of limit</td><td align="right" style="padding:7px 0;border-top:1px solid #eef0f2;">${wal.avg}%</td><td align="right" style="padding:7px 0;border-top:1px solid #eef0f2;font-weight:700;">${wal.max}%</td></tr>
  <tr><td style="padding:7px 0;border-top:1px solid #eef0f2;">Cache hit rate</td><td align="right" style="padding:7px 0;border-top:1px solid #eef0f2;">${cache.avg}%</td><td align="right" style="padding:7px 0;border-top:1px solid #eef0f2;font-weight:700;">${cache.min}% low</td></tr>
  <tr><td style="padding:7px 0;border-top:1px solid #eef0f2;">Database size</td><td align="right" style="padding:7px 0;border-top:1px solid #eef0f2;">${gb(disk.avg)} GB</td><td align="right" style="padding:7px 0;border-top:1px solid #eef0f2;font-weight:700;">${gb(disk.max)} GB</td></tr>
  </table>`;

  const alertList = alertRows.length
    ? `<p style="color:#374151;font-size:15px;margin:18px 0 6px;font-weight:700;">Alerts raised (${alertRows.length})</p>
       <ul style="color:#374151;font-size:14px;line-height:1.6;padding-left:18px;margin:0;">${alertRows
         .slice(0, 10)
         .map((a) => `<li>${esc(fmtTime(a.created_at))} — ${esc(a.metric)}: ${esc(a.message)}</li>`)
         .join("")}</ul>`
    : `<p style="color:#166534;font-size:15px;margin:18px 0 0;">No threshold alerts were raised in this window.</p>`;

  const verdict = stable
    ? "The Small instance size looks <strong>stable</strong> — no critical alerts and headroom on every metric."
    : "The Small instance size showed <strong>pressure</strong> during this window. Review the alerts below; a larger instance may be warranted.";

  return {
    subject: `${final ? "Final" : "Daily"} stability report – TeeVents backend${stable ? " (stable)" : " (needs review)"}`,
    stable,
    html: shell(
      `${final ? "7-Day Stability Report" : "Daily Stability Check"}`,
      `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">
         Monitoring window: <strong>${esc(fmtTime(start))}</strong> → <strong>${esc(fmtTime(final ? new Date().toISOString() : s.monitoring_ends_at))}</strong><br/>
         Readings collected: <strong>${rows.length}</strong></p>
       <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">${verdict}</p>
       ${table}${alertList}
       <p style="margin:20px 0 0;"><a href="https://www.teevents.golf/admin/platform-health" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:13px 26px;border-radius:6px;text-decoration:none;font-weight:bold;">Open Platform Health</a></p>`,
      stable ? "#1a5c38" : "#b45309",
    ),
    stats: { conn, wal, cache, disk, readings: rows.length, alerts: alertRows.length, critical },
  };
}
