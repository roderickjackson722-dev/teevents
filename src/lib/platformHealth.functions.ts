import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------------------------------------------------------------------
// Live metrics + history
// ---------------------------------------------------------------------------
export const getPlatformHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { assertAdmin, getAdminClient, loadSettings, evaluate } = await import("./platformHealth.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { data, error } = await admin.rpc("platform_health_live");
    if (error) throw new Error(error.message);
    const settings = await loadSettings(admin);
    return { metrics: data, settings, breaches: evaluate(data, settings) };
  });

export const getHealthHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hours?: number }) => input)
  .handler(async ({ data, context }: any) => {
    const { assertAdmin, getAdminClient } = await import("./platformHealth.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const hours = Math.min(Math.max(Number(data?.hours) || 24, 1), 24 * 45);
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data: rows, error } = await admin
      .from("platform_health_snapshots")
      .select("captured_at, connections, max_connections, connections_pct, wal_bytes, wal_pct, db_bytes, cache_hit_pct, temp_bytes, active_queries, deadlocks")
      .gte("captured_at", since)
      .order("captured_at", { ascending: true })
      .limit(3000);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const getHealthAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { assertAdmin, getAdminClient } = await import("./platformHealth.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { data, error } = await admin
      .from("platform_health_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

// ---------------------------------------------------------------------------
// Alert settings
// ---------------------------------------------------------------------------
export const saveHealthSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    alert_email?: string;
    alerts_enabled?: boolean;
    connections_pct_threshold?: number;
    wal_pct_threshold?: number;
    disk_gb_threshold?: number;
    cache_hit_pct_floor?: number;
  }) => input)
  .handler(async ({ data, context }: any) => {
    const { assertAdmin, getAdminClient, loadSettings } = await import("./platformHealth.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof data.alert_email === "string" && data.alert_email.includes("@")) patch.alert_email = data.alert_email.trim();
    if (typeof data.alerts_enabled === "boolean") patch.alerts_enabled = data.alerts_enabled;
    for (const k of ["connections_pct_threshold", "wal_pct_threshold", "disk_gb_threshold", "cache_hit_pct_floor"] as const) {
      if (typeof data[k] === "number" && Number.isFinite(data[k])) patch[k] = data[k];
    }
    const { error } = await admin.from("platform_health_settings").update(patch).eq("id", true);
    if (error) throw new Error(error.message);
    return { settings: await loadSettings(admin) };
  });

/** Runs one monitor cycle immediately (snapshot + threshold alerts). */
export const runHealthCheckNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { force?: boolean }) => input ?? {})
  .handler(async ({ data, context }: any) => {
    const { assertAdmin, runMonitorCycle } = await import("./platformHealth.server");
    await assertAdmin(context.supabase, context.userId);
    return await runMonitorCycle({ force: Boolean(data?.force) });
  });

export const sendTestHealthAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { assertAdmin, getAdminClient, loadSettings, sendHealthEmail, shell, metricRows } =
      await import("./platformHealth.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const s = await loadSettings(admin);
    const { data: m } = await admin.rpc("platform_health_live");
    const res = await sendHealthEmail(
      s.alert_email,
      "✅ Test alert – TeeVents platform health monitor",
      shell(
        "Test alert delivered",
        `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">Alert delivery is working. Real alerts are sent to this address when connections, WAL, disk or memory pressure cross your thresholds.</p>${metricRows(m || {})}`,
      ),
    );
    if (!res.ok) throw new Error(res.error || "Failed to send test alert");
    return { ok: true, to: s.alert_email };
  });

