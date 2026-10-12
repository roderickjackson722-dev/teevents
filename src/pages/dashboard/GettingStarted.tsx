import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Package, Hammer, UserRoundCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";

const steps = [
  { title: "Tell Us About Your Event", items: ["Complete your event details (date, course, format, registration fees).", "Add your event name and description.", "Set your registration open and close dates."] },
  { title: "Upload Your Assets to the Organizer Toolbox", items: ["Add your logo", "Add your brand colors", "Upload any images you want on your event page", "Upload your sponsor logos", "Upload any documents (waivers, rules, course info)"] },
  { title: "Start Building (Optional)", items: ["Build your event page using the site builder", "Set up your registration form", "Configure your scoring format and pairings", "Or just wait for your rep to do it with you"] },
];

export default function GettingStarted() {
  const { org } = useOrgContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tournamentId, setTournamentId] = useState<string | null>(null);

  const ctx = (() => {
    const keep = new URLSearchParams();
    for (const k of ["admin_org", "sample_org", "tournament_id"]) { const v = searchParams.get(k); if (v) keep.set(k, v); }
    const s = keep.toString(); return s ? `?${s}` : "";
  })();

  useEffect(() => {
    if (!org) return;
    (async () => {
      const { data } = await supabase.from("tournaments").select("id").eq("organization_id", org.orgId).order("created_at", { ascending: false }).limit(1);
      setTournamentId(searchParams.get("tournament_id") || data?.[0]?.id || null);
      // Remember that this organizer has seen the welcome screen (skip when an admin is viewing).
      if (searchParams.get("admin_org")) return;
      const { data: tb } = await (supabase as any).from("organizer_toolboxes").select("id, onboarding_seen_at").eq("organization_id", org.orgId).maybeSingle();
      if (tb?.onboarding_seen_at) return;
      const now = new Date().toISOString();
      if (tb) await (supabase as any).from("organizer_toolboxes").update({ onboarding_seen_at: now }).eq("id", tb.id);
      else await (supabase as any).from("organizer_toolboxes").insert({ organization_id: org.orgId, user_id: org.userId, onboarding_seen_at: now });
    })();
  }, [org, searchParams]);

  return <div className="mx-auto max-w-3xl pb-12">
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="bg-primary px-6 py-8 text-center text-primary-foreground md:px-10">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Welcome to TeeVents!</h1>
        <p className="mt-2 text-lg text-primary-foreground/85">You're all set. Here's what happens next.</p>
      </div>
      <div className="space-y-6 p-6 md:p-10">
        <div className="flex gap-4 rounded-lg border-l-4 border-secondary bg-secondary/10 p-5">
          <UserRoundCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-3 text-sm leading-relaxed text-foreground md:text-base">
            <p>Thank you for signing up. A dedicated TeeVents rep will contact you within 1 business day to help build your event page, set up registration, and configure your leaderboard.</p>
            <p>In the meantime, you can start setting things up yourself. Anything you build will be reviewed and refined by your rep before your event goes live.</p>
          </div>
        </div>

        <ol className="space-y-5">
          {steps.map((s, i) => <li key={s.title} className="rounded-lg border border-border p-5">
            <h2 className="flex items-center gap-3 font-display text-lg font-bold text-primary">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm text-primary">{i + 1}</span>
              Step {i + 1}: {s.title}
            </h2>
            <ul className="mt-3 space-y-2 pl-11">
              {s.items.map(item => <li key={item} className="flex gap-2 text-sm text-muted-foreground md:text-base"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}
            </ul>
          </li>)}
        </ol>

        <p className="border-t border-border pt-6 text-center text-sm leading-relaxed text-muted-foreground md:text-base">You are never on your own. Your dedicated TeeVents rep will reach out within 1 business day. In the meantime, the Organizer Toolbox is where you upload everything you want on your site.</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="secondary" size="lg" className="font-semibold" onClick={() => navigate(`/dashboard/toolbox${ctx}`)}><Package className="h-4 w-4" /> Go to Organizer Toolbox</Button>
          <Button variant="outline" size="lg" className="border-primary font-semibold text-primary" onClick={() => navigate(tournamentId ? `/dashboard/tournaments/${tournamentId}/site-builder${ctx}` : `/dashboard/tournaments${ctx}`)}><Hammer className="h-4 w-4" /> Start Building My Event</Button>
        </div>
        <div className="text-center">
          <button type="button" onClick={() => navigate(`/dashboard${ctx}`)} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary">I'll wait for my rep to contact me</button>
        </div>
      </div>
    </div>
  </div>;
}
