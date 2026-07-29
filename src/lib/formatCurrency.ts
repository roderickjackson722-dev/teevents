const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a dollar amount as $1,000.00 */
export function formatMoney(dollars: number | string | null | undefined): string {
  const n = typeof dollars === "string" ? parseFloat(dollars) : dollars;
  return usd.format(Number.isFinite(n as number) ? (n as number) : 0);
}

/** Format a cents amount as $1,000.00 */
export function formatCents(cents: number | string | null | undefined): string {
  const n = typeof cents === "string" ? parseFloat(cents) : cents;
  return usd.format((Number.isFinite(n as number) ? (n as number) : 0) / 100);
}
