import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Library, CheckCircle2, MapPin, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { US_STATES } from "@/lib/usStates";

export interface CourseTee {
  tee_name: string | null;
  tee_color: string | null;
  gender: string | null;
  course_rating: number | null;
  slope_rating: number | null;
  par: number | null;
  yardage: number | null;
}

export interface CourseDBResult {
  id: string;
  course_name: string;
  city: string | null;
  state: string | null;
  address?: string | null;
  website?: string | null;
  tee_name: string | null;
  par_total: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  hole_pars: number[] | null;
  hole_stroke_indexes: number[] | null;
  hole_distances: number[] | null;
  hole_pars_total?: number | null;
  hole_pars_verified?: boolean;
  tees?: CourseTee[];
  is_verified?: boolean;
  source?: "saved" | "api";
}


interface Props {
  onSelect: (course: CourseDBResult) => void;
  onSaveCurrent?: () => Promise<void> | void;
  /** Reveals the manual course entry form for courses not in the database. */
  onManualEntry?: () => void;
  manualEntryOpen?: boolean;
}

function fullAddress(c: CourseDBResult): string {
  if (c.address && c.address.trim().length > 0) return c.address;
  return [c.city, c.state].filter(Boolean).join(", ");
}

export default function CourseDatabaseSearch({ onSelect, onSaveCurrent, onManualEntry, manualEntryOpen }: Props) {
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [results, setResults] = useState<CourseDBResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CourseDBResult | null>(null);
  const debounceRef = useRef<number | null>(null);

  const runSearch = async (query: string, st: string) => {
    if (!query.trim() && !st) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url = new URL(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-golf-courses`,
      );
      if (query.trim()) url.searchParams.set("query", query.trim());
      if (st) url.searchParams.set("state", st);
      const res = await fetch(url.toString(), {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Search failed");
      setResults((json.courses as CourseDBResult[]) || []);
      setOpen(true);
    } catch (e: any) {
      toast({ title: "Search failed", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Debounced typeahead
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (q.trim().length < 2 && !stateFilter) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      runSearch(q, stateFilter);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q, stateFilter]);

  const handleSelect = async (c: CourseDBResult) => {
    let full = c;
    if (c.source === "api" && c.id) {
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
        if (res.ok && json.course) full = { ...c, ...json.course };
      } catch { /* ignore, use summary */ }
    }
    setSelected(full);
    setOpen(false);
    setResults([]);
    setQ(full.course_name);
    onSelect(full);
    toast({ title: `Selected ${full.course_name}` });
  };

  const clearSelection = () => {
    setSelected(null);
    setQ("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Library className="h-4 w-4 text-primary" />
          Golf Course Database
        </CardTitle>
        <CardDescription>
          Start typing a course name — suggestions appear automatically. Tap one to auto-fill par,
          slope, rating, and hole data. Verify the address below before saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 relative">
          <div className="flex-1 relative">
            <Input
              placeholder="Search by course name (e.g. Pebble Beach)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setSelected(null); }}
              onFocus={() => results.length > 0 && setOpen(true)}
              autoComplete="off"
            />
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            )}
            {/* Autocomplete dropdown */}
            {open && results.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-80 overflow-auto">
                {results.map((c, idx) => {
                  const addr = fullAddress(c);
                  return (
                    <div
                      key={`${c.source ?? "saved"}-${c.id ?? idx}`}
                      role="button"
                      tabIndex={0}
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
                      onTouchStart={(e) => { e.preventDefault(); handleSelect(c); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/60 active:bg-muted border-b last:border-b-0 cursor-pointer"
                    >
                      <div className="font-semibold text-sm truncate">{c.course_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="truncate">{addr || "Location unknown"}</span>
                      </div>
                      {(c.tee_name || c.par_total || c.slope_rating) && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {c.tee_name ? `${c.tee_name} Tees` : ""}
                          {c.par_total ? ` • Par ${c.par_total}` : ""}
                          {c.course_rating ? ` • Rating ${c.course_rating}` : ""}
                          {c.slope_rating ? ` • Slope ${c.slope_rating}` : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <Select value={stateFilter || "all"} onValueChange={(v) => setStateFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Any state" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Any state</SelectItem>
              {US_STATES.map((s) => (
                <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => runSearch(q, stateFilter)} disabled={loading}>
            <Search className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Search</span>
          </Button>
          {onSaveCurrent && (
            <Button variant="outline" onClick={() => onSaveCurrent()}>
              Save current to library
            </Button>
          )}
        </div>

        {q.trim().length >= 2 && !loading && results.length === 0 && !selected && (
          <p className="text-sm text-muted-foreground italic">
            No matches yet. Keep typing, or enter your course details manually below — you can save
            it to the library after.
          </p>
        )}

        {/* Selected course verification card */}
        {selected && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold">{selected.course_name}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{fullAddress(selected) || "Location not provided — verify manually below"}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selected.tee_name ? `${selected.tee_name} Tees` : ""}
                  {selected.par_total ? ` • Par ${selected.par_total}` : ""}
                  {selected.course_rating ? ` • Rating ${selected.course_rating}` : ""}
                  {selected.slope_rating ? ` • Slope ${selected.slope_rating}` : ""}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Not the right course? Several clubs share similar names — clear and search again, or
                  edit the details below to match your venue exactly.
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
