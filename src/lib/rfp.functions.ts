import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only RFP feature set (multi-sport, seasons, facilities, financial
 * reporting). Every function asserts platform-admin role, so these features are
 * invisible and inaccessible to organizers and the public.
 */

export const SPORT_TYPES = [
  "golf",
  "baseball",
  "softball",
  "soccer",
  "basketball",
  "flag_football",
] as const;

export interface SportSetting {
  id: string;
  sport_type: string;
  label: string;
  field_name: string;
  scoring_type: string;
  period_name: string;
  max_players_per_team: number;
  min_players_per_team: number;
  innings_or_halves: number;
  is_active: boolean;
}

async function adminOnly(context: any) {
  const { getAdminClient, assertAdmin } = await import("./security.server");
  await assertAdmin(context.supabase, context.userId);
  return await getAdminClient();
}

/* ---------------------------------- sports --------------------------------- */

export const listSports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const admin = await adminOnly(context);
    const [{ data: sports }, { data: tournaments }] = await Promise.all([
      admin.from("sport_settings").select("*").order("label"),
      admin
        .from("tournaments")
        .select("id, title, date, sport_type")
        .order("date", { ascending: false })
        .limit(300),
    ]);
    return {
      sports: (sports || []) as SportSetting[],
      tournaments: (tournaments || []) as any[],
    };
  });

export const upsertSport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<SportSetting> & { sport_type: string; label: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const row = {
      sport_type: String(data.sport_type).trim().toLowerCase().replace(/\s+/g, "_"),
      label: String(data.label).trim(),
      field_name: data.field_name || "Field",
      scoring_type: data.scoring_type || "points",
      period_name: data.period_name || "Period",
      max_players_per_team: Number(data.max_players_per_team) || 9,
      min_players_per_team: Number(data.min_players_per_team) || 1,
      innings_or_halves: Number(data.innings_or_halves) || 4,
      is_active: data.is_active !== false,
    };
    const { error } = data.id
      ? await admin.from("sport_settings").update(row).eq("id", data.id)
      : await admin.from("sport_settings").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { error } = await admin.from("sport_settings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignTournamentSport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tournamentId: string; sportType: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { error } = await admin
      .from("tournaments")
      .update({ sport_type: data.sportType })
      .eq("id", data.tournamentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- seasons --------------------------------- */

export const listSeasons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const admin = await adminOnly(context);
    const [{ data: seasons }, { data: teams }, { data: standings }] = await Promise.all([
      admin.from("seasons").select("*").order("created_at", { ascending: false }),
      admin.from("season_teams").select("*").order("team_name"),
      admin.from("season_standings").select("*"),
    ]);
    return {
      seasons: (seasons || []) as any[],
      teams: (teams || []) as any[],
      standings: (standings || []) as any[],
    };
  });

export const upsertSeason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const row = {
      name: String(data.name || "").trim(),
      sport_type: data.sport_type || "golf",
      season_type: data.season_type || "league",
      status: data.status || "draft",
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      tournament_id: data.tournament_id || null,
    };
    const { error } = data.id
      ? await admin.from("seasons").update(row).eq("id", data.id)
      : await admin.from("seasons").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSeason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { error } = await admin.from("seasons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertSeasonTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const row = {
      season_id: data.season_id,
      team_name: String(data.team_name || "").trim(),
      division: data.division || null,
      coach_name: data.coach_name || null,
      coach_email: data.coach_email || null,
    };
    if (data.id) {
      const { error } = await admin.from("season_teams").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { data: inserted, error } = await admin
      .from("season_teams")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await admin
      .from("season_standings")
      .insert({ season_id: row.season_id, team_id: inserted.id });
    return { ok: true };
  });

