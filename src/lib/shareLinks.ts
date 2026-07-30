const DOMAIN = "https://www.teevents.golf";

/**
 * Builds a crawler-friendly share link.
 *
 * Text messages and social apps only read the static HTML head of the site, so
 * they show the generic TeeVents description for every page. A /share/... link
 * is rendered server-side with this page's own title, description and image,
 * then instantly forwards real visitors to the normal page.
 *
 * Example: sharePreviewUrl("/college/twd") -> https://share.teevents.golf/college/twd
 */
export function sharePreviewUrl(path: string): string {
  let p = path.trim();
  if (p.startsWith(DOMAIN)) p = p.slice(DOMAIN.length);
  p = p.replace(/^https?:\/\/[^/]+/, "");
  if (!p.startsWith("/")) p = `/${p}`;
  return `https://share.teevents.golf${p}`;
}
