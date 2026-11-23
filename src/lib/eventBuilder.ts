/** AI event builder (admin "Create Tournament for Client"): field model, fill-blanks merge and provenance. */
export type FieldSource = "already" | "flyer" | "typed" | "blank";
export const SOURCE_LABEL: Record<FieldSource, string> = {
  already: "Already set", flyer: "Filled from flyer", typed: "Filled from typed input", blank: "Blank",
};
export const TEEVENTS_COLORS = { primary_color: "#1a5c38", secondary_color: "#F5A623", background_color: "#ffffff", text_color: "#111111" };

export interface Tier { name: string; price: string; includes: string }
export interface Sponsor { name: string; tier: string }
export interface Schedule { registration: string; shotgun: string; lunch: string; awards: string }

export interface BuilderValues {
  event_name: string; organization_name: string; event_date: string; start_time: string; checkin_time: string;
  course_name: string; location: string; registration_fee: string; scoring_format: string; beneficiary: string;
  contact_name: string; contact_email: string; contact_phone: string; description: string; tagline: string;
  primary_color: string; secondary_color: string; background_color: string; text_color: string;
  tiers: Tier[]; sponsors: Sponsor[]; schedule: Schedule; contests: string[];
}

export const SCALAR_KEYS = [
  "event_name", "organization_name", "event_date", "start_time", "checkin_time", "course_name", "location",
  "registration_fee", "scoring_format", "beneficiary", "contact_name", "contact_email", "contact_phone",
  "description", "tagline", "primary_color", "secondary_color", "background_color", "text_color",
] as const;
export const LIST_KEYS = ["tiers", "sponsors", "schedule", "contests"] as const;
export type BuilderKey = (typeof SCALAR_KEYS)[number] | (typeof LIST_KEYS)[number];

export const emptySchedule = (): Schedule => ({ registration: "", shotgun: "", lunch: "", awards: "" });
export function emptyValues(): BuilderValues {
  return {
    event_name: "", organization_name: "", event_date: "", start_time: "", checkin_time: "", course_name: "", location: "",
    registration_fee: "", scoring_format: "", beneficiary: "", contact_name: "", contact_email: "", contact_phone: "",
    description: "", tagline: "", primary_color: "", secondary_color: "", background_color: "", text_color: "",
    tiers: [], sponsors: [], schedule: emptySchedule(), contests: [],
  };
}

export function isFilled(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.values(v as Record<string, string>).some((x) => !!String(x ?? "").trim());
  return !!String(v ?? "").trim();
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Fill only blanks. Values already set on an existing sample are kept; where the incoming
 * value differs, the key is returned in `conflicts` so the admin can confirm a replacement.
 */
export function fillBlanks(existing: Partial<BuilderValues> | null, incoming: Partial<BuilderValues>, source: "flyer" | "typed") {
  const values = { ...emptyValues(), ...(existing || {}) } as BuilderValues;
  const sources = {} as Record<BuilderKey, FieldSource>;
  const conflicts: BuilderKey[] = [];
  for (const k of [...SCALAR_KEYS, ...LIST_KEYS] as BuilderKey[]) {
    const had = existing ? isFilled((existing as any)[k]) : false;
    const inc = (incoming as any)[k];
    if (had) {
      sources[k] = "already";
      if (isFilled(inc) && !same(inc, (existing as any)[k])) conflicts.push(k);
    } else if (isFilled(inc)) {
      (values as any)[k] = inc; sources[k] = source;
    } else sources[k] = "blank";
  }
  return { values, sources, conflicts };
}

export function scheduleText(s: Schedule, start?: string, checkin?: string): string {
  return [
    checkin && `Check-in: ${checkin}`, s.registration && `Registration: ${s.registration}`,
    (s.shotgun || start) && `Shotgun start: ${s.shotgun || start}`, s.lunch && `Lunch: ${s.lunch}`, s.awards && `Awards: ${s.awards}`,
  ].filter(Boolean).join("\n");
}

export function descriptionText(v: BuilderValues): string {
  const parts: string[] = [];
  if (v.description.trim()) parts.push(v.description.trim());
  else if (v.organization_name.trim()) parts.push(`A custom TeeVents sample built for ${v.organization_name.trim()}.`);
  if (v.beneficiary.trim()) parts.push(`Benefiting: ${v.beneficiary.trim()}`);
  if (v.tiers.length) parts.push("Registration packages:\n" + v.tiers.map((t) => `• ${t.name}${t.price ? ` — $${t.price}` : ""}${t.includes ? ` (${t.includes})` : ""}`).join("\n"));
  if (v.contests.length) parts.push("Contests:\n" + v.contests.map((c) => `• ${c}`).join("\n"));
  if (v.contact_name.trim()) parts.push(`Contact: ${v.contact_name.trim()}`);
  return parts.join("\n\n");
}
