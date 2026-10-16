import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Settings", url: "/dashboard/settings", match: ["/dashboard/settings"] },
  { label: "Help", url: "/help", match: [] as string[] },
  { label: "Activity", url: "/dashboard/activity-log", match: ["/dashboard/activity-log"] },
  { label: "Getting Started", url: "/dashboard/getting-started", match: ["/dashboard/getting-started", "/dashboard/toolbox"] },
];

export const HELP_SETTINGS_PATHS = ["/dashboard/settings", "/dashboard/activity-log", "/dashboard/getting-started", "/dashboard/toolbox"];

/** Shared Help & Settings tab bar. Navigation only. */
export default function HelpSettingsTabs() {
  const { pathname, search } = useLocation();
  const tid = new URLSearchParams(search).get("tournament");
  const keep = (url: string) => (url.startsWith("/dashboard") && search ? `${url}${search}` : url);
  return (
    <nav aria-label="Help and Settings sections" className="mb-6 border-b border-border">
      <ul className="flex flex-wrap gap-1">
        {TABS.map((t) => {
          const active = t.match.includes(pathname);
          return (
            <li key={t.label}>
              <a href={keep(t.url)} aria-current={active ? "page" : undefined}
                className={cn("inline-block px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {t.label}
              </a>
            </li>
          );
        })}
      </ul>
      <p className="py-2 text-xs text-muted-foreground">
        {pathname === "/dashboard/settings" && (<>Fee choices: <a href="#fee-settings" className="underline">Payment & Fee Settings</a>. Payouts are managed in <a href={keep("/dashboard/payout-settings")} className="underline">Money → Payouts</a>.</>)}
        {pathname === "/dashboard/activity-log" && <>Every change made by anyone on your team.</>}
        {(pathname === "/dashboard/getting-started" || pathname === "/dashboard/toolbox") && (<>
          <a href={keep("/dashboard/toolbox")} className="underline">Organizer Toolbox</a> · Edit the same event details in <a href={tid ? `/dashboard/tournaments/${tid}/site-builder` : "/dashboard"} className="underline">Setup → Site Builder</a>.
        </>)}
      </p>
    </nav>
  );
}
