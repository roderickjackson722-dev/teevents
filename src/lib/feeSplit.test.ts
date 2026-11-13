import { describe, it, expect } from "vitest";
import { computeFeeSplit } from "./feeSplit";
describe("fee split at 8%", () => {
  it("Choice A on $125", () => { const r = computeFeeSplit(12500, 0.08, "player"); expect(r.charge).toBe(13893); expect(r.organizerReceives).toBe(12460); });
  it("Choice B on $125", () => { const r = computeFeeSplit(12500, 0.08, "split"); expect([r.playerShare, r.processing, r.charge, r.realStripe, r.organizerReceives]).toEqual([500, 393, 13393, 418, 11975]); });
  it("Choice C on $125", () => { const r = computeFeeSplit(12500, 0.08, "organizer"); expect(r.charge).toBe(12500); expect(r.organizerReceives).toBe(11107); });
  it("Choice B on $150", () => { const r = computeFeeSplit(15000, 0.08, "split"); expect(r.charge).toBe(16065); expect(r.organizerReceives).toBe(14369); });
});
