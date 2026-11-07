import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), scores: vi.fn(), inserted: [] as any[], registrations: [] as any[], scoringFormat: "stroke_play" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/lib/fetchLeaderboardScores", () => ({ fetchAllTournamentScores: mocks.scores }));
import { recomputeDivisionSkins, type SkinsGame } from "./divisionSkins";
const game: SkinsGame = { id:"game", tournament_id:"test", division_id:null, name:"Test", total_purse_cents:4000, skin_format:"gross", carryover:true, round_number:1, status:"active" };
describe("shared Calculate persistence boundary", () => {
  beforeEach(() => {
    mocks.inserted=[];mocks.from.mockReset();mocks.scores.mockReset();
    mocks.scoringFormat="stroke_play";
    mocks.registrations=[{id:"a",handicap:0,status:"active"},{id:"b",handicap:0,status:"active"},{id:"wd",status:"wd"},{id:"out",status:"active",skins_opt_in:false}];
    mocks.from.mockImplementation((table:string) => {
      const builder:any={select:()=>builder,eq:()=>builder,maybeSingle:()=>builder,
        delete:()=>builder,insert:(rows:any[])=>{mocks.inserted=rows;return builder;},
        then:(resolve:any)=>resolve({error:null,data:table==="tournaments"?{scoring_format:mocks.scoringFormat,pairings_config:{byDay:{0:{roundHoles:4}}}}:table==="tournament_registrations"?mocks.registrations:[]})};
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
  it("combines two selected divisions into one competition and excludes every other division even if opted in", async () => {
    mocks.registrations=[{id:"a",flight_id:"division-a"},{id:"b",tier_id:"division-b"},{id:"other",flight_id:"division-c",skins_opt_in:true}];
    mocks.scores.mockResolvedValue([{registration_id:"a",hole_number:1,strokes:3},{registration_id:"b",hole_number:1,strokes:2},{registration_id:"other",hole_number:1,strokes:1}]);
    const rows=await recomputeDivisionSkins({...game,selected_division_ids:["division-a","division-b"]});
    expect(rows[0]).toEqual({hole_number:1,registration_id:"b",score:2,amount_cents:1000,skins:1});
    expect(mocks.inserted.every((row)=>row.skins_game_id==="game")).toBe(true);
  });
  it("keeps withdrawn and opted-out players excluded in a combined pot", async () => {
    mocks.registrations=[{id:"a",flight_id:"division-a"},{id:"b",flight_id:"division-b",skins_opt_in:false},{id:"wd",flight_id:"division-b",status:"wd"}];
    const rows=await recomputeDivisionSkins({...game,selected_division_ids:["division-a","division-b"]});
    expect(rows.map((r)=>r.registration_id)).toEqual(["a","a","a","a"]);
  });
  it("fails closed for an empty combined selection instead of using the whole field", async () => {
    const rows=await recomputeDivisionSkins({...game,selected_division_ids:[]});
    expect(rows.map((r)=>r.registration_id)).toEqual([null,null,null,null]);
  });
  it("retains the legacy separate-division explicit opt-in override", async () => {
    mocks.registrations=[{id:"a",flight_id:"division-a"},{id:"b",flight_id:"division-b",skins_opt_in:true}];
    const rows=await recomputeDivisionSkins({...game,division_id:"division-a"});
    expect(rows.map((r)=>r.registration_id)).toEqual(["a",null,"a",null]);
  });
  it("counts a two-person shamble team's shared score once across combined divisions", async () => {
    mocks.scoringFormat="shamble_2";
    mocks.registrations=[
      {id:"a",group_id:"team-ab",group_number:8,flight_id:"division-a"},
      {id:"b",group_id:"team-ab",group_number:8,flight_id:"division-a"},
      {id:"c",group_id:"team-cd",group_number:8,flight_id:"division-b"},
      {id:"d",group_id:"team-cd",group_number:8,flight_id:"division-b"},
    ];
    mocks.scores.mockResolvedValue([1,2].flatMap(h=>[
      {registration_id:"a",hole_number:h,strokes:3},{registration_id:"b",hole_number:h,strokes:3},
      {registration_id:"c",hole_number:h,strokes:h===1?4:3},{registration_id:"d",hole_number:h,strokes:h===1?4:3},
    ]));
    const rows=await recomputeDivisionSkins({...game,selected_division_ids:["division-a","division-b"]});
    expect(rows[0]).toMatchObject({registration_id:"a",score:3,amount_cents:1000,skins:1});
    expect(rows[1]).toMatchObject({registration_id:null,score:3,amount_cents:0});
  });
  it("preserves individual ties even when players share a registration or pairing", async () => {
    mocks.registrations=[{id:"a",group_id:"ab",group_number:8},{id:"b",group_id:"ab",group_number:8}];
    mocks.scores.mockResolvedValue([{registration_id:"a",hole_number:1,strokes:3},{registration_id:"b",hole_number:1,strokes:3}]);
    const rows=await recomputeDivisionSkins(game);
    expect(rows[0].registration_id).toBeNull();
  });
  it("does not admit excluded teammates or divisions through team aggregation", async () => {
    mocks.scoringFormat="shamble_2";
    mocks.registrations=[
      {id:"a",group_id:"ab",group_number:8,flight_id:"division-a"},
      {id:"b",group_id:"ab",group_number:8,flight_id:"division-a",skins_opt_in:false},
      {id:"c",group_id:"cd",group_number:8,flight_id:"division-c",skins_opt_in:true},
      {id:"d",group_id:"cd",group_number:8,flight_id:"division-c",status:"wd"},
    ];
    mocks.scores.mockResolvedValue(["a","b","c","d"].map(id=>({registration_id:id,hole_number:1,strokes:id==="a"?4:1})));
    const rows=await recomputeDivisionSkins({...game,selected_division_ids:["division-a"]});
    expect(rows[0]).toMatchObject({registration_id:"a",score:4,amount_cents:1000});
  });
});