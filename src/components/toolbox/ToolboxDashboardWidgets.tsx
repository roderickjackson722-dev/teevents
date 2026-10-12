import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Package, ArrowRight, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import OnboardingChecklist from "@/components/toolbox/OnboardingChecklist";
import { itemCount, loadToolbox, type Toolbox } from "@/lib/organizerToolbox";

// Accounts created before the toolbox launched never see the one-time welcome
// screen or the "rep will contact you" banner, so current organizers are unaffected.
const LAUNCH = "2026-10-12T00:00:00Z";

export default function ToolboxDashboardWidgets({ orgId, hasTournament }: { orgId: string; hasTournament: boolean }) {
  const [tb, setTb] = useState<Toolbox | null | undefined>(undefined);
  const [isNewOrg, setIsNewOrg] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ctx = (() => {
    const keep = new URLSearchParams();
    for (const k of ["admin_org", "sample_org", "tournament_id"]) { const v = searchParams.get(k); if (v) keep.set(k, v); }
    const s = keep.toString(); return s ? `?${s}` : "";
  })();

  useEffect(() => {
    (async () => {
      const [t, { data: o }] = await Promise.all([
        loadToolbox(orgId),
        supabase.from("organizations").select("created_at").eq("id", orgId).maybeSingle(),
      ]);
      setTb(t);
      setIsNewOrg(!!o?.created_at && o.created_at >= LAUNCH);
    })();
  }, [orgId]);

  // One-time welcome screen after the first event exists.
  useEffect(() => {
    if (tb === undefined || !isNewOrg || !hasTournament) return;
    if (searchParams.get("admin_org") || searchParams.get("sample_org") || searchParams.get("sample")) return;
    if (!tb?.onboarding_seen_at) navigate(`/dashboard/getting-started${ctx}`, { replace: true });
  }, [tb, isNewOrg, hasTournament]); // eslint-disable-line react-hooks/exhaustive-deps

  const empty = tb !== undefined && itemCount(tb ?? null) === 0;

  return <>
    {isNewOrg && tb && (tb as any).onboarding_completed_at && <OnboardingChecklist orgId={orgId} tb={tb} ctx={ctx} />}
    {isNewOrg && empty && <div className="mb-6 flex flex-col gap-4 rounded-lg border-2 border-secondary bg-secondary/10 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-relaxed text-foreground md:text-base">Your rep will contact you within 1 business day. In the meantime, upload your event assets to the Organizer Toolbox so your rep can start building right away.</p>
      <Button asChild variant="secondary" className="shrink-0 font-semibold"><Link to={`/dashboard/toolbox${ctx}`}>Go to Organizer Toolbox <ArrowRight className="h-4 w-4" /></Link></Button>
    </div>}
    <div className="mb-8 grid gap-4 sm:grid-cols-2">
      <Link to={`/dashboard/toolbox${ctx}`} className="group flex items-center gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-secondary">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-secondary"><Package className="h-6 w-6" /></span>
        <span><span className="block font-display text-lg font-bold text-primary">Organizer Toolbox</span><span className="text-sm text-muted-foreground">Upload logos, images, and event assets.</span></span>
        <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground group-hover:text-primary" />
      </Link>
      <Link to={`/dashboard/getting-started${ctx}`} className="group flex items-center gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-secondary">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-secondary"><Rocket className="h-6 w-6" /></span>
        <span><span className="block font-display text-lg font-bold text-primary">Getting Started</span><span className="text-sm text-muted-foreground">See what happens next and what you can do now.</span></span>
        <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground group-hover:text-primary" />
      </Link>
    </div>
  </>;
}
