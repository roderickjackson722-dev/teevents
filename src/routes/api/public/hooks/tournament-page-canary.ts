// Daily canary for public tournament pages.
//
// Runs once every 24 hours (pg_cron, 07:00 UTC) and can be triggered manually.
// It does three things:
//   1. Fetches a known-good published tournament page and confirms it renders
//      the tournament (HTTP 200, no "not found" / retry card).
//   2. Calls resolve_public_tournament with the ANON key — this is the exact
//      path that broke when table-level SELECT grants were revoked from `anon`.
//   3. Probes anon SELECT on the tables public pages depend on, so a missing
//      GRANT is caught even if the page happens to be cached.
//
// Any failure emails info@teevents.golf with the details and records a row in
// public.link_check_logs (run_id prefixed "canary").
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://www.teevents.golf";
const SENDER = "TeeVents Golf <info@notifications.teevents.golf>";
const ALERT_TO = "info@teevents.golf";

// Stable, published tournament used as the canary target.
const CANARY_SLUG = process.env["CANARY_TOURNAMENT_SLUG"] || "gamble-sands-tournament";

// Tables that must remain readable by `anon` for public pages to work.
const PUBLIC_READ_TABLES = [
  "tournaments",
  "tournament_registrations",
  "sponsorship_tiers",
  "public_events",
  "golf_courses",
  "event_resources",
  "tournament_photos",
];

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

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Failure = { check: string; detail: string };

async function handle() {
  const failures: Failure[] = [];
  const checks: { check: string; ok: boolean; detail?: string }[] = [];
  const runId = `canary-${crypto.randomUUID()}`;

  const add = (check: string, detail: string | null) => {
    checks.push({ check, ok: !detail, ...(detail ? { detail } : {}) });
    if (detail) failures.push({ check, detail });
  };

  const url = `${SITE}/t/${CANARY_SLUG}`;

  // 1. Page render check
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "TeeVents-Canary/1.0", "Cache-Control": "no-cache" },
    });
    const html = await res.text().catch(() => "");
    if (!res.ok) add("page_render", `HTTP ${res.status} for ${url}`);
    else if (/tournament not found/i.test(html)) add("page_render", `Page shows "Tournament not found"`);
    else if (/just a moment/i.test(html)) add("page_render", `Page shows the loading/retry card (data fetch failing)`);
    else add("page_render", null);
  } catch (e) {
    add("page_render", e instanceof Error ? e.message : String(e));
  }

  // 2 + 3. Anon-key database access — mirrors what the browser can see.
  const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (!supabaseUrl || !anonKey) {
    add("anon_client", "Anon Supabase credentials not configured for the canary");
  } else {
    const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    try {
      const { data, error } = await anon.rpc("resolve_public_tournament", { _slug: CANARY_SLUG });
      const row = Array.isArray(data) ? data[0] : data;
      if (error) add("resolve_rpc", `resolve_public_tournament failed: ${error.message}`);
      else if (!row) add("resolve_rpc", `resolve_public_tournament returned no row for "${CANARY_SLUG}"`);
      else add("resolve_rpc", null);
    } catch (e) {
      add("resolve_rpc", e instanceof Error ? e.message : String(e));
    }

    for (const table of PUBLIC_READ_TABLES) {
      try {
        const { error } = await anon.from(table).select("*", { head: true, count: "exact" }).limit(1);
        // RLS returning zero rows is fine; a permission error is not.
        if (error && /permission denied|not exist/i.test(error.message)) {
          add(`anon_select:${table}`, `Public read access lost: ${error.message}`);
        } else if (error) {
          add(`anon_select:${table}`, error.message);
        } else {
          add(`anon_select:${table}`, null);
        }
      } catch (e) {
        add(`anon_select:${table}`, e instanceof Error ? e.message : String(e));
      }
    }
  }

  // Log the run (best-effort, service role).
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (supabaseUrl && serviceKey) {
    try {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      await admin.from("link_check_logs").insert({
        tournament_id: null,
        tournament_title: `Daily canary (${CANARY_SLUG})`,
        url,
        status_code: failures.length ? 500 : 200,
        resolved_slug: CANARY_SLUG,
        expected_slug: CANARY_SLUG,
        is_error: failures.length > 0,
        skipped: false,
        error_message: failures.length
          ? failures.map((f) => `${f.check}: ${f.detail}`).join("; ")
          : null,
        run_id: runId,
      } as any);
    } catch {
      /* logging is best-effort */
    }
  }

  // Alert on failure.
  const apiKey = process.env["RESEND_API_KEY"];
  if (failures.length && apiKey) {
    const rows = failures
      .map(
        (f) => `<tr>
  <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:14px;">${esc(f.check)}</td>
  <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#b91c1c;">${esc(f.detail)}</td>
</tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;padding:24px;">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;max-width:640px;margin:auto;">
<tr><td style="background:#b91c1c;padding:20px;color:#fff;font-size:18px;font-weight:700;">Daily Canary Failed – Public Tournament Page</td></tr>
<tr><td style="padding:20px;">
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">The daily canary check on <a href="${esc(url)}">${esc(url)}</a> failed. This usually means public read access (table grants or RLS) has changed, or the page is not rendering.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<th align="left" style="padding:8px;font-size:12px;text-transform:uppercase;color:#6b7280;">Check</th>
<th align="left" style="padding:8px;font-size:12px;text-transform:uppercase;color:#6b7280;">Error</th>
</tr>${rows}</table>
<p style="color:#374151;font-size:15px;margin:18px 0 0;">Restore steps: run <code>docs/db-grants-baseline.sql</code> (see <code>docs/public-page-permissions.md</code>).</p>
<p style="color:#6b7280;font-size:12px;margin:18px 0 0;">Automated alert from TeeVents. Run ID: ${esc(runId)}</p>
</td></tr></table></body></html>`;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: SENDER,
          to: [ALERT_TO],
          subject: `🚨 TeeVents canary failed – public tournament page (${failures.length} issue${failures.length > 1 ? "s" : ""})`,
          html,
        }),
      });
    } catch {
      /* alert delivery is best-effort */
    }
  }

  return json(
    { ok: failures.length === 0, run_id: runId, url, slug: CANARY_SLUG, failures, checks },
    failures.length ? 500 : 200,
  );
}

export const Route = createFileRoute("/api/public/hooks/tournament-page-canary")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { headers: cors }),
      GET: () => handle(),
      POST: () => handle(),
    },
  },
});
