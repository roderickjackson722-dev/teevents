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
