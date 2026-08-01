import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  tournamentId: string;
  /** Refresh the parent tournament query after a save. */
  onSaved?: () => void;
}

/**
 * Lets an organizer edit the course name / location line that appears
 * directly under the tournament name on the public live leaderboard.
 */
export default function LeaderboardHeaderCard({ tournamentId, onSaved }: Props) {
  const [courseName, setCourseName] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["leaderboard-header", tournamentId],
    queryFn: async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase
          .from("tournaments")
          .select("id, course_name, location")
          .eq("id", tournamentId)
          .maybeSingle(),
        supabase
          .from("golf_courses")
          .select("name")
          .eq("tournament_id", tournamentId)
          .limit(1)
          .maybeSingle(),
      ]);
      return { tournament: t, detailsCourseName: (c as any)?.name || null };
    },
    enabled: !!tournamentId,
  });

  useEffect(() => {
    if (!data?.tournament) return;
    setCourseName((data.tournament as any).course_name || "");
    setLocation((data.tournament as any).location || "");
  }, [data?.tournament]);

  const detailsName: string | null = data?.detailsCourseName || null;
  const mismatch = !!detailsName && detailsName.trim() !== (courseName || "").trim();

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({ course_name: courseName.trim() || null, location: location.trim() || null })
      .eq("id", tournamentId);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Leaderboard header updated", description: "Players will see the new course name." });
    refetch();
    onSaved?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Leaderboard Header
        </CardTitle>
        <CardDescription>
          This is the course and location line shown under your tournament name on the public live leaderboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lb-course-name">Course name</Label>
                <Input
                  id="lb-course-name"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Sugar Creek Golf & Tennis Club"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lb-location">Location</Label>
                <Input
                  id="lb-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Atlanta, GA"
                />
              </div>
            </div>

            {mismatch && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 flex flex-wrap items-center gap-2">
                <span>
                  Course Details lists <strong>{detailsName}</strong>, which doesn't match what the leaderboard shows.
                </span>
                <Button size="sm" variant="outline" onClick={() => setCourseName(detailsName!)}>
                  Use "{detailsName}"
                </Button>
              </div>
            )}

            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Preview</div>
              {[courseName, location].filter(Boolean).join(" · ") || "No course or location set"}
            </div>

            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? "Saving..." : "Save Header"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
