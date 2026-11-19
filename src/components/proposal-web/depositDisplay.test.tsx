import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import ProposalPage from "./ProposalPage";
import { emptyDocument, type WebDocument } from "./content";

afterEach(cleanup);

/** A proposal whose only program is Full Service Management, with admin-written price wording. */
function fsmDocument(): WebDocument {
  const d = emptyDocument();
  d.recommended = "Full Service Management";
  d.packages = ["Full Service Management"];
  d.programOverrides = { "Full Service Management": { Price: "Two-Day Championship ($5,000)" } };
  return d;
}

describe("Full Service payment display", () => {
  it("never auto-prints the deposit and balance lines under the price", () => {
    const { container } = render(<ProposalPage document={fsmDocument()} />);
    const text = container.textContent || "";
    expect(text).not.toContain("Deposit due at agreement");
    expect(text).not.toContain("Balance due:");
    expect(text).toContain("Two-Day Championship ($5,000)");
  });

  it("keeps the discount breakdown while the deposit lines stay gone", () => {
    const d = fsmDocument();
    d.fullService = { ...d.fullService!, discountType: "dollar", discountAmount: 750 };
    const { container } = render(<ProposalPage document={d} />);
    const text = container.textContent || "";
    expect(text).toContain("Discount: -$750.00");
    expect(text).toContain("Your price: $4,250.00 per event");
    expect(text).not.toContain("Deposit due at agreement");
    expect(text).not.toContain("Balance due:");
  });
});
