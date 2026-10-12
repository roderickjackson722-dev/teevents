import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Toolbox } from "@/lib/organizerToolbox";

/** Persistent "Getting Started" list shown after onboarding until every item is done. */
export default function OnboardingChecklist({ orgId, tb, ctx }: { orgId: string; tb: Toolbox; ctx: string }) {
  const [state, setState] = useState<{ details: boolean; reg: boolean; scoring: boolean; pairings: boolean; published: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("tournaments").select("id, date, course_name, scoring_format, site_published").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!t) { setState({ details: false, reg: false, scoring: false, pairings: false, published: false }); return; }
      const [tiers, groups] = await Promise.all([
        supabase.from("tournament_registration_tiers").select("id", { count: "exact", head: true }).eq("tournament_id", t.id),
        supabase.from("registration_groups").select("id", { count: "exact", head: true }).eq("tournament_id", t.id),
      ]);
      setState({ details: !!(t.date && t.course_name), reg: (tiers.count || 0) > 0, scoring: !!t.scoring_format, pairings: (groups.count || 0) > 0, published: !!t.site_published });
    })();
  }, [orgId]);

  if (!state) return null;
  const c = tb.brand_colors || {};
  const items: [string, boolean, string][] = [
    ["Complete event details", state.details, "/dashboard/tournaments"],
    ["Upload logo and brand colors", !!tb.logo && !!(c.primary || c.secondary || c.accent), "/dashboard/toolbox"],
    ["Upload sponsor logos (optional)", tb.sponsor_logos?.length > 0, "/dashboard/toolbox"],
    ["Set up registration form", state.reg, "/dashboard/registration"],
    ["Configure scoring format", state.scoring, "/dashboard/scoring-payouts"],
    ["Set up pairings", state.pairings, "/dashboard/players"],
    ["Review and publish event page", state.published, "/dashboard/public-page-editor"],
  ];
  const done = items.filter(i => i[1]).length;
  if (done === items.length) return null;

  return <section className="mb-6 rounded-lg border-2 border-secondary bg-card p-5" aria-labelledby="getting-started-list">
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id="getting-started-list" className="font-display text-lg font-bold text-primary">Getting Started</h2>
      <span className="text-sm text-muted-foreground">{done} of {items.length} complete</span>
    </div>
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map(([label, ok, url]) => <li key={label}>
        <Link to={`${url}${ctx}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
          {ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-golf-green" aria-label="Done" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-label="To do" />}
          <span className={ok ? "text-muted-foreground line-through" : "font-medium text-foreground"}>{label}</span>
        </Link>
      </li>)}
    </ul>
  </section>;
}
