import { describe, expect, it } from "vitest";
import { clientDemoDashboardLink, isProtectedClientDemo } from "./clientDemo";

describe("editable client demos", () => {
  it("pins dashboard access to the demo's organization and event", () => {
    expect(clientDemoDashboardLink({ tournament_id: "event-123", organization_id: "org-456" })).toBe("/dashboard?admin_org=org-456&tournament_id=event-123");
  });
  it("keeps linked samples protected until explicitly converted", () => {
    expect(isProtectedClientDemo({ client_sample_id: "sample-123", is_converted_from_sample: false })).toBe(true);
    expect(isProtectedClientDemo({ client_sample_id: "sample-123", is_converted_from_sample: true })).toBe(false);
    expect(isProtectedClientDemo({ client_sample_id: null, is_converted_from_sample: false })).toBe(false);
  });
});