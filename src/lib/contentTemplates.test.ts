import { describe, it, expect } from "vitest";
import { fillTemplatePlaceholders } from "./contentTemplates";

describe("fillTemplatePlaceholders", () => {
  it("fills event name, course, date and email from the event", () => {
    const out = fillTemplatePlaceholders("[Event Name] at [Course Name] on [Date]. Email [email].", {
      title: "Drive for the Cure", course_name: "Woodward Golf Club", date: "2027-06-11", contact_email: "a@b.com",
    });
    expect(out).toBe("Drive for the Cure at Woodward Golf Club on Friday, June 11, 2027. Email a@b.com.");
  });
  it("leaves unknown or missing placeholders in brackets", () => {
    expect(fillTemplatePlaceholders("[email] [cause]", { title: "X" })).toBe("[email] [cause]");
  });
});
