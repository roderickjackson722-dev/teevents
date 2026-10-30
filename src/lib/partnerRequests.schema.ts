import { z } from 'zod';
export const partnerRequestSchema = z.object({
  tournamentId: z.string().uuid(), firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255), phone: z.string().trim().max(30), teamSize: z.number().int().min(2).max(4),
  partnersNeeded: z.number().int().min(1).max(3), answers: z.record(z.string().max(500)).refine(v => Object.keys(v).length <= 100),
  message: z.string().trim().max(1000), captchaToken: z.string().min(1).max(10000),
}).refine(v => v.partnersNeeded < v.teamSize, 'Partners needed must be fewer than team size');
export function partnerTeamSizes(max: number, allowed?: number[] | null): number[] {
  return (allowed?.length ? allowed : Array.from({length: max}, (_, i) => i + 1)).filter(n => n >= 2 && n <= 4 && n <= max);
}
export function validatePartnerAnswers(fields: {id: string; label: string; is_required: boolean; field_type: string; options: unknown}[], answers: Record<string,string>, phone: string) {
  for (const f of fields) {
    const value = f.label.toLowerCase() === 'phone' ? phone : (answers[f.id] || '').trim();
    if (f.is_required && !value) throw new Error(`${f.label} is required.`);
    if (value && f.field_type === 'number' && !Number.isFinite(Number(value))) throw new Error(`${f.label} must be a number.`);
    if (value && f.field_type === 'dropdown' && Array.isArray(f.options) && !f.options.includes(value)) throw new Error(`Choose a valid ${f.label}.`);
  }
}
