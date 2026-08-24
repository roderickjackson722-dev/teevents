// Automated platform health monitor.
//
// Runs every 5 minutes from pg_cron. Captures a backend health snapshot
// (connections, WAL, disk, memory/cache pressure), raises + emails alerts when
// a metric crosses its safe threshold, and emails the daily / final summary
// while a stability monitoring run is active.
import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

async function handle() {
  try {
    const { runMonitorCycle } = await import("@/lib/platformHealth.server");
    const result = await runMonitorCycle();
    // Don't echo raw metrics to a public endpoint.
    return json({
      ok: true,
      captured_at: result.captured_at,
      breaches: result.breaches,
      alerted: result.alerted,
      summary: result.summary,
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Monitor run failed" }, 500);
  }
}

export const Route = createFileRoute("/api/public/hooks/platform-health-monitor")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { headers: cors }),
      GET: () => handle(),
      POST: () => handle(),
    },
  },
});
