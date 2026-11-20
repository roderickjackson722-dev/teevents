import { describe, it, expect } from "vitest";
import { computeFeeSplit } from "./feeSplit";
import { computeFeeSplit as checkoutFeeSplit } from "../../supabase/functions/_shared/feeSplit";
describe("approved 6% registration totals", () => {
  it.each([[12500,750,393,13643],[15000,900,465,16365],[17500,1050,538,19088]])("player pays all on %i cents", (base, fee, processing, total) => {
    for (const calculate of [computeFeeSplit, checkoutFeeSplit]) {
      const r = calculate(base, 0.06, "player");
      expect([r.teeFee,r.processing,r.charge]).toEqual([fee,processing,total]);
      expect(r.realStripe).toBe(Math.round(total * 0.029 + 30));
      expect(r.organizerReceives).toBe(total-fee-r.realStripe);
    }
  });
  it.each([[12500,375,393,13268],[15000,450,465,15915]])("split on %i cents", (base, share, processing, total) => {
    const r=computeFeeSplit(base,0.06,"split");
    expect([r.playerShare,r.organizerShare,r.processing,r.charge]).toEqual([share,share,processing,total]);
  });
  it.each([[12500,11357],[15000,13635],[17500,15912]])("organizer/exact payout on %i cents", (base, payout) => {
    for (const choice of ["organizer","exact"] as const) {
      const r=computeFeeSplit(base,0.06,choice);
      expect([r.charge,r.playerShare,r.processing,r.organizerReceives]).toEqual([base,0,0,payout]);
    }
  });
  it("keeps paid-plan platform fee at zero",()=>expect(computeFeeSplit(17500,0,"exact")).toMatchObject({teeFee:0,organizerReceives:16962}));
  it("preserves saved 5% and 8% event math",()=>{
    expect(computeFeeSplit(12500,0.05,"player").teeFee).toBe(625);
    expect(computeFeeSplit(12500,0.08,"player").teeFee).toBe(1000);
  });
});
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

import { feeSplitLabel } from "./feeSplit";
describe("custom per-event platform fee", () => {
  it("uses a custom 6% rate", () => {
    const r = computeFeeSplit(10000, 0.06, "player");
    expect(r.teeFee).toBe(600);
    expect(feeSplitLabel("split", 6)).toContain("3% player");
  });
});
