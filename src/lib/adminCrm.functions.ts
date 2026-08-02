import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CrmEvent = {
  id: string;
  name: string;
  type: "tournament" | "league";
  date: string | null;
  end_date?: string | null;
  status: string;
  organization_name: string | null;
  /** Platform fees collected for this event, in cents. */
  platform_fees_cents: number;
};


export type CrmNote = {
  id: string;
  note: string;
  created_at: string;
  created_by: string | null;
  created_by_email: string | null;
};

export type CrmUser = {
  user_id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  full_name: string | null;
  phone: string | null;
  organization_name: string | null;
  organizations: string[];
  vetting_answers: Record<string, string | null> | null;
  events: CrmEvent[];
  tournament_count: number;
  league_count: number;
  /** Total platform fees collected across all this user's events, in cents. */
  platform_fees_cents: number;
  notes: CrmNote[];
};


/** Load every user with their events, vetting answers and admin notes. */
export const adminListUserEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    // 1. All auth users (paginated).
    const authUsers: Array<{
      id: string;
      email: string | null;
      created_at: string | null;
      last_sign_in_at: string | null;
      user_metadata?: Record<string, unknown> | null;
    }> = [];
    for (let page = 1; page <= 40; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const batch = data?.users ?? [];
      authUsers.push(
        ...batch.map((u: any) => ({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
          user_metadata: u.user_metadata ?? null,
        })),
      );
      if (batch.length < 200) break;
    }

    const [vetting, members, orgs, tournaments, leagues, notes, txns, leaguePays] = await Promise.all([
      admin.from("signup_vetting").select("*").order("created_at", { ascending: false }),
      admin.from("org_members").select("user_id, organization_id, role, name"),
      admin.from("organizations").select("id, name, workspace_type"),
      admin.from("tournaments").select("id, title, date, status, organization_id"),
      admin
        .from("golf_leagues")
        .select("id, league_name, start_date, end_date, season_year, is_active, publish_status, organization_id"),
      admin
        .from("admin_user_notes")
        .select("id, user_id, note, created_at, created_by")
        .order("created_at", { ascending: false }),
      admin
        .from("platform_transactions")
        .select("tournament_id, platform_fee_cents, status")
        .eq("status", "succeeded"),
      admin
        .from("league_payments")
        .select("league_id, platform_fee_cents, status")
        .eq("status", "paid"),
    ]);

    for (const r of [vetting, members, orgs, tournaments, leagues, notes, txns, leaguePays]) {
      if (r.error) throw new Error(r.error.message);
    }

    // Platform fees collected, keyed by event id
    const feesByTournament = new Map<string, number>();
    for (const t of txns.data ?? []) {
      if (!t.tournament_id) continue;
      feesByTournament.set(
        t.tournament_id,
        (feesByTournament.get(t.tournament_id) ?? 0) + (t.platform_fee_cents ?? 0),
      );
    }
    const feesByLeague = new Map<string, number>();
    for (const p of leaguePays.data ?? []) {
      if (!p.league_id) continue;
      feesByLeague.set(p.league_id, (feesByLeague.get(p.league_id) ?? 0) + (p.platform_fee_cents ?? 0));
    }


    const orgById = new Map<string, { id: string; name: string }>();
    for (const o of orgs.data ?? []) orgById.set(o.id, { id: o.id, name: o.name });

    const tournamentsByOrg = new Map<string, any[]>();
    for (const t of tournaments.data ?? []) {
      if (!t.organization_id) continue;
      const list = tournamentsByOrg.get(t.organization_id) ?? [];
      list.push(t);
      tournamentsByOrg.set(t.organization_id, list);
    }
    const leaguesByOrg = new Map<string, any[]>();
    for (const l of leagues.data ?? []) {
      if (!l.organization_id) continue;
      const list = leaguesByOrg.get(l.organization_id) ?? [];
      list.push(l);
      leaguesByOrg.set(l.organization_id, list);
    }

    const vettingByUser = new Map<string, any>();
    for (const v of vetting.data ?? []) {
      if (!vettingByUser.has(v.user_id)) vettingByUser.set(v.user_id, v);
    }

    const emailById = new Map<string, string | null>();
    for (const u of authUsers) emailById.set(u.id, u.email);

    const notesByUser = new Map<string, CrmNote[]>();
    for (const n of notes.data ?? []) {
      const list = notesByUser.get(n.user_id) ?? [];
      list.push({
        id: n.id,
        note: n.note,
        created_at: n.created_at,
        created_by: n.created_by,
        created_by_email: n.created_by ? emailById.get(n.created_by) ?? null : null,
      });
      notesByUser.set(n.user_id, list);
    }

    const orgsByUser = new Map<string, string[]>();
    for (const m of members.data ?? []) {
      const list = orgsByUser.get(m.user_id) ?? [];
      list.push(m.organization_id);
      orgsByUser.set(m.user_id, list);
    }

    const rows: CrmUser[] = authUsers.map((u) => {
      const v = vettingByUser.get(u.id);
      const orgIds = Array.from(new Set(orgsByUser.get(u.id) ?? []));
      const orgNames = orgIds.map((id) => orgById.get(id)?.name).filter(Boolean) as string[];

      const events: CrmEvent[] = [];
      for (const orgId of orgIds) {
        const orgName = orgById.get(orgId)?.name ?? null;
        for (const t of tournamentsByOrg.get(orgId) ?? []) {
          events.push({
            id: t.id,
            name: t.title || "Untitled tournament",
            type: "tournament",
            date: t.date ?? null,
            status: t.status ?? "draft",
            organization_name: orgName,
            platform_fees_cents: feesByTournament.get(t.id) ?? 0,
          });
        }
        for (const l of leaguesByOrg.get(orgId) ?? []) {
          events.push({
            id: l.id,
            name: l.league_name || "Untitled league",
            type: "league",
            date: l.start_date ?? null,
            end_date: l.end_date ?? null,
            status: l.publish_status === "draft" ? "draft" : l.is_active ? "active" : "completed",
            organization_name: orgName,
            platform_fees_cents: feesByLeague.get(l.id) ?? 0,
          });
        }

      }
      events.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

      const vettingAnswers = v
        ? {
            "How did you hear about us?": v.heard_from_other || v.heard_from || null,
            "Primary goal": v.primary_goal || null,
            "Planning status": v.planning_status || null,
            "Role(s)": Array.isArray(v.roles) ? v.roles.join(", ") : v.roles || null,
            "Other role": v.role_other || null,
            "Interest area": v.interest_area || null,
            "Vetting status": v.vetting_status || null,
          }
        : null;

      const meta = (u.user_metadata ?? {}) as Record<string, any>;

      return {
        user_id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: v?.full_name || meta.full_name || meta.name || null,
        phone: v?.phone || meta.phone || null,
        organization_name: v?.organization_name || orgNames[0] || null,
        organizations: orgNames,
        vetting_answers: vettingAnswers,
        events,
        tournament_count: events.filter((e) => e.type === "tournament").length,
        league_count: events.filter((e) => e.type === "league").length,
        platform_fees_cents: events.reduce((s, e) => s + (e.platform_fees_cents ?? 0), 0),
        notes: notesByUser.get(u.id) ?? [],
      };
    });

    rows.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

    const totalFeesCents =
      (txns.data ?? []).reduce((s: number, t: any) => s + (t.platform_fee_cents ?? 0), 0) +
      (leaguePays.data ?? []).reduce((s: number, p: any) => s + (p.platform_fee_cents ?? 0), 0);

    return {
      rows,
      totals: {
        users: rows.length,
        tournaments: (tournaments.data ?? []).length,
        leagues: (leagues.data ?? []).length,
        platform_fees_cents: totalFeesCents,
      },
    };

  });

export const adminAddUserNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; note: string }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const note = String(data.note || "").trim();
    if (!note) throw new Error("Note cannot be empty");
    const admin = await getAdminClient();
    const { error } = await admin.from("admin_user_notes").insert({
      user_id: data.userId,
      note,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteUserNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { noteId: string }) => input)
  .handler(async ({ data, context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { error } = await admin.from("admin_user_notes").delete().eq("id", data.noteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
