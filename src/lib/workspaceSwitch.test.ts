import { describe, it, expect } from "vitest";
import { decideWorkspaceSwitch } from "./workspaceSwitch";

const tOrg = (id = "t1") => ({ organization_id: id, workspace_type: "tournament" as const });
const lOrg = (id = "l1") => ({ organization_id: id, workspace_type: "league" as const });

describe("decideWorkspaceSwitch", () => {
  it("sends a tournament-only user to create-workspace with reason=switch", () => {
    const d = decideWorkspaceSwitch([tOrg("t1")], "/dashboard");
    expect(d.path).toBe("/create-workspace?type=league&reason=switch");
  });

  it("sends a league-only user to create-workspace for a tournament", () => {
    const d = decideWorkspaceSwitch([lOrg("l1")], "/dashboard/leagues");
    expect(d.path).toBe("/create-workspace?type=tournament&reason=switch");
  });

  it("jumps directly to the league dashboard when the user has one of each", () => {
    const d = decideWorkspaceSwitch([tOrg("t1"), lOrg("l1")], "/dashboard");
    expect(d.path).toBe("/dashboard/leagues?admin_org=l1");
  });

  it("jumps directly to the tournament dashboard from a league workspace", () => {
    const d = decideWorkspaceSwitch([tOrg("t1"), lOrg("l1")], "/dashboard/leagues/manage");
    expect(d.path).toBe("/dashboard?admin_org=t1");
  });

  it("routes to /select-workspace when multiple league workspaces exist", () => {
    const d = decideWorkspaceSwitch(
      [tOrg("t1"), lOrg("l1"), lOrg("l2")],
      "/dashboard",
    );
    expect(d.path).toBe("/select-workspace");
  });

  it("routes to /select-workspace when multiple tournament workspaces exist from a league", () => {
    const d = decideWorkspaceSwitch(
      [tOrg("t1"), tOrg("t2"), lOrg("l1")],
      "/dashboard/leagues",
    );
    expect(d.path).toBe("/select-workspace");
  });

  it("treats missing workspace_type as tournament", () => {
    const d = decideWorkspaceSwitch(
      [{ organization_id: "t1", workspace_type: null }],
      "/dashboard",
    );
    expect(d.path).toBe("/create-workspace?type=league&reason=switch");
  });

  it("handles zero memberships by routing to create-workspace", () => {
    const d = decideWorkspaceSwitch([], "/dashboard");
    expect(d.path).toBe("/create-workspace?type=league&reason=switch");
  });
});
