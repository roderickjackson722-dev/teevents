import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import ProposalPage from "./ProposalPage";
import { emptyDocument } from "./content";

afterEach(cleanup);

describe("Recommended for You label", () => {
  it("shows the label on the recommended program by default", () => {
    const d = emptyDocument();
    d.recommended = "Full Service Management";
    d.packages = ["Full Service Management"];
    const { container } = render(<ProposalPage document={d} />);
    expect(container.textContent).toContain("Recommended for You");
  });

  it("hides the label everywhere when the admin turns it off", () => {
    const d = emptyDocument();
    d.recommended = "Full Service Management";
    d.packages = ["Full Service Management"];
    d.hideRecommendedBadge = true;
    const { container } = render(<ProposalPage document={d} />);
    expect(container.textContent).not.toContain("Recommended for You");
  });
});
