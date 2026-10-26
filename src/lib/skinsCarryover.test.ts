import { describe, expect, it } from "vitest";
import { calculateSkinsCarryover, recordedSkinsResult } from "./skinsCarryover";

const win = [{ registration_id: "a", score: 3 }, { registration_id: "b", score: 4 }];
const tie = [{ registration_id: "a", score: 3 }, { registration_id: "b", score: 3 }];
describe("true ordered Skins carryover", () => {
  it("Test 1: pays a six-hole $60 chain as $10, $20, $30", () => {
    const r = calculateSkinsCarryover(6000, 6, { 1: win, 2: tie, 3: win, 4: tie, 5: tie, 6: win });
    expect(r.rows.map((h) => [h.skins, h.amount_cents])).toEqual([[1,1000],[0,0],[2,2000],[0,0],[0,0],[3,3000]]);
    expect(r.summary).toEqual({totalPurseCents:6000,perSkinValueCents:1000,skinsAwarded:6,skinsUnclaimed:0,totalPaidCents:6000,unclaimedAmountCents:0});
  });
  it("Test 2: leaves final tied skin unpaid from $40", () => {
    const r = calculateSkinsCarryover(4000, 4, {1:win,2:tie,3:win,4:tie});
    expect(r.rows.map((h) => [h.skins,h.amount_cents])).toEqual([[1,1000],[0,0],[2,2000],[0,0]]);
    expect(r.summary).toMatchObject({perSkinValueCents:1000,skinsAwarded:3,totalPaidCents:3000,skinsUnclaimed:1,unclaimedAmountCents:1000});
  });
  it("Test 3: pays every outright hole $10", () => {
    const r = calculateSkinsCarryover(4000,4,{1:win,2:win,3:win,4:win});
    expect(r.rows.map((h) => [h.skins,h.amount_cents])).toEqual([[1,1000],[1,1000],[1,1000],[1,1000]]);
    expect(r.summary).toMatchObject({totalPaidCents:4000,skinsUnclaimed:0,unclaimedAmountCents:0});
  });
  it("Test 4: whole-field and division pots have independent carries and purses", () => {
    const field = calculateSkinsCarryover(4000,4,{1:win,2:tie,3:win,4:tie});
    const division = calculateSkinsCarryover(6000,6,{1:win,2:tie,3:win,4:tie,5:tie,6:win});
    expect(field.summary).toMatchObject({skinsUnclaimed:1,totalPaidCents:3000});
    expect(division.rows[0]).toMatchObject({skins:1,amount_cents:1000});
    expect(division.summary).toMatchObject({skinsUnclaimed:0,totalPaidCents:6000});
  });
  it("resets carry across rounds and Gross/Net calls", () => {
    calculateSkinsCarryover(2000,2,{1:tie,2:tie});
    expect(calculateSkinsCarryover(2000,2,{1:win,2:win}).rows[0].skins).toBe(1);
  });
  it("reconciles cents on the last winner without paying unclaimed shares", () => {
    const r = calculateSkinsCarryover(10000,6,{1:win,2:win,3:win,4:win,5:win,6:tie});
    expect(r.rows.map((h) => h.amount_cents)).toEqual([1667,1667,1667,1667,1665,0]);
    expect(r.summary.totalPaidCents).toBe(8333);
    expect(r.summary.unclaimedAmountCents).toBe(1667);
  });
  it("does not change stored amounts when reconstructing a saved result", () => {
    const r=recordedSkinsResult(4000,[{hole_number:1,registration_id:"a",score:3,amount_cents:999},{hole_number:2,registration_id:null,score:3,amount_cents:0}]);
    expect(r.rows.map((h)=>h.amount_cents)).toEqual([999,0]);
  });
});