import { useState, useEffect } from "react";
import { Trophy, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sampleLeaderboard } from "./sampleData";

const DemoLeaderboardTab = () => {
  const [board, setBoard] = useState(sampleLeaderboard);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate real-time score updates every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setBoard((prev) => {
        const copy = [...prev];
        const idx = Math.floor(Math.random() * copy.length);
        const change = Math.random() > 0.5 ? -1 : 1;
        copy[idx] = { ...copy[idx], score: copy[idx].score + change };
        // re-sort
        copy.sort((a, b) => a.score - b.score);
        return copy.map((t, i) => ({ ...t, position: i + 1 }));
      });
      setLastUpdate(new Date());
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const formatScore = (s: number) => (s === 0 ? "E" : s > 0 ? `+${s}` : `${s}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-secondary animate-pulse" />
          <span className="text-xs text-muted-foreground">
            Live — updated {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
        <Badge variant="outline" className="text-xs">Simulated Updates</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-secondary" />
            Live Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-semibold text-muted-foreground w-12">Pos</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Team</th>
                  <th className="text-center p-3 font-semibold text-muted-foreground">Score</th>
                  <th className="text-center p-3 font-semibold text-muted-foreground">Thru</th>
                </tr>
              </thead>
              <tbody>
                {board.map((team) => (
                  <tr
                    key={team.name}
                    className={`border-b border-border/50 transition-colors ${
                      team.position <= 3 ? "bg-secondary/5" : ""
                    }`}
                  >
                    <td className="p-3">
                      {team.position <= 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                          {team.position}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-mono pl-1.5">{team.position}</span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-foreground">{team.name}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`font-bold font-mono ${
                          team.score < 0
                            ? "text-green-600"
                            : team.score > 0
                            ? "text-red-500"
                            : "text-foreground"
                        }`}
                      >
                        {formatScore(team.score)}
                      </span>
                    </td>
                    <td className="p-3 text-center text-muted-foreground">{team.thru}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoLeaderboardTab;
