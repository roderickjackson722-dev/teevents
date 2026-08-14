import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import PublicLeague from "./PublicLeague";
import NotFound from "./NotFound";

// Reserved top-level paths that must never be treated as a league slug.
const RESERVED = new Set([
  "about","services","platform","events","reviews","contact","login","admin","admin-login",
  "setup-admin","get-started","onboarding","payment-success","dashboard","league","leagues",
  "day-of","trips","pricing","plans","golf-leagues","sample","demo","help","features","faq",
  "privacy","terms","unsubscribe","claim","book","scan","score","survey","refund","flyer",
  "compare","nonprofits","sales","enterprise-pricing","oauth","confirm-bank-change",
  "confirm-payout-change","force-password-change","reset-password","accept-invitation",
  "golf-tournament-software","charity-golf-tournament-planning","golf-fundraiser-management",
  "what-is-a-scramble","charity-golf-tournament-guide","golf-tournament-formats","custom-golf-tournament-website",
  "golf-tournament-sponsor-management","live-scoring-golf-tournaments","eventbrite-vs-golf-tournament-software",
  "golfstatus-vs-golf-genius","what-is-a-shotgun-start","golf-tournament-software-pricing",
  "eventbrite-for-golf-tournaments","golf-tournament-registration-platform","best-golf-tournament-management-software","online-golf-tournament-registration","golfstatus-alternatives","golf-genius-alternatives","perfect-golf-event-reviews","rsvpify-for-golf-tournaments","golf-tournament-pairings-management","golf-tournament-handicap-system","golf-tournament-sponsor-packages","golf-tournament-live-scoring","golf-tournament-website-builder","golf-tournament-website-design","branded-golf-event-page","golf-tournament-page-customization",
]);

export default function SlugResolver() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<"loading" | "league" | "notfound">("loading");

  useEffect(() => {
    if (!slug || RESERVED.has(slug.toLowerCase())) {
      setState("notfound");
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("golf_leagues")
        .select("id")
        .eq("league_slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      setState(data ? "league" : "notfound");
    })();
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (state === "league") return <PublicLeague />;
  return <NotFound />;
}
