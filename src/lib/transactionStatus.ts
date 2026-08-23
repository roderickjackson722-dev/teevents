// Single source of truth for how payment statuses are worded and coloured.
// Organizers should never have to guess whether a customer actually paid:
//   paid  -> the money is in
//   awaiting_payment -> the customer has NOT paid yet
//   failed -> the charge did not go through

export type PaymentStatusKey = "paid" | "awaiting_payment" | "failed" | "refunded" | "other";

/** Collapses legacy values (succeeded/completed/pending) onto the new vocabulary. */
export function normalizePaymentStatus(status?: string | null): PaymentStatusKey {
  const s = (status || "").toLowerCase().trim();
  if (s === "paid" || s === "succeeded" || s === "completed" || s === "released" || s === "held") return "paid";
  if (s === "awaiting_payment" || s === "pending" || s === "unpaid" || s === "incomplete") return "awaiting_payment";
  if (s === "failed" || s === "canceled" || s === "cancelled") return "failed";
  if (s === "refunded") return "refunded";
  return "other";
}

export function paymentStatusLabel(status?: string | null): string {
  switch (normalizePaymentStatus(status)) {
    case "paid": return "Paid";
    case "awaiting_payment": return "Awaiting Payment";
    case "failed": return "Failed";
    case "refunded": return "Refunded";
    default: return status ? status.replace(/_/g, " ") : "—";
  }
}

/** Emoji marker used in compact tables and exports. */
export function paymentStatusIcon(status?: string | null): string {
  switch (normalizePaymentStatus(status)) {
    case "paid": return "✅";
    case "awaiting_payment": return "⏳";
    case "failed": return "❌";
    default: return "";
  }
}

/** Tailwind classes for a pill/badge. */
export function paymentStatusClasses(status?: string | null): string {
  switch (normalizePaymentStatus(status)) {
    case "paid": return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "awaiting_payment": return "bg-amber-100 text-amber-700 border border-amber-300";
    case "failed": return "bg-red-100 text-red-700 border border-red-200";
    case "refunded": return "bg-muted text-muted-foreground border border-border";
    default: return "bg-muted text-muted-foreground border border-border";
  }
}

export function paymentStatusBadgeVariant(status?: string | null): "default" | "secondary" | "destructive" | "outline" {
  const key = normalizePaymentStatus(status);
  if (key === "failed") return "destructive";
  if (key === "paid") return "default";
  return "secondary";
}
