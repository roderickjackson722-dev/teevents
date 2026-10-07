/**
 * GHIN handicap lookups and event/league sync. Server-only.
 *
 * Credentials: set GHIN_USERNAME and GHIN_PASSWORD. Until both exist every lookup
 * returns `pending`, and players keep
 * their stored/manual index — nothing is blocked.
 */
import { computeHandicaps } from "@/lib/courseHandicap";

export type GhinLookup =
  | { status: "ok"; index: number; lowIndex: number | null }
  | { status: "pending"; message: string }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

export function ghinConfigured() {
  return Boolean(process.env["GHIN_USERNAME"] && process.env["GHIN_PASSWORD"]);
}

function parseIndex(v: unknown): number | null {
  if (v == null || v === "" || v === "NH") return null;
  const s = String(v).trim();
  const n = s.startsWith("+") ? -Number(s.slice(1)) : Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function lookupHandicapByGhinId(ghinId: string, lastName?: string | null): Promise<GhinLookup> {
  const username = process.env["GHIN_USERNAME"];
  const password = process.env["GHIN_PASSWORD"];
  if (!username || !password) return { status: "pending", message: "GHIN is not connected yet — enter the index manually." };
  try {
    const { GhinClient } = await import("@spicygolf/ghin");
    const client = new GhinClient({ username, password });
    const result = await client.golfers.getMany([Number(ghinId)], { status: null });
    if (result.isErr()) return { status: "error", message: result.error.message || "GHIN request failed" };
    const g = result.value.golfers[0];
    if (!g) return { status: "not_found", message: "No active golfer found for that GHIN number." };
    if (lastName && g.last_name && g.last_name.toLowerCase() !== lastName.toLowerCase()) {
      return { status: "not_found", message: "The GHIN number did not match that player's last name." };
    }
    const index = parseIndex(g.handicap_index ?? g.hi_value);
    if (index == null) return { status: "not_found", message: "Golfer has no handicap index on file." };
    return { status: "ok", index, lowIndex: parseIndex(g.low_hi ?? g.low_hi_value) };
  } catch (e: any) {
    return { status: "error", message: e?.message || "GHIN request failed" };
  }
}

async function batchLookup(ghinIds: string[]): Promise<Map<string, GhinLookup>> {
  const output = new Map<string, GhinLookup>();
  const unique = [...new Set(ghinIds.filter((id) => /^\d{4,10}$/.test(id)))];
  if (!unique.length) return output;
  const username = process.env["GHIN_USERNAME"];
  const password = process.env["GHIN_PASSWORD"];
  if (!username || !password) {
    unique.forEach((id) => output.set(id, { status: "pending", message: "GHIN is not connected yet — enter the index manually." }));
    return output;
  }
  try {
    const { GhinClient } = await import("@spicygolf/ghin");
    const client = new GhinClient({ username, password });
    const result = await client.golfers.getMany(unique.map(Number), { status: null });
    if (result.isErr()) {
      unique.forEach((id) => output.set(id, { status: "error", message: result.error.message || "GHIN request failed" }));
      return output;
    }
    const golfers = new Map(result.value.golfers.map((g) => [String(g.ghin), g]));
    unique.forEach((id) => {
      const golfer = golfers.get(id);
      if (!golfer) { output.set(id, { status: "not_found", message: "No golfer found for that GHIN number." }); return; }
      const index = parseIndex(golfer.handicap_index ?? golfer.hi_value);
      output.set(id, index == null
        ? { status: "not_found", message: "Golfer has no handicap index on file." }
        : { status: "ok", index, lowIndex: parseIndex(golfer.low_hi ?? golfer.low_hi_value) });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GHIN request failed";
    unique.forEach((id) => output.set(id, { status: "error", message }));
  }
  return output;
}

type Admin = any;
export interface SyncSummary {
  total: number;
  updated: number;
  manualRemaining: number;
  failed: number;
  pending: boolean;
  errors: { player: string; message: string }[];
  message: string;
}

function summarize(s: Omit<SyncSummary, "message">): SyncSummary {
  const base = s.pending
    ? `GHIN isn't connected yet. ${s.total} players kept their current index.`
    : `Updated ${s.updated} of ${s.total} players.`;
  const manual = s.manualRemaining ? ` ${s.manualRemaining} manual ${s.manualRemaining === 1 ? "entry remains" : "entries remain"}.` : "";
  const failed = s.failed && !s.pending ? ` ${s.failed} could not be reached.` : "";
  return { ...s, message: base + manual + failed };
}

async function writeLog(admin: Admin, row: Record<string, unknown>, s: SyncSummary) {
  await admin.from("handicap_sync_logs").insert({
    ...row,
    total: s.total,
    updated: s.updated,
    manual_remaining: s.manualRemaining,
    failed: s.failed,
    pending: s.pending,
    errors: s.errors,
  });
  if (s.errors.length) console.error("[ghin] sync errors", row, s.errors);
}

/** Recalculate and store Course/Playing Handicaps for every player in an event. */
export async function recalcEventHandicaps(admin: Admin, eventId: string) {
  const { data: t } = await admin
    .from("tournaments")
    .select("id, course_rating, slope_rating, course_par, handicap_allowance_percentage, enterprise_settings")
    .eq("id", eventId)
    .maybeSingle();
  if (!t) return 0;
  const holes = Number(t.enterprise_settings?.holes) === 9 ? 9 : 18;
  const { data: regs } = await admin
    .from("tournament_registrations")
    .select("id, handicap_index")
    .eq("tournament_id", eventId);
  const rows: any[] = [];
  for (const r of regs || []) {
    if (r.handicap_index == null) continue;
    const { courseHandicap: ch, playingHandicap: ph } = computeHandicaps(Number(r.handicap_index), {
      courseRating: t.course_rating, slopeRating: t.slope_rating, par: t.course_par ?? 72,
      allowancePercentage: t.handicap_allowance_percentage ?? 100, holes,
    });
    if (ch == null || ph == null) continue;
    rows.push({ event_id: eventId, player_id: r.id, handicap_index: r.handicap_index, course_handicap: ch, playing_handicap: ph, calculated_at: new Date().toISOString() });
    await admin.from("tournament_registrations").update({ course_handicap: ch, playing_handicap: ph }).eq("id", r.id);
  }
  if (rows.length) await admin.from("course_handicaps").upsert(rows, { onConflict: "event_id,player_id" });
  return rows.length;
}

export async function syncHandicapsForEvent(admin: Admin, eventId: string, triggeredBy = "manual"): Promise<SyncSummary> {
  const { data: t } = await admin.from("tournaments").select("id, title, organization_id").eq("id", eventId).maybeSingle();
  const { data: regs } = await admin
    .from("tournament_registrations")
    .select("id, first_name, last_name, ghin_id, handicap_index")
    .eq("tournament_id", eventId);
  const list = regs || [];
  const pending = !ghinConfigured();
  const lookups = await batchLookup(list.map((r: any) => r.ghin_id).filter(Boolean));
  let updated = 0, failed = 0;
  const errors: SyncSummary["errors"] = [];
  const now = new Date().toISOString();
  for (const r of list) {
    if (!r.ghin_id || pending) continue;
    const res = lookups.get(r.ghin_id) || { status: "not_found" as const, message: "No golfer found for that GHIN number." };
    if (res.status === "ok") {
      await admin.from("tournament_registrations").update({
        handicap_index: res.index, handicap: Math.round(res.index), low_handicap_index: res.lowIndex,
        handicap_source: "ghin", handicap_last_updated: now,
      }).eq("id", r.id);
      await admin.from("handicap_index_history").insert({ organization_id: t?.organization_id, registration_id: r.id, handicap_index: res.index, source: "ghin" });
      updated++;
    } else {
      failed++;
      errors.push({ player: `${r.first_name} ${r.last_name}`.trim(), message: res.message });
    }
  }
  await recalcEventHandicaps(admin, eventId);
  const summary = summarize({
    total: list.length, updated, failed, pending, errors,
    manualRemaining: list.filter((r: any) => !r.ghin_id).length,
  });
  await writeLog(admin, { organization_id: t?.organization_id, scope: "event", target_id: eventId, target_name: t?.title, triggered_by: triggeredBy }, summary);
  return summary;
}

export async function syncHandicapsForLeague(admin: Admin, leagueId: string, triggeredBy = "manual"): Promise<SyncSummary> {
  const { data: lg } = await admin.from("golf_leagues").select("id, league_name, organization_id").eq("id", leagueId).maybeSingle();
  const { data: members } = await admin
    .from("league_members")
    .select("id, member_name, ghin_id")
    .eq("league_id", leagueId)
    .neq("is_active", false);
  const list = members || [];
  const pending = !ghinConfigured();
  const lookups = await batchLookup(list.map((m: any) => m.ghin_id).filter(Boolean));
  let updated = 0, failed = 0;
  const errors: SyncSummary["errors"] = [];
  const now = new Date().toISOString();
  for (const m of list) {
    if (!m.ghin_id || pending) continue;
    const res = lookups.get(m.ghin_id) || { status: "not_found" as const, message: "No golfer found for that GHIN number." };
    if (res.status === "ok") {
      await admin.from("league_members").update({
        handicap_index: res.index, low_handicap_index: res.lowIndex, handicap_source: "ghin",
        handicap_last_updated: now, handicap_updated_at: now,
      }).eq("id", m.id);
      await admin.from("handicap_index_history").insert({ organization_id: lg?.organization_id, league_member_id: m.id, handicap_index: res.index, source: "ghin" });
      updated++;
    } else {
      failed++;
      errors.push({ player: m.member_name, message: res.message });
    }
  }
  const summary = summarize({
    total: list.length, updated, failed, pending, errors,
    manualRemaining: list.filter((m: any) => !m.ghin_id).length,
  });
  await writeLog(admin, { organization_id: lg?.organization_id, scope: "league", target_id: leagueId, target_name: lg?.league_name, triggered_by: triggeredBy }, summary);
  return summary;
}

/** Sync every event/league that has auto-sync on (or all handicap events when `all`). */
export async function syncAll(admin: Admin, triggeredBy: string, all = false) {
  const today = new Date().toISOString().slice(0, 10);
  let evQ = admin.from("tournaments").select("id").eq("handicap_enabled", true).gte("date", today);
  if (!all) evQ = evQ.eq("handicap_sync_enabled", true);
  const { data: evs } = await evQ.limit(500);
  let lgQ = admin.from("golf_leagues").select("id").eq("is_active", true);
  if (!all) lgQ = lgQ.eq("handicap_sync_enabled", true);
  const { data: lgs } = await lgQ.limit(500);
  let events = 0, leagues = 0, updated = 0;
  for (const e of evs || []) { const s = await syncHandicapsForEvent(admin, e.id, triggeredBy); events++; updated += s.updated; }
  for (const l of lgs || []) { const s = await syncHandicapsForLeague(admin, l.id, triggeredBy); leagues++; updated += s.updated; }
  return { events, leagues, updated, pending: !ghinConfigured() };
}

/** Verify the bearer token and return { userId, userClient } or null. */
export async function authUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id, client };
}

export function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
