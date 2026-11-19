// Pure fee-split math shared by the admin preview and registration checkout.
export type FeeSplit = "player" | "split" | "organizer" | "exact";

export const FEE_SPLIT_LABELS: Record<FeeSplit, string> = {
  player: "Player pays all, 8 percent",
  split: "Split, 4 percent player, 4 percent organizer",
  organizer: "Organizer pays all, 8 percent",
  exact: "Exact Price, organizer absorbs all fees",
};

const fmtPct = (n: number) => String(Math.round(n * 100) / 100);
export function feeSplitLabel(split: FeeSplit, pct = 8): string {
  if (split === "player") return `Player pays all, ${fmtPct(pct)}% TeeVents fee plus Stripe fee`;
  if (split === "split") return `Split, ${fmtPct(pct / 2)}% player, ${fmtPct(pct / 2)}% organizer, plus Stripe fee`;
  if (split === "organizer") return `Organizer pays all, ${fmtPct(pct)}% TeeVents fee plus Stripe fee`;
  return "Exact Price, organizer absorbs all fees";
}

export const stripeFeeOn = (cents: number) => (cents > 0 ? Math.round(cents * 0.029 + 30) : 0);

export function computeFeeSplit(baseCents: number, feeRate: number, split: FeeSplit) {
  const teeFee = Math.round(baseCents * feeRate);
  const playerShare = split === "player" ? teeFee : split === "split" ? Math.round(teeFee / 2) : 0;
  const organizerShare = teeFee - playerShare;
  const processing = split === "organizer" || split === "exact" ? 0 : stripeFeeOn(baseCents);
  const charge = baseCents + playerShare + processing;
  const realStripe = stripeFeeOn(charge);
  const organizerReceives = Math.max(charge - teeFee - realStripe, 0);
  return { teeFee, playerShare, organizerShare, processing, charge, realStripe, organizerReceives };
}
