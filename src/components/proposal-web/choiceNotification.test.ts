import {it,expect} from "vitest";
import {choiceNotification} from "./choiceNotification";
import {emptyDocument} from "./content";
it("notifies only Rod with the chosen management final price and deposit",()=>{
 const d=emptyDocument();d.fields.preparedFor="HBCU Golf";d.fields.event="Annual Golf Tournament";
 const msg=choiceNotification(d,"Full Service Management","2026-11-05T14:13:00Z");
 expect(msg.to).toEqual(["info@teevents.golf"]);
 expect(msg.subject).toBe("Proposal acceptance, HBCU Golf, Full Service Management");
 expect(msg.text).toContain("Full Service Final Price: $5,000.00");expect(msg.text).toContain("Deposit due at agreement: $2,500.00");expect(msg.text).toContain("Date and time: 2026-11-05T14:13:00Z");expect(msg.text).toContain("Event: Annual Golf Tournament");
});
it("does not add management totals for a software choice",()=>{
 expect(choiceNotification(emptyDocument(),"Per Event","2026-11-05T14:13:00Z").text).not.toContain("Full Service Final Price");
});it("includes the signature and qualifying answers, replying to the signer",()=>{
 const msg=choiceNotification(emptyDocument(),"Per Event","2026-11-05T14:13:00Z",{signature:"Jane Doe",title:"Chair",email:"jane@example.com",phone:"555-123-4567",golfers:"120",eventDate:"May 1, 2027",notes:"",agreed:true});
 expect(msg.to).toEqual(["info@teevents.golf"]);expect(msg.reply_to).toBe("jane@example.com");
 expect(msg.text).toContain("Electronic signature: Jane Doe");expect(msg.text).toContain("Expected number of golfers: 120");
});
