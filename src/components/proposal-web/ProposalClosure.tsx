import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { shownPrograms, type WebDocument } from "./content";
import { fullServiceTotals, money, choiceConfirmation } from "./pricing";
import { chooseWebProgram } from "./proposalWeb.functions";
export default function ProposalClosure({document:d,token}:{document:WebDocument;token?:string}) {
 const choose=useServerFn(chooseWebProgram),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 const shown=shownPrograms(d),t=d.fullService?fullServiceTotals(d.fullService):null;
 const offers:Record<string,{text:string;button:string}>={
 "No Cost to Start":{text:"$0 to start, 5 percent platform fee, paid by players at checkout",button:"Start With No Cost to Start"},
 "Per Event":{text:"$399 per event, 0 percent TeeVents platform fee, Live Leaderboard and Mobile Scoring included",button:"Start With Per Event, $399"},
 "Per League":{text:"$599 per league",button:"Start With Per League, $599"},
 "Enterprise":{text:"$2,999 per year, for 10 or more events, 0 percent TeeVents platform fee",button:"Start With Enterprise, $2,999"},
 "Full Service Management":{text:`${money(t?.final||0)} per event, 50 percent deposit due at agreement (${money(t?.deposit||0)})`,button:"Start With Full Service Management"},
 };
 async function start(program:string) {
 if(!token){setMessage("Preview only. No choice recorded or email sent.");return;}
 setBusy(true);setMessage("");
 try{await choose({data:{token,program}});setDone(true);setMessage(choiceConfirmation);}catch(e){setMessage(e instanceof Error?e.message:"Could not record your choice. Please try again.");}finally{setBusy(false);}
 }
 return <section id="closure" data-track className="border-b border-border py-12"><h2 className="font-display text-3xl font-bold text-primary">Ready to Get Started?</h2><p className="mt-6 text-lg leading-8">Choose how you would like to start. There is no obligation until you accept in writing, and no payment is taken on this page.</p>
 {d.recommended&&shown.includes(d.recommended)&&<a className="mt-5 inline-block text-sm text-primary underline" href={`#program-${d.recommended.replaceAll(" ","-")}`}>Your recommended program is {d.recommended}, see its details above</a>}
 <div className="mt-8 grid gap-5 sm:grid-cols-2">{shown.filter(p=>p in offers).map(p=><div key={p} className={`closure-option rounded-md border p-5 ${d.recommended===p?"border-primary bg-muted":"border-border"}`}><h3 className="font-display text-xl font-semibold">Start with {p}</h3>{p==="Full Service Management"&&t&&t.discount>0&&<p className="mt-3"><s>{money(t.base)} per event</s><br/>Discount: -{money(t.discount)}{d.fullService?.discountReason?`, ${d.fullService.discountReason}`:""}</p>}<p className="mt-3 leading-7">{offers[p].text}</p><Button className="web-controls mt-5 w-full" disabled={busy||done} onClick={()=>void start(p)}>{offers[p].button}</Button></div>)}</div>
 {message&&<p role="status" className="web-controls mt-6">{message}</p>}<p className="mt-8 leading-7">This proposal{shown.includes("Full Service Management")?", including the Full Service Management price and any discount":""}, is valid until {d.fields.validUntil||"[Valid Until date]"}.</p></section>;
}