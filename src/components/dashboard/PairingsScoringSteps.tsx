import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Format", url: "/dashboard/scoring-payouts", match: (p: string, s: string) => p === "/dashboard/scoring-payouts" && !s.includes("section=flights") },
  { label: "Flights", url: "/dashboard/scoring-payouts?section=flights", match: (p: string, s: string) => p === "/dashboard/scoring-payouts" && s.includes("section=flights") },
  { label: "Pairings", url: "/dashboard/players?tab=pairings", match: (p: string, s: string) => p === "/dashboard/players" && s.includes("tab=pairings") },
  { label: "Leaderboard", url: "/dashboard/leaderboard", match: (p: string, s: string) => (p === "/dashboard/leaderboard" || p === "/dashboard/stress-test") && !s.includes("view=scoring") },
  { label: "Score Entry", url: "/dashboard/leaderboard?view=scoring", match: (p: string, s: string) => p === "/dashboard/leaderboard" && s.includes("view=scoring") },
];

/** Numbered step bar tying the Pairings & Scoring screens into one flow. Navigation only. */
export default function PairingsScoringSteps() {
  const { pathname, search } = useLocation();
  return (
    <nav aria-label="Pairings & Scoring steps" className="mb-6 border-b border-border">
      <ol className="flex flex-wrap gap-1">
        {STEPS.map((s, i) => {
          const active = s.match(pathname, search);
          return (
            <li key={s.label}>
              <Link
                to={s.url}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-xs", active ? "bg-primary text-primary-foreground" : "bg-muted")}>{i + 1}</span>
                {s.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
