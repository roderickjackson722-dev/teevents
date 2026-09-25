import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import EnterpriseDemo, { type EnterpriseDemoConfig } from "@/components/pricing/EnterpriseDemo";
import EnterpriseInquiryDialog from "@/components/pricing/EnterpriseInquiryDialog";
import { Check } from "lucide-react";

const INCLUDED = [
  "Unlimited tournaments and leagues",
  "Live Leaderboard + Mobile Scoring on every event",
  "Branded course page for your club",
  "0% transaction fees",
  "Multiple staff logins with roles",
  "Priority support",
];

const EnterpriseDemoPage = () => {
  const { slug } = useParams();
  const [config, setConfig] = useState<EnterpriseDemoConfig | null>(slug ? null : {});
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase.rpc("get_enterprise_demo" as any, { _slug: slug }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setConfig(row as EnterpriseDemoConfig);
      else { setMissing(true); setConfig({}); }
    });
  }, [slug]);

  useEffect(() => { document.title = "Enterprise Demo — Live Leaderboard & Mobile Scoring | TeeVents"; }, []);

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-primary py-12 px-4 text-center" style={config?.primary_color ? { backgroundColor: config.primary_color } : undefined}>
        <p className="text-secondary text-xs font-bold uppercase tracking-widest">TeeVents Enterprise · $2,500/year</p>
        <h1 className="mt-2 font-display text-3xl md:text-5xl font-bold text-primary-foreground">
          {config?.club_name ? `Built for ${config.club_name}` : "See what your club gets with Enterprise"}
        </h1>
        <p className="mt-3 text-primary-foreground/80 max-w-2xl mx-auto">
          Your own branded course page, a live leaderboard, and mobile scoring from any phone — try it below.
        </p>
        {missing && <p className="mt-2 text-sm text-secondary">This demo link wasn't found, so we're showing our sample club.</p>}
      </section>
      <div className="px-4 pb-12">
        {config ? <EnterpriseDemo key={JSON.stringify(config)} config={config} /> : <p className="text-center py-20 text-muted-foreground">Loading demo…</p>}
        <div className="max-w-5xl mx-auto mt-10 grid md:grid-cols-2 gap-8 items-center">
          <ul className="space-y-2">
            {INCLUDED.map((i) => <li key={i} className="flex gap-2 text-foreground"><Check className="h-5 w-5 text-secondary" />{i}</li>)}
          </ul>
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="font-display text-2xl font-bold text-foreground">Ready for your club?</p>
            <p className="text-sm text-muted-foreground mb-4">Run 10 events and it pays for itself.</p>
            <EnterpriseInquiryDialog>
              <button className="w-full rounded-md bg-secondary py-3 text-sm font-semibold text-secondary-foreground">Request Enterprise</button>
            </EnterpriseInquiryDialog>
            <Link to="/plans" className="mt-3 inline-block text-xs text-muted-foreground underline">See all plans</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseDemoPage;
