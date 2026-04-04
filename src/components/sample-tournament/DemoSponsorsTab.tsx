import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sampleSponsors } from "./sampleData";

const levelColors: Record<string, string> = {
  Platinum: "bg-primary/10 text-primary border-primary/30",
  Gold: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  Silver: "bg-muted text-muted-foreground border-border",
  Bronze: "bg-orange-500/10 text-orange-700 border-orange-500/30",
};

const DemoSponsorsTab = () => (
  <div className="space-y-6">
    <p className="text-muted-foreground text-sm">
      Sponsors are showcased on the tournament website, leaderboard, and printed materials.
    </p>

    <div className="grid sm:grid-cols-2 gap-4">
      {sampleSponsors.map((s) => (
        <Card key={s.name} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <div className="bg-muted/30 p-6 flex items-center justify-center min-h-[120px]">
              <img src={s.logo} alt={s.name} className="max-h-20 object-contain" />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{s.name}</p>
                <Badge variant="outline" className={`mt-1 text-xs ${levelColors[s.level] ?? ""}`}>
                  {s.level}
                </Badge>
              </div>
              <a
                href={s.website}
                onClick={(e) => e.preventDefault()}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default DemoSponsorsTab;
