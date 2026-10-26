import { describe, expect, it } from "vitest";
import { enterpriseItemIsActive, enterpriseLink } from "./enterpriseNavigation";

describe("Enterprise settings navigation", () => {
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