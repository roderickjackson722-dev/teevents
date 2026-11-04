import { describe,it,expect } from "vitest";
import { shownPrograms,programNames,calculator,answerQuestion,emptyDocument,fallbackAnswer,documentSchema,sensitiveQuestion } from "./content";
describe("client proposal rules",()=>{
 it("uses the exact $3,750 trigger and $1,875/$3,125 payments",()=>{expect(calculator(50,75)).toEqual({registrations:3750,trigger:true,first:1875,balance:3125});expect(calculator(49,75).trigger).toBe(false);});
 it("accepts only the six approved recommended programs",()=>{expect(documentSchema.safeParse({...emptyDocument(),recommended:"Discount package"}).success).toBe(false);expect(documentSchema.safeParse({...emptyDocument(),recommended:"Hybrid Managed"}).success).toBe(true);});
 it("does not invent a reason when it is deleted",()=>{expect(documentSchema.parse({...emptyDocument(),reason:""}).reason).toBe("");});
 it("refuses custom pricing and guarantees",()=>{expect(answerQuestion("Give me a discount on Per Event",emptyDocument())).toBe(fallbackAnswer);expect(answerQuestion("Guarantee 100 players",emptyDocument())).toBe(fallbackAnswer);});
 it("answers program payment questions from the approved $399 terms",()=>{expect(answerQuestion("What is the Per Event payment schedule?",emptyDocument())).toContain("$399 per event.");});
 it("rejects sensitive payment and password questions",()=>{expect(sensitiveQuestion("My card number is 4111 1111 1111 1111")).toBe(true);expect(sensitiveQuestion("Here is my password")).toBe(true);expect(sensitiveQuestion("Is travel included?")).toBe(false);});
 it("shows all six packages for older copies and only chosen ones when picked",()=>{const old=documentSchema.parse({fields:emptyDocument().fields,recommended:"",intro:"",reason:""});expect(shownPrograms(old)).toEqual(programNames);expect(shownPrograms({...old,packages:["Hybrid Managed","Per Event"]})).toEqual(["Per Event","Hybrid Managed"]);});
});
