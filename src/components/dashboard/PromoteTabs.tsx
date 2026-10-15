import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Share", url: "/dashboard/share-promote", match: ["/dashboard/share-promote"] },
  { label: "Flyers", url: "/dashboard/flyer-studio", match: ["/dashboard/flyer-studio"] },
  { label: "Email", url: "/dashboard/email-templates", match: ["/dashboard/email-templates", "/dashboard/email-log"] },
  { label: "SMS", url: "/dashboard/messages", match: ["/dashboard/messages"] },
  { label: "Public", url: "/dashboard/public-search", match: ["/dashboard/public-search"] },
];

const EMAIL_SUB = [
  { label: "Templates", url: "/dashboard/email-templates" },
  { label: "Log", url: "/dashboard/email-log" },
];

export const PROMOTE_PATHS = TABS.flatMap((t) => t.match);

/** Shared Promote tab bar. Navigation only. */
export default function PromoteTabs() {
  const { pathname } = useLocation();
  const inEmail = pathname === "/dashboard/email-templates" || pathname === "/dashboard/email-log";
  const linkCls = (active: boolean) =>
    cn("inline-block px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
      active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground");
  return (
    <nav aria-label="Promote sections" className="mb-6">
      <ul className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <li key={t.label}>
            <a href={t.url} aria-current={t.match.includes(pathname) ? "page" : undefined} className={linkCls(t.match.includes(pathname))}>
              {t.label}
            </a>
          </li>
        ))}
      </ul>
      {inEmail && (
        <ul aria-label="Email sections" className="mt-2 flex flex-wrap gap-1 border-b border-border">
          {EMAIL_SUB.map((t) => (
            <li key={t.label}>
              <a href={t.url} aria-current={pathname === t.url ? "page" : undefined} className={linkCls(pathname === t.url)}>
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
