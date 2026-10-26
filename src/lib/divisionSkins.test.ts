import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), scores: vi.fn(), inserted: [] as any[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/lib/fetchLeaderboardScores", () => ({ fetchAllTournamentScores: mocks.scores }));
import { recomputeDivisionSkins, type SkinsGame } from "./divisionSkins";
const game: SkinsGame = { id:"game", tournament_id:"test", division_id:null, name:"Test", total_purse_cents:4000, skin_format:"gross", carryover:true, round_number:1, status:"active" };
describe("shared Calculate persistence boundary", () => {
  beforeEach(() => {
    mocks.inserted=[];mocks.from.mockReset();mocks.scores.mockReset();
    mocks.from.mockImplementation((table:string) => {
      const builder:any={select:()=>builder,eq:()=>builder,maybeSingle:()=>builder,
        delete:()=>builder,insert:(rows:any[])=>{mocks.inserted=rows;return builder;},
        then:(resolve:any)=>resolve({error:null,data:table==="tournaments"?{pairings_config:{byDay:{0:{roundHoles:4}}}}:table==="tournament_registrations"?[{id:"a",handicap:0,status:"active"},{id:"b",handicap:0,status:"active"},{id:"wd",status:"wd"},{id:"out",status:"active",skins_opt_in:false}]:[]})};
      return builder;
    });
    mocks.scores.mockResolvedValue([1,2,3,4].flatMap(h=>[
      {registration_id:"a",hole_number:h,strokes:3},{registration_id:"b",hole_number:h,strokes:h===2||h===4?3:4},
      {registration_id:"wd",hole_number:h,strokes:1},{registration_id:"out",hole_number:h,strokes:1},
    ]));
  });
  it("does not read or modify saved results before explicit Calculate", () => {
    expect(mocks.from).not.toHaveBeenCalled();expect(mocks.inserted).toEqual([]);
  });
  it("uses round holes and excludes withdrawn/not-in-pot scores, storing ties at zero", async () => {
    const rows=await recomputeDivisionSkins(game);
    expect(rows.map(r=>[r.registration_id,r.amount_cents])).toEqual([["a",1000],[null,0],["a",2000],[null,0]]);
    expect(mocks.inserted).toHaveLength(4);
    expect(mocks.inserted[3]).toEqual({skins_game_id:"game",registration_id:null,hole_number:4,score:3,amount_cents:0});
    expect(mocks.scores).toHaveBeenCalledWith("test",{roundNumber:1});
  });
});