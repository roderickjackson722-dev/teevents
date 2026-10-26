import { describe, expect, it } from "vitest";
import { enterpriseItemIsActive, enterpriseLeagueManageLink, enterpriseLink } from "./enterpriseNavigation";

describe("Enterprise settings navigation", () => {
  it("carries the same selected event and admin workspace into Skins payouts and back to Scores", () => {
    const search = "?admin_org=client&tournament_id=selected-event";
    expect(enterpriseLink("/enterprise/skins-payouts", search)).toBe("/enterprise/skins-payouts?admin_org=client&tournament_id=selected-event");
    expect(enterpriseLink("/enterprise/scores", search)).toBe("/enterprise/scores?admin_org=client&tournament_id=selected-event");
  });
  it("assigns Payments to Operations rather than Home or Admin", () => {
    expect(enterpriseItemIsActive("/enterprise/operations", "/enterprise/payments")).toBe(true);
    expect(enterpriseItemIsActive("/enterprise", "/enterprise/payments")).toBe(false);
    expect(enterpriseItemIsActive("/enterprise/admin", "/enterprise/payments")).toBe(false);
  });
  it("preserves the selected organization and event on settings links", () => {
    expect(enterpriseLink("/enterprise/settings/web-address?step=domain", "?admin_org=client&tournament_id=event"))
      .toBe("/enterprise/settings/web-address?step=domain&admin_org=client&tournament_id=event");
  });
  it("retains explicit target context and leaves non-Enterprise links unchanged", () => {
    expect(enterpriseLink("/enterprise/payments?tournament_id=target", "?sample_org=sample&tournament_id=current"))
      .toBe("/enterprise/payments?tournament_id=target&sample_org=sample");
    expect(enterpriseLink("/dashboard/settings", "?admin_org=client")).toBe("/dashboard/settings");
  });
});

describe("Enterprise league management navigation", () => {
  it("uses one destination for the selected league with admin workspace and event preserved", () => {
    expect(enterpriseLeagueManageLink("league-5", "?admin_org=client&tournament_id=event"))
      .toBe("/enterprise/leagues/league-5/manage?admin_org=client&tournament_id=event");
  });
  it("keeps sample workspace context and different leagues distinct", () => {
    expect(enterpriseLeagueManageLink("league-2", "?sample_org=sample&sample=1"))
      .toBe("/enterprise/leagues/league-2/manage?sample_org=sample&sample=1");
    expect(enterpriseLeagueManageLink("league-1", "")).not.toBe(enterpriseLeagueManageLink("league-2", ""));
  });
  it("highlights Leagues rather than Home on league management", () => {
    expect(enterpriseItemIsActive("/enterprise/leagues", "/enterprise/leagues/league-5/manage")).toBe(true);
    expect(enterpriseItemIsActive("/enterprise", "/enterprise/leagues/league-5/manage")).toBe(false);
  });
});