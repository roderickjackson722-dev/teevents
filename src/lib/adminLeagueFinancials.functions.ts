import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LeaguePaymentRow = {
  id: string;
  created_at: string;
  kind: string;
  status: string;
  source: "online" | "manual";
  league_id: string;
  league_name: string;
  organization_name: string | null;
  event_id: string | null;
  event_name: string;
  event_date: string | null;
  member_name: string | null;
  payer_email: string | null;
  gross_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  net_cents: number;
  stripe_payment_intent: string | null;
};

/** All golf-league money movements, admin-only, joined with league/event/member names. */
export const adminListLeagueFinancials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any): Promise<{ rows: LeaguePaymentRow[] }> => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const [payRes, leagueRes, eventRes, memberRes, orgRes] = await Promise.all([
      admin
        .from("league_payments")
        .select(
          "id, created_at, kind, status, league_id, event_id, member_id, payer_email, amount_cents, gross_amount_cents, platform_fee_cents, stripe_fee_cents, stripe_payment_intent, entry_source",
        )
        .order("created_at", { ascending: false }),
      admin.from("golf_leagues").select("id, league_name, organization_id"),
      admin.from("league_events").select("id, event_name, event_date"),
      admin.from("league_members").select("id, member_name, email"),
      admin.from("organizations").select("id, name"),
    ]);

    const orgMap = new Map<string, string>((orgRes.data ?? []).map((o: any) => [o.id, o.name]));
    const leagueMap = new Map<string, any>((leagueRes.data ?? []).map((l: any) => [l.id, l]));
    const eventMap = new Map<string, any>((eventRes.data ?? []).map((e: any) => [e.id, e]));
    const memberMap = new Map<string, any>((memberRes.data ?? []).map((m: any) => [m.id, m]));

    const rows: LeaguePaymentRow[] = (payRes.data ?? []).map((p: any) => {
      const league = leagueMap.get(p.league_id);
      const event = p.event_id ? eventMap.get(p.event_id) : null;
      const member = p.member_id ? memberMap.get(p.member_id) : null;
      const gross = Number(p.gross_amount_cents ?? p.amount_cents ?? 0) || Number(p.amount_cents ?? 0);
      const platform = Number(p.platform_fee_cents ?? 0);
      const stripe = Number(p.stripe_fee_cents ?? 0);
      const manual = p.entry_source === "manual";
      return {
        id: p.id,
        created_at: p.created_at,
        kind: p.kind ?? "other",
        status: p.status ?? "unknown",
        source: manual ? "manual" : "online",
        league_id: p.league_id,
        league_name: league?.league_name ?? "Unknown league",
        organization_name: league?.organization_id ? orgMap.get(league.organization_id) ?? null : null,
        event_id: p.event_id ?? null,
        event_name: event?.event_name ?? (p.kind === "membership" ? "League membership" : p.kind === "registration" ? "League registration" : "—"),
        event_date: event?.event_date ?? null,
        member_name: member?.member_name ?? null,
        payer_email: p.payer_email ?? member?.email ?? null,
        gross_cents: gross,
        platform_fee_cents: manual ? 0 : platform,
        stripe_fee_cents: manual ? 0 : stripe,
        net_cents: manual ? gross : gross - platform - stripe,
        stripe_payment_intent: p.stripe_payment_intent ?? null,
      };
    });

    return { rows };
  });
