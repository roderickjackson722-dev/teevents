import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Flag, Trophy } from "lucide-react";
import LeagueSkinsTab from "@/components/leagues/LeagueSkinsTab";
import LeaguePayoutsTab from "@/components/leagues/LeaguePayoutsTab";
import LeagueStandingsTab from "@/components/leagues/LeagueStandingsTab";

export default function LeagueScoringPayoutsTab({ leagueId }: { leagueId: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" /> Season-Long Scoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Set the points system and review cumulative standings for the season. Per-event scoring formats are
            configured on each event in the Events tab.
          </p>
          <LeagueStandingsTab leagueId={leagueId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5 text-primary" /> Skins per Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeagueSkinsTab leagueId={leagueId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flag className="h-5 w-5 text-primary" /> Flights &amp; Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeaguePayoutsTab leagueId={leagueId} />
        </CardContent>
      </Card>
    </div>
  );
}
