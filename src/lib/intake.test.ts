import { describe, it, expect } from "vitest";
import { tournamentIntakeSchema, leagueIntakeSchema, leagueFeeLines, intakeSubject, contactSchema, intakeValue } from "./intake.schema";

const t = { eventName: "QA Classic", orgName: "QA Org", eventDate: "", dateNotSet: true, fieldSize: 72, priceIndividual: 150 };
const l = { leagueName: "QA League", orgName: "QA Org", seasonStart: "", seasonEnd: "", datesNotSet: true, players: 40, feePerPlayer: 100 };

describe("signup intake rules", () => {
  it("Step 1 needs first name, last name, email and phone", () => {
    expect(contactSchema.safeParse({ first_name: "A", last_name: "B", email: "a@b.co", phone_number: "4045551212" }).success).toBe(true);
    expect(contactSchema.safeParse({ first_name: "", last_name: "B", email: "a@b.co", phone_number: "4045551212" }).success).toBe(false);
  });
  it("Date not set yet makes the tournament date optional", () => { expect(tournamentIntakeSchema.safeParse(t).success).toBe(true); });
  it("tournament date is required when Date not set yet is unchecked", () => { expect(tournamentIntakeSchema.safeParse({ ...t, dateNotSet: false }).success).toBe(false); });
  it("course is optional; format defaults to Not sure yet; registration starts 8:00 AM", () => {
    const r = tournamentIntakeSchema.parse(t);
    expect(r.courseName).toBe(""); expect(r.format).toBe("Not sure yet"); expect(intakeValue("tournament", r, "regStartTime")).toBe("8:00 AM");
  });
  it("no logo does not block submit and rep builds by default", () => { const r = tournamentIntakeSchema.parse(t); expect(r.logoPath).toBe(""); expect(r.buildChoice).toBe("Rep builds it for you"); });
  it("players and price per golfer are required", () => {
    expect(tournamentIntakeSchema.safeParse({ ...t, fieldSize: "" }).success).toBe(false);
    expect(tournamentIntakeSchema.safeParse({ ...t, priceIndividual: "" }).success).toBe(false);
  });
  it("Dates not set yet makes both season dates optional", () => { expect(leagueIntakeSchema.safeParse(l).success).toBe(true); expect(leagueIntakeSchema.safeParse({ ...l, datesNotSet: false }).success).toBe(false); });
  it("league days and weeks are optional", () => { expect(leagueIntakeSchema.parse(l).days).toEqual([]); });
  it("$100 league fee: $0.00 platform fee, $3.20 Stripe, $103.20 total", () => { expect(leagueFeeLines(100)).toEqual({ registration: 10000, platform: 0, stripe: 320, total: 10320 }); });
  it("email subjects", () => {
    expect(intakeSubject("tournament", { eventName: "QA Classic", eventDate: "2027-05-01" })).toBe("New tournament intake: QA Classic - 2027-05-01");
    expect(intakeSubject("league", { leagueName: "QA League", seasonStart: "2027-04-01" })).toBe("New league intake: QA League - 2027-04-01");
  });
});
