import { type WebDocument } from "./content";
import { fullServiceTotals, money } from "./pricing";
import { z } from "zod";
import { resolveSelectionBox } from "./selectionBoxes";
export const acceptanceSchema=z.object({
 signature:z.string().trim().min(2).max(120),
 title:z.string().trim().min(1).max(120),
 email:z.string().trim().email().max(320),
 phone:z.string().trim().min(7).max(40),
 golfers:z.string().trim().min(1).max(40),
 eventDate:z.string().trim().min(1).max(60),
 notes:z.string().trim().max(1000).default(""),
 agreed:z.literal(true),
});
export type Acceptance=z.infer<typeof acceptanceSchema>;
const one=(s:string)=>s.replace(/[\r\n]+/g," ");
export function acceptanceLines(a:Acceptance){return [
 "",`Electronic signature: ${one(a.signature)}`,`Title or role: ${one(a.title)}`,`Email: ${one(a.email)}`,`Phone: ${one(a.phone)}`,
 `Expected number of golfers: ${one(a.golfers)}`,`Planned event date: ${one(a.eventDate)}`,...(a.notes?[`Notes: ${a.notes}`]:[]),
 "Agreed: Yes, signer approved this proposal and the selected package."];}
export function choiceNotification(d:WebDocument, program:string, at:string, a?:Acceptance, selectionBoxId?:string) {
 const t=d.fullService?fullServiceTotals(d.fullService):null;
 const box=selectionBoxId?resolveSelectionBox(d,selectionBoxId,program):null;
 return {
  to:["info@teevents.golf"],
  ...(a?{reply_to:one(a.email)}:{}),
  subject:`Proposal acceptance, ${d.fields.preparedFor.replace(/[\r\n]/g," ")}, ${program}`,
  text:[`Client: ${d.fields.preparedFor}`,`Event: ${d.fields.event}`,`Program chosen: ${program}`,...(box?[`Selection: ${box.title}`,`Package and payment terms: ${box.text}`,"Custom choice submitted for confirmation. No payment taken."]:program==="Full Service Management"&&t?[`Full Service Final Price: ${money(t.final)}`,`Deposit due at agreement: ${money(t.deposit)}`]:[]),`Date and time: ${at}`,...(a?acceptanceLines(a):[])].join("\n"),
 };
}