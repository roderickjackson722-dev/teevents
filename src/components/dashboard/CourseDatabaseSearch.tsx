import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Library, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface CourseDBResult {
  id: string;
  course_name: string;
  city: string | null;
  state: string | null;
  tee_name: string | null;
  par_total: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  hole_pars: number[] | null;
  hole_stroke_indexes: number[] | null;
  hole_distances: number[] | null;
  is_verified: boolean;
}

interface Props {
  onSelect: (course: CourseDBResult) => void;
  onSaveCurrent?: () => Promise<void> | void;
}

export default function CourseDatabaseSearch({ onSelect, onSaveCurrent }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CourseDBResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("course_database" as any)
      .select("*")
      .ilike("course_name", `%${q.trim()}%`)
      .order("is_verified", { ascending: false })
      .order("course_name")
      .limit(25);
    setLoading(false);
    setSearched(true);
    if (error) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
      return;
    }
    setResults((data as any) || []);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Library className="h-4 w-4 text-primary" />
          Course Database
        </CardTitle>
        <CardDescription>
          Search the shared course library to auto-fill par, slope, rating, and per-hole data. If you don't find your course, enter it below and save it to the library for next time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search by course name (e.g. Pebble Beach)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <Button onClick={search} disabled={loading || !q.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Search</span>
          </Button>
          {onSaveCurrent && (
            <Button variant="outline" onClick={() => onSaveCurrent()}>
              Save current to library
            </Button>
          )}
        </div>

        {searched && results.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground italic">
            No matches. Enter your course details manually below — you can save it to the library after.
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-auto">
            {results.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/40">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    <span className="truncate">{c.course_name}</span>
                    {c.is_verified && (
                      <Badge variant="secondary" className="text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> Verified
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[c.city, c.state].filter(Boolean).join(", ")}
                    {c.tee_name ? ` • ${c.tee_name} Tees` : ""}
                    {c.par_total ? ` • Par ${c.par_total}` : ""}
                    {c.course_rating ? ` • Rating ${c.course_rating}` : ""}
                    {c.slope_rating ? ` • Slope ${c.slope_rating}` : ""}
                  </div>
                </div>
                <Button size="sm" onClick={() => onSelect(c)}>Select</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
