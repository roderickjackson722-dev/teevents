// Automated tournament public-page link checker.
//
// Runs twice daily from pg_cron (06:00 and 18:00 UTC) and can be triggered
// manually from Admin Dashboard -> Link Health.
//
// For every published tournament it requests the public page (and the ?ref=qr
// QR-code variant), verifies the page returns 200, resolves to the correct
// tournament, and does not render a "tournament not found" state. Results land
// in public.link_check_logs; failures trigger an alert email to info@teevents.golf.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://www.teevents.golf";
const SENDER = "TeeVents Golf <info@notifications.teevents.golf>";
const ALERT_TO = "info@teevents.golf";

type CheckRow = {
  tournament_id: string | null;
  tournament_title: string | null;
  url: string;
  status_code: number | null;
  resolved_slug: string | null;
  expected_slug: string | null;
  is_error: boolean;
  skipped: boolean;
  error_message: string | null;
  run_id: string;
};

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type, apikey, authorization",
    },
  });
}

/** Pulls the slug the page believes it is, from canonical / og:url. */
function slugFromHtml(html: string): string | null {
  const m =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/property=["']og:url["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:url["']/i);
  if (!m?.[1]) return null;
  const path = m[1].replace(/^https?:\/\/[^/]+/, "").split("?")[0] ?? "";
  const parts = path.split("/").filter(Boolean);
  return parts.length ? (parts[parts.length - 1] ?? null) : null;
}

async function checkUrl(url: string): Promise<{ status: number | null; html: string; error: string | null }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "TeeVents-LinkChecker/1.0" },
    });
    const html = await res.text().catch(() => "");
    return { status: res.status, html, error: res.ok ? null : `HTTP ${res.status}` };
  } catch (e) {
    return { status: null, html: "", error: e instanceof Error ? e.message : String(e) };
  }
}

async function handle(request: Request) {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!supabaseUrl || !serviceKey) return json({ error: "Server not configured" }, 500);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const limit = Math.min(Number(body?.limit) || 200, 400);
  const runId = crypto.randomUUID();

  const { data: tournaments, error } = await admin
    .from("tournaments")
    .select("id, title, slug, custom_slug, site_published")
    .eq("site_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return json({ error: error.message }, 500);

  const rows: CheckRow[] = [];

  for (const t of tournaments || []) {
    const expected = (t.custom_slug || t.slug || "").trim();

    if (!expected) {
      rows.push({
        tournament_id: t.id,
        tournament_title: t.title,
        url: `${SITE}/t/`,
        status_code: null,
        resolved_slug: null,
        expected_slug: null,
        is_error: false,
        skipped: true,
        error_message: "No public page address set",
        run_id: runId,
      });
      continue;
    }

    // Confirm the slug resolves to this tournament in the database.
    let dbError: string | null = null;
    try {
      const { data: resolved, error: rpcError } = await admin.rpc("resolve_public_tournament", {
        _slug: expected,
      });
      const match = Array.isArray(resolved) ? resolved[0] : resolved;
      if (rpcError) dbError = `Lookup failed: ${rpcError.message}`;
      else if (!match) dbError = "Slug does not resolve to a tournament";
      else if ((match as any).id !== t.id) dbError = `Slug resolves to a different tournament (${(match as any).title})`;
    } catch (e) {
      dbError = e instanceof Error ? e.message : String(e);
    }

    const urls = [`${SITE}/t/${expected}`, `${SITE}/t/${expected}?ref=qr`];
    for (const url of urls) {
      const { status, html, error: httpError } = await checkUrl(url);
      const notFound = /tournament not found/i.test(html);
      const resolvedSlug = slugFromHtml(html);
      const mismatch = !!resolvedSlug && resolvedSlug !== expected;

      const problems = [
        httpError,
        notFound ? "Page shows \"Tournament not found\"" : null,
        mismatch ? `Page resolved to /${resolvedSlug}` : null,
        dbError,
      ].filter(Boolean) as string[];

      rows.push({
        tournament_id: t.id,
        tournament_title: t.title,
        url,
        status_code: status,
        resolved_slug: resolvedSlug,
        expected_slug: expected,
        is_error: problems.length > 0,
        skipped: false,
        error_message: problems.length ? problems.join("; ") : null,
        run_id: runId,
      });
    }
  }

  if (rows.length) {
    // insert in chunks so a large platform doesn't exceed payload limits
    for (let i = 0; i < rows.length; i += 100) {
      await admin.from("link_check_logs").insert(rows.slice(i, i + 100) as any);
    }
  }

  const failures = rows.filter((r) => r.is_error);
  const apiKey = process.env["RESEND_API_KEY"];

  if (failures.length && apiKey) {
    const first = failures[0]!;
    const subject = `⚠️ Tournament Page Link Check Failed – ${first.tournament_title || "Unknown"}${
      failures.length > 1 ? ` (+${failures.length - 1} more)` : ""
    }`;
    const items = failures
      .map(
        (f) => `<tr>
  <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:14px;">${esc(f.tournament_title)}</td>
  <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:14px;"><a href="${esc(f.url)}">${esc(f.url)}</a></td>
  <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#b91c1c;">${esc(f.error_message)}</td>
</tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;padding:24px;">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;max-width:640px;margin:auto;">
<tr><td style="background:#1a5c38;padding:20px;color:#fff;font-size:18px;font-weight:700;">Tournament Page Link Check Failed</td></tr>
<tr><td style="padding:20px;">
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">The following tournament page${
      failures.length > 1 ? "s" : ""
    } failed the automated link check:</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<th align="left" style="padding:8px;font-size:12px;text-transform:uppercase;color:#6b7280;">Tournament</th>
<th align="left" style="padding:8px;font-size:12px;text-transform:uppercase;color:#6b7280;">URL</th>
<th align="left" style="padding:8px;font-size:12px;text-transform:uppercase;color:#6b7280;">Error</th>
</tr>${items}</table>
<p style="color:#374151;font-size:15px;margin:18px 0 0;">Please investigate immediately.</p>
<p style="color:#6b7280;font-size:12px;margin:18px 0 0;">This is an automated alert from TeeVents.</p>
</td></tr></table></body></html>`;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: SENDER, to: [ALERT_TO], subject, html }),
      });
    } catch {
      /* alert delivery is best-effort */
    }
  }

  return json({
    ok: true,
    run_id: runId,
    checked: rows.filter((r) => !r.skipped).length,
    passed: rows.filter((r) => !r.skipped && !r.is_error).length,
    failed: failures.length,
    skipped: rows.filter((r) => r.skipped).length,
  });
}

export const Route = createFileRoute("/api/public/hooks/check-tournament-links")({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type, apikey, authorization",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        }),
      POST: ({ request }) => handle(request),
    },
  },
});
