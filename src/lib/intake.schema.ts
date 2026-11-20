import { z } from "zod";

export const FORMATS_TOURNAMENT = ["Scramble", "Stroke Play", "Best Ball", "Shamble", "Stableford", "Match Play", "Not sure yet"] as const;
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const BUILD_CHOICES = ["Rep builds it for you", "I will build it myself"] as const;
export const INTAKE_STATUSES = ["not_submitted", "new", "in_build", "preview_sent", "live"] as const;
export const STATUS_LABELS: Record<(typeof INTAKE_STATUSES)[number], string> = {
  not_submitted: "Not submitted", new: "New", in_build: "In build", preview_sent: "Preview sent", live: "Live",
};
export type Kind = "tournament" | "league";

const txt = (max = 500) => z.string().trim().max(max).default("");
const req = (msg: string, max = 200) => z.string().trim().min(1, msg).max(max);
const money = (msg?: string) => msg
  ? z.preprocess(v => (v === "" || v == null ? undefined : v), z.coerce.number({ required_error: msg, invalid_type_error: msg }).min(0, msg).max(100000))
  : z.union([z.literal(""), z.coerce.number().min(0).max(100000)]).default("");
const count = (msg: string) => z.preprocess(v => (v === "" || v == null ? undefined : v), z.coerce.number({ required_error: msg, invalid_type_error: msg }).int("Enter a whole number.").min(1, msg).max(10000));
const optDate = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).default("");
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Signup Step 1, Your Info (same for tournaments and leagues). */
export const contactSchema = z.object({
  first_name: req("Enter your first name.", 80),
  last_name: req("Enter your last name.", 80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(255),
  phone_number: z.string().trim().max(30).refine(v => v.replace(/\D/g, "").length >= 10, "Enter a valid phone number."),
});

/** Tournament Step 2 (Event Info) fields. */
export const tournamentEventSchema = z.object({
  eventDate: z.string().default(""),
  dateNotSet: z.boolean().default(false),
  regStartTime: z.string().trim().max(10).default("08:00"),
  eventName: req("Enter the name of your tournament."),
  orgName: req("Enter the name of your organization.", 150),
  courseName: txt(200),
  courseCityState: txt(200),
  format: z.enum(FORMATS_TOURNAMENT).default("Not sure yet"),
});
/** Tournament Step 3 (Registration Info) fields. */
export const tournamentRegSchema = z.object({
  fieldSize: count("Enter how many players you expect."),
  priceIndividual: money("Enter the price per golfer."),
  priceFoursome: money(),
  registrationDeadline: optDate,
  sponsorships: txt(2000),
  logoPath: txt(400),
  colors: txt(200),
  beneficiary: txt(300),
  buildChoice: z.enum(BUILD_CHOICES).default("Rep builds it for you"),
  notes: txt(4000),
});
export const tournamentIntakeSchema = tournamentEventSchema.merge(tournamentRegSchema).superRefine((v, ctx) => {
  if (!v.dateNotSet && !DATE.test(v.eventDate)) ctx.addIssue({ code: "custom", path: ["eventDate"], message: "Choose the tournament date, or check Date not set yet." });
});

/** League Step 2 (League Info) fields. */
export const leagueEventSchema = z.object({
  leagueName: req("Enter the name of your league."),
  orgName: req("Enter the name of your organization.", 150),
  seasonStart: z.string().default(""),
  seasonEnd: z.string().default(""),
  datesNotSet: z.boolean().default(false),
  courseName: txt(200),
  courseCityState: txt(200),
  days: z.array(z.enum(WEEKDAYS)).default([]),
  weeks: z.union([z.literal(""), z.coerce.number().int().min(1).max(104)]).default(""),
});
/** League Step 3 (Registration Info) fields. */
export const leagueRegSchema = z.object({
  players: count("Enter how many players you expect."),
  feePerPlayer: money("Enter the price per player."),
  additionalCourses: txt(1000),
  teeTime: txt(120),
  standingsDetails: txt(2000),
  sponsorships: txt(2000),
  logoPath: txt(400),
  colors: txt(200),
  buildChoice: z.enum(BUILD_CHOICES).default("Rep builds it for you"),
  notes: txt(4000),
});
export const leagueIntakeSchema = leagueEventSchema.merge(leagueRegSchema).superRefine((v, ctx) => {
  if (v.datesNotSet) return;
  if (!DATE.test(v.seasonStart)) ctx.addIssue({ code: "custom", path: ["seasonStart"], message: "Choose the season start date, or check Dates not set yet." });
  if (!DATE.test(v.seasonEnd)) ctx.addIssue({ code: "custom", path: ["seasonEnd"], message: "Choose the season end date, or check Dates not set yet." });
  else if (v.seasonStart && v.seasonEnd < v.seasonStart) ctx.addIssue({ code: "custom", path: ["seasonEnd"], message: "The end date must be on or after the start date." });
});

export const intakeSchemaFor = (k: Kind) => (k === "league" ? leagueIntakeSchema : tournamentIntakeSchema);

/** Signup with intake details, or skipped ("I'll add this later"). */
export const signupRequestSchema = z.object({
  interest: z.enum(["tournament", "league"]),
  contact: contactSchema,
  skipped: z.boolean(),
  details: z.record(z.any()),
  selectedPlan: z.string().max(30).default(""),
  captchaToken: z.string().max(5000).default(""),
  origin: z.string().max(200).default(""),
});

export type TournamentIntake = z.infer<typeof tournamentIntakeSchema>;
export type LeagueIntake = z.infer<typeof leagueIntakeSchema>;

export const TOURNAMENT_LABELS: [string, string][] = [
  ["eventDate", "Tournament date"], ["regStartTime", "Registration begins"], ["eventName", "Tournament name"], ["orgName", "Organization name"],
  ["courseName", "Golf course name"], ["courseCityState", "Course city and state"], ["format", "Format"],
  ["fieldSize", "Expected field size"], ["priceIndividual", "Entry price per golfer"], ["priceFoursome", "Entry price, foursome"],
  ["registrationDeadline", "Registration deadline"], ["sponsorships", "Sponsorship levels and prices"], ["logoPath", "Logo"],
  ["colors", "Event colors"], ["beneficiary", "Charity or beneficiary"], ["buildChoice", "How do you want your page built?"], ["notes", "Notes or special requests"],
];
export const LEAGUE_LABELS: [string, string][] = [
  ["leagueName", "League name"], ["orgName", "Organization name"], ["seasonStart", "Season start date"], ["seasonEnd", "Season end date"],
  ["courseName", "Home golf course name"], ["courseCityState", "Course city and state"], ["days", "Day or days of the week"], ["weeks", "Number of weeks"],
  ["players", "Expected number of players"], ["feePerPlayer", "League fee per player"], ["additionalCourses", "Additional courses"],
  ["teeTime", "Weekly tee time"], ["standingsDetails", "Standings, skins, and handicaps details"], ["sponsorships", "Sponsorship levels and prices"],
  ["logoPath", "Logo"], ["colors", "League colors"], ["buildChoice", "How do you want your page built?"], ["notes", "Notes or special requests"],
];
export const CONTACT_LABELS: [string, string][] = [
  ["first_name", "First Name"], ["last_name", "Last Name"], ["email", "Email address"], ["phone_number", "Phone"], ["organization_name", "Organization name"],
];
export const SUMMARY_KEYS: Record<Kind, [string, string][]> = {
  tournament: [["eventName", "Event name"], ["eventDate", "Event date"], ["courseName", "Golf course name"], ["fieldSize", "Expected field size"], ["priceIndividual", "Entry price per golfer"]],
  league: [["leagueName", "League name"], ["seasonStart", "Season start date"], ["seasonEnd", "Season end date"], ["courseName", "Home golf course name"], ["players", "Expected number of players"], ["feePerPlayer", "League fee per player"]],
};

function time12(v: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return v;
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** Display value for one intake field (dates, money, lists, "not set" flags). */
export function intakeValue(kind: Kind, d: Record<string, unknown>, key: string): string {
  const v = d[key];
  if (kind === "tournament" && key === "eventDate" && d["dateNotSet"]) return "Date not set yet";
  if (kind === "league" && (key === "seasonStart" || key === "seasonEnd") && d["datesNotSet"]) return "Dates not set yet";
  if (key === "logoPath") return v ? "Uploaded" : "Will send later";
  if (key === "regStartTime") return v ? time12(String(v)) : "";
  if (["priceIndividual", "priceFoursome", "feePerPlayer"].includes(key)) return v === "" || v == null ? "" : `$${Number(v).toFixed(2)}`;
  if (Array.isArray(v)) return v.join(", ");
  return v == null ? "" : String(v);
}

export function intakeSubject(kind: Kind, d: Record<string, unknown>): string {
  return kind === "tournament"
    ? `New tournament intake: ${d["eventName"]} - ${intakeValue(kind, d, "eventDate")}`
    : `New league intake: ${d["leagueName"]} - ${intakeValue(kind, d, "seasonStart")}`;
}

export function intakeEmailText(kind: Kind, d: Record<string, unknown>, contact: Record<string, unknown>): string {
  const labels = kind === "tournament" ? TOURNAMENT_LABELS : LEAGUE_LABELS;
  return [
    kind === "tournament" ? "Tournament details" : "League details",
    ...labels.map(([k, l]) => `${l}: ${intakeValue(kind, d, k) || "Not provided"}`),
    "", "Contact",
    ...CONTACT_LABELS.map(([k, l]) => `${l}: ${contact[k] ? String(contact[k]) : "Not provided"}`),
  ].join("\n");
}

/** League fee lines: 0% TeeVents platform fee and Stripe 2.9% + $0.30, on separate lines. */
export function leagueFeeLines(feeDollars: number) {
  const base = Math.round(feeDollars * 100);
  const stripe = base > 0 ? Math.round(base * 0.029 + 30) : 0;
  return { registration: base, platform: 0, stripe, total: base + stripe };
}
