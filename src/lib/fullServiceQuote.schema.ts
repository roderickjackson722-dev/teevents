import { z } from "zod";

export const eventTypes = ["Fundraising", "Competitive", "College sanctioned", "Corporate", "Charity", "League", "Other"] as const;
export const eventFormats = ["Scramble", "Stroke play", "Best ball", "Skins", "Other", "Not sure yet"] as const;
export const progressOptions = ["Just starting", "Date set", "Course booked", "Registration already built elsewhere", "Other"] as const;
export const serviceOptions = ["Branded registration page", "Sponsorships", "Pairings", "Check in", "Live scoring and leaderboard", "Course negotiation", "Food, awards, and vendor coordination", "On site event day coordination", "Timeline and consulting", "Post event closeout", "Other"] as const;
export const budgetOptions = ["Prefer to discuss", "Under $5,000", "$5,000 to $10,000", "Over $10,000"] as const;
const requiredText = z.string().trim().min(1, "This field is required.").max(300, "Please use 300 characters or fewer.");
const optionalText = z.string().trim().max(500, "Please use 500 characters or fewer.").default("");
export const quoteAnswersSchema = z.object({
  organization: requiredText, contactName: requiredText,
  email: z.string().trim().min(1, "This field is required.").email("Enter a valid email address.").max(254),
  phone: z.string().trim().max(40).default(""), eventName: requiredText,
  eventType: z.enum(eventTypes, { errorMap: () => ({ message: "Select an event type." }) }), eventTypeOther: optionalText,
  eventDate: z.string().default(""), dateTbd: z.boolean(), location: requiredText,
  course: optionalText, courseTbd: z.boolean(),
  players: z.coerce.number({ invalid_type_error: "Enter the expected number of players." }).int("Enter a whole number.").positive("Enter the expected number of players."),
  eventFormat: z.enum(["", ...eventFormats]).default(""), eventFormatOther: optionalText,
  progress: z.enum(progressOptions, { errorMap: () => ({ message: "Select how far along you are." }) }), progressOther: optionalText,
  services: z.array(z.enum(serviceOptions)).min(1, "Select at least one service."), servicesOther: optionalText,
  fundraisingGoal: z.union([z.literal(""), z.coerce.number().finite().nonnegative("Enter zero or a positive amount.")]).default(""),
  budget: z.enum(["", ...budgetOptions]).default(""), help: optionalText,
  contactMethod: z.enum(["Email", "Phone"], { errorMap: () => ({ message: "Select a preferred contact method." }) }),
  bestTime: optionalText, consent: z.boolean().refine(v => v, "Please agree to be contacted about this event."),
}).strict().superRefine((v, ctx) => {
  if (!v.dateTbd && (!/^\d{4}-\d{2}-\d{2}$/.test(v.eventDate) || !Number.isFinite(Date.parse(v.eventDate)) || new Date(v.eventDate).toISOString().slice(0, 10) !== v.eventDate)) ctx.addIssue({ code: "custom", path: ["eventDate"], message: "Enter an event date or select Date TBD." });
  for (const [selection, field] of [[v.eventType, "eventTypeOther"], [v.eventFormat, "eventFormatOther"], [v.progress, "progressOther"], [v.services.includes("Other") ? "Other" : "", "servicesOther"]] as const) {
    if (selection === "Other" && !v[field].trim()) ctx.addIssue({ code: "custom", path: [field], message: "Please describe Other." });
  }
}).transform(v => ({ ...v, eventDate: v.dateTbd ? "" : v.eventDate, course: v.courseTbd ? "" : v.course,
  eventTypeOther: v.eventType === "Other" ? v.eventTypeOther : "", eventFormatOther: v.eventFormat === "Other" ? v.eventFormatOther : "",
  progressOther: v.progress === "Other" ? v.progressOther : "", servicesOther: v.services.includes("Other") ? v.servicesOther : "",
  fundraisingGoal: v.eventType === "Fundraising" || v.eventType === "Charity" ? v.fundraisingGoal : "" }));
export type QuoteAnswers = z.infer<typeof quoteAnswersSchema>;
export const quoteSubmissionSchema = z.object({ answers: quoteAnswersSchema, captchaToken: z.string().min(1).max(10000), requestKey: z.string().uuid() }).strict();
export const quoteLabels: Record<keyof QuoteAnswers, string> = {
  organization: "Organization Name", contactName: "Contact Name", email: "Email", phone: "Phone", eventName: "Event Name", eventType: "Event Type", eventTypeOther: "Other Event Type", eventDate: "Event Date", dateTbd: "Date TBD", location: "Location, City and State", course: "Course, if known", courseTbd: "Course TBD", players: "Expected Number of Players", eventFormat: "Event Format, if known", eventFormatOther: "Other Event Format", progress: "How Far Along Are You", progressOther: "Other Progress", services: "Services Needed", servicesOther: "Other Services", fundraisingGoal: "Fundraising Goal, if fundraising", budget: "Budget Range for Management", help: "What Do You Need Help With Most", contactMethod: "Preferred Contact Method", bestTime: "Best Time To Reach You", consent: "I agree TeeVents may contact me about this event",
};
export function quoteAnswerLines(answers: QuoteAnswers) {
  return Object.entries(quoteLabels).map(([key, label]) => {
    const value = answers[key as keyof QuoteAnswers];
    return `${label}: ${Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? value ? "Yes" : "No" : value === "" ? "Not provided" : value}`;
  });
}