import { describe, expect, it } from "vitest";
import { buildInvoiceEmail } from "./enterpriseInvoiceEmail";

describe("buildInvoiceEmail", () => {
  const email = buildInvoiceEmail({ invoice_number: "ENT-2026-123456", organization_name: "Pine Club", billing_name: "A & B", billing_address: "1 Main\nTown", amount_cents: 125050, due_date: "2026-11-25" });
  it("shows amount, due date, escaped billing details and subject", () => {
    expect(email.subject).toBe("Invoice ENT-2026-123456 from Pine Club");
    expect(email.html).toContain("$1,250.50");
    expect(email.html).toContain("2026-11-25");
    expect(email.html).toContain("A &amp; B");
    expect(email.html).toContain("1 Main<br>Town");
  });
});
