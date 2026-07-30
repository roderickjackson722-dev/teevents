const DOMAIN = "https://www.teevents.golf";
const SHARE_HOST = "https://share.teevents.golf";

/** Strips any host off a path and normalises the leading slash. */
function toPath(path: string): string {
  let p = path.trim();
  if (p.startsWith(DOMAIN)) p = p.slice(DOMAIN.length);
  if (p.startsWith(SHARE_HOST)) p = p.slice(SHARE_HOST.length);
  p = p.replace(/^https?:\/\/[^/]+/, "");
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

/**
 * Builds a crawler-friendly share link.
 *
 * Text messages and social apps only read the static HTML head of the site, so
 * they show the generic TeeVents description for every page. A share.teevents.golf
 * link is rendered server-side with this page's own title, description and image,
 * then instantly forwards real visitors to the normal page.
 *
 * Example: sharePreviewUrl("/college/twd") -> https://share.teevents.golf/college/twd
 */
export function sharePreviewUrl(path: string, ref?: string): string {
  const p = toPath(path);
  const url = `${SHARE_HOST}${p}`;
  if (!ref) return url;
  return `${url}${p.includes("?") ? "&" : "?"}ref=${encodeURIComponent(ref)}`;
}

/** The plain public URL (what visitors see in the address bar). */
export function publicUrl(path: string, ref?: string): string {
  const p = toPath(path);
  const url = `${DOMAIN}${p}`;
  if (!ref) return url;
  return `${url}${p.includes("?") ? "&" : "?"}ref=${encodeURIComponent(ref)}`;
}

/**
 * Social / messaging intents. All of them post the share.teevents.golf URL so the
 * preview card shows the event's own title, description and image.
 */
export function socialShareLinks(path: string, text: string) {
  const fb = sharePreviewUrl(path, "facebook");
  const tw = sharePreviewUrl(path, "twitter");
  const li = sharePreviewUrl(path, "linkedin");
  const em = sharePreviewUrl(path, "email");
  const wa = sharePreviewUrl(path, "whatsapp");
  const sms = sharePreviewUrl(path, "sms");
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fb)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(tw)}&text=${encodeURIComponent(text)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(li)}`,
    email: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n\n${em}`)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}: ${wa}`)}`,
    sms: `sms:?&body=${encodeURIComponent(`${text}: ${sms}`)}`,
  };
}