export const deleteSeasonTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { error } = await admin.from("season_teams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveStanding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const row = {
      season_id: data.season_id,
      team_id: data.team_id,
      wins: Number(data.wins) || 0,
      losses: Number(data.losses) || 0,
      ties: Number(data.ties) || 0,
      points: Number(data.points) || 0,
      runs_scored: Number(data.runs_scored) || 0,
      runs_allowed: Number(data.runs_allowed) || 0,
    };
    const { error } = await admin
      .from("season_standings")
      .upsert(row, { onConflict: "season_id,team_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- facilities ------------------------------- */

export const listFacilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const admin = await adminOnly(context);
    const [{ data: facilities }, { data: bookings }, { data: seasons }] = await Promise.all([
      admin.from("facilities").select("*").order("name"),
      admin.from("facility_bookings").select("*").order("start_time", { ascending: true }),
      admin.from("seasons").select("id, name").order("name"),
    ]);
    return {
      facilities: (facilities || []) as any[],
      bookings: (bookings || []) as any[],
      seasons: (seasons || []) as any[],
    };
  });

export const upsertFacility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const row = {
      name: String(data.name || "").trim(),
      address: data.address || null,
      facility_type: data.facility_type || "field",
      capacity: data.capacity ? Number(data.capacity) : null,
      is_active: data.is_active !== false,
      notes: data.notes || null,
    };
    const { error } = data.id
      ? await admin.from("facilities").update(row).eq("id", data.id)
      : await admin.from("facilities").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFacility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { error } = await admin.from("facilities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const row = {
      facility_id: data.facility_id,
      season_id: data.season_id || null,
      tournament_id: data.tournament_id || null,
      title: data.title || null,
      start_time: data.start_time,
      end_time: data.end_time,
      booking_type: data.booking_type || "game",
      status: data.status || "confirmed",
    };
    // Overlap guard so two games are never scheduled on one field at once.
    const { data: clash } = await admin
      .from("facility_bookings")
      .select("id, title, start_time, end_time")
      .eq("facility_id", row.facility_id)
      .neq("status", "cancelled")
      .lt("start_time", row.end_time)
      .gt("end_time", row.start_time);
    const conflicts = (clash || []).filter((c: any) => c.id !== data.id);
    if (conflicts.length && row.status !== "cancelled") {
      throw new Error("That facility is already booked for this time window.");
    }
    const { error } = data.id
      ? await admin.from("facility_bookings").update(row).eq("id", data.id)
      : await admin.from("facility_bookings").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { error } = await admin.from("facility_bookings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------- financial reporting --------------------------- */

export interface FinancialLine {
  id: string;
  date: string;
  category: string;
  program: string;
  sport_type: string;
  season: string | null;
  gross_cents: number;
  platform_fee_cents: number;
  net_cents: number;
}

const CATEGORY_BY_TYPE = (type: string): string => {
  const t = (type || "").toLowerCase();
  if (t.includes("sponsor")) return "Sponsorships";
  if (t.includes("donation")) return "Donations";
  if (t.includes("registration") || t.includes("entry")) return "Registration Fees";
  if (t.includes("ticket")) return "Ticket Sales";
  return "Add-on Sales";
};

export const getFinancialReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from?: string; to?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    let q = admin
      .from("platform_transactions")
      .select("id, created_at, type, status, amount_cents, platform_fee_cents, tournament_id")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (data?.from) q = q.gte("created_at", data.from);
    if (data?.to) q = q.lte("created_at", `${data.to}T23:59:59Z`);

    const [{ data: txs }, { data: tournaments }, { data: seasons }] = await Promise.all([
      q,
      admin.from("tournaments").select("id, title, sport_type"),
      admin.from("seasons").select("id, name, tournament_id"),
    ]);

    const tMap = new Map<string, any>();
    ((tournaments || []) as any[]).forEach((t) => tMap.set(t.id, t));
    const seasonByTournament = new Map<string, string>();
    ((seasons || []) as any[]).forEach((s) => {
      if (s.tournament_id) seasonByTournament.set(s.tournament_id, s.name);
    });

    const paid = ["paid", "succeeded", "completed"];
    const lines: FinancialLine[] = ((txs || []) as any[])
      .filter((t) => paid.includes(String(t.status || "").toLowerCase()))
      .map((t) => {
        const tour = t.tournament_id ? tMap.get(t.tournament_id) : null;
        const gross = Number(t.amount_cents) || 0;
        const fee = Number(t.platform_fee_cents) || 0;
        return {
          id: t.id,
          date: t.created_at,
          category: CATEGORY_BY_TYPE(t.type),
          program: tour?.title || "Platform",
          sport_type: tour?.sport_type || "golf",
          season: (t.tournament_id && seasonByTournament.get(t.tournament_id)) || null,
          gross_cents: gross,
          platform_fee_cents: fee,
          net_cents: gross - fee,
        };
      });

    return { lines };
  });

