import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "@/pages/Index";
import PublicTournament from "@/pages/PublicTournament";
import { Loader2 } from "lucide-react";

const PLATFORM_HOSTS = [
  "localhost",
  "teevents.lovable.app",
  "teevents.golf",
  "www.teevents.golf",
];

const CustomDomainRouter = () => {
  const [state, setState] = useState<"loading" | "platform" | "tournament">("loading");
  const [tournamentSlug, setTournamentSlug] = useState<string | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;

    // Check if this is the platform itself (marketing site)
    if (
      PLATFORM_HOSTS.some((h) => hostname === h || hostname.endsWith(".lovable.app"))
    ) {
      setState("platform");
      return;
    }

    // Otherwise, look up a tournament by custom_domain
    const cleanHost = hostname.replace(/^www\./, "");

    supabase
      .from("tournaments")
      .select("slug")
      .or(`custom_domain.eq.${cleanHost},custom_domain.eq.www.${cleanHost}`)
      .eq("site_published", true)
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (data?.slug) {
          setTournamentSlug(data.slug);
          setState("tournament");
        } else {
          // No matching tournament — show platform homepage
          setState("platform");
        }
      });
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === "tournament" && tournamentSlug) {
    return <PublicTournament slugOverride={tournamentSlug} />;
  }

  return <Index />;
};

export default CustomDomainRouter;
