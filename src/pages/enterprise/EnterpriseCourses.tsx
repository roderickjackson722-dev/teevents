import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { homeCourseId, matchingCourseTees, newCourseEventLink, type EnterpriseCourse } from "@/lib/enterpriseHomeCourse";
import { loadEnterpriseCourseLibrary } from "@/lib/enterpriseCourses.client";

export default function EnterpriseCourses() {
  const { org } = useOrgContext();
  const location = useLocation();
  const searchInput = useRef<HTMLInputElement>(null);
  const [courses, setCourses] = useState<EnterpriseCourse[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    loadEnterpriseCourseLibrary().then((rows) => { if (active) setCourses(rows); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setHomeId(org ? homeCourseId(org.enterpriseSettings) : null);
    setSelectedId(null);
  }, [org]);

  const unique = matchingCourseTees(courses, search);
  const home = courses.find((course) => course.id === homeId);
  const selected = unique.find((course) => course.id === selectedId);
  const details = (course: EnterpriseCourse) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span>{course.tee_name || "Tees not set"}</span>
      <span>Par {course.par_total ?? "—"}</span>
      <span>Rating {course.course_rating ?? "—"}</span>
      <span>Slope {course.slope_rating ?? "—"}</span>
    </div>
  );
  const saveHome = async () => {
    if (!org || !selected || saving) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("organizations").select("enterprise_settings").eq("id", org.orgId).single();
      if (error) throw error;
      const current = data.enterprise_settings;
      const settings = current && typeof current === "object" && !Array.isArray(current) ? current : {};
      const update = supabase.from("organizations")
        .update({ enterprise_settings: { ...settings, homeCourseId: selected.id } })
        .eq("id", org.orgId);
      const { data: saved, error: saveError } = await (current === null
        ? update.is("enterprise_settings", null)
        : update.eq("enterprise_settings", current)).select("id");
      if (saveError) throw saveError;
      if (!saved?.length) throw new Error("Your account settings changed. Please try again.");
      setHomeId(selected.id);
      setSelectedId(null);
      setSearch("");
      toast.success("Home course saved.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save home course."); }
    finally { setSaving(false); }
  };

  return (
    <EnterpriseLayout
      title="My Courses"
      description="Courses and tee sets available to your events. Search the course library to add another."
      crumbs={[{ label: "My Courses" }]}
    >
      {home && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Home Course</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="break-words font-semibold">{home.course_name}</p>
            {details(home)}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setSearch(""); setSelectedId(null); searchInput.current?.focus(); }}>Change home course</Button>
              <Button asChild variant="outline" className="h-auto min-h-9 whitespace-normal"><Link to={newCourseEventLink(home.id, location.search)}>Use home course in new event</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}
      <section>
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input ref={searchInput} aria-label="Search courses" className="h-9 pl-8" placeholder="Search courses" value={search} onChange={(e) => { setSearch(e.target.value); setSelectedId(null); }} />
          </div>
          {!search.trim() ? <p className="py-4 text-sm text-muted-foreground">Search for your home course, then save it.</p> : loadError ? (
            <p className="py-4 text-sm text-destructive">Could not load the course library. Please reload to try again.</p>
          ) : loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading courses…</div>
          ) : (
            <div className="divide-y divide-border">
              {unique.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 py-4 text-sm" data-course-result={c.id}>
                  <input type="radio" name="home-course" aria-label={`Select ${c.course_name}, ${c.tee_name || "Tees not set"}`} checked={selectedId === c.id} onChange={() => setSelectedId(c.id)} disabled={saving} className="h-4 w-4 accent-primary" />
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="break-words font-medium">{c.course_name}</span>
                  <span className="text-muted-foreground">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</span>
                  {details(c)}
                  <div className="ml-auto flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={newCourseEventLink(c.id, location.search)}>Use in new event</Link>
                  </Button>
                  <Button variant={selectedId === c.id ? "default" : "outline"} className={selectedId === c.id ? "bg-secondary text-primary hover:bg-secondary/90" : ""} size="sm" disabled={saving || !org || selectedId !== c.id} onClick={saveHome}>{saving && selectedId === c.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save as home course</Button>
                  </div>
                </div>
              ))}
              {unique.length === 0 && <p className="py-4 text-sm text-muted-foreground">No courses matched that search.</p>}
            </div>
          )}
      </section>
    </EnterpriseLayout>
  );
}