/* --------------------------------- invoices -------------------------------- */

export interface RfpInvoiceLine {
  id?: string;
  service_type: string;
  service_date: string;
  duration: string;
  rate_cents: number;
  total_cents: number;
  sort_order?: number;
}

export interface RfpInvoice {
  id: string;
  invoice_number: string;
  po_reference: string | null;
  invoice_date: string;
  bill_to: string | null;
  payment_terms: string;
  notes: string | null;
  total_amount_cents: number;
  status: string;
  line_items?: RfpInvoiceLine[];
}

export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const admin = await adminOnly(context);
    const [{ data: invoices }, { data: lines }] = await Promise.all([
      admin.from("rfp_invoices").select("*").order("created_at", { ascending: false }),
      admin.from("rfp_invoice_line_items").select("*").order("sort_order"),
    ]);
    const byInvoice = new Map<string, any[]>();
    ((lines || []) as any[]).forEach((l) => {
      const arr = byInvoice.get(l.invoice_id) || [];
      arr.push(l);
      byInvoice.set(l.invoice_id, arr);
    });
    return {
      invoices: ((invoices || []) as any[]).map((inv) => ({
        ...inv,
        line_items: byInvoice.get(inv.id) || [],
      })) as RfpInvoice[],
    };
  });

export const saveInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const lines: RfpInvoiceLine[] = (data.line_items || []).filter(
      (l: RfpInvoiceLine) => String(l.service_type || "").trim().length > 0,
    );
    const total = lines.reduce((s, l) => s + (Number(l.total_cents) || 0), 0);
    const row = {
      invoice_number: String(data.invoice_number || "").trim(),
      po_reference: data.po_reference || null,
      invoice_date: data.invoice_date || new Date().toISOString().slice(0, 10),
      bill_to: data.bill_to || null,
      payment_terms: data.payment_terms || "Net 30",
      notes: data.notes || null,
      status: data.status || "draft",
      total_amount_cents: total,
    };
    if (!row.invoice_number) throw new Error("Invoice number is required.");

    let invoiceId = data.id as string | undefined;
    if (invoiceId) {
      const { error } = await admin.from("rfp_invoices").update(row).eq("id", invoiceId);
      if (error) throw new Error(error.message);
      await admin.from("rfp_invoice_line_items").delete().eq("invoice_id", invoiceId);
    } else {
      const { data: inserted, error } = await admin
        .from("rfp_invoices")
        .insert(row)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      invoiceId = inserted.id;
    }

    if (lines.length) {
      const { error } = await admin.from("rfp_invoice_line_items").insert(
        lines.map((l, i) => ({
          invoice_id: invoiceId,
          service_type: String(l.service_type).trim(),
          service_date: l.service_date || row.invoice_date,
          duration: String(l.duration || ""),
          rate_cents: Number(l.rate_cents) || 0,
          total_cents: Number(l.total_cents) || 0,
          sort_order: i,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true, id: invoiceId, total_amount_cents: total };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { error } = await admin.from("rfp_invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ Clippd integration ------------------------------ */

export interface ClippdTournament {
  id: string;
  title: string;
  date: string | null;
  clippd_tournament_id: string | null;
  clippd_integration_enabled: boolean;
  clippd_last_sync: string | null;
  has_api_key: boolean;
}

const cleanText = (value: unknown, max = 240) => String(value ?? "").trim().slice(0, max);

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===";
  const binary = atob(padded.slice(0, Math.floor(padded.length / 4) * 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getClippdCryptoKey() {
  const secret = process.env["CLIPPD_ENCRYPTION_KEY"];
  if (!secret) throw new Error("Clippd encryption is not configured.");
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptClippdKey(value: string) {
  const key = await getClippdCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return `v1.${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(ciphertext))}`;
}

async function decryptClippdKey(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("Stored Clippd API key is invalid.");
  const key = await getClippdCryptoKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64Url(parts[1]) },
    key,
    decodeBase64Url(parts[2]),
  );
  return new TextDecoder().decode(plaintext);
}

export const listClippdTournaments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const admin = await adminOnly(context);
    const { data, error } = await admin
      .from("tournaments")
      .select("id, title, date, clippd_tournament_id, clippd_integration_enabled, clippd_last_sync, clippd_api_key")
      .order("date", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return {
      tournaments: ((data || []) as any[]).map((t) => ({
        id: t.id,
        title: t.title || "Untitled tournament",
        date: t.date ?? null,
        clippd_tournament_id: t.clippd_tournament_id ?? null,
        clippd_integration_enabled: !!t.clippd_integration_enabled,
        clippd_last_sync: t.clippd_last_sync ?? null,
        has_api_key: !!t.clippd_api_key,
      })) as ClippdTournament[],
    };
  });

export const saveClippdIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tournamentId: string; clippdTournamentId: string; apiKey?: string; enabled: boolean }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const tournamentId = cleanText(data.tournamentId, 80);
    const clippdTournamentId = cleanText(data.clippdTournamentId, 160);
    const apiKey = cleanText(data.apiKey, 500);
    if (!tournamentId) throw new Error("Tournament is required.");
    if (data.enabled && !clippdTournamentId) throw new Error("Clippd Tournament ID is required when integration is enabled.");

    const { data: existing, error: readError } = await admin
      .from("tournaments")
      .select("id, clippd_api_key")
      .eq("id", tournamentId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) throw new Error("Tournament not found.");
    if (data.enabled && !apiKey && !existing.clippd_api_key) throw new Error("API Key is required the first time integration is enabled.");

    const encryptedKey = apiKey ? await encryptClippdKey(apiKey) : existing.clippd_api_key;
    const { error } = await admin.from("tournaments").update({
      clippd_tournament_id: clippdTournamentId || null,
      clippd_api_key: encryptedKey || null,
      clippd_integration_enabled: !!data.enabled,
    }).eq("id", tournamentId);
    if (error) throw new Error(error.message);
    return { ok: true, has_api_key: !!encryptedKey };
  });

function normalizePersonName(value: unknown) {
  return cleanText(value, 180).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function playerNameFromClippd(item: any) {
  const player = item?.player || item?.golfer || item?.athlete || {};
  return cleanText(
    item?.player_name ?? item?.playerName ?? item?.golfer_name ?? item?.name ?? player?.name ??
    [player?.first_name ?? player?.firstName, player?.last_name ?? player?.lastName].filter(Boolean).join(" "),
    180,
  );
}

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function addHoleScores(target: Array<{ round_number: number; hole_number: number; strokes: number }>, round: unknown, holes: unknown) {
  const roundNumber = Math.max(1, Math.min(3, Number(round) || 1));
  if (!Array.isArray(holes)) return;
  holes.forEach((value, index) => {
    const hole = typeof value === "object" && value !== null ? value : null;
    const strokes = numberValue(hole ? (hole.strokes ?? hole.score ?? hole.value) : value);
    const holeNumber = hole ? Number(hole.hole_number ?? hole.hole ?? hole.number ?? index + 1) : index + 1;
    if (strokes && holeNumber > 0 && holeNumber <= 18) target.push({ round_number: roundNumber, hole_number: holeNumber, strokes });
  });
}

function extractClippdScores(item: any) {
  const result: Array<{ round_number: number; hole_number: number; strokes: number }> = [];
  const rounds = item?.rounds ?? item?.round_scores ?? item?.scores_by_round;
  if (Array.isArray(rounds)) {
    rounds.forEach((round: any, index) => {
      addHoleScores(result, round?.round_number ?? round?.round ?? index + 1, round?.holes ?? round?.hole_scores ?? (Array.isArray(round) ? round : null));
    });
  } else if (rounds && typeof rounds === "object") {
    Object.entries(rounds).forEach(([key, value]: [string, any]) => {
      addHoleScores(result, key.replace(/[^0-9]/g, "") || 1, value?.holes ?? value?.hole_scores ?? (Array.isArray(value) ? value : null));
    });
  }
  if (Array.isArray(item?.hole_scores)) addHoleScores(result, item?.round_number ?? 1, item.hole_scores);
  return result;
}

async function fetchClippdMatches(clippdTournamentId: string, apiKey: string) {
  const url = `https://clipped.com/${encodeURIComponent(clippdTournamentId)}/matches`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });
      if (response.status === 401 || response.status === 403) throw new Error("Clippd API key was rejected.");
      if (response.status === 404) throw new Error("Clippd Tournament ID was not found.");
      if (!response.ok) {
        if (response.status >= 500 && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
          continue;
        }
        throw new Error(`Clippd returned an error (${response.status}).`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error && !/fetch|network/i.test(error.message)) throw error;
      if (attempt === 2) throw new Error("Could not reach Clippd after 3 attempts.");
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw new Error("Could not reach Clippd after 3 attempts.");
}

export const syncClippdScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tournamentId: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { data: tournament, error: tournamentError } = await admin
      .from("tournaments")
      .select("id, clippd_tournament_id, clippd_api_key, clippd_integration_enabled")
      .eq("id", cleanText(data.tournamentId, 80))
      .maybeSingle();
    if (tournamentError) throw new Error(tournamentError.message);
    if (!tournament) throw new Error("Tournament not found.");
    if (!tournament.clippd_integration_enabled) throw new Error("Clippd integration is disabled for this tournament.");
    if (!tournament.clippd_tournament_id) throw new Error("Clippd Tournament ID is not configured.");
    if (!tournament.clippd_api_key) throw new Error("Clippd API Key is not configured.");

    const payload = await fetchClippdMatches(tournament.clippd_tournament_id, await decryptClippdKey(tournament.clippd_api_key));
    const records = Array.isArray(payload) ? payload : (payload?.matches ?? payload?.results ?? payload?.players ?? payload?.data ?? []);
    const { data: registrations, error: registrationError } = await admin
      .from("tournament_registrations")
      .select("id, first_name, last_name")
      .eq("tournament_id", tournament.id);
    if (registrationError) throw new Error(registrationError.message);

    const byName = new Map<string, any>();
    ((registrations || []) as any[]).forEach((registration) => {
      byName.set(normalizePersonName(`${registration.first_name} ${registration.last_name}`), registration);
    });
    const unmatched: string[] = [];
    let importedScores = 0;
    for (const record of (records as any[])) {
      const name = playerNameFromClippd(record);
      const registration = byName.get(normalizePersonName(name));
      if (!registration) { if (name) unmatched.push(name); continue; }
      const scores = extractClippdScores(record);
      if (!scores.length) continue;
      const { error } = await admin.from("tournament_scores").upsert(
        scores.map((score) => ({ ...score, tournament_id: tournament.id, registration_id: registration.id })),
        { onConflict: "registration_id,round_number,hole_number" },
      );
      if (error) throw new Error(error.message);
      importedScores += scores.length;
    }
    const syncedAt = new Date().toISOString();
    const { error: updateError } = await admin.from("tournaments").update({ clippd_last_sync: syncedAt }).eq("id", tournament.id);
    if (updateError) throw new Error(updateError.message);
    return { ok: true, synced_at: syncedAt, matched_players: records.length - unmatched.length, imported_scores: importedScores, unmatched_players: Array.from(new Set(unmatched)) };
  });

