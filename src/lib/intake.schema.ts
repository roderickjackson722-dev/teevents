import { z } from "zod";

export const FORMATS_TOURNAMENT = ["Scramble", "Stroke Play", "Best Ball", "Shamble", "Stableford", "Match Play", "Not sure yet"] as const;
export const FORMATS_LEAGUE = ["Scramble", "Stroke Play", "Best Ball", "Shamble", "Stableford", "Match Play", "Skins", "Not sure yet"] as const;
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const BUILD_CHOICES = ["Rep builds it for you", "I will build it myself"] as const;
export const INTAKE_STATUSES = ["not_submitted", "new", "in_build", "preview_sent", "live"] as const;
export const STATUS_LABELS: Record<(typeof INTAKE_STATUSES)[number], string> = {
  not_submitted: "Not submitted", new: "New", in_build: "In build", preview_sent: "Preview sent", live: "Live",
};

const txt = (max = 500) => z.string().trim().max(max).default("");
const req = (msg: string, max = 200) => z.string().trim().min(1, msg).max(max);
const money = (msg?: string) => msg
  ? z.preprocess(v => (v === "" || v == null ? undefined : v), z.coerce.number({ required_error: msg, invalid_type_error: msg }).min(0, msg).max(100000))
  : z.union([z.literal(""), z.coerce.number().min(0).max(100000)]).default("");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");

export const tournamentIntakeSchema = z.object({
  eventName: req("Enter the event name."),
  eventDate: z.string().default(""),
  dateNotSet: z.boolean().default(false),
  courseName: req("Enter the golf course name."),
  courseCityState: req("Enter the course city and state."),
  format: z.enum(FORMATS_TOURNAMENT, { errorMap: () => ({ message: "Choose a format." }) }),
  fieldSize: z.coerce.number({ invalid_type_error: "Enter the expected field size." }).int("Enter a whole number.").min(1, "Enter the expected field size.").max(10000),
  priceIndividual: money("Enter the individual entry price."),
  priceFoursome: money(),
  teeTime: txt(120),
  registrationDeadline: z.union([z.literal(""), isoDate]).default(""),
  sponsorships: txt(2000),
  logoPath: txt(400),
  colors: txt(200),
  beneficiary: txt(300),
  link: txt(400),
  buildChoice: z.enum(BUILD_CHOICES).default("Rep builds it for you"),
  notes: txt(4000),
}).superRefine((v, ctx) => {
  if (!v.dateNotSet && !/^\d{4}-\d{2}-\d{2}$/.test(v.eventDate)) ctx.addIssue({ code: "custom", path: ["eventDate"], message: "Choose the event date, or check Date not set yet." });
});

export const leagueIntakeSchema = z.object({
  leagueName: req("Enter the league name."),
  seasonStart: z.string().default(""),
  seasonEnd: z.string().default(""),
  datesNotSet: z.boolean().default(false),
  courseName: req("Enter the home golf course name."),
  courseCityState: req("Enter the course city and state."),
  days: z.array(z.enum(WEEKDAYS)).min(1, "Choose at least one day."),
  weeks: z.coerce.number({ invalid_type_error: "Enter the number of weeks." }).int("Enter a whole number.").min(1, "Enter the number of weeks.").max(104),
  format: z.enum(FORMATS_LEAGUE, { errorMap: () => ({ message: "Choose a format." }) }),
  players: z.coerce.number({ invalid_type_error: "Enter the expected number of players." }).int("Enter a whole number.").min(1, "Enter the expected number of players.").max(10000),
  feePerPlayer: money("Enter the league fee per player."),
  additionalCourses: txt(1000),
  teeTime: txt(120),
  standingsDetails: txt(2000),
  sponsorships: txt(2000),
  logoPath: txt(400),
  colors: txt(200),
  buildChoice: z.enum(BUILD_CHOICES).default("Rep builds it for you"),
  notes: txt(4000),
}).superRefine((v, ctx) => {
  if (v.datesNotSet) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.seasonStart)) ctx.addIssue({ code: "custom", path: ["seasonStart"], message: "Choose the season start date, or check Dates not set yet." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.seasonEnd)) ctx.addIssue({ code: "custom", path: ["seasonEnd"], message: "Choose the season end date, or check Dates not set yet." });
  else if (v.seasonStart && v.seasonEnd < v.seasonStart) ctx.addIssue({ code: "custom", path: ["seasonEnd"], message: "The end date must be on or after the start date." });
});

