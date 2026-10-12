import { z } from "zod";

export const contactTopics = ["I want to run a tournament", "I want to run a league", "I have a question about pricing", "I am a golfer looking for an event", "I want to learn about consulting services", "I want to partner with TeeVents", "Media or press inquiry", "Something else"] as const;
export const contactSources = ["Facebook", "Instagram", "LinkedIn", "Google Search", "Word of mouth", "Golf course", "A TeeVents event", "Other"] as const;

const text = (max: number) => z.string().trim().max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), "Please remove unsupported characters.");
export const contactSchema = z.object({
  name: text(100).pipe(z.string().min(1, "Enter your full name.")),
  email: z.string().trim().max(255).email("Enter a valid email address."),
  phone: z.string().trim().max(30).regex(/^[+\d\s().-]+$/, "Enter a valid phone number.").refine(value => { const digits = value.replace(/\D/g, ""); return digits.length >= 7 && digits.length <= 15; }, "Enter a valid phone number."),
  organization: text(150),
  topic: z.enum(contactTopics, { errorMap: () => ({ message: "Choose how we can help." }) }),
  message: text(5000).pipe(z.string().min(1, "Enter your message.")),
  source: z.union([z.literal(""), z.enum(contactSources)]),
  captchaToken: z.string().min(1, "Complete the CAPTCHA before sending.").max(5000),
}).strict();