export interface EnterpriseCourse {
  id: string;
  course_name: string;
  city: string | null;
  state: string | null;
  tee_name: string | null;
  par_total: number | null;
  course_rating: number | null;
  slope_rating: number | null;
}

const normalize = (value: string | null) => (value || "").trim().replace(/\s+/g, " ").toLowerCase();

export function uniqueCourseTees(courses: EnterpriseCourse[]): EnterpriseCourse[] {
  const seen = new Set<string>();
  return courses.filter((course) => {
    const key = JSON.stringify([normalize(course.course_name), normalize(course.city), normalize(course.state), normalize(course.tee_name)]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function matchingCourseTees(courses: EnterpriseCourse[], search: string): EnterpriseCourse[] {
  const query = normalize(search);
  if (!query) return [];
  return uniqueCourseTees(courses).filter((course) =>
    normalize(`${course.course_name} ${course.city || ""} ${course.state || ""}`).includes(query));
}

export function homeCourseId(settings: Record<string, unknown>): string | null {
  return typeof settings.homeCourseId === "string" && settings.homeCourseId ? settings.homeCourseId : null;
}

export function newEventCourse(courses: EnterpriseCourse[], settings: Record<string, unknown>, tournamentId: string | null, requestedCourseId: string | null): EnterpriseCourse | null {
  if (tournamentId) return null;
  const courseId = requestedCourseId || homeCourseId(settings);
  return courses.find((course) => course.id === courseId) || null;
}

/** A new event must not inherit an existing tournament ID from workspace context. */
export function newCourseEventLink(courseId: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete("tournament_id");
  params.set("type", "single_round");
  params.set("course_id", courseId);
  return `/enterprise/create?${params.toString()}`;
}