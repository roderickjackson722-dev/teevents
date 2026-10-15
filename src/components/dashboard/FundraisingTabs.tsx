import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Sponsors", url: "/dashboard/sponsors", keywords: "sponsor page link qr public display logo size form fields tiers registrations assets deliverables" },
  { label: "Vendors", url: "/dashboard/vendors", keywords: "vendor packages form builder booth locations check-in" },
  { label: "Donations", url: "/dashboard/donations", keywords: "donation total raised offline online donors goal" },
  { label: "Auctions", url: "/dashboard/auctions", keywords: "auction item bid buy now" },
  { label: "Raffles", url: "/dashboard/raffles", keywords: "raffle tickets draw" },
  { label: "Day-of Sales", url: "/dashboard/event-day-sales", keywords: "event day sales items qr sheet mulligans" },
  { label: "Products", url: "/dashboard/store", keywords: "products store templates listings" },
  { label: "Tools", url: "/dashboard/sponsorship-tools", keywords: "branding removal digital sponsor outreach email template asset kit qr" },
];

export const FUNDRAISING_PATHS = TABS.map((t) => t.url);

/** Shared tab bar and search for the Fundraising screens. Navigation only. */
export default function FundraisingTabs() {
  const { pathname } = useLocation();
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return TABS.filter((t) => `${t.label} ${t.keywords}`.toLowerCase().includes(s));
  }, [q]);

  return (
    <div className="mb-6 space-y-3">
      <nav aria-label="Fundraising sections" className="border-b border-border">
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
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Fundraising (sponsors, booths, raffles...)"
          className="pl-9"
          aria-label="Search Fundraising"
        />
        {q.trim() && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md">
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>
            ) : (
              matches.map((m) => (
                <Link key={m.url} to={m.url} onClick={() => setQ("")} className="block rounded px-3 py-2 text-sm hover:bg-muted">
                  {m.label}
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
