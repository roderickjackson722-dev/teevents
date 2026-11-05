import { describe,it,expect } from "vitest";
import { programs,shownPrograms,programNames,calculator,answerQuestion,emptyDocument,fallbackAnswer,documentSchema,sensitiveQuestion,reasonTemplates,reasonExample,orderedReasonTemplates,withReason } from "./content";
describe("client proposal rules",()=>{
 it("uses the exact $3,750 trigger and $1,875/$3,125 payments",()=>{expect(calculator(50,75)).toEqual({registrations:3750,trigger:true,first:1875,balance:3125});expect(calculator(49,75).trigger).toBe(false);});
 it("accepts only the six approved recommended programs",()=>{expect(documentSchema.safeParse({...emptyDocument(),recommended:"Discount package"}).success).toBe(false);expect(documentSchema.safeParse({...emptyDocument(),recommended:"Hybrid Managed"}).success).toBe(true);});
 it("does not invent a reason when it is deleted",()=>{expect(documentSchema.parse({...emptyDocument(),reason:""}).reason).toBe("");});
 it("refuses custom pricing and guarantees",()=>{expect(answerQuestion("Give me a discount on Per Event",emptyDocument())).toBe(fallbackAnswer);expect(answerQuestion("Guarantee 100 players",emptyDocument())).toBe(fallbackAnswer);});
 it("answers program payment questions from the approved $399 terms",()=>{expect(answerQuestion("What is the Per Event payment schedule?",emptyDocument())).toContain("$399 per event.");});
 it("rejects sensitive payment and password questions",()=>{expect(sensitiveQuestion("My card number is 4111 1111 1111 1111")).toBe(true);expect(sensitiveQuestion("Here is my password")).toBe(true);expect(sensitiveQuestion("Is travel included?")).toBe(false);});
 it("shows the historical six packages for older copies and only chosen ones when picked",()=>{const old=documentSchema.parse({fields:emptyDocument().fields,recommended:"",intro:"",reason:""});expect(shownPrograms(old)).toEqual(["No Cost to Start","Per Event","Per League","Enterprise","Hybrid Managed","Full Service Planning"]);expect(shownPrograms({...old,packages:["Hybrid Managed","Per Event"]})).toEqual(["Per Event","Hybrid Managed"]);});
 it("gives every approved program at least one editable reason template",()=>{for(const p of programNames)expect(reasonTemplates.filter(t=>t.program===p).length).toBeGreaterThan(0);});
 it("keeps reason templates on approved prices, % signs, and a dedicated person",()=>{
  for(const t of reasonTemplates){expect(t.text).not.toMatch(/percent/i);expect(t.text).not.toMatch(/\bfree\b/i);expect(t.text).toMatch(/dedicated (TeeVents )?(rep|manager)/i);}
  expect(reasonTemplates.find(t=>t.program==="Per Event")!.text).toContain("$399");
  expect(reasonTemplates.find(t=>t.program==="Per League")!.text).toContain("$599");
  expect(reasonTemplates.find(t=>t.program==="Enterprise")!.text).toContain("$2,999");
  expect(reasonTemplates.find(t=>t.program==="Hybrid Managed")!.text).toContain("$5,000");
  expect(reasonTemplates.find(t=>t.program==="Full Service Planning")!.text).toContain("$5,000");
  expect(reasonTemplates.find(t=>t.program==="No Cost to Start")!.text).toContain("5% platform fee");
 });
 it("fills the reason box without repeating or dropping written text",()=>{
  expect(withReason(reasonExample,"T")).toBe("T");
  expect(withReason("","T")).toBe("T");
  expect(withReason("Real note","T")).toBe("Real note\n\nT");
  expect(withReason("Real note\n\nT","T")).toBe("Real note\n\nT");
  expect(withReason("Real note","")).toBe("Real note");
 });
 it("lists the recommended program's templates first",()=>{expect(orderedReasonTemplates("Enterprise")[0]!.program).toBe("Enterprise");expect(orderedReasonTemplates("")[0]!.program).toBe(reasonTemplates[0]!.program);});
 it("Full Service Planning takes a 50% deposit at initial sign up",()=>{expect(programs["Full Service Planning"]["Payment Schedule"]).toContain("50% deposit");expect(reasonTemplates.filter(t=>t.program==="Full Service Planning").every(t=>t.text.includes("50% deposit"))).toBe(true);});
 it("tags every program as software or managed service with the exact definition under the price",()=>{
  const softwareDef="Use the TeeVents software. A dedicated rep builds your event page for you. You run event day yourself, using the software.";
  const managedDef="Everything in the software, plus a dedicated tournament manager who works with you from agreement through event day, on site.";
  for(const p of ["No Cost to Start","Per Event","Per League","Enterprise"] as const){
   const keys=Object.keys(programs[p]);
   expect(keys[0]).toBe("Type");
   expect(programs[p].Type).toBe("SOFTWARE");
   expect(keys[keys.indexOf("Price")+1]).toBe("Definition");
   expect(programs[p].Definition).toBe(softwareDef);
  }
  for(const p of ["Hybrid Managed","Full Service Planning"] as const){
   expect(programs[p].Type).toBe("MANAGED SERVICE, ON SITE");
   expect(programs[p].Definition).toBe(managedDef);
   expect(programs[p]["On Site, What Your Manager Does On Event Day"]).toContain("On site event day coordination, from check in through awards");
  }
 });
});

import { test } from "vitest";
import { reasonText as _rt, emptyDocument as _ed } from "./content";
test("reason fills [Organization] from Prepared for", () => {
  const d = { ..._ed(), reason: "Built for [Organization].", fields: { ..._ed().fields, preparedFor: "HBCU Golf" } };
  expect(_rt(d)).toBe("Built for HBCU Golf.");
});
