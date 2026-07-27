import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flag } from "lucide-react";
import { SCORING_FORMATS } from "@/lib/scoringFormats";

const METHOD_LABEL: Record<string, string> = {
  half: "Split in Half (2 flights)",
  thirds: "Split in Thirds (3 flights)",
  quarters: "Split in Quarters (4 flights)",
  custom: "Custom flights",
};

export default function ScoringPayoutsWidget({ tournamentId }: { tournamentId: string }) {
  const [data, setData] = useState<any>(null);
  const [purseCents, setPurseCents] = useState(0);

  useEffect(() => {
    (async () => {
      const [tRes, pRes] = await Promise.all([
        supabase
          .from("tournaments")
          .select("scoring_format, skins_enabled, skins_mode, flights_enabled, flight_method")
          .eq("id", tournamentId)
          .maybeSingle(),
        supabase
          .from("flight_payouts")
          .select("purse_cents")
          .eq("tournament_id", tournamentId),
      ]);
      setData(tRes.data);
      setPurseCents(((pRes.data as any[]) || []).reduce((s, r) => s + (r.purse_cents || 0), 0));
    })();
  }, [tournamentId]);

  if (!data) return null;

  const fmt = SCORING_FORMATS.find((f) => f.id === data.scoring_format);
  const formatLabel = fmt?.name || data.scoring_format || "Not set";

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flag className="h-5 w-5 text-primary" /> Scoring &amp; Payouts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p><span className="text-muted-foreground">Format:</span> <span className="font-medium">{formatLabel}</span></p>
        <p>
          <span className="text-muted-foreground">Skins:</span>{" "}
          <span className="font-medium">
            {data.skins_enabled ? `Enabled (${String(data.skins_mode || "gross").replace(/^\w/, (c: string) => c.toUpperCase())})` : "Off"}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Flights:</span>{" "}
          <span className="font-medium">{data.flights_enabled ? (METHOD_LABEL[data.flight_method] || data.flight_method) : "Off"}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Total Purse:</span>{" "}
          <span className="font-medium">${(purseCents / 100).toLocaleString()}</span>
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to={`/dashboard/scoring-payouts?tournament_id=${tournamentId}`}>
            Edit Scoring &amp; Payouts <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