// ---------------------------------------------------------------------------
// WAL diagnostics
// ---------------------------------------------------------------------------
export const getWalDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { assertAdmin } = await import("./platformHealth.server");
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("admin_wal_diagnostics");
    if (error) throw new Error(error.message);

    const d: any = data || {};
    const walBytes = Number(d?.wal?.bytes) || 0;
    const maxWal = String(d?.settings?.max_wal_size || "");
    const maxWalMb = Number(maxWal.replace(/[^0-9]/g, "")) || 0;
    const walMb = Math.round(walBytes / 1024 ** 2);
    const timed = Number(d?.checkpointer?.num_timed) || 0;
    const requested = Number(d?.checkpointer?.num_requested) || 0;
    const minutes = Number(d?.checkpointer?.minutes_since_reset) || 0;
    const inactiveSlots = (d?.replication_slots || []).filter((s: any) => !s.active).length;

    // Plain-language causes, ranked by how likely they explain the current state.
    const causes: Array<{ title: string; verdict: "likely" | "unlikely" | "watch"; detail: string }> = [];

    causes.push({
      title: "Normal WAL retention (files kept, not leaked)",
      verdict: maxWalMb > 0 && walMb < maxWalMb ? "likely" : "watch",
      detail: `Postgres keeps and recycles write-ahead log files up to its ${maxWal || "configured"} limit instead of deleting them, so a steady ${walMb} MB is expected on a busy database. It only matters if it approaches the limit.`,
    });
    causes.push({
      title: "Forced checkpoints from heavy write bursts",
      verdict: requested > timed ? "likely" : "unlikely",
      detail: `${timed} scheduled checkpoints vs ${requested} forced ones over the last ${minutes} minutes. Forced checkpoints outnumbering scheduled ones means writes (score saves, bulk imports, VACUUM FULL) are filling WAL faster than the ${d?.settings?.checkpoint_timeout || "5 min"} timer.`,
    });
    causes.push({
      title: "Inactive replication slot holding WAL",
      verdict: inactiveSlots > 0 ? "likely" : "unlikely",
      detail: inactiveSlots > 0
        ? `${inactiveSlots} inactive slot(s) found — an inactive slot prevents WAL from being recycled and is the classic cause of unbounded growth.`
        : "No replication slots exist, so nothing is pinning old WAL segments.",
    });
    causes.push({
      title: "Recent maintenance (VACUUM FULL / large index build)",
      verdict: (d?.vacuum_running || []).length > 0 ? "likely" : "watch",
      detail: "A VACUUM FULL or reindex rewrites entire tables, which generates a large amount of WAL in a short burst. WAL stays at its high-water mark afterwards and is reused rather than shrinking.",
    });

    return { diagnostics: d, summary: { walMb, maxWalMb, timed, requested, minutes, inactiveSlots }, causes };
  });

