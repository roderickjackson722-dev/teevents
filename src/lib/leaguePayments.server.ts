/** Server-only helpers for league payment reporting. */
import { computeFeeBreakdown, manualBreakdown } from "./leagueFees";

export async function assertLeagueManager(
  supabase: any,
  admin: any,
  userId: string,
  leagueId: string,
) {
  const { data: league } = await admin
    .from("golf_leagues")
    .select("id, league_name, organization_id")
    .eq("id", leagueId)
    .maybeSingle();
  if (!league) throw new Error("League not found");
  const { data: membership } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("organization_id", league.organization_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) throw new Error("Not authorized for this league");
  return league;
}

export type LedgerRow = {
  id: string;
  kind: string;
  source: "online" | "manual";
  status: string;
  created_at: string;
  member_name: string | null;
  member_email: string | null;
  event_id: string | null;
  event_name: string | null;
  event_date: string | null;
  description: string;
  gross_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  fees_cents: number;
  net_cents: number;
  stripe_payment_intent: string | null;
};

/**
 * Builds the single source of truth for a league's money: completed Stripe payments
 * plus manual/offline entries recorded by the league manager.
 */
export async function buildLeagueLedger(admin: any, leagueId: string) {
  const [{ data: league }, { data: payRows }, { data: events }, { data: members }] =
    await Promise.all([
      admin
        .from("golf_leagues")
        .select("id, league_name, pass_platform_fee_to_members")
        .eq("id", leagueId)
        .maybeSingle(),
      admin
        .from("league_payments")
        .select(
          "id, kind, amount_cents, gross_amount_cents, platform_fee_cents, stripe_fee_cents, entry_source, status, payer_email, created_at, stripe_payment_intent, member_id, event_id, registration_id",
        )
        .eq("league_id", leagueId)
        .eq("status", "paid")
        .order("created_at", { ascending: false }),
      admin.from("league_events").select("id, event_name, event_date").eq("league_id", leagueId),
      admin.from("league_members").select("id, member_name, email").eq("league_id", leagueId),
    ]);

  const passFees = (league as any)?.pass_platform_fee_to_members !== false;
  const em = new Map((events || []).map((e: any) => [e.id, e]));
  const mm = new Map((members || []).map((m: any) => [m.id, m]));

  const rows: LedgerRow[] = (payRows || []).map((r: any) => {
    const b = computeFeeBreakdown({
      baseCents: r.amount_cents,
      platformFeeCents: r.platform_fee_cents,
      stripeFeeCents: r.stripe_fee_cents,
      grossCents: r.gross_amount_cents,
      passFees,
    });
    const ev: any = r.event_id ? em.get(r.event_id) : null;
    const mem: any = r.member_id ? mm.get(r.member_id) : null;
    return {
      id: r.id,
      kind: r.kind,
      source: r.entry_source === "manual" ? "manual" : "online",
      status: "paid",
      created_at: r.created_at,
      member_name: mem?.member_name ?? null,
      member_email: mem?.email ?? r.payer_email ?? null,
      event_id: r.event_id ?? null,
      event_name: ev?.event_name ?? null,
      event_date: ev?.event_date ?? null,
      description:
        ev?.event_name ??
        (r.kind === "membership" || r.kind === "registration"
          ? "League Membership"
          : r.kind),
      ...b,
      stripe_payment_intent: r.stripe_payment_intent ?? null,
    };
  });

  // Manual / offline event entries: paid registrations with no online payment behind them.
  const eventIds = (events || []).map((e: any) => e.id);
  let manual: LedgerRow[] = [];
  if (eventIds.length) {
    const { data: regs } = await admin
      .from("league_event_registrations")
      .select(
        "id, event_id, member_id, fee_paid, registration_fee_paid, paid_at, created_at, fee_tier_label, fee_tier_amount_cents, is_manual_entry, entry_type",
      )
      .in("event_id", eventIds);

    const onlineRegIds = new Set(
      (payRows || []).filter((r: any) => r.registration_id).map((r: any) => r.registration_id),
    );
    const onlinePairs = new Set(
      (payRows || [])
        .filter((r: any) => r.event_id && r.member_id)
        .map((r: any) => `${r.event_id}:${r.member_id}`),
    );

    const eventFeeById = new Map<string, number>();
    const { data: feeRows } = await admin
      .from("league_events")
      .select("id, registration_fee_cents")
      .eq("league_id", leagueId);
    for (const f of feeRows || []) eventFeeById.set(f.id, f.registration_fee_cents || 0);

    manual = (regs || [])
      .filter(
        (r: any) =>
          (r.fee_paid || r.registration_fee_paid) &&
          !onlineRegIds.has(r.id) &&
          !onlinePairs.has(`${r.event_id}:${r.member_id}`),
      )
      .map((r: any) => {
        const amount = r.fee_tier_amount_cents ?? eventFeeById.get(r.event_id) ?? 0;
        const ev: any = em.get(r.event_id);
        const mem: any = mm.get(r.member_id);
        return {
          id: `manual-${r.id}`,
          kind: "event",
          source: "manual" as const,
          status: "paid",
          created_at: r.paid_at || r.created_at,
          member_name: mem?.member_name ?? null,
          member_email: mem?.email ?? null,
          event_id: r.event_id,
          event_name: ev?.event_name ?? null,
          event_date: ev?.event_date ?? null,
          description: ev?.event_name ?? "Event entry",
          ...manualBreakdown(amount),
          stripe_payment_intent: null,
          note: r.fee_tier_label || null,
        } as LedgerRow;
      });
  }

  const all = [...rows, ...manual].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const sum = (key: keyof LedgerRow) =>
    all.reduce((s, r) => s + (Number(r[key]) || 0), 0);

  return {
    passFees,
    payments: all,
    totals: {
      count: all.length,
      onlineCount: all.filter((r) => r.source === "online").length,
      manualCount: all.filter((r) => r.source === "manual").length,
      gross: sum("gross_cents"),
      platformFees: sum("platform_fee_cents"),
      stripeFees: sum("stripe_fee_cents"),
      fees: sum("fees_cents"),
      net: sum("net_cents"),
    },
  };
}
