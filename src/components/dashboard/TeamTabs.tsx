import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { withDashboardContext } from "@/lib/dashboardContext";

const TABS = [
  { label: "Members", url: "/dashboard/team" },
  { label: "Performance", url: "/dashboard/team-performance" },
  { label: "Volunteers", url: "/dashboard/volunteers" },
  { label: "Team HQ", url: "/dashboard/team-hq" },
  { label: "CRM", url: "/dashboard/crm" },
];

export const TEAM_PATHS = TABS.map((t) => t.url);

/** Shared Team tab bar. Navigation only; keeps the current tournament in the link. */
export default function TeamTabs() {
  const { pathname, search } = useLocation();
  return (
    <nav aria-label="Team sections" className="mb-6 border-b border-border">
      <ul className="flex flex-wrap gap-1">
        {TABS.map((t) => {
          const active = pathname === t.url;
          return (
            <li key={t.url}>
              <a
                href={withDashboardContext(t.url, search)}
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
    </nav>
  );
}
