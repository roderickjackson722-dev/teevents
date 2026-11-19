import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReferencesSection, PhotosSection } from "./ProposalExtraPages";
import { defaultPhotoLinksPage, defaultReferencesPage, emptyDocument } from "./content";

afterEach(cleanup);

describe("optional proposal pages", () => {
  it("renders references and a clickable event image preview with a link fallback", () => {
    const d = emptyDocument();
    d.referencesPage = { ...defaultReferencesPage(), enabled: true, entries: [{ id: "ref-1", name: "Jordan Lee", organization: "Community Golf Foundation", description: "Annual charity tournament", contact: "jordan@example.test" }] };
    d.photoLinksPage = { ...defaultPhotoLinksPage(), enabled: true, links: [{ id: "photo-1", title: "2026 Charity Classic", url: "https://images.example.test/classic.jpg", description: "Awards ceremony" }] };
    render(<><ReferencesSection document={d} /><PhotosSection document={d} /></>);
    expect(screen.getByRole("heading", { name: "References" })).toBeTruthy();
    expect(screen.getByText("Community Golf Foundation")).toBeTruthy();
    const image = screen.getByRole("img", { name: "2026 Charity Classic" });
    expect(image.getAttribute("src")).toBe("https://images.example.test/classic.jpg");
    expect(screen.getByRole("link", { name: /images\.example\.test\/classic\.jpg/ }).getAttribute("href")).toBe("https://images.example.test/classic.jpg");
    fireEvent.error(image);
    expect(screen.getByText("Image preview unavailable. Use the clickable link below.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /images\.example\.test\/classic\.jpg/ })).toBeTruthy();
  });

  it("renders nothing for disabled optional pages", () => {
    const { container } = render(<><ReferencesSection document={emptyDocument()} /><PhotosSection document={emptyDocument()} /></>);
    expect(container).toBeEmptyDOMElement();
  });
});
