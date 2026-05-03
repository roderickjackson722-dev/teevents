import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Loader2, Sparkles, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOrgContext } from "@/hooks/useOrgContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TournamentRow {
  id: string;
  title: string;
  date: string | null;
  is_pro: boolean;
}

const proHighlights = [
  "Unlimited players",
  "Live leaderboard + live scoring",
  "Sponsor portal & sponsor sign-up page",
  "Silent auction, 50/50 raffle, donation page",
  "Add-on store (mulligans, merch, dinner)",
  "Volunteer management with QR check-in",
  "Email + SMS broadcasts",
  "Custom domain & Flyer Studio",
  "Advanced auto-pairings + budget tracking",
  "Up to 5 team members",
  "Automatic Stripe Connect payouts",
  "Priority support",
];

const UpgradePlan = () => {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, date, is_pro")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTournaments((data as TournamentRow[]) || []));
  }, [org]);

  const handleUpgrade = async (tournamentId: string) => {
    setLoadingId(tournamentId);
    try {
      const { data, error } = await supabase.functions.invoke("upgrade-to-pro", {
        body: { tournament_id: tournamentId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Could not start checkout");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Upgrade to Pro</h1>
        <p className="text-muted-foreground mt-1">
          Pro is a one-time <span className="font-semibold">$399 unlock per tournament</span>. No subscription, no monthly fees.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        {/* What you get */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-display font-bold text-foreground">What's in Pro</h2>
          </div>
          <ul className="space-y-2.5">
            {proHighlights.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Enterprise */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-6 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">Running 5+ tournaments / year?</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4 flex-1">
            Enterprise gives you unlimited tournaments, white-label, dedicated account manager, custom integrations, and SLA — at a custom rate.
          </p>
          <Button asChild variant="outline" className="self-start">
            <Link to="/enterprise-pricing">
              Contact Enterprise Sales <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Per-tournament list */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-display font-bold text-foreground">Your tournaments</h2>
          <p className="text-sm text-muted-foreground">Upgrade individual tournaments to unlock Pro features.</p>
        </div>
        {tournaments.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground italic">
            No tournaments yet. Create one first, then come back to upgrade it.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {tournaments.map((t) => (
              <li key={t.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.date || "No date set"}</p>
                </div>
                {t.is_pro ? (
                  <span className="inline-flex items-center gap-1 bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                    <Check className="h-3.5 w-3.5" /> Pro Unlocked
                  </span>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(t.id)}
                    disabled={loadingId === t.id}
                    size="sm"
                  >
                    {loadingId === t.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Upgrade — $399
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UpgradePlan;
