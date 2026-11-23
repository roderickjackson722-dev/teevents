import { z } from "zod";

export const sampleFormats = ["Scramble", "Best Ball", "Stroke Play", "Stableford", "Modified Stableford", "Match Play", "Skins", "Shamble"] as const;
const statedText = z.object({ value: z.string().nullable(), evidence: z.string().nullable(), certain: z.boolean() });
const statedFee = z.object({ value: z.number().nullable(), evidence: z.string().nullable(), certain: z.boolean() });
export const flyerResultSchema = z.object({
  readable: z.boolean(),
  tournament_name: statedText, event_date: statedText, course_name: statedText,
  location: statedText, registration_fee: statedFee, scoring_format: statedText,
  primary_color: z.string().nullable(), accent_color: z.string().nullable(), background_color: z.string().nullable(),
  // Extra event-builder details (optional so older readers still parse).
  organization: statedText.optional(), start_time: statedText.optional(), checkin_time: statedText.optional(),
  beneficiary: statedText.optional(), contact_name: statedText.optional(), contact_email: statedText.optional(), contact_phone: statedText.optional(),
  schedule_registration: statedText.optional(), schedule_shotgun: statedText.optional(), schedule_lunch: statedText.optional(), schedule_awards: statedText.optional(),
  tiers: z.array(z.object({ name: z.string().nullable(), price: z.number().nullable(), includes: z.string().nullable(), evidence: z.string().nullable(), certain: z.boolean() })).optional(),
  sponsors: z.array(z.object({ name: z.string().nullable(), tier: z.string().nullable(), evidence: z.string().nullable(), certain: z.boolean() })).optional(),
  contests: z.array(z.object({ text: z.string().nullable(), evidence: z.string().nullable(), certain: z.boolean() })).optional(),
  text_color: z.string().nullable().optional(),
});
export type FlyerResult = z.infer<typeof flyerResultSchema>;
export const blankFlyerFields = { tournament_name: "", event_date: "", course_name: "", location: "", registration_fee: "", scoring_format: "" };
export function canBuildClientSample(step: number, built: boolean, busy: boolean, title: string) {
  return step === 4 && !built && !busy && title.trim().length > 0;
}
export function reviewedFlyer(result: FlyerResult) {
  const text = (field: z.infer<typeof statedText>) => field.certain && field.evidence?.trim() && field.value?.trim() ? field.value.trim() : "";
  const fields = { ...blankFlyerFields };
  if (result.readable) {
    fields.tournament_name = text(result.tournament_name);
    fields.course_name = text(result.course_name);
    fields.location = text(result.location);
    const date = text(result.event_date);
    const parsed = new Date(`${date}T12:00:00Z`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && /\b\d{4}\b/.test(result.event_date.evidence || "") && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date) fields.event_date = date;
    const fee = result.registration_fee;
    if (fee.certain && fee.evidence?.trim() && fee.value != null && Number.isFinite(fee.value) && fee.value >= 0) fields.registration_fee = fee.value.toFixed(2);
    const format = text(result.scoring_format);
    fields.scoring_format = sampleFormats.find(f => f.toLowerCase() === format.toLowerCase()) || "";
  }
  const color = (value: string | null) => result.readable && value && /^#[0-9a-f]{6}$/i.test(value) ? value : null;
  return { fields, colors: { primary: color(result.primary_color), accent: color(result.accent_color), background: color(result.background_color) }, blank: Object.entries(fields).filter(([, value]) => !value).map(([key]) => key) };
}
/** Extra flyer details: only certain, evidenced values survive; everything else stays blank. */
export function reviewedFlyerDetails(result: FlyerResult) {
  const ok = (f?: { value: string | null; evidence: string | null; certain: boolean }) =>
    result.readable && f && f.certain && f.evidence?.trim() && f.value?.trim() ? f.value.trim() : "";
  const keep = (e: { evidence: string | null; certain: boolean }) => result.readable && e.certain && !!e.evidence?.trim();
  return {
    organization: ok(result.organization), start_time: ok(result.start_time), checkin_time: ok(result.checkin_time),
    beneficiary: ok(result.beneficiary), contact_name: ok(result.contact_name), contact_email: ok(result.contact_email), contact_phone: ok(result.contact_phone),
    schedule: { registration: ok(result.schedule_registration), shotgun: ok(result.schedule_shotgun), lunch: ok(result.schedule_lunch), awards: ok(result.schedule_awards) },
    tiers: (result.tiers || []).filter((t) => keep(t) && t.name?.trim()).map((t) => ({ name: t.name!.trim(), price: t.price != null && Number.isFinite(t.price) && t.price >= 0 ? t.price.toFixed(2) : "", includes: t.includes?.trim() || "" })),
    sponsors: (result.sponsors || []).filter((x) => keep(x) && x.name?.trim()).map((x) => ({ name: x.name!.trim(), tier: x.tier?.trim() || "" })),
    contests: (result.contests || []).filter((c) => keep(c) && c.text?.trim()).map((c) => c.text!.trim()),
    text_color: result.readable && result.text_color && /^#[0-9a-f]{6}$/i.test(result.text_color) ? result.text_color : null,
  };
}
