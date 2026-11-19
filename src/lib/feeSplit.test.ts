import { describe, it, expect } from "vitest";
import { computeFeeSplit } from "./feeSplit";
describe("fee split at 8%", () => {
  it("Choice A on $125", () => { const r = computeFeeSplit(12500, 0.08, "player"); expect(r.charge).toBe(13893); expect(r.organizerReceives).toBe(12460); });
  it("Choice B on $125", () => { const r = computeFeeSplit(12500, 0.08, "split"); expect([r.playerShare, r.processing, r.charge, r.realStripe, r.organizerReceives]).toEqual([500, 393, 13393, 418, 11975]); });
  it("Choice C on $125", () => { const r = computeFeeSplit(12500, 0.08, "organizer"); expect(r.charge).toBe(12500); expect(r.organizerReceives).toBe(11107); });
  it("Choice B on $150", () => { const r = computeFeeSplit(15000, 0.08, "split"); expect(r.charge).toBe(16065); expect(r.organizerReceives).toBe(14369); });
});
describe("Exact Price, organizer absorbs all fees", () => {
  const row = (c: number) => { const r = computeFeeSplit(c, 0.08, "exact"); return [r.charge, r.teeFee, r.realStripe, r.organizerReceives]; };
  it("$125", () => expect(row(12500)).toEqual([12500, 1000, 393, 11107]));
  it("$150", () => expect(row(15000)).toEqual([15000, 1200, 465, 13335]));
  it("$175", () => expect(row(17500)).toEqual([17500, 1400, 538, 15562]));
  it("$175 Per-Event plan, 0% fee", () => expect(row.length && computeFeeSplit(17500, 0, "exact").organizerReceives).toBe(16962));
});
