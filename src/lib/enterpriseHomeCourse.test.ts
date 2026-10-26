import { describe, expect, it } from "vitest";
import { homeCourseId, matchingCourseTees, newCourseEventLink, newEventCourse, uniqueCourseTees, type EnterpriseCourse } from "./enterpriseHomeCourse";

const blue: EnterpriseCourse = { id: "blue", course_name: "Home Golf Club", city: "Atlanta", state: "GA", tee_name: "Blue", par_total: 72, course_rating: 71.2, slope_rating: 125 };
const white = { ...blue, id: "white", tee_name: "White", course_rating: 69.1 };
const courses = [blue, { ...blue, id: "duplicate", course_name: " Home Golf Club ", tee_name: " BLUE " }, white];

describe("Enterprise home course", () => {
  it("shows no list before a search", () => { expect(matchingCourseTees(courses, "  ")).toEqual([]); });
  it("finds matching library courses and returns each course/tee once", () => { expect(matchingCourseTees(courses, "home").map((c) => c.id)).toEqual(["blue", "white"]); });
  it("keeps distinct tees and distinct locations", () => { expect(uniqueCourseTees([...courses, { ...blue, id: "other", city: "Savannah" }]).map((c) => c.id)).toEqual(["blue", "white", "other"]); });
  it("restores the saved tee for new events with its course name and ratings", () => { const restored = JSON.parse(JSON.stringify({ homeCourseId: "white" })); expect(homeCourseId(restored)).toBe("white"); expect(newEventCourse(courses, restored, null, null)).toEqual(white); });
  it("starts blank without a saved home course", () => { expect(newEventCourse(courses, {}, null, null)).toBeNull(); });
  it("allows an explicit course to override the home course", () => { expect(newEventCourse(courses, { homeCourseId: "white" }, null, "blue")).toEqual(blue); });
  it("never applies a home course to an existing tournament", () => { expect(newEventCourse(courses, { homeCourseId: "white" }, "existing", "blue")).toBeNull(); });
  it("new-event buttons retain workspace but never edit the selected tournament", () => { const url = new URL(newCourseEventLink("blue", "?admin_org=org&tournament_id=existing"), "https://www.teevents.golf"); expect(url.pathname).toBe("/enterprise/create"); expect(url.searchParams.get("tournament_id")).toBeNull(); expect(url.searchParams.get("admin_org")).toBe("org"); expect(url.searchParams.get("course_id")).toBe("blue"); });
});