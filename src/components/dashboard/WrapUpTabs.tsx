import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Report", url: "/dashboard/post-event-report" },
  { label: "Survey", url: "/dashboard/surveys" },
];

export const WRAPUP_PATHS = TABS.map((t) => t.url);

/** Shared Wrap-Up tab bar. Navigation only; keeps the current tournament in the link. */
export default function WrapUpTabs() {
  const { pathname, search } = useLocation();
  const tid = new URLSearchParams(search).get("tournament");
  return (
    <nav aria-label="Wrap-Up sections" className="mb-6 border-b border-border">
      <ul className="flex flex-wrap gap-1">
        {TABS.map((t) => {
          const active = pathname === t.url;
          return (
            <li key={t.url}>
              <a
                href={tid ? `${t.url}?tournament=${encodeURIComponent(tid)}` : t.url}
                aria-current={active ? "page" : undefined}
                className={cn("inline-block px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                {t.label}
              </a>
            </li>
          );
        })}
      </ul>
      <p className="py-2 text-xs text-muted-foreground">
        The Report is a read-only summary of Setup, Players, Pairings & Scoring, Fundraising and Money. Shared email design lives in <a href="/dashboard/email-templates" className="underline">Promote → Email Templates</a>.
      </p>
    </nav>
  );
}
