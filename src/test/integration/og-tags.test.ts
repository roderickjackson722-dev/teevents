import { describe, it, expect, beforeAll } from "vitest";

/**
 * Regression guard for social/text-message link previews.
 *
 * Crawlers (iMessage, Facebook, WhatsApp, LinkedIn) do not run JavaScript, so the
 * server-rendered <head> must already contain per-page Open Graph tags. These tests
 * hit the running dev/preview server and assert the SSR HTML carries event-specific
 * title / description / image for tournament and college pages, and the generic
 * TeeVents preview for the homepage.
 *
 * Skipped automatically when no server is reachable (e.g. isolated CI unit runs).
 */
const BASE = process.env.OG_TEST_BASE_URL ?? "http://localhost:8080";

const tag = (html: string, key: string) => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([\\s\\S]*?)["']|<meta[^>]+content=["']([\\s\\S]*?)["'][^>]*(?:property|name)=["']${key}["']`,
    "i",
  );
  const m = html.match(re);
  return (m?.[1] ?? m?.[2] ?? "").trim();
};

const title = (html: string) => html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";

let reachable = false;
beforeAll(async () => {
  try {
    const res = await fetch(BASE, { redirect: "follow" });
    reachable = res.ok;
  } catch {
    reachable = false;
  }
});

const fetchHtml = async (path: string) => {
  const res = await fetch(`${BASE}${path}`, { headers: { "user-agent": "facebookexternalhit/1.1" } });
  return res.text();
};

describe("server-rendered Open Graph tags", () => {
  it("homepage keeps the generic TeeVents preview", async () => {
    if (!reachable) return;
    const html = await fetchHtml("/");
    expect(title(html)).toContain("TeeVents");
    expect(tag(html, "og:title")).toContain("TeeVents");
    expect(tag(html, "og:description").length).toBeGreaterThan(20);
  });

  it("tournament pages expose event-specific tags", async () => {
    if (!reachable) return;
    const html = await fetchHtml("/t/bolton-invitational");
    expect(title(html)).toContain("Bolton Invitational");
    expect(tag(html, "og:title")).toContain("Bolton Invitational");
    expect(tag(html, "og:description")).toMatch(/Bolton Invitational/);
    expect(tag(html, "og:image")).toMatch(/^https:\/\//);
    expect(tag(html, "og:url")).toContain("/t/bolton-invitational");
    expect(tag(html, "twitter:card")).toBe("summary_large_image");
  });

  it("college pages expose event-specific tags", async () => {
    if (!reachable) return;
    const html = await fetchHtml("/college/twd");
    expect(title(html)).toContain("Dortch");
    expect(tag(html, "og:title")).toContain("Dortch");
    expect(tag(html, "og:description").length).toBeGreaterThan(20);
    expect(tag(html, "og:image")).toMatch(/^https:\/\//);
    expect(tag(html, "og:url")).toContain("/college/twd");
  });
});
