import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Flag } from "lucide-react";
import LeagueSkinsTab from "@/components/leagues/LeagueSkinsTab";
import LeaguePayoutsTab from "@/components/leagues/LeaguePayoutsTab";

export default function LeagueScoringPayoutsTab({ leagueId }: { leagueId: string }) {
  return (
    <div className="space-y-6">
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
          <LeaguePayoutsTab leagueId={leagueId} showRecentCharges={false} />
        </CardContent>
      </Card>
    </div>
  );
}
