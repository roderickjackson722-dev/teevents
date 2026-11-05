import { type WebDocument } from "./content";
import { fullServiceTotals, money } from "./pricing";
export function choiceNotification(d:WebDocument, program:string, at:string) {
 const t=d.fullService?fullServiceTotals(d.fullService):null;
 return {
  to:["info@teevents.golf"],
  subject:`Proposal acceptance, ${d.fields.preparedFor.replace(/[\r\n]/g," ")}, ${program}`,
  text:[`Client: ${d.fields.preparedFor}`,`Event: ${d.fields.event}`,`Program chosen: ${program}`,...(program==="Full Service Management"&&t?[`Full Service Final Price: ${money(t.final)}`,`Deposit due at agreement: ${money(t.deposit)}`]:[]),`Date and time: ${at}`].join("\n"),
 };
}