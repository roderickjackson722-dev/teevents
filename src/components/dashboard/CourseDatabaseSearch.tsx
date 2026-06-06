import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Library, CheckCircle2, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { US_STATES } from "@/lib/usStates";

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
  is_verified?: boolean;
  source?: "saved" | "api";
}

interface Props {
  onSelect: (course: CourseDBResult) => void;
  onSaveCurrent?: () => Promise<void> | void;
}

export default function CourseDatabaseSearch({ onSelect, onSaveCurrent }: Props) {
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [results, setResults] = useState<CourseDBResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!q.trim() && !stateFilter) {
      toast({ title: "Enter a course name or pick a state to search" });
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-golf-courses", {
        method: "GET" as any,
        body: undefined,
        // Pass as query string via headers fallback: use fetch directly
      });
      // supabase.functions.invoke doesn't accept query params for GET reliably,
      // so use a direct fetch to the function URL.
      const url = new URL(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-golf-courses`,
      );
      if (q.trim()) url.searchParams.set("query", q.trim());
      if (stateFilter) url.searchParams.set("state", stateFilter);
      const res = await fetch(url.toString(), {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Search failed");
      setResults((json.courses as CourseDBResult[]) || []);
      // Suppress unused-var warning for the unused invoke return
      void data;
      void error;
    } catch (e: any) {
      toast({ title: "Search failed", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (c: CourseDBResult) => {
    if (c.source === "api" && c.id) {
      // Fetch full details from API for completeness
      try {
        const url = new URL(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-course-details`,
        );
        url.searchParams.set("courseId", c.id);
        url.searchParams.set("source", "api");
        const res = await fetch(url.toString(), {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        const json = await res.json();
        if (res.ok && json.course) {
          onSelect({ ...c, ...json.course });
          return;
        }
      } catch {
        // fall through to onSelect with summary data
      }
    }
    onSelect(c);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Library className="h-4 w-4 text-primary" />
          Golf Course Database
        </CardTitle>
        <CardDescription>
          Search by course name or state. Results include your saved library and the public OpenGolfAPI directory. Pick a course to auto-fill par, slope, rating, and hole data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search by course name (e.g. Pebble Beach)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="flex-1"
          />
          <Select value={stateFilter || "all"} onValueChange={(v) => setStateFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Any state" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Any state</SelectItem>
              {US_STATES.map((s) => (
                <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={search} disabled={loading}>
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
              <div key={`${c.source ?? "saved"}-${c.id}`} className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/40">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    <span className="truncate">{c.course_name}</span>
                    {c.is_verified && (
                      <Badge variant="secondary" className="text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> Verified
                      </Badge>
                    )}
                    {c.source === "api" && (
                      <Badge variant="outline" className="text-[10px]">
                        <Globe className="h-3 w-3 mr-0.5" /> OpenGolfAPI
                      </Badge>
                    )}
                    {c.source === "saved" && (
                      <Badge variant="outline" className="text-[10px]">Library</Badge>
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
                <Button size="sm" onClick={() => handleSelect(c)}>Select</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
