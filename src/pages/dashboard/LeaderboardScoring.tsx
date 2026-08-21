import { useSearchParams, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, PenLine } from "lucide-react";
import Leaderboard from "./Leaderboard";
import Scoring from "./Scoring";

/**
 * Merged "Leaderboard & Live Scoring" workspace. Score entry and the live
 * leaderboard both drive the same public leaderboard, so they live together
 * behind two tabs (?view=leaderboard | ?view=scoring).
 */
const LeaderboardScoring = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const param = searchParams.get("view");
  const view =
    param === "scoring" || (!param && location.pathname.endsWith("/scoring"))
      ? "scoring"
      : "leaderboard";

  const setView = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v === "leaderboard") next.delete("view");
    else next.set("view", v);
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Leaderboard &amp; Live Scoring
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enter scores and manage everything that appears on your live leaderboard.
        </p>
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList className="mb-6">
          <TabsTrigger value="leaderboard" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Live Leaderboard Settings
          </TabsTrigger>
          <TabsTrigger value="scoring" className="gap-2">
            <PenLine className="h-4 w-4" /> Score Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-6">
          <Leaderboard mode="settings" />
          <Scoring embedded />
        </TabsContent>
        <TabsContent value="scoring">
          <Leaderboard mode="entry" />
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default LeaderboardScoring;
