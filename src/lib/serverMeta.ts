const SITE = "https://www.teevents.golf";
const DEFAULT_IMAGE = `${SITE}/og-image.png`;

export interface PageMeta { title: string; description: string; image: string; url: string }
const decode = (value: string) => value
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">");
const plain = (value: unknown) => decode(decode(String(value ?? "").replace(/<[^>]+>/g, " "))).replace(/\s+/g, " ").trim();
export const clamp = (value: string, max = 300) => (value.length <= max ? value : `${value.slice(0, max - 1).replace(/\s+\S*$/, "")}…`);
const absolute = (value: unknown) => { const url = String(value ?? ""); return /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? `${SITE}${url}` : DEFAULT_IMAGE; };

async function query(table: string, params: URLSearchParams) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return undefined;
  const response = await fetch(`${base}/rest/v1/${table}?${params}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) return undefined;
  const rows = await response.json() as Record<string, unknown>[];
  return rows[0];
}

export async function getCollegeMeta(slug: string): Promise<PageMeta> {
  const row = await query("college_tournaments", new URLSearchParams({ select: "title,description,hero_tagline,hero_image_url,flyer_url", slug: `eq.${slug}`, status: "eq.active", limit: "1" }));
  const title = plain(row?.title) || "College Golf Tournament";
  return { title: `${title} | TeeVents College Golf`, description: clamp(plain(row?.hero_tagline) || plain(row?.description) || `${title} — college golf tournament details, schedule and registration.`), image: absolute(row?.hero_image_url || row?.flyer_url), url: `${SITE}/college/${slug}` };
}

export interface CollegeHubItem { slug: string; title: string; tagline: string }

export async function getCollegeHubList(): Promise<CollegeHubItem[]> {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return [];
  const params = new URLSearchParams({ select: "slug,title,hero_tagline", status: "eq.active", order: "created_at.desc", limit: "50" });
  const response = await fetch(`${base}/rest/v1/college_tournaments?${params}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) return [];
  const rows = await response.json() as Record<string, unknown>[];
  return rows.filter((row) => row.slug).map((row) => ({ slug: String(row.slug), title: plain(row.title) || "College Golf Tournament", tagline: plain(row.hero_tagline) }));
}

export async function getTournamentMeta(slug: string, route: "t" | "tournament"): Promise<PageMeta> {
  const filter = `or=(custom_slug.eq.${encodeURIComponent(slug)},slug.eq.${encodeURIComponent(slug)})`;
  const params = `select=title,date,location,course_name,description,site_hero_image_url,site_logo_url,image_url&${filter}&site_published=eq.true&limit=1`;
  const base = import.meta.env.VITE_SUPABASE_URL; const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  let row: Record<string, unknown> | undefined;
  if (base && key) { const response = await fetch(`${base}/rest/v1/tournaments?${params}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }); if (response.ok) row = ((await response.json()) as Record<string, unknown>[])[0]; }
  const title = plain(row?.title) || "Golf Tournament";
  const date = row?.date ? new Date(`${row.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
  const where = plain(row?.location || row?.course_name);
  return { title: `${title} | TeeVents Golf Tournaments`, description: plain(row?.description) || `Join us for ${title}${date ? ` on ${date}` : ""}${where ? ` at ${where}` : ""}. Register now!`, image: absolute(row?.site_hero_image_url || row?.image_url || row?.site_logo_url), url: `${SITE}/${route}/${slug}` };
}

/** Player "Team HQ" mobile homepage: /team/{slug} */
export async function getTeamMeta(slug: string): Promise<PageMeta> {
  const filter = `or=(custom_slug.eq.${encodeURIComponent(slug)},slug.eq.${encodeURIComponent(slug)})`;
  const params = `select=title,date,location,course_name,site_hero_image_url,site_logo_url,image_url&${filter}&limit=1`;
  const base = import.meta.env.VITE_SUPABASE_URL; const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  let row: Record<string, unknown> | undefined;
  if (base && key) { const response = await fetch(`${base}/rest/v1/tournaments?${params}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }); if (response.ok) row = ((await response.json()) as Record<string, unknown>[])[0]; }
  const name = plain(row?.title) || "Tournament";
  const date = row?.date ? new Date(`${row.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
  const where = plain(row?.location || row?.course_name);
  return {
    title: `${name} — Team HQ | TeeVents`,
    description: clamp(`Player hub for ${name}${date ? ` on ${date}` : ""}${where ? ` at ${where}` : ""}: your team, starting hole, tee time, live leaderboard and score entry.`),
    image: absolute(row?.site_hero_image_url || row?.image_url || row?.site_logo_url),
    url: `${SITE}/team/${slug}`,
  };
}

export const headFromMeta = (meta: PageMeta | undefined) => {
  if (!meta) return {};
  return ({
  meta: [{ title: meta.title }, { name: "description", content: meta.description }, { property: "og:type", content: "website" }, { property: "og:title", content: meta.title }, { property: "og:description", content: meta.description }, { property: "og:url", content: meta.url }, { property: "og:image", content: meta.image }, { property: "og:image:secure_url", content: meta.image }, { property: "og:image:alt", content: meta.title }, { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:title", content: meta.title }, { name: "twitter:description", content: meta.description }, { name: "twitter:image", content: meta.image }],
  links: [{ rel: "canonical", href: meta.url }],
  });
};