export type TournamentIntake = z.infer<typeof tournamentIntakeSchema>;
export type LeagueIntake = z.infer<typeof leagueIntakeSchema>;

export const TOURNAMENT_LABELS: [keyof TournamentIntake, string][] = [
  ["eventName", "Event name"], ["eventDate", "Event date"], ["courseName", "Golf course name"], ["courseCityState", "Course city and state"],
  ["format", "Format"], ["fieldSize", "Expected field size"], ["priceIndividual", "Entry price, individual"], ["priceFoursome", "Entry price, foursome"],
  ["teeTime", "Tee time or shotgun time"], ["registrationDeadline", "Registration deadline"], ["sponsorships", "Sponsorship levels and prices"],
  ["logoPath", "Logo"], ["colors", "Event colors"], ["beneficiary", "Charity or beneficiary"], ["link", "Website or social link"],
  ["buildChoice", "How do you want your page built?"], ["notes", "Notes or special requests"],
];
export const LEAGUE_LABELS: [keyof LeagueIntake, string][] = [
  ["leagueName", "League name"], ["seasonStart", "Season start date"], ["seasonEnd", "Season end date"], ["courseName", "Home golf course name"],
  ["courseCityState", "Course city and state"], ["days", "Day or days of the week"], ["weeks", "Number of weeks"], ["format", "Format"],
  ["players", "Expected number of players"], ["feePerPlayer", "League fee, per player"], ["additionalCourses", "Additional courses"],
  ["teeTime", "Weekly tee time"], ["standingsDetails", "Standings, skins, and handicaps details"], ["sponsorships", "Sponsorship levels and prices"],
  ["logoPath", "Logo"], ["colors", "League colors"], ["buildChoice", "How do you want your page built?"], ["notes", "Notes or special requests"],
];
export const CONTACT_LABELS: [string, string][] = [
  ["full_legal_name", "Full Legal Name"], ["email", "Email Address"], ["phone_number", "Phone Number"],
  ["organization_name", "Organization Name"], ["role", "Your Role in the Organization"], ["event_description", "Brief Description of Your Upcoming Event(s)"],
];

/** Display value for one intake field (dates, money, lists, "not set" flags). */
export function intakeValue(kind: "tournament" | "league", d: Record<string, unknown>, key: string): string {
  const v = d[key];
  if (kind === "tournament" && key === "eventDate" && d["dateNotSet"]) return "Date not set yet";
  if (kind === "league" && (key === "seasonStart" || key === "seasonEnd") && d["datesNotSet"]) return "Dates not set yet";
  if (key === "logoPath") return v ? "Uploaded" : "Will send later";
  if (["priceIndividual", "priceFoursome", "feePerPlayer"].includes(key)) return v === "" || v == null ? "" : `$${Number(v).toFixed(2)}`;
  if (Array.isArray(v)) return v.join(", ");
  return v == null ? "" : String(v);
}

export function intakeSubject(kind: "tournament" | "league", d: Record<string, unknown>): string {
  return kind === "tournament"
    ? `New tournament intake: ${d["eventName"]} - ${intakeValue(kind, d, "eventDate")}`
    : `New league intake: ${d["leagueName"]} - ${intakeValue(kind, d, "seasonStart")}`;
}

export function intakeEmailText(kind: "tournament" | "league", d: Record<string, unknown>, contact: Record<string, unknown>): string {
  const labels = kind === "tournament" ? TOURNAMENT_LABELS : LEAGUE_LABELS;
  return [
    kind === "tournament" ? "Your Tournament (Step 4)" : "Your League (Step 4)",
    ...labels.map(([k, l]) => `${l}: ${intakeValue(kind, d, k) || "Not provided"}`),
    "", "Contact and organization",
    ...CONTACT_LABELS.map(([k, l]) => `${l}: ${contact[k] ? String(contact[k]) : "Not provided"}`),
  ].join("\n");
}

/** League fee lines: 0% TeeVents platform fee and Stripe 2.9% + $0.30, on separate lines. */
export function leagueFeeLines(feeDollars: number) {
  const base = Math.round(feeDollars * 100);
  const stripe = base > 0 ? Math.round(base * 0.029 + 30) : 0;
  return { registration: base, platform: 0, stripe, total: base + stripe };
}
