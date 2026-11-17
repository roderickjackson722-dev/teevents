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
    const { container: previewContainer } = render(
      <LeaderboardRenderer design={design} title="Test Cup" rows={rows} bannerSponsor={banner} compact />
    );
    const { container: liveContainer } = render(
      <LeaderboardRenderer design={design} title="Test Cup" rows={rows} bannerSponsor={banner} />
    );

    const preview = (previewContainer.querySelector('[data-testid="lb-root"]') as HTMLElement).getAttribute("style") || "";
    const live = (liveContainer.querySelector('[data-testid="lb-root"]') as HTMLElement).getAttribute("style") || "";
    for (const token of [
      "background-color: rgb(17, 34, 51)",
      "color: rgb(171, 205, 239)",
      "font-family: Roboto",
      "font-size: 20px",
    ]) {
      expect(preview).toContain(token);
      expect(live).toContain(token);
    }

    expect(previewContainer.querySelectorAll('[data-testid="lb-row"]').length).toBe(3);
    expect(liveContainer.querySelectorAll('[data-testid="lb-row"]').length).toBe(3);
  });


  it("shows the Today column by default and removes its header and cells when disabled", () => {
    const todayRows = [{ name: "Alpha", total: 65, thru: 9, today: 35, parToday: 36 }];
    const { getByText, rerender, queryByText, getByTestId } = render(
      <LeaderboardRenderer design={design} title="Test Cup" rows={todayRows} rounds={[1]} currentRound={1} />,
    );
    expect(getByText("Today")).toBeTruthy();
    expect(getByTestId("lb-table").textContent).toContain("-1");

    rerender(
      <LeaderboardRenderer design={{ ...design, show_today: false }} title="Test Cup" rows={todayRows} rounds={[1]} currentRound={1} />,
    );
    expect(queryByText("Today")).toBeNull();
    expect(getByTestId("lb-table").textContent).not.toContain("-1");
  });

  it("hides an attached leaderboard photo without removing its gallery data", () => {
    const heroImage = { id: "photo-1", image_url: "https://example.com/photo.jpg", caption: "18th green" };
    const sponsor = { id: "sponsor-1", name: "ACME", logo_url: null };
    const { queryByAltText, rerender, getByAltText } = render(
      <LeaderboardRenderer
        design={design}
        title="Test Cup"
        rows={rows}
        heroImage={heroImage}
        scrollingSponsors={[sponsor]}
        scrollingSponsorsPosition="sidebar"
      />,
    );
    expect(getByAltText("18th green")).toBeTruthy();

    rerender(
      <LeaderboardRenderer
        design={{ ...design, show_gallery: false }}
        title="Test Cup"
        rows={rows}
        heroImage={heroImage}
        scrollingSponsors={[sponsor]}
        scrollingSponsorsPosition="sidebar"
      />,
    );
    expect(queryByAltText("18th green")).toBeNull();
  });

  it("shows player names, team names, or both in the name column", () => {
    const teamRows = [
      { name: "Eagle Eyes", total: 65, thru: 18, players: ["Bob Adams", "Aubrey Jackson"] },
    ];
    const headers = (table: HTMLElement) =>
      Array.from(table.querySelectorAll("th")).map((th) => {
        const spans = th.querySelectorAll("span");
        // The name column carries a short phone label and a full desktop label.
        const full = spans[spans.length - 1];
        return (full ? full.textContent : th.textContent || "").trim();
      });

    const both = render(
      <LeaderboardRenderer design={design} title="Test Cup" rows={teamRows} />,
    );
    expect(both.getByTestId("lb-table").textContent).toContain("Eagle Eyes");
    expect(both.getByTestId("lb-table").textContent).toContain("Bob Adams, Aubrey Jackson");
    expect(headers(both.getByTestId("lb-table"))).toContain("Player / Team");
    both.unmount();

    const teamOnly = render(
      <LeaderboardRenderer design={{ ...design, name_display_mode: "team" }} title="Test Cup" rows={teamRows} />,
    );
    expect(teamOnly.getByTestId("lb-table").textContent).toContain("Eagle Eyes");
    expect(teamOnly.getByTestId("lb-table").textContent).not.toContain("Bob Adams");
    expect(headers(teamOnly.getByTestId("lb-table"))).toContain("Team");
    teamOnly.unmount();

    const playerOnly = render(
      <LeaderboardRenderer design={{ ...design, name_display_mode: "player" }} title="Test Cup" rows={teamRows} />,
    );
    expect(playerOnly.getByTestId("lb-table").textContent).toContain("Bob Adams, Aubrey Jackson");
    expect(playerOnly.getByTestId("lb-table").textContent).not.toContain("Eagle Eyes");
    expect(headers(playerOnly.getByTestId("lb-table"))).toContain("Player");
    playerOnly.unmount();
  });

  it("falls back to defaults when design tokens are missing", () => {
    const partial = mergeDesign({ background_color: "#000000" } as any);
    expect(partial.header_background).toBeTruthy();
    expect(partial.accent_color).toBeTruthy();
    expect(partial.font_family).toBeTruthy();
    expect(partial.max_rows).toBeGreaterThan(0);
  });
});
