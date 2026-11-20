import { describe, it, expect } from "vitest";
import { tournamentIntakeSchema, leagueIntakeSchema, leagueFeeLines, intakeSubject } from "./intake.schema";

const t = { eventName: "QA Classic", eventDate: "", dateNotSet: true, courseName: "QA Course", courseCityState: "Phoenix, AZ", format: "Scramble", fieldSize: 72, priceIndividual: 150 };
const l = { leagueName: "QA League", seasonStart: "", seasonEnd: "", datesNotSet: true, courseName: "QA Course", courseCityState: "Phoenix, AZ", days: ["Tuesday"], weeks: 10, format: "Skins", players: 40, feePerPlayer: 100 };

describe("intake rules", () => {
  it("Date not set yet makes the event date optional", () => { expect(tournamentIntakeSchema.safeParse(t).success).toBe(true); });
  it("event date is required when Date not set yet is unchecked", () => { expect(tournamentIntakeSchema.safeParse({ ...t, dateNotSet: false }).success).toBe(false); });
  it("no logo does not block submit and rep builds by default", () => { const r = tournamentIntakeSchema.parse(t); expect(r.logoPath).toBe(""); expect(r.buildChoice).toBe("Rep builds it for you"); });
  it("Dates not set yet makes both season dates optional", () => { expect(leagueIntakeSchema.safeParse(l).success).toBe(true); expect(leagueIntakeSchema.safeParse({ ...l, datesNotSet: false }).success).toBe(false); });
  it("league needs at least one day of the week", () => { expect(leagueIntakeSchema.safeParse({ ...l, days: [] }).success).toBe(false); });
  it("$100 league fee: $0.00 platform fee, $3.20 Stripe, $103.20 total", () => { expect(leagueFeeLines(100)).toEqual({ registration: 10000, platform: 0, stripe: 320, total: 10320 }); });
  it("individual entry price is required", () => { expect(tournamentIntakeSchema.safeParse({ ...t, priceIndividual: "" }).success).toBe(false); });
  it("email subjects", () => {
    expect(intakeSubject("tournament", { eventName: "QA Classic", eventDate: "2027-05-01" })).toBe("New tournament intake: QA Classic - 2027-05-01");
    expect(intakeSubject("league", { leagueName: "QA League", seasonStart: "2027-04-01" })).toBe("New league intake: QA League - 2027-04-01");
  });
});
