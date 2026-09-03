import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Calendar, FileText, GraduationCap, Link2, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CollegeTournamentHub from "@/components/admin/CollegeTournamentHub";
import CollegeScoringSettings from "@/pages/admin/CollegeScoringSettings";
import ClippdIntegration from "@/pages/admin/rfp/ClippdIntegration";

/**
 * Admin → College Hub: one place that combines college event management, the
 * College Golf Scoring add-on controls, and the Scoreboard/Clippd integration.
 */
export default function AdminCollegeHub() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "events");

  const change = (value: string) => {
    setTab(value);
    const next = new URLSearchParams(params);
    next.set("tab", value);
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
        </Button>

        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <School className="h-6 w-6 text-primary" /> College Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything needed to run a college event: event pages and rosters, the College Golf Scoring &amp;
            Leaderboard add-on, and the Scoreboard/Clippd score sync.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/college-hub/bookings")}>
            <Calendar className="h-4 w-4 mr-2" /> Bookings
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/college-hub/surveys")}>
            <FileText className="h-4 w-4 mr-2" /> Surveys
          </Button>
        </div>

        <Tabs value={tab} onValueChange={change} className="space-y-6">
          <TabsList>
            <TabsTrigger value="events">
              <School className="h-4 w-4 mr-1.5" /> College Events
            </TabsTrigger>
            <TabsTrigger value="scoring">
              <GraduationCap className="h-4 w-4 mr-1.5" /> Scoring &amp; Leaderboard Add-on
            </TabsTrigger>
            <TabsTrigger value="clippd">
              <Link2 className="h-4 w-4 mr-1.5" /> Scoreboard / Clippd
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <CollegeTournamentHub />
          </TabsContent>

          <TabsContent value="scoring">
            <CollegeScoringSettings embedded />
          </TabsContent>

          <TabsContent value="clippd">
            <ClippdIntegration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
