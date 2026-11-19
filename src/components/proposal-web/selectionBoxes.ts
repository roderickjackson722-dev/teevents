import { shownPrograms, type WebDocument, type SelectionBox } from "./content";
import { fullServiceTotals, money } from "./pricing";

export function defaultSelectionBoxes(d:WebDocument):SelectionBox[] {
 const totals=d.fullService?fullServiceTotals(d.fullService):null;
 const descriptions:Record<string,string>={
  "No Cost to Start":"$0 to start, 5% platform fee, paid by players at checkout",
  "Per Event":"$399 per event, 0% TeeVents platform fee, Live Leaderboard and Mobile Scoring included",
  "Per League":"$599 per league",
  "Enterprise":"$2,999 per year, for 10 or more events, 0% TeeVents platform fee",
  "Full Service Management":`${money(totals?.final||0)} per event, 50% deposit due at agreement (${money(totals?.deposit||0)})`,
 };
 return shownPrograms(d).flatMap((program,index)=>program==="Hybrid Managed"||program==="Full Service Planning"?[]:[{id:`option-${index}`,program,enabled:true,title:`Start with ${program}`,text:descriptions[program],button:`Select ${program}`,next:"Your signed choice will be sent to TeeVents for confirmation. No payment is taken when you submit this choice."}]);
}
export function selectionBoxes(d:WebDocument){return (d.selectionBoxes??[]).filter(b=>b.enabled&&b.title.trim()&&shownPrograms(d).includes(b.program));}
export function duplicateSelectionBox(box:SelectionBox,id:string):SelectionBox{return {...box,id};}
/** Resolve only saved, visible choices; never trust prices or wording submitted by a client. */
export function resolveSelectionBox(d:WebDocument,id:string,program:string){
 const box=selectionBoxes(d).find(b=>b.id===id&&b.program===program);
 if(!box)throw new Error("This choice is no longer available. Refresh the proposal and choose again.");
 return box;
}