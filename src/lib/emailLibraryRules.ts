import { z } from "zod";
export const filtersSchema = z.object({ eventIds: z.array(z.string().uuid()).max(200).default([]), year: z.string().regex(/^(all|\d{4})$/).default("all"), status: z.enum(["registered", "played", "did_not_play"]).default("registered") }).strict();
export type AudienceFilters = z.infer<typeof filtersSchema>;
export const templateSchema = z.object({ name: z.string().trim().min(1).max(200), subject: z.string().trim().min(1).max(200), config: z.record(z.unknown()), source_kind: z.string().max(60) });
export const typedEmailSchema = z.string().trim().toLowerCase().email().max(254);
export const normalizedEmail = (value: string) => value.trim().toLowerCase();
export function played(reg: any) { return reg.checked_in === true || reg.group_score != null || reg.team_score_count > 0 || ["played", "completed"].includes(reg.status); }
export function audienceFrom(rows: any[], events: any[], filters: AudienceFilters, suppressed: string[], now = new Date()) {
  const eventMap = new Map(events.map(e => [e.id, e]));
  const blocked = new Set(suppressed.map(normalizedEmail));
  for (const row of rows) if (row.enterprise_email_opt_out) blocked.add(normalizedEmail(row.email || ""));
  const found = new Map<string, any>();
  for (const row of rows) {
    const event = eventMap.get(row.tournament_id);
    const email = normalizedEmail(row.email || "");
    if (!event || !typedEmailSchema.safeParse(email).success || blocked.has(email) || event.post_event_email_opt_out) continue;
    if (!event.date || event.date.slice(0, 10) >= now.toISOString().slice(0, 10)) continue;
    if (filters.eventIds.length && !filters.eventIds.includes(event.id)) continue;
    if (filters.year !== "all" && !event.date.startsWith(filters.year)) continue;
    if (filters.status === "played" && !played(row)) continue;
    if (filters.status === "did_not_play" && played(row)) continue;
    if (!found.has(email)) found.set(email, { ...row, email });
  }
  return [...found.values()];
}
export function insertAtCursor(text: string, field: string, start: number, end = start) { return { text: text.slice(0, start) + field + text.slice(end), cursor: start + field.length }; }