export interface ClippdExportOptions {
  tournamentId: string;
  format: "csv" | "json";
  includeNames: boolean;
  includeRounds: boolean;
  includeTotals: boolean;
  includeHandicaps: boolean;
  includeTeams: boolean;
}

async function buildClippdExportRows(admin: any, tournamentId: string, options: ClippdExportOptions) {
  const { data: registrations, error: registrationError } = await admin
    .from("tournament_registrations")
    .select("id, first_name, last_name, handicap, handicap_index, status, team_id")
    .eq("tournament_id", tournamentId)
    .order("last_name");
  if (registrationError) throw new Error(registrationError.message);
  const { data: scores, error: scoreError } = await admin
    .from("tournament_scores")
    .select("registration_id, round_number, strokes")
    .eq("tournament_id", tournamentId);
  if (scoreError) throw new Error(scoreError.message);
  const teamIds = Array.from(new Set(((registrations || []) as any[]).map((r) => r.team_id).filter(Boolean)));
  const { data: teams, error: teamError } = teamIds.length
    ? await admin.from("tournament_teams").select("id, team_name").in("id", teamIds)
    : { data: [], error: null };
  if (teamError) throw new Error(teamError.message);
  const teamNames = new Map(((teams || []) as any[]).map((team) => [team.id, team.team_name]));
  const totals = new Map<string, Record<number, number>>();
  ((scores || []) as any[]).forEach((score) => {
    const byRound = totals.get(score.registration_id) || {};
    const round = Math.max(1, Number(score.round_number) || 1);
    byRound[round] = (byRound[round] || 0) + (Number(score.strokes) || 0);
    totals.set(score.registration_id, byRound);
  });
  return ((registrations || []) as any[]).map((registration) => {
    const rounds = totals.get(registration.id) || {};
    const row: Record<string, unknown> = {};
    if (options.includeNames) row.player_name = `${registration.first_name || ""} ${registration.last_name || ""}`.trim();
    if (options.includeTeams) row.team_name = teamNames.get(registration.team_id) || "";
    if (options.includeRounds) {
      row.round_1 = rounds[1] || null;
      row.round_2 = rounds[2] || null;
      row.round_3 = rounds[3] || null;
    }
    if (options.includeTotals) row.total_score = Object.values(rounds).reduce((sum, value) => sum + value, 0) || null;
    if (options.includeHandicaps) row.handicap = registration.handicap_index ?? registration.handicap ?? null;
    row.status = registration.status || "active";
    return row;
  });
}

export const exportClippdResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ClippdExportOptions) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const options: ClippdExportOptions = {
      tournamentId: cleanText(data.tournamentId, 80),
      format: data.format === "json" ? "json" : "csv",
      includeNames: data.includeNames !== false,
      includeRounds: data.includeRounds !== false,
      includeTotals: data.includeTotals !== false,
      includeHandicaps: data.includeHandicaps !== false,
      includeTeams: data.includeTeams !== false,
    };
    if (!options.tournamentId) throw new Error("Tournament is required.");
    const rows = await buildClippdExportRows(admin, options.tournamentId, options);
    const date = new Date().toISOString().slice(0, 10);
    if (options.format === "json") {
      return { filename: `clippd-results-${date}.json`, mime: "application/json", content: JSON.stringify(rows, null, 2), count: rows.length };
    }
    const headers = Object.keys(rows[0] || {
      player_name: "", team_name: "", round_1: "", round_2: "", round_3: "", total_score: "", handicap: "", status: "",
    });
    const csv = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    return { filename: `clippd-results-${date}.csv`, mime: "text/csv;charset=utf-8", content: `\uFEFF${csv}`, count: rows.length };
  });
