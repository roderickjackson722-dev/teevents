import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BRANDING_PRICE_CENTS = 50000;
const PAID_STATUSES = ["paid", "succeeded", "completed"];
const UPGRADE_TYPES = ["flat_rate_pro", "branding_removal", "digital_sponsor"];

export interface RevenueTournamentRow {
  tournamentId: string;
  title: string;
  date: string | null;
  organizationName: string | null;
  brandingRemoved: boolean;
  brandingSource: "paid" | "admin" | null;
  brandingFeeCents: number;
  flatRateFeeCents: number;
  digitalSponsorFeeCents: number;
  sponsorGrossCents: number;
  sponsorPlatformFeeCents: number;
  otherPlatformFeeCents: number;
  platformRevenueCents: number;
}

/**
 * Platform-admin revenue view: how much each tournament contributes through the
 * $500 branding-removal fee, sponsor payments and other platform fees.
 */
export const getAdminRevenueOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { getAdminClient, assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const [{ data: tournaments }, { data: txs }, { data: brandingLogs }, { data: orgs }] =
      await Promise.all([
        admin
          .from("tournaments")
          .select(
            "id, title, date, organization_id, branding_removed, branding_removed_paid, branding_removed_by_admin",
          ),
        admin
          .from("platform_transactions")
          .select("tournament_id, type, status, amount_cents, platform_fee_cents"),
        admin
          .from("branding_audit_log")
          .select("tournament_id, action, amount_cents")
          .eq("action", "payment_confirmed"),
        admin.from("organizations").select("id, name"),
      ]);

    const orgName = new Map<string, string>();
    ((orgs || []) as any[]).forEach((o) => orgName.set(o.id, o.name));

    const brandingPaid = new Map<string, number>();
    ((brandingLogs || []) as any[]).forEach((l) => {
      if (!l.tournament_id) return;
      brandingPaid.set(
        l.tournament_id,
        (brandingPaid.get(l.tournament_id) || 0) + (Number(l.amount_cents) || BRANDING_PRICE_CENTS),
      );
    });

    const flatRateFee = new Map<string, number>();
    const digitalSponsorFee = new Map<string, number>();
    const brandingTxFee = new Map<string, number>();
    const sponsorGross = new Map<string, number>();
    const sponsorFee = new Map<string, number>();
    const otherFee = new Map<string, number>();
    ((txs || []) as any[]).forEach((t) => {
      if (!t.tournament_id) return;
      if (!PAID_STATUSES.includes(String(t.status || "").toLowerCase())) return;
      const type = String(t.type || "").toLowerCase();
      const amount = Number(t.amount_cents) || 0;
      const fee = Number(t.platform_fee_cents) || 0;
      // Platform upgrades (Flat-Rate Pro, Branding Removal, Digital Sponsor) are
      // TeeVents revenue in full and tracked on their own lines.
      if (UPGRADE_TYPES.includes(type)) {
        const target =
          type === "flat_rate_pro"
            ? flatRateFee
            : type === "digital_sponsor"
              ? digitalSponsorFee
              : brandingTxFee;
        target.set(t.tournament_id, (target.get(t.tournament_id) || 0) + amount);
        return;
      }
      const isSponsor = type.includes("sponsor");
      if (isSponsor) {
        sponsorGross.set(t.tournament_id, (sponsorGross.get(t.tournament_id) || 0) + amount);
        sponsorFee.set(t.tournament_id, (sponsorFee.get(t.tournament_id) || 0) + fee);
      } else {
        otherFee.set(t.tournament_id, (otherFee.get(t.tournament_id) || 0) + fee);
      }
    });

    const rows: RevenueTournamentRow[] = ((tournaments || []) as any[])
      .map((t) => {
        const brandingFeeCents = Math.max(
          brandingPaid.get(t.id) ?? (t.branding_removed_paid ? BRANDING_PRICE_CENTS : 0),
          brandingTxFee.get(t.id) || 0,
        );
        const flatRateFeeCents = flatRateFee.get(t.id) || 0;
        const digitalSponsorFeeCents = digitalSponsorFee.get(t.id) || 0;
        const sponsorGrossCents = sponsorGross.get(t.id) || 0;
        const sponsorPlatformFeeCents = sponsorFee.get(t.id) || 0;
        const otherPlatformFeeCents = otherFee.get(t.id) || 0;
        return {
          tournamentId: t.id,
          title: t.title || "Untitled tournament",
          date: t.date ?? null,
          organizationName: t.organization_id ? orgName.get(t.organization_id) ?? null : null,
          brandingRemoved: !!(t.branding_removed || t.branding_removed_by_admin),
          brandingSource: (t.branding_removed_paid
            ? "paid"
            : t.branding_removed_by_admin
              ? "admin"
              : null) as "paid" | "admin" | null,
          brandingFeeCents,
          flatRateFeeCents,
          digitalSponsorFeeCents,
          sponsorGrossCents,
          sponsorPlatformFeeCents,
          otherPlatformFeeCents,
          platformRevenueCents:
            brandingFeeCents +
            flatRateFeeCents +
            digitalSponsorFeeCents +
            sponsorPlatformFeeCents +
            otherPlatformFeeCents,
        };
      })
      .filter((r) => r.platformRevenueCents > 0 || r.sponsorGrossCents > 0 || r.brandingRemoved)
      .sort((a, b) => b.platformRevenueCents - a.platformRevenueCents);

    const totals = rows.reduce(
      (acc, r) => ({
        brandingFeeCents: acc.brandingFeeCents + r.brandingFeeCents,
        brandingCount: acc.brandingCount + (r.brandingFeeCents > 0 ? 1 : 0),
        flatRateFeeCents: acc.flatRateFeeCents + r.flatRateFeeCents,
        flatRateCount: acc.flatRateCount + (r.flatRateFeeCents > 0 ? 1 : 0),
        digitalSponsorFeeCents: acc.digitalSponsorFeeCents + r.digitalSponsorFeeCents,
        digitalSponsorCount: acc.digitalSponsorCount + (r.digitalSponsorFeeCents > 0 ? 1 : 0),
        sponsorGrossCents: acc.sponsorGrossCents + r.sponsorGrossCents,
        sponsorPlatformFeeCents: acc.sponsorPlatformFeeCents + r.sponsorPlatformFeeCents,
        otherPlatformFeeCents: acc.otherPlatformFeeCents + r.otherPlatformFeeCents,
        platformRevenueCents: acc.platformRevenueCents + r.platformRevenueCents,
      }),
      {
        brandingFeeCents: 0,
        flatRateFeeCents: 0,
        flatRateCount: 0,
        digitalSponsorFeeCents: 0,
        digitalSponsorCount: 0,
        brandingCount: 0,
        sponsorGrossCents: 0,
        sponsorPlatformFeeCents: 0,
        otherPlatformFeeCents: 0,
        platformRevenueCents: 0,
      },
    );

    return { rows, totals };
  });
