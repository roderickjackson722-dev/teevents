import { supabase } from "@/integrations/supabase/client";
import type { EnterpriseCourse } from "./enterpriseHomeCourse";

export async function loadEnterpriseCourseLibrary(): Promise<EnterpriseCourse[]> {
  const courses: EnterpriseCourse[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("course_database")
      .select("id, course_name, city, state, tee_name, par_total, course_rating, slope_rating")
      .order("course_name").order("id").range(offset, offset + 999);
    if (error) throw error;
    courses.push(...(data || []));
    if (!data || data.length < 1000) return courses;
  }
}