import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Roster", url: "/dashboard/players" },
  { label: "Registration", url: "/dashboard/registration" },
  { label: "Check-in", url: "/dashboard/check-in" },
  { label: "Waitlist", url: "/dashboard/waitlist" },
  { label: "Printables", url: "/dashboard/printables" },
];

/** Shared tab bar that ties the Players screens together. Navigation only. */
export default function PlayersTabs() {
  const { pathname, search } = useLocation();
  if (pathname === "/dashboard/players" && search.includes("tab=pairings")) return null;
  return (
    <nav aria-label="Players sections" className="mb-6 border-b border-border">
      <ul className="flex flex-wrap gap-1">
        {TABS.map((t) => {
          const active = pathname === t.url;
          return (
            <li key={t.url}>
              <Link
                to={t.url}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
