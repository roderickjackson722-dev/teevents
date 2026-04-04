import { CalendarRange, MapPin, Users, DollarSign, Trophy, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { sampleTournament } from "./sampleData";

const DemoOverviewTab = () => {
  const fillPercent = Math.round(
    (sampleTournament.current_registrations / sampleTournament.max_players) * 100
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-primary/80 p-8 md:p-12 text-primary-foreground">
        <div className="relative z-10">
          <Badge variant="secondary" className="mb-3">
            <Trophy className="h-3 w-3 mr-1" /> Charity Tournament
          </Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">
            {sampleTournament.name}
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-2xl">
            {sampleTournament.description}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <CalendarRange className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-bold text-foreground">{sampleTournament.date}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-bold text-foreground text-xs">Pebble Beach, CA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <p className="text-sm text-muted-foreground">Entry Fee</p>
            <p className="font-bold text-foreground">${sampleTournament.registration_fee}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <p className="text-sm text-muted-foreground">Registered</p>
            <p className="font-bold text-foreground">
              {sampleTournament.current_registrations}/{sampleTournament.max_players}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Registration Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-secondary" />
            Registration Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {sampleTournament.current_registrations} of {sampleTournament.max_players} spots filled
              </span>
              <span className="font-semibold text-foreground">{fillPercent}%</span>
            </div>
            <Progress value={fillPercent} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {sampleTournament.max_players - sampleTournament.current_registrations} spots remaining
              &nbsp;·&nbsp; Registration closes June 10, 2026
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Event Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event Day Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {[
              { time: "7:00 AM", event: "Registration & Breakfast" },
              { time: "8:30 AM", event: "Shotgun Start" },
              { time: "12:00 PM", event: "Lunch at the Turn" },
              { time: "2:00 PM", event: "Last Group Finishes" },
              { time: "3:00 PM", event: "Cocktail Hour & Silent Auction" },
              { time: "5:00 PM", event: "Awards Dinner" },
            ].map((item) => (
              <div key={item.time} className="flex gap-4 items-center">
                <span className="font-mono font-semibold text-secondary w-20">{item.time}</span>
                <span className="text-foreground">{item.event}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoOverviewTab;
