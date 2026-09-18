import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Search } from "lucide-react";

interface CourseRow {
  id: string;
  course_name: string;
  city: string | null;
  state: string | null;
  tee_name: string | null;
  par_total: number | null;
  course_rating: number | null;
  slope_rating: number | null;
}

export default function EnterpriseCourses() {
  const { org } = useOrgContext();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("course_database")
        .select("id, course_name, city, state, tee_name, par_total, course_rating, slope_rating")
        .order("use_count", { ascending: false })
        .limit(400);
      setCourses((data || []) as CourseRow[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!org) return;
    (supabase.from("tournaments") as any)
      .select("course_name")
      .eq("organization_id", org.orgId)
      .not("course_name", "is", null)
      .then(({ data }: any) => setUsed([...new Set(((data || []) as any[]).map((r) => r.course_name))] as string[]));
  }, [org]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? courses.filter((c) => `${c.course_name} ${c.city || ""} ${c.state || ""}`.toLowerCase().includes(q))
    : courses.filter((c) => used.includes(c.course_name)).concat(courses.slice(0, 25));

  const unique = [...new Map(filtered.map((c) => [c.id, c])).values()];

  return (
    <EnterpriseLayout
      title="My Courses"
      description="Courses and tee sets available to your events. Search the course library to add another."
      crumbs={[{ label: "My Courses" }]}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">Courses</CardTitle>
          <div className="relative w-56">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="h-9 pl-8" placeholder="Search courses" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading courses…</div>
          ) : (
            <div className="divide-y divide-border">
              {unique.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">{c.course_name}</span>
                  <span className="text-muted-foreground">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</span>
                  <span className="text-muted-foreground">{c.tee_name || "Tees not set"}</span>
                  <span className="text-muted-foreground">Par {c.par_total ?? "—"}</span>
                  <span className="text-muted-foreground">
                    {c.course_rating ?? "—"} / {c.slope_rating ?? "—"}
                  </span>
                  {used.includes(c.course_name) && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">In use</span>
                  )}
                  <Button asChild variant="ghost" size="sm" className="ml-auto">
                    <Link to={`/enterprise/create?type=single_round`}>Use in new event</Link>
                  </Button>
                </div>
              ))}
              {unique.length === 0 && <p className="py-4 text-sm text-muted-foreground">No courses matched that search.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </EnterpriseLayout>
  );
}
