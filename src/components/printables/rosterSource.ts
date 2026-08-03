import { isPaidStatus } from "@/lib/rosterUtils";

export type PrintablesDataSource = "roster" | "legacy";

interface Reg {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  payment_status?: string | null;
  group_number?: number | null;
  created_at?: string | null;
}

/**
 * Printables must mirror the Players & Pairings roster exactly:
 * only paid registrations, with duplicates removed.
 * "legacy" keeps every registration row (old behavior).
 */
export function rosterForPrintables<T extends Reg>(regs: T[], source: PrintablesDataSource = "roster"): T[] {
  if (source === "legacy") return regs;

  const paid = regs.filter((r) => isPaidStatus(r as any));

  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of paid) {
    const email = (r.email || "").trim().toLowerCase();
    const name = `${(r.first_name || "").trim().toLowerCase()}|${(r.last_name || "").trim().toLowerCase()}`;
    const key = email ? `e:${email}|${name}` : `n:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
