/**
 * Spreadsheet-safe CSV cell. Values beginning with =, +, -, @, tab or CR are
 * prefixed with a single quote so spreadsheet apps treat them as text, not
 * formulas (CSV/formula injection). Always returns a quoted, escaped cell.
 */
export function neutralizeCsvFormula(value: unknown): string {
  const s = String(value ?? "");
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function csvCell(value: unknown): string {
  return `"${neutralizeCsvFormula(value).replace(/"/g, '""')}"`;
}
