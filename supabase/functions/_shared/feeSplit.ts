// Pure fee-split math shared by the admin preview and registration checkout.
export type FeeSplit = "player" | "split" | "organizer";

export const FEE_SPLIT_LABELS: Record<FeeSplit, string> = {
  player: "Player pays all, 8 percent",
  split: "Split, 4 percent player, 4 percent organizer",
  organizer: "Organizer pays all, 8 percent",
};

export const stripeFeeOn = (cents: number) => (cents > 0 ? Math.round(cents * 0.029 + 30) : 0);

export function computeFeeSplit(baseCents: number, feeRate: number, split: FeeSplit) {
  const teeFee = Math.round(baseCents * feeRate);
  const playerShare = split === "player" ? teeFee : split === "split" ? Math.round(teeFee / 2) : 0;
  const organizerShare = teeFee - playerShare;
  const processing = split === "organizer" ? 0 : stripeFeeOn(baseCents);
  const charge = baseCents + playerShare + processing;
  const realStripe = stripeFeeOn(charge);
  const organizerReceives = Math.max(charge - teeFee - realStripe, 0);
  return { teeFee, playerShare, organizerShare, processing, charge, realStripe, organizerReceives };
}
