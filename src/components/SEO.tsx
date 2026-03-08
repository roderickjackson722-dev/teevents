import { useEffect } from "react";

const BASE_URL = "https://teevents.golf";
const DEFAULT_OG_IMAGE = "https://teevents.golf/og-image.png";
const SITE_NAME = "TeeVents Golf";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
}

const SEO = ({ title, description, path = "", ogImage = DEFAULT_OG_IMAGE }: SEOProps) => {
  const fullTitle = title === "Home" ? `${SITE_NAME} — Tournament Planning & Management` : `${title} | ${SITE_NAME}`;
  const url = `${BASE_URL}${path}`;

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);
  }, [fullTitle, description, url, ogImage]);

  return null;
};

export default SEO;
