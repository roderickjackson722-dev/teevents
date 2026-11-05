import { quoteAnswerLines, type QuoteAnswers } from "./fullServiceQuote.schema";
import type { Json } from "@/integrations/supabase/types";

type Inquiry = { id: string; answers: Json; submitted_at: string; email_sent_at: string | null; email_provider_id: string | null };
export type QuoteDependencies = {
  verify: (token: string) => Promise<boolean>;
  save: (requestKey: string, answers: QuoteAnswers) => Promise<Inquiry>;
  send: (id: string, answers: QuoteAnswers, submittedAt: string) => Promise<string>;
  markSent: (id: string, providerId: string) => Promise<void>;
};
export async function deliverQuote(input: { answers: QuoteAnswers; captchaToken: string; requestKey: string }, deps: QuoteDependencies) {
  if (!await deps.verify(input.captchaToken)) return { ok: false, message: "Please complete a new CAPTCHA and try again." };
  const row = await deps.save(input.requestKey, input.answers);
  if (!row.email_sent_at) {
    // Use the original saved answers on retries, never overwrite an inquiry.
    const { quoteAnswersSchema } = await import("./fullServiceQuote.schema");
    const savedAnswers = quoteAnswersSchema.parse(row.answers);
    try {
      const providerId = await deps.send(row.id, savedAnswers, row.submitted_at);
      await deps.markSent(row.id, providerId);
    } catch {
      return { ok: false, message: "Your request is saved for admin review, but the email could not be confirmed. Please try again or email info@teevents.golf." };
    }
  }
  return { ok: true, message: "Thanks, we received your request. Rod will reach out to book a meeting." };
}
export function quoteEmailText(answers: QuoteAnswers, submittedAt: string) {
  return ["Full Service Management inquiry", `Submitted: ${submittedAt}`, "", ...quoteAnswerLines(answers)].join("\n");
}