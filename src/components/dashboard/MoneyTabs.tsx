import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Transactions", url: "/dashboard/finances", match: ["/dashboard/finances"] },
  { label: "Payouts", url: "/dashboard/payout-settings", match: ["/dashboard/payout-settings"] },
  { label: "Budget", url: "/dashboard/budget", match: ["/dashboard/budget"] },
  { label: "Upgrades", url: "/dashboard/upgrade", match: ["/dashboard/upgrade", "/dashboard/tournament-payment"] },
  { label: "Reports", url: "/dashboard/finances?tab=reports", match: [] as string[] },
];

export const MONEY_PATHS = ["/dashboard/finances", "/dashboard/payout-settings", "/dashboard/budget", "/dashboard/upgrade", "/dashboard/tournament-payment"];

/** Shared Money tab bar. Navigation only. */
export default function MoneyTabs() {
  const { pathname, search } = useLocation();
  const isReports = pathname === "/dashboard/finances" && new URLSearchParams(search).get("tab") === "reports";
  return (
    <nav aria-label="Money sections" className="mb-6 border-b border-border">
      <ul className="flex flex-wrap gap-1">
        {TABS.map((t) => {
          const active = t.label === "Reports" ? isReports : !isReports && t.match.includes(pathname);
          return (
            <li key={t.label}>
              <a
                href={t.url}
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
      {pathname === "/dashboard/upgrade" && (
        <p className="py-2 text-xs text-muted-foreground">
          Per-Event pricing and current plan: <Link to="/dashboard/tournament-payment" className="underline">Tournament Payments</Link>
        </p>
      )}
    </nav>
  );
}
