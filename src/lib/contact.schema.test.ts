import { describe, expect, it } from "vitest";
import { contactSchema } from "./contact.schema";

const valid = { name: "Test Organizer", email: "organizer@example.com", phone: "+1 (602) 555-0100", organization: "Test Golf", topic: "I want to run a tournament", message: "A tournament inquiry.", source: "Golf course", captchaToken: "test-token" };
describe("Contact validation", () => {
  it("accepts and trims complete messages", () => {
    expect(contactSchema.parse({ ...valid, name: "  Test Organizer  " }).name).toBe("Test Organizer");
  });
  it.each(["name", "email", "phone", "topic", "message", "captchaToken"])("rejects a missing %s", field => {
    expect(contactSchema.safeParse({ ...valid, [field]: "" }).success).toBe(false);
  });
  it("accepts optional fields omitted as empty text", () => {
    expect(contactSchema.safeParse({ ...valid, organization: "", source: "" }).success).toBe(true);
  });
  it("rejects malformed emails, phones, choices and excessive input", () => {
    for (const override of [{ email: "not-an-email" }, { email: "a@example.com\r\nBcc: victim@example.com" }, { phone: "phone" }, { phone: "12" }, { message: "x".repeat(5001) }, { topic: "unknown" }, { source: "unknown" }, { name: "Test\u0000" }, { recipient: "other@example.com" }]) {
      expect(contactSchema.safeParse({ ...valid, ...override }).success).toBe(false);
    }
  });
});