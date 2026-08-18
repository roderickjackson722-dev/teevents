/**
 * Universal server-rendered share metadata.
 *
 * Every page of the platform is served through the TanStack catch-all route, so
 * crawlers (iMessage, Facebook, WhatsApp, LinkedIn, Slack, X) only ever saw the
 * generic site-wide Open Graph tags. This module resolves the correct title,
 * description and image for ANY pathname on the server, so shared links always
 * preview that specific page — sample pages, demo pages, tournaments, leagues,
 * marketing and help pages alike.
 */
import { SITE_URL, SITE_DEFAULT_IMAGE, plain, clamp, absolute, query, type PageMeta } from "./serverMeta";

export interface PathMeta extends PageMeta { noIndex?: boolean }

const SITE_NAME = "TeeVents Golf Tournaments";
const DEFAULT_DESCRIPTION =
  "Golf tournament management for registration, payments, live scoring, sponsors, and pairings.";

const make = (title: string, description: string, path: string, image?: unknown, noIndex?: boolean): PathMeta => ({
  title,
  description: clamp(plain(description) || DEFAULT_DESCRIPTION),
  image: image ? absolute(image) : SITE_DEFAULT_IMAGE,
  url: `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL,
  noIndex,
});

const prettyDate = (value: unknown) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

/** Static copy for marketing / help / legal pages. */
const STATIC: Record<string, { title: string; description: string }> = {
  "/": { title: SITE_NAME, description: "All-in-one platform to plan, manage, and run golf tournaments — registration, sponsors, live scoring, and payments." },
  "/about": { title: "About TeeVents – Platform & On-Site Event Management | TeeVents", description: "TeeVents is the complete golf tournament solution — an online platform plus full-service on-site event management, built by tournament directors." },
  "/services": { title: "Services | TeeVents", description: "Full-service golf tournament consulting — from course selection and vendor management to day-of coordination and sponsor strategy." },
  "/events": { title: "Upcoming Events | TeeVents", description: "Discover and register for upcoming golf tournaments and charity events." },
  "/reviews": { title: "Reviews | TeeVents", description: "See what tournament organizers say about TeeVents — real reviews from nonprofits and corporations running golf events." },
  "/contact": { title: "Contact Us | TeeVents", description: "Get in touch with TeeVents for golf tournament planning, platform questions, or consulting inquiries." },
  "/plans": { title: "Simple, Transparent Pricing | TeeVents", description: "The complete golf tournament management platform is free. Add paid add-ons per event only when you need them. No monthly fees, no hidden charges." },
  "/enterprise-pricing": { title: "Enterprise Pricing | TeeVents", description: "White-label and volume plans for associations, management companies, and multi-event organizers." },
  "/features": { title: "All Features | TeeVents Golf Tournament Software", description: "Explore every TeeVents feature in tournament-day order — from planning and registration through live scoring and post-event reporting." },
  "/faq": { title: "FAQ | TeeVents", description: "Answers to common questions about TeeVents golf tournament management — payments, fees, payouts, and support." },
  "/golf-leagues": { title: "Golf League Management Software | TeeVents", description: "Run your golf league with real-time scoring, live leaderboards, skins, handicap tracking, and season stats." },
  "/nonprofits": { title: "Nonprofits | TeeVents", description: "TeeVents empowers 501(c)(3) nonprofits with transparent pricing, donor-covers-fees model, automated tax receipts, and everything needed to run a charity golf tournament." },
  "/request-sample": { title: "Request a Sample – See TeeVents With Your Own Tournament", description: "Tell us about your golf tournament and we'll build a personalized TeeVents sample — real organizer dashboard, branded event page, live scoring." },
  "/tournaments/search": { title: "Find a Golf Tournament | TeeVents", description: "Search upcoming golf tournaments and charity events by name, state, and date. Register or follow live scoring." },
  "/interactive-demo": { title: "Interactive Demo | TeeVents", description: "Take a self-guided tour of the TeeVents tournament dashboard — no signup required." },
  "/sample-organizer": { title: "Sample Organizer Dashboard | TeeVents", description: "Experience a fully interactive sample tournament on TeeVents. Explore leaderboards, registration, sponsors, volunteers, and financials." },
  "/sample-dashboard": { title: "Sample Dashboard | TeeVents", description: "Interactive sample organizer dashboard showcasing all TeeVents features." },
  "/compare": { title: "Compare Golf Tournament Software | TeeVents", description: "Compare TeeVents to Eventbrite, Givebutter, Venmo, and Google Forms. See why TeeVents is the smarter choice for golf tournaments." },
  "/compare/eventbrite-vs-teevents": { title: "TeeVents vs Eventbrite — Compare Tournament Software", description: "Side-by-side comparison of TeeVents and Eventbrite for golf tournaments: fees, payouts, pairings, and live scoring." },
  "/compare/golf-genius-vs-teevents": { title: "TeeVents vs Golf Genius — Compare Tournament Software", description: "Side-by-side comparison of TeeVents and Golf Genius. Simpler pricing, built-in pin sheets, no annual contract." },
  "/help": { title: "Help Center | TeeVents", description: "Get help with payments, payouts, fees, and managing your golf tournament on TeeVents." },
  "/privacy-policy": { title: "Privacy Policy | TeeVents", description: "TeeVents privacy policy — how we collect, use, and protect your personal information." },
  "/terms-of-service": { title: "Terms of Service | TeeVents", description: "TeeVents terms of service — the rules and guidelines for using our golf tournament platform." },
};

const HELP_TITLES: Record<string, { title: string; description: string }> = {
  "step-by-step": { title: "Step-by-Step Instructions", description: "Detailed walkthroughs for every menu item in the TeeVents tournament organizer dashboard." },
  "connect-stripe": { title: "Connect Your Bank Account", description: "Step-by-step guide to connecting your bank account via Stripe Connect for automatic tournament payouts." },
  "fees-and-hold": { title: "Fees & Payment Flow", description: "Understand the TeeVents 5% platform fee and automatic payment splitting. TeeVents never holds your money." },
  "payout-schedule": { title: "Payout Schedule", description: "How automatic payment splitting works. Funds go directly to your Stripe account — withdraw on your schedule." },
  "tax-information": { title: "Tax Information", description: "1099-K reporting, annual tax summaries, and record keeping guidance for TeeVents tournament organizers." },
  "payment-settings": { title: "Payment Settings", description: "Configure fee models — pass fees to golfers or absorb them as the organizer." },
  "refunds-chargebacks": { title: "Refunds & Chargebacks", description: "How refund requests and chargebacks are handled to protect tournament organizers." },
  "custom-domain": { title: "Custom Domain Setup", description: "Point your own domain at your TeeVents tournament page with simple DNS records." },
  "how-payments-work": { title: "How Payments Work", description: "How TeeVents processes payments using Stripe Connect — 5% platform fee, instant splits, direct deposits." },
  "understanding-payout-timing": { title: "Understanding Payout Timing", description: "How transactions are recorded immediately, why Stripe holds funds on new accounts, and where to track everything." },
  "finding-stripe-payouts": { title: "Where to Find Your Payouts in Stripe", description: "Locate your TeeVents tournament funds inside the Stripe Dashboard, and why a balance can show as pending." },
  "uploading-images": { title: "Troubleshooting Image Uploads", description: "Fix common problems when uploading tournament logos, flyers, and hero images." },
};

async function tournamentRow(slug: string, requirePublished: boolean) {
  const filter = new URLSearchParams({
    select: "title,date,location,course_name,description,site_hero_image_url,site_logo_url,image_url",
    or: `(custom_slug.eq.${slug},slug.eq.${slug})`,
    limit: "1",
  });
  if (requirePublished) filter.set("site_published", "eq.true");
  const row = await query("tournaments", filter);
  if (row) return row;
  return requirePublished ? await tournamentRow(slug, false) : undefined;
}

async function tournamentMeta(slug: string, path: string, prefix = "", requirePublished = true): Promise<PathMeta | undefined> {
  const row = await tournamentRow(slug, requirePublished);
  if (!row) return undefined;
  const title = plain(row.title) || "Golf Tournament";
  const when = prettyDate(row.date);
  const where = plain(row.location || row.course_name);
  return make(
    `${prefix}${title} | ${SITE_NAME}`,
    plain(row.description) || `Join us for ${title}${when ? ` on ${when}` : ""}${where ? ` at ${where}` : ""}. Register now!`,
    path,
    row.site_hero_image_url || row.image_url || row.site_logo_url,
  );
}

async function sampleMeta(slug: string, path: string, prefix = ""): Promise<PathMeta | undefined> {
  const row = await query(
    "sample_tournaments",
    new URLSearchParams({ select: "tournament_name,event_date,location,description,hero_image_url,logo_url", unique_slug: `eq.${slug}`, limit: "1" }),
  );
  if (!row) return undefined;
  const name = plain(row.tournament_name) || "Golf Tournament";
  const when = prettyDate(row.event_date);
  const where = plain(row.location);
  return make(
    `${prefix}${name} | ${SITE_NAME}`,
    plain(row.description) ||
      `See ${name}${when ? ` on ${when}` : ""}${where ? ` at ${where}` : ""} — a live example of a TeeVents tournament page with registration, sponsors, pairings and live scoring.`,
    path,
    row.hero_image_url || row.logo_url,
  );
}

async function demoMeta(token: string, path: string, prefix = ""): Promise<PathMeta | undefined> {
  const row = await query(
    "demo_tournaments",
    new URLSearchParams({ select: "tournament_name,event_date,location,course_name", public_token: `eq.${token}`, limit: "1" }),
  );
  if (!row) return undefined;
  const name = plain(row.tournament_name) || "Golf Tournament";
  const when = prettyDate(row.event_date);
  const where = plain(row.location || row.course_name);
  return make(
    `${prefix}${name} | ${SITE_NAME}`,
    `Preview ${name}${when ? ` on ${when}` : ""}${where ? ` at ${where}` : ""} — event page, registration, sponsors, pairings and live scoring, built on TeeVents.`,
    path,
    undefined,
    true,
  );
}

async function leagueMeta(slug: string, path: string, prefix = ""): Promise<PathMeta | undefined> {
  const row = await query(
    "golf_leagues",
    new URLSearchParams({ select: "league_name,description,tagline,logo_url", league_slug: `eq.${slug}`, limit: "1" }),
  );
  if (!row) return undefined;
  const name = plain(row.league_name) || "Golf League";
  return make(
    `${prefix}${name} — Golf League | ${SITE_NAME}`,
    plain(row.description) || plain(row.tagline) || `${name} standings, schedule, results and member registration.`,
    path,
    row.logo_url,
  );
}

async function leadMagnetMeta(slug: string, path: string): Promise<PathMeta | undefined> {
  const row = await query(
    "lead_magnets",
    new URLSearchParams({ select: "title,description,cover_image_url", slug: `eq.${slug}`, is_published: "eq.true", limit: "1" }),
  );
  if (!row) return undefined;
  const title = plain(row.title) || "Free Golf Tournament Resource";
  return make(`${title} | TeeVents`, plain(row.description) || `Download ${title} — a free resource from TeeVents.`, path, row.cover_image_url);
}

const isSafeSlug = (value: string) => /^[A-Za-z0-9._-]{1,120}$/.test(value);

/**
 * Resolves share metadata for any pathname. Never throws — falls back to
 * site-wide defaults so a database hiccup can never break page rendering.
 */
export async function resolvePathMeta(pathname: string): Promise<PathMeta> {
  const path = (pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
  const fallback = make(SITE_NAME, DEFAULT_DESCRIPTION, path);

  try {
    const seg = path.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
    const priv = seg[0] === "dashboard" || seg[0] === "admin" || seg[0] === "sales-hub" || seg[0] === "sales";

    const staticHit = STATIC[path];
    if (staticHit) return make(staticHit.title, staticHit.description, path);

    if (seg[0] === "help" && seg[1] && HELP_TITLES[seg[1]]) {
      const h = HELP_TITLES[seg[1]];
      return make(`${h.title} | TeeVents Help`, h.description, path);
    }

    const slug = seg[1] && isSafeSlug(seg[1]) ? seg[1] : "";

    if (slug) {
      switch (seg[0]) {
        case "t":
        case "tournament":
        case "events": {
          const suffix = seg[2];
          const prefix =
            suffix === "scoring" ? "Enter Scores — " : suffix === "sponsor" ? "Sponsor — " : suffix === "vendors" ? "Vendors — " : "";
          return (await tournamentMeta(slug, path, prefix)) ?? fallback;
        }
        case "live":
          return (await tournamentMeta(slug, path, "Live Leaderboard — ")) ?? fallback;
        case "day-of":
          return (await tournamentMeta(slug, path, "Day of Event — ", false)) ?? fallback;
        case "score":
          return (await tournamentMeta(slug, path, "Enter Scores — ", false)) ?? fallback;
        case "player":
        case "team":
          return (await tournamentMeta(slug, path, "Player Hub — ", false)) ?? fallback;
        case "league": {
          const suffix = seg[2];
          const prefix = suffix === "register" || suffix === "register-code" ? "Register — " : suffix === "score" ? "Enter Scores — " : "";
          return (await leagueMeta(slug, path, prefix)) ?? fallback;
        }
        case "sample": {
          if (seg[1] === "dashboard" || seg[1] === "access") {
            return make("Your TeeVents Sample | TeeVents", "Explore your personalized TeeVents sample — organizer dashboard, branded event page, and live scoring.", path, undefined, true);
          }
          const suffix = seg[2];
          const prefix = suffix === "live" ? "Live Leaderboard — " : suffix === "dashboard" ? "Organizer Dashboard — " : "";
          return (await sampleMeta(slug, path, prefix)) ?? fallback;
        }
        case "demo": {
          const suffix = seg[2];
          const prefix =
            suffix === "live" ? "Live Leaderboard — " : suffix === "dashboard" ? "Organizer Dashboard — " : suffix === "day-of" ? "Day of Event — " : "";
          return (await demoMeta(slug, path, prefix)) ?? fallback;
        }
        case "lead-magnet":
          return (await leadMagnetMeta(slug, path)) ?? fallback;
        default:
          break;
      }
    }

    if (priv) return { ...fallback, noIndex: true };
    return fallback;
  } catch {
    return fallback;
  }
}

/** Builds the TanStack `head()` payload for a resolved path meta. */
export const headFromPathMeta = (meta: PathMeta | undefined) => {
  if (!meta) return {};
  return {
    meta: [
      { title: meta.title },
      { name: "description", content: meta.description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: meta.title },
      { property: "og:description", content: meta.description },
      { property: "og:url", content: meta.url },
      { property: "og:image", content: meta.image },
      { property: "og:image:secure_url", content: meta.image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: meta.title },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: meta.title },
      { name: "twitter:description", content: meta.description },
      { name: "twitter:image", content: meta.image },
      ...(meta.noIndex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [{ rel: "canonical", href: meta.url }],
  };
};
