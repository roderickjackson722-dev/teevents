import { useState } from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  tournamentId: string;
  tournamentTitle?: string;
  /** If true, show the full banner. If false, show a compact button only. */
  variant?: "banner" | "button";
}

/**
 * UpgradeToProBanner — invites the organizer to upgrade a SPECIFIC tournament
 * to Pro for $399. Per-tournament unlock model.
 */
const UpgradeToProBanner = ({ tournamentId, tournamentTitle, variant = "banner" }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("upgrade-to-pro", {
        body: { tournament_id: tournamentId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not start upgrade checkout");
      setLoading(false);
    }
  };

  if (variant === "button") {
    return (
      <Button onClick={handleUpgrade} disabled={loading} size="sm">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
        Upgrade this tournament to Pro — $399
      </Button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-secondary bg-secondary/5 p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="flex-shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-secondary/20 text-secondary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base md:text-lg font-display font-bold text-foreground">
              Unlock live leaderboard, sponsor portal, auction & raffle, and automatic Stripe payouts.
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upgrade <span className="font-semibold">{tournamentTitle || "this tournament"}</span> to Pro for a one-time <span className="font-semibold">$399</span>. No subscription.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:flex-shrink-0">
          <Button onClick={handleUpgrade} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Upgrade to Pro
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="outline" asChild>
            <Link to="/pricing">Learn More</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeToProBanner;
