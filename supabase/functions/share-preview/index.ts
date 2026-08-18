// Crawler-friendly share links.
// Serves a tiny HTML document with per-page Open Graph / Twitter tags so that
// iMessage, Facebook, LinkedIn, Slack, X, WhatsApp etc. show the correct
// event title / description / image, then redirects real visitors to the app.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://www.teevents.golf";
const DEFAULT_IMAGE = `${SITE}/og-image.png`;
const SITE_NAME = "TeeVents Golf Tournaments";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plain(html: string | null | undefined, max = 200) {
  if (!html) return "";
  const t = String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function absolute(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${SITE}${url}`;
  return null;
}

/** Only allow safe in-app destinations. */
function sanitizePath(raw: string | null): string {
  if (!raw) return "/";
  let p = raw.trim();
  if (/^https?:\/\//i.test(p)) {
    try {
      const u = new URL(p);
      if (!/(^|\.)teevents\.golf$/i.test(u.hostname)) return "/";
      p = u.pathname + u.search;
    } catch {
      return "/";
    }
  }
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.startsWith("//")) return "/";
  if (p.length > 400) return "/";
  if (/[\s<>"']/.test(p)) return "/";
  return p;
}

interface Meta {
  title: string;
  description: string;
  image: string;
}

async function resolveMeta(path: string): Promise<Meta> {
  const fallback: Meta = {
    title: SITE_NAME,
    description:
      "Golf tournament management for registration, payments, live scoring, sponsors, and pairings.",
    image: DEFAULT_IMAGE,
  };

  const segments = path.split("?")[0].split("/").filter(Boolean);
  if (segments.length < 2) return fallback;
  const [kind, slugRaw] = segments;
  const slug = decodeURIComponent(slugRaw);
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(slug)) return fallback;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (kind === "college") {
      const { data } = await admin
        .from("college_tournaments")
        .select("title, description, hero_tagline, hero_image_url, flyer_url")
        .eq("slug", slug)
        .maybeSingle();
      if (data) {
        return {
          title: `${data.title} | TeeVents College Golf`,
          description:
            plain(data.hero_tagline) ||
            plain(data.description) ||
            `${data.title} — college golf tournament details, schedule and registration.`,
          image: absolute(data.hero_image_url) || absolute(data.flyer_url) || DEFAULT_IMAGE,
        };
      }
    }

    if (["t", "tournament", "live", "day-of", "score", "player"].includes(kind)) {
      const { data } = await admin
        .from("tournaments")
        .select(
          "title, date, location, course_name, description, site_hero_image_url, site_logo_url, image_url",
        )
        .or(`custom_slug.eq.${slug},slug.eq.${slug}`)
        .eq("site_published", true)
        .limit(1)
        .maybeSingle();
      if (data) {
        const when = data.date
          ? new Date(`${data.date}T12:00:00Z`).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })
          : "";
        const where = data.location || data.course_name || "";
        const auto = `Join us for ${data.title}${when ? ` on ${when}` : ""}${where ? ` at ${where}` : ""}. Register now!`;
        const prefix = kind === "live" ? "Live Leaderboard — " : "";
        return {
          title: `${prefix}${data.title} | ${SITE_NAME}`,
          description: plain(data.description) || auto,
          image:
            absolute(data.site_hero_image_url) ||
            absolute(data.image_url) ||
            absolute(data.site_logo_url) ||
            DEFAULT_IMAGE,
        };
      }
    }

    if (kind === "sample") {
      const { data } = await admin
        .from("sample_tournaments")
        .select("tournament_name, event_date, location, description, hero_image_url, logo_url")
        .eq("unique_slug", slug)
        .maybeSingle();
      if (data) {
        const prefix = segments[2] === "live" ? "Live Leaderboard — " : segments[2] === "dashboard" ? "Organizer Dashboard — " : "";
        return {
          title: `${prefix}${data.tournament_name} | ${SITE_NAME}`,
          description:
            plain(data.description) ||
            `See ${data.tournament_name} — a live example of a TeeVents tournament page with registration, sponsors, pairings and live scoring.`,
          image: absolute(data.hero_image_url) || absolute(data.logo_url) || DEFAULT_IMAGE,
        };
      }
    }

    if (kind === "lead-magnet") {
      const { data } = await admin
        .from("lead_magnets")
        .select("title, description, cover_image_url")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (data) {
        return {
          title: `${data.title} | TeeVents`,
          description: plain(data.description) || `Download ${data.title} — a free resource from TeeVents.`,
          image: absolute(data.cover_image_url) || DEFAULT_IMAGE,
        };
      }
    }

    if (kind === "league") {
      const { data } = await admin
        .from("golf_leagues")
        .select("league_name, description, tagline, logo_url")
        .eq("league_slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      if (data) {
        return {
          title: `${data.league_name} — Golf League | ${SITE_NAME}`,
          description:
            plain(data.description) ||
            plain(data.tagline) ||
            `${data.league_name} standings, schedule, results and member registration.`,
          image: absolute(data.logo_url) || DEFAULT_IMAGE,
        };
      }
    }

  } catch (err) {
    console.error("share-preview resolve error:", err);
  }

  return fallback;
}

function renderHtml(path: string, meta: Meta) {
  const url = `${SITE}${path}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}" />
<link rel="canonical" href="${esc(url)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${esc(SITE_NAME)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:title" content="${esc(meta.title)}" />
<meta property="og:description" content="${esc(meta.description)}" />
<meta property="og:image" content="${esc(meta.image)}" />
<meta property="og:image:secure_url" content="${esc(meta.image)}" />
<meta property="og:image:alt" content="${esc(meta.title)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(meta.title)}" />
<meta name="twitter:description" content="${esc(meta.description)}" />
<meta name="twitter:image" content="${esc(meta.image)}" />
<meta http-equiv="refresh" content="0;url=${esc(url)}" />
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f2a1d;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
<div>
<h1 style="font-size:20px;margin:0 0 8px;">${esc(meta.title)}</h1>
<p style="opacity:.8;margin:0 0 16px;">Taking you to the event page…</p>
<a href="${esc(url)}" style="color:#F5A623;font-weight:600;">Continue</a>
</div>
<script>window.location.replace(${JSON.stringify(url)});</script>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const reqUrl = new URL(req.url);
  // Supports both ?p=/college/twd and /functions/v1/share-preview/college/twd
  const suffix = reqUrl.pathname.replace(/^.*share-preview/, "");
  const raw = reqUrl.searchParams.get("p") || reqUrl.searchParams.get("u") || suffix;
  const path = sanitizePath(raw);
  const meta = await resolveMeta(path);

  return new Response(renderHtml(path, meta), {
    headers: {
      ...cors,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
