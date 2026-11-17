import { describe,it,expect } from "vitest";
import { programs,programDetails,shownPrograms,programNames,calculator,answerQuestion,emptyDocument,fallbackAnswer,documentSchema,sensitiveQuestion,reasonTemplates,reasonExample,orderedReasonTemplates,withReason,defaultPageContent,proposalPageContent,withProgramDetail,defaultReferencesPage,defaultPhotoLinksPage } from "./content";
describe("client proposal rules",()=>{
 it("new proposal defaults do not change the definition displayed by saved historical payloads",()=>{
  const historical=documentSchema.parse({fields:emptyDocument().fields,recommended:"",intro:"",reason:"",packages:["No Cost to Start","Per Event"]});
  expect(programDetails(historical,"Per Event").Definition).toBe("Use the TeeVents software. A dedicated rep builds your event page for you. You run event day yourself, using the software.");
  const next=emptyDocument();
  expect(next.softwareDefinition).toBeDefined();
  expect(programDetails(documentSchema.parse(next),"Per Event").Definition).toBe(next.softwareDefinition);
  expect(historical.softwareDefinition).toBeUndefined();
 });
 it("preserves all saved program terms when an existing definition snapshot is present",()=>{
  const saved=documentSchema.parse({fields:emptyDocument().fields,recommended:"Per Event",intro:"Saved introduction",reason:"Saved reason",packages:["Per Event"],softwareDefinition:"TeeVents is software plus a real tournament director."});
  const before=JSON.stringify(saved);
  expect(programDetails(saved,"Per Event")).toEqual({...programs["Per Event"],Definition:saved.softwareDefinition});
  expect(programDetails(saved,"Full Service Management")).toEqual(programs["Full Service Management"]);
  expect(JSON.stringify(saved)).toBe(before);
 });
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
test("the email note starts with the approved follow-up line", async () => {
  const { defaultEmailNote } = await import("./content");
  expect(defaultEmailNote).toBe("Please don’t hesitate to reach out if you have any questions after reviewing the attached proposal.");
});
test("program panels alternate shaded, plain, shaded so each reads as its own item", async () => {
  const { programPanelClass } = await import("./content");
  expect(programPanelClass(0)).toBe("program-shaded");
  expect(programPanelClass(1)).toBe("");
  expect(programPanelClass(2)).toBe("program-shaded");
  expect(programPanelClass(3)).toBe("");
});

describe("flexible proposal wording and optional pages",()=>{
 it("leaves historical payloads unchanged when the new optional fields are absent",()=>{
  const historical=documentSchema.parse({fields:emptyDocument().fields,recommended:"Per Event",intro:"Saved introduction",reason:"Saved reason",packages:["Per Event"],softwareDefinition:"Saved definition"});
  const before=JSON.stringify(historical);
  expect(proposalPageContent(historical)).toEqual(defaultPageContent());
  expect(historical.referencesPage).toBeUndefined();
  expect(historical.photoLinksPage).toBeUndefined();
  expect(JSON.stringify(historical)).toBe(before);
 });
 it("customizes Full Service expectations while preserving its calculated price and payment terms",()=>{
  const original=emptyDocument();
  const before=programDetails(original,"Full Service Management");
  let custom=withProgramDetail(original,"Full Service Management","What We Provide","Custom course, vendor and awards coordination for this organization.");
  custom=withProgramDetail(custom,"Full Service Management","Your Group Handles","The committee approves vendors and recruits players.");
  const details=programDetails(custom,"Full Service Management");
  expect(details["What We Provide"]).toBe("Custom course, vendor and awards coordination for this organization.");
  expect(details["Your Group Handles"]).toBe("The committee approves vendors and recruits players.");
  expect(details.Price).toBe(before.Price);
  expect(details["Payment Schedule"]).toBe(before["Payment Schedule"]);
  expect(details.Cancellation).toBe(before.Cancellation);
 });
 it("does not let wording overrides replace checkout-connected prices or platform fees",()=>{
  const d=emptyDocument();
  expect(withProgramDetail(d,"Per Event","Price","$1 per event")).toBe(d);
  expect(withProgramDetail(d,"Per Event","Platform fee","Custom fee")).toBe(d);
  expect(programDetails(d,"Per Event").Price).toBe("$399 per event");
 });
 it("starts both additional pages disabled and saves populated optional pages",()=>{
  const d=emptyDocument();
  expect(d.referencesPage?.enabled).toBe(false);
  expect(d.photoLinksPage?.enabled).toBe(false);
  const referencesPage={...defaultReferencesPage(),enabled:true,entries:[{id:"ref-1",name:"Jordan Lee",organization:"Community Golf Foundation",description:"Annual charity tournament",contact:"jordan@example.test"}]};
  const photoLinksPage={...defaultPhotoLinksPage(),enabled:true,links:[{id:"photo-1",title:"2026 Charity Classic",url:"https://images.example.test/classic.jpg",description:"Awards ceremony"}]};
  const parsed=documentSchema.parse({...d,referencesPage,photoLinksPage});
  expect(parsed.referencesPage?.entries[0]?.organization).toBe("Community Golf Foundation");
  expect(parsed.photoLinksPage?.links[0]?.url).toBe("https://images.example.test/classic.jpg");
 });
 it("accepts blank or http(s) photo links but rejects unsafe URLs",()=>{
  const d=emptyDocument();
  const page={...defaultPhotoLinksPage(),enabled:true,links:[{id:"photo-1",title:"Event",url:"javascript:alert(1)",description:""}]};
  expect(documentSchema.safeParse({...d,photoLinksPage:page}).success).toBe(false);
  expect(documentSchema.safeParse({...d,photoLinksPage:{...page,links:[{...page.links[0],url:""}]}}).success).toBe(true);
  expect(documentSchema.safeParse({...d,photoLinksPage:{...page,links:[{...page.links[0],url:"https://images.example.test/event.png"}]}}).success).toBe(true);
 });
 it("answers an edited common question from that proposal's approved content",()=>{
  const d={...emptyDocument(),faqItems:[{id:"custom",question:"Who coordinates vendors?",answer:"Our dedicated manager coordinates the approved vendors."}]};
  expect(answerQuestion("Who coordinates vendors?",d)).toBe("Our dedicated manager coordinates the approved vendors.\n\nFrom Common Questions in this proposal.");
 });
});
