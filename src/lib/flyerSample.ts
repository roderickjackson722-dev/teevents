import { z } from "zod";

export const sampleFormats = ["Scramble", "Best Ball", "Stroke Play", "Stableford", "Modified Stableford", "Match Play", "Skins", "Shamble"] as const;
const statedText = z.object({ value: z.string().nullable(), evidence: z.string().nullable(), certain: z.boolean() });
const statedFee = z.object({ value: z.number().nullable(), evidence: z.string().nullable(), certain: z.boolean() });
export const flyerResultSchema = z.object({
  readable: z.boolean(),
  tournament_name: statedText, event_date: statedText, course_name: statedText,
  location: statedText, registration_fee: statedFee, scoring_format: statedText,
  primary_color: z.string().nullable(), accent_color: z.string().nullable(), background_color: z.string().nullable(),
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