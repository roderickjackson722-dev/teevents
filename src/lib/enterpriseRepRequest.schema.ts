import { z } from "zod";

export const enterpriseRepRequestSchema = z.object({
  organizationId: z.string().uuid(),
  eventName: z.string().trim().min(1, "Enter an event name.").max(200, "Event name must be 200 characters or fewer."),
  date: z.string().refine((value) => {
    if (value === "") return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Enter a valid event date, or leave it blank."),
  message: z.string().trim().min(1, "Enter a message for your rep.").max(3000, "Message must be 3,000 characters or fewer."),
}).strict();

export function repRequestQuestion(input: z.infer<typeof enterpriseRepRequestSchema>) {
  const data = enterpriseRepRequestSchema.parse(input);
  return `Enterprise rep setup request\nEvent name: ${data.eventName}\nDate: ${data.date || "Not yet known"}\n\n${data.message}`;
}