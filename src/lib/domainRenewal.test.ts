import { describe, expect, it } from "vitest";
import { domainStage, renewedExpiryMs, DAY_MS } from "./domainRenewal";

const end = Date.parse("2026-10-01T23:59:59Z");
const t = { custom_domain: "golf.example.org", end_date: "2026-10-01" };

describe("custom domain renewal lifecycle", () => {
  it("stays fully live for the first 30 days after the event", () => {
    expect(domainStage(t, end + 29 * DAY_MS)).toBe("active");
  });
  it("sends the renewal notice from day 30", () => {
    expect(domainStage(t, end + 30 * DAY_MS)).toBe("renewal_due");
  });
  it("redirects to the archive from day 60", () => {
    expect(domainStage(t, end + 60 * DAY_MS)).toBe("archived");
  });
  it("a paid renewal keeps the domain live for one more year", () => {
    const now = end + 61 * DAY_MS;
    const exp = new Date(renewedExpiryMs(t, now)).toISOString();
    expect(domainStage({ ...t, custom_domain_expires_at: exp }, now + 300 * DAY_MS)).toBe("active");
    expect(renewedExpiryMs(t, now)).toBe(now + 365 * DAY_MS);
  });
  it("events without a custom domain are ignored", () => {
    expect(domainStage({ end_date: "2026-10-01" }, end + 90 * DAY_MS)).toBe("none");
  });
});
