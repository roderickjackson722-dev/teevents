import { describe, it, expect } from "vitest";
import { resolveDashboardContext, withDashboardContext } from "./dashboardContext";

const sp = (s: string) => new URLSearchParams(s);

describe("resolveDashboardContext", () => {
  it("restores admin org and tournament when a tab link drops them", () => {
    const stored = { admin_org: "org1", tournament_id: "t1", path: "/dashboard" };
    const { redirect } = resolveDashboardContext("/dashboard/players", sp(""), stored);
    expect(redirect?.get("admin_org")).toBe("org1");
    expect(redirect?.get("tournament_id")).toBe("t1");
  });

  it("keeps the tournament when moving to another page without the param", () => {
    const stored = { admin_org: "org1", tournament_id: "t1", path: "/dashboard/players" };
    const { redirect } = resolveDashboardContext("/dashboard/setup-checklist", sp("admin_org=org1"), stored);
    expect(redirect?.get("tournament_id")).toBe("t1");
  });

  it("honours an explicit All events clear on the same page", () => {
    const stored = { admin_org: "org1", tournament_id: "t1", path: "/dashboard/players" };
    const { redirect, next } = resolveDashboardContext("/dashboard/players", sp("admin_org=org1"), stored);
    expect(redirect).toBeNull();
    expect(next.tournament_id).toBeUndefined();
  });

  it("does not carry a tournament into a different admin org", () => {
    const stored = { admin_org: "org1", tournament_id: "t1", path: "/dashboard" };
    const { redirect, next } = resolveDashboardContext("/dashboard/players", sp("admin_org=org2"), stored);
    expect(redirect).toBeNull();
    expect(next.admin_org).toBe("org2");
    expect(next.tournament_id).toBeUndefined();
  });

  it("does nothing when there is no remembered context", () => {
    expect(resolveDashboardContext("/dashboard/players", sp(""), null).redirect).toBeNull();
  });
});

describe("withDashboardContext", () => {
  it("adds admin_org and tournament_id to dashboard links", () => {
    expect(withDashboardContext("/dashboard/players", "?admin_org=o&tournament_id=t&x=1"))
      .toBe("/dashboard/players?admin_org=o&tournament_id=t");
  });
  it("keeps existing query on the link", () => {
    expect(withDashboardContext("/dashboard/players?tab=pairings", "?admin_org=o"))
      .toBe("/dashboard/players?tab=pairings&admin_org=o");
  });
});
