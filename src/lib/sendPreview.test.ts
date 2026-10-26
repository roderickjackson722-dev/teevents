import { describe, expect, it } from "vitest";
import { dayBeforeAllRecipients, personalizeSms, scheduledEmailRecipients, smsRecipients, smsSegments, templateEmailRecipients } from "./sendPreview";

const regs = [
  { id: "a", first_name: "Ann", last_name: "Lee", email: "ann@x.com", phone: "+14045550001", payment_status: "paid", tee_time: "8:00 AM", group_number: 3, scoring_code: "ABC123" },
  { id: "b", first_name: "Bo", last_name: "Ray", email: "", phone: " ", payment_status: "pending" },
  { id: "c", first_name: "Cy", last_name: "Do", email: "cy@x.com", phone: "+14045550003", payment_status: "pending" },
];

describe("send preview rules", () => {
  it("fills in name, event, tee time, hole and scoring code", () => {
    const text = personalizeSms("{{first_name}} {{tournament_name}} {{tee_time}} hole {{starting_hole}} code {{scoring_code}}", regs[0], { title: "Club Cup" });
    expect(text).toBe("Ann Club Cup 8:00 AM hole 3 code ABC123");
  });
  it("counts text message parts", () => {
    expect(smsSegments("a".repeat(160)).segments).toBe(1);
    expect(smsSegments("a".repeat(161)).segments).toBe(2);
    expect(smsSegments("⛳".repeat(71)).segments).toBe(2);
  });
  it("sends now only to players with phones, capped by remaining texts", () => {
    const r = smsRecipients({ mode: "now", audience: "registered", registrations: regs, manualNumbers: [], creditsRemaining: 1 });
    expect(r.recipients.map((x) => x.id)).toEqual(["a"]);
    expect(r.skippedForCredits).toBe(1);
  });
  it("scheduled texts go to registered phones and ignore typed numbers", () => {
    const r = smsRecipients({ mode: "schedule", audience: "manual", registrations: regs, manualNumbers: ["+1999"], creditsRemaining: 0 });
    expect(r.recipients.map((x) => x.address)).toEqual(["+14045550001", "+14045550003"]);
    expect(r.manualIgnored).toBe(true);
  });
  it("uses alternate and both addresses for hand-picked emails", () => {
    const r = templateEmailRecipients(regs, ["a", "c"], { a: "alt@x.com" }, { a: "both" });
    expect(r.map((x) => x.address)).toEqual(["alt@x.com", "ann@x.com", "cy@x.com"]);
  });
  it("day-before reminder to everyone goes to paid players only", () => {
    expect(dayBeforeAllRecipients(regs).map((x) => x.id)).toEqual(["a"]);
  });
  it("scheduled template email to everyone uses all players with email", () => {
    expect(scheduledEmailRecipients({ templateKind: "confirmation", audience: "all", selectedIds: [], testEmail: "", registrations: regs }).map((x) => x.id)).toEqual(["a", "c"]);
    expect(scheduledEmailRecipients({ templateKind: "confirmation", audience: "all", selectedIds: [], testEmail: "me@x.com", registrations: regs }).map((x) => x.address)).toEqual(["me@x.com"]);
  });
});
