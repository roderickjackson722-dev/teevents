import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { guides, extraGuides } from "@/pages/seo/guides";

const BASE_URL = "https://www.teevents.golf";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

/** Marketing, feature, help and legal pages. */
const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/golf-tournament-software", changefreq: "monthly", priority: "0.95" },
  { path: "/charity-golf-tournament-planning", changefreq: "monthly", priority: "0.9" },
  { path: "/golf-fundraiser-management", changefreq: "monthly", priority: "0.9" },
  { path: "/features", changefreq: "monthly", priority: "0.85" },
  { path: "/plans", changefreq: "monthly", priority: "0.9" },
  { path: "/enterprise-pricing", changefreq: "monthly", priority: "0.7" },
  { path: "/services", changefreq: "monthly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/nonprofits", changefreq: "monthly", priority: "0.8" },
  { path: "/golf-leagues", changefreq: "monthly", priority: "0.8" },
  { path: "/events", changefreq: "weekly", priority: "0.7" },
  { path: "/tournaments/search", changefreq: "weekly", priority: "0.7" },
  { path: "/reviews", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/request-sample", changefreq: "monthly", priority: "0.9" },
  { path: "/get-started", changefreq: "monthly", priority: "0.9" },
  { path: "/book", changefreq: "monthly", priority: "0.7" },
  { path: "/help", changefreq: "monthly", priority: "0.5" },
  { path: "/compare", changefreq: "monthly", priority: "0.7" },
  { path: "/compare/eventbrite-vs-teevents", changefreq: "monthly", priority: "0.7" },
  { path: "/compare/golf-genius-vs-teevents", changefreq: "monthly", priority: "0.7" },
  { path: "/platform", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
];

const HELP_SLUGS = [
  "step-by-step",
  "connect-stripe",
  "fees-and-hold",
  "payout-schedule",
  "tax-information",
  "payment-settings",
  "refunds-chargebacks",
  "custom-domain",
  "how-payments-work",
  "understanding-payout-timing",
  "finding-stripe-payouts",
  "uploading-images",
];

/** Public rows from the database (published tournaments, public leagues). */
async function dynamicEntries(): Promise<SitemapEntry[]> {
  const base = process.env["VITE_SUPABASE_URL"] ?? import.meta.env.VITE_SUPABASE_URL;
  const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return [];
  const headers = { apikey: String(key), Authorization: `Bearer ${key}` };
  const entries: SitemapEntry[] = [];

  try {
    const response = await fetch(
      `${base}/rest/v1/tournaments?select=slug,custom_slug&site_published=eq.true&limit=1000`,
      { headers },
    );
    if (response.ok) {
      const rows = (await response.json()) as { slug?: string; custom_slug?: string }[];
      for (const row of rows) {
        const slug = row.custom_slug || row.slug;
        if (!slug) continue;
        entries.push({ path: `/t/${encodeURIComponent(slug)}`, changefreq: "daily", priority: "0.8" });
      }
    }
  } catch {
    /* never let a database hiccup break the sitemap */
  }

  try {
    const response = await fetch(
      `${base}/rest/v1/golf_leagues?select=league_slug&is_public=eq.true&limit=1000`,
      { headers },
    );
    if (response.ok) {
      const rows = (await response.json()) as { league_slug?: string }[];
      for (const row of rows) {
        if (!row.league_slug) continue;
        entries.push({ path: `/league/${encodeURIComponent(row.league_slug)}`, changefreq: "weekly", priority: "0.7" });
      }
    }
  } catch {
    /* ignore */
  }

  return entries;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const guideEntries: SitemapEntry[] = [...guides, ...extraGuides].map((guide) => ({
          path: `/${guide.slug}`,
          changefreq: "monthly",
          priority: "0.8",
        }));

        const helpEntries: SitemapEntry[] = HELP_SLUGS.map((slug) => ({
          path: `/help/${slug}`,
          changefreq: "monthly",
          priority: "0.4",
        }));

        const all = [...STATIC_ENTRIES, ...guideEntries, ...helpEntries, ...(await dynamicEntries())];
        const seen = new Set<string>();
        const unique = all.filter((entry) => (seen.has(entry.path) ? false : (seen.add(entry.path), true)));

        const urls = unique.map((entry) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${entry.path === "/" ? "/" : entry.path}</loc>`,
            entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
            entry.priority ? `    <priority>${entry.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
