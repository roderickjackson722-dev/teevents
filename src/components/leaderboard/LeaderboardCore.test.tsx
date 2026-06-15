import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LeaderboardRenderer, mergeDesign } from "@/components/leaderboard/LeaderboardCore";

const design = mergeDesign({
  background_color: "#112233",
  header_background: "#445566",
  text_color: "#abcdef",
  accent_color: "#ff8800",
  font_family: "Roboto",
  font_size: "large",
  max_rows: 3,
  show_ticker: true,
  ticker_text: "Hello world",
  show_sponsor_banner: true,
  sponsor_banner_position: "top",
});

const rows = [
  { name: "Alpha", total: 65, thru: 18 },
  { name: "Bravo", total: 67, thru: 18 },
  { name: "Charlie", total: 70, thru: 17 },
  { name: "Delta", total: 72, thru: 16 },
  { name: "Echo", total: 75, thru: 15 },
];

const banner = { id: "s", name: "ACME", logo_url: null };

describe("LeaderboardRenderer parity (preview vs live)", () => {
  it("applies all configured design tokens to the root element", () => {
    const { getByTestId } = render(
      <LeaderboardRenderer design={design} title="Test Cup" rows={rows} bannerSponsor={banner} />
    );
    const root = getByTestId("lb-root");
    const style = root.getAttribute("style") || "";
    expect(style).toContain("background-color: rgb(17, 34, 51)");
    expect(style).toContain("color: rgb(171, 205, 239)");
    expect(style).toContain("font-family: Roboto");
    expect(style).toContain("font-size: 20px");
  });

  it("respects max_rows limit", () => {
    const { getAllByTestId } = render(
      <LeaderboardRenderer design={design} title="Test Cup" rows={rows} bannerSponsor={banner} />
    );
    expect(getAllByTestId("lb-row")).toHaveLength(3);
  });

  it("renders ticker and sponsor banner when enabled", () => {
    const { getByTestId, queryByTestId } = render(
      <LeaderboardRenderer design={design} title="Test Cup" rows={rows} bannerSponsor={banner} />
    );
    expect(getByTestId("lb-ticker")).toBeTruthy();
    expect(getByTestId("lb-banner-top")).toBeTruthy();
    expect(queryByTestId("lb-banner-bottom")).toBeNull();
  });

  it("compact (preview) and full (live) modes apply the same colors and row count", () => {
    const { getByTestId: getPreview } = render(
      <LeaderboardRenderer design={design} title="Test Cup" rows={rows} bannerSponsor={banner} compact />
    );
    const { getByTestId: getLive } = render(
      <LeaderboardRenderer design={design} title="Test Cup" rows={rows} bannerSponsor={banner} />
    );

    // Same background, text color, font, and font size on both renderers.
    const preview = getPreview("lb-root").getAttribute("style") || "";
    const live = getLive("lb-root").getAttribute("style") || "";
    for (const token of [
      "background-color: rgb(17, 34, 51)",
      "color: rgb(171, 205, 239)",
      "font-family: Roboto",
      "font-size: 20px",
    ]) {
      expect(preview).toContain(token);
      expect(live).toContain(token);
    }
  });

  it("falls back to defaults when design tokens are missing", () => {
    const partial = mergeDesign({ background_color: "#000000" } as any);
    expect(partial.header_background).toBeTruthy();
    expect(partial.accent_color).toBeTruthy();
    expect(partial.font_family).toBeTruthy();
    expect(partial.max_rows).toBeGreaterThan(0);
  });
});