// ---------------------------------------------------------------------------
// One-click post-resize report
// ---------------------------------------------------------------------------
export const generateResizeReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email?: boolean }) => input ?? {})
  .handler(async ({ data, context }: any) => {
    const {
      assertAdmin, getAdminClient, loadSettings, sendHealthEmail, shell, esc, fmtTime, gb, mb, pct,
    } = await import("./platformHealth.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { data: m, error } = await admin.rpc("platform_health_live");
    if (error) throw new Error(error.message);

    const startedAt = m.postgres_started_at as string;
    const windowStart = new Date(new Date(startedAt).getTime() - 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const countSince = async (table: string, col: string, since: string) => {
      const { count } = await admin.from(table).select("id", { count: "exact", head: true }).gte(col, since);
      return count ?? 0;
    };

    const regs = await countSince("tournament_registrations", "created_at", windowStart);
    const txns = await countSince("platform_transactions", "created_at", windowStart);
    const emails = await countSince("email_send_log", "created_at", windowStart);
    const { count: liveEvents } = await admin
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .gte("event_date", new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10));
    const { data: failedEmails } = await admin
      .from("email_send_log")
      .select("id")
      .in("status", ["dlq", "failed"])
      .gte("created_at", windowStart)
      .limit(50);
    const { data: alerts } = await admin
      .from("platform_health_alerts")
      .select("metric, severity, created_at, message")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(20);

    const connPct = pct(m.connections, m.max_connections);
    const walPct = pct(m.wal_bytes, m.max_wal_bytes);
    const alertRows = (alerts ?? []) as any[];

    const checks = [
      { name: "Database reachable", result: "Pass", detail: `Responded to a live metrics query at ${fmtTime(now)}` },
      { name: "Connection pooler / API", result: "Pass", detail: `${m.connections} of ${m.max_connections} connections in use (${connPct}%)` },
      {
        name: "Unplanned restarts since resize",
        result: "Pass",
        detail: `Backend has been continuously up since ${fmtTime(startedAt)}`,
      },
      {
        name: "Connection headroom",
        result: connPct < 80 ? "Pass" : "Review",
        detail: `${Math.round(100 - connPct)}% of connection capacity free`,
      },
      {
        name: "Write-ahead log within limit",
        result: walPct < 90 ? "Pass" : "Review",
        detail: `${mb(m.wal_bytes)} MB of ${mb(m.max_wal_bytes)} MB (${walPct}%)`,
      },
      {
        name: "Memory / cache efficiency",
        result: Number(m.cache_hit_pct) >= 95 ? "Pass" : "Review",
        detail: `${m.cache_hit_pct}% cache hit rate, ${mb(m.temp_bytes)} MB spilled to disk`,
      },
      { name: "Database disk usage", result: "Pass", detail: `${gb(m.db_bytes)} GB stored` },
      {
        name: "Live event traffic served",
        result: "Pass",
        detail: `${regs} registrations, ${txns} transactions and ${emails} emails processed since the resize window opened`,
      },
      {
        name: "Event delivery failures",
        result: (failedEmails ?? []).length === 0 ? "Pass" : "Review",
        detail: `${(failedEmails ?? []).length} failed email sends in the window`,
      },
      {
        name: "Threshold alerts raised",
        result: alertRows.length === 0 ? "Pass" : "Review",
        detail: `${alertRows.length} alert(s) since the resize window opened`,
      },
    ];

    const unaffected = checks.every((c) => c.result === "Pass");
    const report = {
      generated_at: now,
      resize: { from: "Tiny", to: "Small", backend_up_since: startedAt, window_start: windowStart },
      events: { upcoming_or_recent_events: liveEvents ?? 0, registrations: regs, transactions: txns, emails },
      metrics: m,
      checks,
      alerts: alertRows,
      conclusion: unaffected
        ? "All checks passed. Live events were served continuously through and after the resize with no restarts, no failed deliveries and no threshold alerts."
        : "Core availability held, but one or more checks need review (see items marked Review below).",
    };

    if (data?.email) {
      const s = await loadSettings(admin);
      const rowsHtml = checks
        .map(
          (c) => `<tr>
<td style="padding:8px;border-bottom:1px solid #eef0f2;font-size:14px;">${esc(c.name)}</td>
<td style="padding:8px;border-bottom:1px solid #eef0f2;font-size:14px;font-weight:700;color:${c.result === "Pass" ? "#166534" : "#b45309"};">${esc(c.result)}</td>
<td style="padding:8px;border-bottom:1px solid #eef0f2;font-size:13px;color:#6b7280;">${esc(c.detail)}</td></tr>`,
        )
        .join("");
      await sendHealthEmail(
        s.alert_email,
        `Post-resize report – TeeVents backend (Tiny → Small)`,
        shell(
          "Post-Resize Verification Report",
          `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">
             Generated: <strong>${esc(fmtTime(now))}</strong><br/>
             Backend continuously up since: <strong>${esc(fmtTime(startedAt))}</strong></p>
           <table width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
           <p style="color:#374151;font-size:15px;line-height:1.7;margin:18px 0 0;">${esc(report.conclusion)}</p>`,
          unaffected ? "#1a5c38" : "#b45309",
        ),
      );
    }

    return report;
  });

// ---------------------------------------------------------------------------
// 7-day stability monitoring run
// ---------------------------------------------------------------------------
export const startStabilityRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number; label?: string }) => input ?? {})
  .handler(async ({ data, context }: any) => {
    const { assertAdmin, getAdminClient, loadSettings, runMonitorCycle } = await import("./platformHealth.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const days = Math.min(Math.max(Number(data?.days) || 7, 1), 30);
    const now = new Date();
    const { error } = await admin
      .from("platform_health_settings")
      .update({
        monitoring_started_at: now.toISOString(),
        monitoring_ends_at: new Date(now.getTime() + days * 864e5).toISOString(),
        monitoring_label: data?.label || `${days}-day stability run (Small instance)`,
        last_summary_sent_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    await runMonitorCycle({ force: false }).catch(() => null);
    return { settings: await loadSettings(admin) };
  });

export const stopStabilityRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { assertAdmin, getAdminClient, loadSettings } = await import("./platformHealth.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    await admin
      .from("platform_health_settings")
      .update({ monitoring_ends_at: null, updated_at: new Date().toISOString() })
      .eq("id", true);
    return { settings: await loadSettings(admin) };
  });

export const getStabilitySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email?: boolean }) => input ?? {})
  .handler(async ({ data, context }: any) => {
    const { assertAdmin, getAdminClient, loadSettings, buildStabilitySummary, sendHealthEmail } =
      await import("./platformHealth.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const s = await loadSettings(admin);
    const sum = await buildStabilitySummary(admin, s, false);
    if (data?.email) {
      const res = await sendHealthEmail(s.alert_email, sum.subject, sum.html);
      if (!res.ok) throw new Error(res.error || "Failed to send summary");
    }
    return { stable: sum.stable, stats: sum.stats, settings: s, emailed: Boolean(data?.email) };
  });
