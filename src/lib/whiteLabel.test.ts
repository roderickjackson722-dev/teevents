import { describe, expect, it } from "vitest";
import { brandEmailHtml, brandSender, smsSignature, whiteLabelFrom } from "../../supabase/functions/_shared/whiteLabel";
import { buildInvoiceEmail } from "./enterpriseInvoiceEmail";

const branded = { is_enterprise: true, site_logo_url: "https://cdn.x/logo.png", site_primary_color: "#123456", course_name: "Pine Hills GC", title: "Club Cup" };
const footer = `<div><p style="x">Sent by TeeVents • <a href="https://teevents.golf">teevents.golf</a></p></div>`;

describe("course branding", () => {
  it("applies only to Enterprise events with a saved logo", () => {
    expect(whiteLabelFrom(branded)?.name).toBe("Pine Hills GC");
    expect(whiteLabelFrom({ ...branded, site_logo_url: "" })).toBeNull();
    expect(whiteLabelFrom({ ...branded, is_enterprise: false })).toBeNull();
  });
  it("replaces the TeeVents email footer and sender name when branded", () => {
    const wl = whiteLabelFrom(branded);
    const html = brandEmailHtml(footer, wl);
    expect(html).not.toContain("TeeVents");
    expect(html).toContain("Pine Hills GC");
    expect(brandSender("TeeVents Golf Management <info@notifications.teevents.golf>", wl)).toBe('"Pine Hills GC" <info@notifications.teevents.golf>');
  });
  it("keeps the default email and sender when not branded", () => {
    expect(brandEmailHtml(footer, null)).toBe(footer);
    expect(brandSender("TeeVents Golf Management <a@b.c>", null)).toBe("TeeVents Golf Management <a@b.c>");
  });
  it("text signature uses course name, else TeeVents", () => {
    expect(smsSignature(whiteLabelFrom(branded))).toBe("Pine Hills GC");
    expect(smsSignature(null)).toBe("TeeVents");
  });
  it("invoice uses organization name, falling back to TeeVents", () => {
    const base = { invoice_number: "INV-1", billing_name: "A", billing_address: "B", amount_cents: 100, due_date: "2026-11-01" } as any;
    const named = buildInvoiceEmail({ ...base, organization_name: "Pine Hills GC" });
    expect(named.subject).toBe("Invoice INV-1 from Pine Hills GC");
    expect(named.html).not.toContain("TeeVents");
    const unnamed = buildInvoiceEmail({ ...base, organization_name: "" });
    expect(unnamed.subject).toBe("Invoice INV-1 from TeeVents");
    expect(unnamed.html).toContain("TeeVents Golf Management");
  });
});
