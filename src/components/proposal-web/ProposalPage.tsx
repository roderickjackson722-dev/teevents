import { useEffect,useRef,useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle,Send,X,Download,Mail } from "lucide-react";
import portrait from "@/assets/trust/roderick-jackson.jpg.asset.json";
import logo from "@/assets/teevents-logo-final.png.asset.json";
import { programs,programNames,shownPrograms,fields,faq,about,calculator,introText,answerQuestion,sensitiveQuestion,type WebDocument } from "./content";
import { trackWebDocument,askWebQuestion } from "./proposalWeb.functions";
import "./print.css";

export function ScreenshotSlot({name,caption="Sample"}:{name:string;caption?:string}) {
 return <figure className="my-8"><div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted px-6 py-12 text-center text-muted-foreground"><span>{name}</span></div><figcaption className="mt-2 text-sm text-muted-foreground">{caption}</figcaption></figure>;
}
const cash=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n);
const subsectionLabels:Record<string,string>={"Platform fee":"Platform Fee","Your Group Handles":"Your Group Handles"};
export default function ProposalPage({document:d,token,edit,onEdit}:{document:WebDocument;token?:string;edit?:boolean;onEdit?:(d:WebDocument)=>void}) {
 const [selected,setSelected]=useState<string>(d.recommended||"");
 const [players,setPlayers]=useState(0),[fee,setFee]=useState(0);
 const [chatOpen,setChatOpen]=useState(false),[question,setQuestion]=useState(""),[busy,setBusy]=useState(false),[chatError,setChatError]=useState("");
 const [messages,setMessages]=useState<Array<{question:string;answer:string;saved:boolean}>>([]);
 const visit=useRef(crypto.randomUUID()),track=useServerFn(trackWebDocument),ask=useServerFn(askWebQuestion);
 useEffect(()=>{setSelected(d.recommended||"");},[d.recommended]);
 async function record(kind:"open"|"section"|"time"|"call"|"print",value=""){if(token)await track({data:{token,visit:visit.current,kind,value}});}
 useEffect(()=>{
  if(!token)return;
  const start=Date.now();let activeSince=window.document.visibilityState==="visible"?Date.now():0;let elapsed=0;
  const seen=new Set<string>();
  void record("open").catch(()=>{});
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&!seen.has(entry.target.id)){seen.add(entry.target.id);void record("section",entry.target.id).catch(()=>{});}}},{threshold:0.01});
  window.document.querySelectorAll(".proposal-web section[data-track]").forEach(el=>observer.observe(el));
  const tick=()=>{if(activeSince){elapsed+=Date.now()-activeSince;activeSince=Date.now();}void record("time",String(Math.min(999999,Math.round(elapsed/1000)))).catch(()=>{});};
  const visibility=()=>{if(window.document.visibilityState==="hidden"){tick();activeSince=0;}else activeSince=Date.now();};
  window.document.addEventListener("visibilitychange",visibility);const interval=setInterval(tick,15000);
  return ()=>{observer.disconnect();clearInterval(interval);window.document.removeEventListener("visibilitychange",visibility);if(Date.now()>start)tick();};
 },[token]);
 useEffect(()=>{
  const opened:HTMLDetailsElement[]=[];
  const before=()=>{window.document.querySelectorAll<HTMLDetailsElement>(".proposal-web details").forEach(el=>{if(!el.open){opened.push(el);el.open=true;}});};
  const after=()=>{opened.splice(0).forEach(el=>{el.open=false;});};
  window.addEventListener("beforeprint",before);window.addEventListener("afterprint",after);
  return ()=>{window.removeEventListener("beforeprint",before);window.removeEventListener("afterprint",after);};
 },[]);
 const shown=shownPrograms(d);
 const togglePackage=(p:(typeof programNames)[number])=>{const next=shown.includes(p)?shown.filter(x=>x!==p):programNames.filter(x=>x===p||shown.includes(x));onEdit?.({...d,packages:next,recommended:next.includes(d.recommended as never)?d.recommended:""});};
 const value=(key:keyof typeof fields)=>d.fields[key]||fields[key];
 const calc=calculator(players,fee);
 const editField=(key:keyof typeof fields,v:string)=>onEdit?.({...d,fields:{...d.fields,[key]:v}});
 async function sendQuestion(){
  if(!question.trim()||busy)return;if(sensitiveQuestion(question)){setChatError("Please do not include sensitive information in your question.");return;}
  setBusy(true);setChatError("");try{const answer=token?(await ask({data:{token,visit:visit.current,question}})).answer:answerQuestion(question,d);setMessages(m=>[...m,{question,answer,saved:!!token}]);setQuestion("");}catch(e){setChatError(e instanceof Error?e.message:"Your question could not be saved.");}finally{setBusy(false);}
 }
 return <main className="proposal-web bg-background text-foreground">
  <div className="mx-auto max-w-5xl px-5 sm:px-8">
   <section id="cover" data-track className="web-cover border-b border-border py-12 md:py-16">
    <img src={logo.url} alt="TeeVents logo" className="mb-8 h-16 max-w-full object-contain object-left"/>
    <h1 className="font-display text-5xl font-bold text-primary">TeeVents</h1>
    <p className="mt-5 font-display text-2xl">Golf Tournament Programs and Services</p>
    <p className="mt-5 text-lg leading-relaxed">Every program includes a dedicated TeeVents rep who builds your event for you.</p>
    <dl className="mt-8 grid gap-3 text-lg"><div>Prepared for: {value("preparedFor")}</div><div>Event: {value("event")}</div><div>Date: {value("date")}</div></dl>
    <p className="mt-6 text-sm leading-7 text-muted-foreground">www.teevents.golf · info@teevents.golf · (602) 413 1338</p>
    <ScreenshotSlot name="Cover and Branded event page — sample event hero and registration area"/>
    {edit&&<div className="web-controls grid gap-4 border-t border-border pt-6 sm:grid-cols-2">{Object.entries(fields).map(([key,placeholder])=><label key={key} className="space-y-2 text-sm"><span>{({preparedFor:"Prepared for",event:"Event",date:"Date",contact:"Contact",proposalDate:"Proposal Date",validUntil:"Valid Until",conversationDate:"Conversation Date"} as Record<string,string>)[key]}</span><Input value={d.fields[key as keyof typeof fields]} placeholder={placeholder} onChange={e=>editField(key as keyof typeof fields,e.target.value)}/></label>)}</div>}
    <div className="mt-6 grid gap-2 text-sm text-muted-foreground"><p>Contact: {value("contact")}</p><p>Proposal Date: {value("proposalDate")}</p><p>Valid Until: {value("validUntil")}</p></div>
   </section>
   <section id="intro" data-track className="border-b border-border py-12">
    <h2 className="font-display text-3xl font-bold text-primary">A Quick Note From Rod</h2>
    <p className="mt-4 text-xl">Personalized for {value("preparedFor")}</p>
    {edit?<div className="web-controls mt-6 space-y-5"><label className="block space-y-2"><span>Recommended Program</span><select aria-label="Recommended Program" className="w-full rounded-md border border-input bg-background p-3" value={d.recommended} onChange={e=>onEdit?.({...d,recommended:e.target.value as WebDocument["recommended"]})}><option value="">[Recommended Program, one of the 6 programs below]</option>{shown.map(p=><option key={p}>{p}</option>)}</select></label><label className="block space-y-2"><span>Personalized intro</span><Textarea aria-label="Personalized intro" rows={5} value={d.intro} onChange={e=>onEdit?.({...d,intro:e.target.value})}/></label><label className="block space-y-2"><span>Personalized Reason</span><Textarea aria-label="Personalized Reason" rows={5} value={d.reason} onChange={e=>onEdit?.({...d,reason:e.target.value})}/></label></div>:null}
    <p className="mt-6 whitespace-pre-wrap text-lg leading-8">{introText(d)}</p><p className="mt-5 whitespace-pre-wrap text-lg leading-8">{d.reason}</p>
    {d.recommended&&<a href={`#program-${d.recommended.replaceAll(" ","-")}`} className="mt-5 inline-block text-primary underline" onClick={()=>setSelected(d.recommended)}>See the {d.recommended} details below</a>}
   </section>
   <section id="about" data-track className="border-b border-border py-12">
    <h2 className="font-display text-3xl font-bold text-primary">About TeeVents</h2>
    <div className="mt-8 grid gap-8 md:grid-cols-[240px_minmax(0,1fr)]"><figure><img src={portrait.url} alt="Rod, founder of TeeVents" className="aspect-[3/4] w-full rounded-lg object-cover" loading="lazy"/><figcaption className="mt-3 text-sm text-muted-foreground">Rod, founder of TeeVents</figcaption></figure><div className="space-y-5 text-lg leading-8">{about.map(p=><p key={p}>{p}</p>)}<ul className="list-disc space-y-2 pl-5">{["Tournament director for more than 10 years","Organizing golf tournaments since 2017","Worked for Troon Golf and Cleveland Golf","Golfer since the late 1990s"].map(b=><li key={b}>{b}</li>)}</ul></div></div>
    <p className="mt-8 text-lg leading-8">Every program includes: a dedicated TeeVents rep, a branded event page built for you, online registration and payments, sponsor tiers, pairings and check in, sponsor and auction tools, live budget tracking</p>
   </section>
   <section id="programs" data-track className="border-b border-border py-12">
    <h2 className="font-display text-3xl font-bold text-primary">Programs at a Glance</h2><p className="mt-4 text-lg">Choose a program below to see its full details.</p>
    {edit&&<fieldset className="web-controls mt-6 rounded-lg border border-border p-4"><legend className="px-1 font-semibold">Packages to show this client</legend><div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="ghost" size="sm" onClick={()=>onEdit?.({...d,packages:[...programNames]})}>Select all</Button><Button type="button" variant="ghost" size="sm" onClick={()=>onEdit?.({...d,packages:[],recommended:""})}>Clear</Button></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{programNames.map(p=><label key={p} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={shown.includes(p)} onChange={()=>togglePackage(p)}/>{p}</label>)}</div>{!shown.length&&<p role="alert" className="mt-3 text-sm text-destructive">Pick at least one package before saving.</p>}</fieldset>}
    <div className="web-controls mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Program selector">{shown.map(p=><Button key={p} aria-pressed={selected===p} variant={selected===p?"secondary":"outline"} className="flex-col items-start p-4 text-left" onClick={()=>setSelected(p)}><span className="font-semibold">{p}{p==="No Cost to Start"&&<span className="ml-2 text-xs">MOST POPULAR</span>}</span><span className="text-xs leading-5">{programs[p].Price}</span>{"Platform fee" in programs[p]&&<span className="text-xs leading-5">{p==="Hybrid Managed"||p==="Full Service Planning"?"Platform stays No Cost to Start":String(programs[p]["Platform fee"])}</span>}</Button>)}</div>
    {selected&&<Button variant="link" className="web-controls mt-3 px-0" onClick={()=>setSelected("")}>Show all programs again</Button>}
   </section>
   <section id="details" data-track className="border-b border-border py-12">
    {shown.map(p=><article key={p} id={`program-${p.replaceAll(" ","-")}`} className={`program-detail mb-12 ${selected&&selected!==p?"hidden":""}`}><h2 className="font-display text-3xl font-bold text-primary">{p}{p==="No Cost to Start"&&<span className="mt-3 block font-body text-sm">MOST POPULAR</span>}</h2><div className="mt-7 space-y-6">{Object.entries(programs[p]).map(([label,text])=><div key={label}><h3 className="font-display text-xl font-bold">{subsectionLabels[label]||label}</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-base leading-8">{text.split(/(?<=\.)\s+(?=[A-Z])/).map((t,i)=><li key={i}>{t}</li>)}</ul></div>)}</div>
    {p==="Hybrid Managed"&&<div className="mt-8 border-y border-border py-6"><h3 className="font-display text-xl font-bold">Example only, not a guarantee</h3><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span>Expected Players</span><Input type="number" min="0" max="1000000" step="1" value={players} onChange={e=>setPlayers(Math.min(1000000,Math.max(0,Math.floor(Number(e.target.value)))))}/></label><label className="space-y-2"><span>Average Entry Fee</span><Input type="number" min="0" max="1000000" step="0.01" value={fee} onChange={e=>setFee(Math.min(1000000,Math.max(0,Number(e.target.value))))}/></label></div><dl className="mt-5 space-y-3"><div>Expected Registrations: <strong>{cash(calc.registrations)}</strong></div><div>$3,750 Trigger Reached: <strong>{calc.trigger?"Yes":"No"}</strong></div><div>First Payment: $1,875, due at the $3,750 trigger</div><div>Balance: $3,125, due 7 days before event day</div></dl><p className="mt-4 text-sm leading-6">This calculator is an example only. It does not guarantee a player count, sponsorship dollars, or profit.</p></div>}
    {(p==="Hybrid Managed"||p==="Full Service Planning")&&<ScreenshotSlot name="Event management dashboard — timeline, communications or event setup" caption="Test data only"/>}</article>)}
    <ScreenshotSlot name="Registration — sample registration form and entry tiers"/><ScreenshotSlot name="Sponsor tiers — sample event sponsor tiers"/><ScreenshotSlot name="Pairings — test pairings screen" caption="Test data only"/><ScreenshotSlot name="Check in — QR check in on computer or iPad" caption="Test data only"/><ScreenshotSlot name="Live scoring and leaderboard — sample event leaderboard" caption="Sample scores"/><ScreenshotSlot name="Sponsor and auction tools — test dashboard" caption="Test data only"/><ScreenshotSlot name="Live budget tracking — test budget dashboard" caption="Test data only"/>
   </section>
   <section id="addons" data-track className="border-b border-border py-12"><h2 className="font-display text-3xl font-bold text-primary">Add ons, $99 each, one time per event</h2><ul className="mt-6 list-disc space-y-3 pl-5 text-lg">{["Live Leaderboard and Mobile Scoring, included with Per Event and up","Unlimited Manual Entries","Auction Dashboard","Branding Removal and Digital Sponsor","Custom Domain"].map(t=><li key={t}>{t}</li>)}</ul><p className="mt-6 text-lg">Stripe processing is separate: 2.9% plus $0.30, and applies in all cases.</p></section>
   <section id="questions" data-track className="border-b border-border py-12"><h2 className="font-display text-3xl font-bold text-primary">Common Questions</h2><div className="mt-6">{faq.map(([q,a])=><details key={q} className="border-b border-border py-5"><summary className="cursor-pointer text-lg font-semibold">{q}</summary><p className="mt-4 text-base leading-8">{a}</p></details>)}</div></section>
   <section id="next" data-track className="border-b border-border py-12"><h2 className="font-display text-3xl font-bold text-primary">Next Steps</h2><ul className="mt-6 list-disc space-y-3 pl-5 text-lg">{["Choose the program that fits your event","Schedule a call with your dedicated rep","Send your logo and tournament details","We build your page and you are live in 7 days or less"].map(t=><li key={t}>{t}</li>)}</ul><div className="web-controls mt-8 flex flex-wrap items-center gap-3"><Button asChild variant="secondary"><a href="mailto:info@teevents.golf?subject=Proposal%20follow%20up" onClick={()=>void record("call").catch(()=>{})}><Mail/>Schedule a Call</a></Button><Button variant="ghost" onClick={()=>{void record("print").catch(()=>{});window.print();}}><Download/>Download PDF</Button><Button asChild variant="link"><a href="mailto:info@teevents.golf">Contact TeeVents</a></Button></div><p className="mt-8 leading-8">Contact: Website www.teevents.golf, Email info@teevents.golf, Phone (602) 413 1338</p><p className="mt-5 text-sm leading-7">This proposal is a draft until accepted in writing. Prices, travel, and third party costs are as stated in this proposal, and third party costs are paid directly by the organizer unless stated otherwise in a custom line item.</p></section>
   <section id="notice" data-track className="pb-24 pt-8 text-sm leading-7 text-muted-foreground">This proposal link is made just for {value("preparedFor")}, so TeeVents can see when you have had a chance to look, and follow up at a good time.</section>
  </div>
  <div className="web-chat fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)]">{chatOpen?<div className="w-96 max-w-full rounded-lg border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">Ask about this proposal</h2><Button size="icon" variant="ghost" aria-label="Close proposal chat" onClick={()=>setChatOpen(false)}><X/></Button></div><div className="max-h-[45vh] overflow-y-auto py-3" aria-live="polite">{messages.map((m,i)=><div className="mb-5 space-y-2" key={i}><p className="font-semibold">{m.question}</p><p className="whitespace-pre-wrap text-sm leading-6">{m.answer}</p>{m.saved&&<p className="text-xs text-muted-foreground">Your question has been saved for Rod to follow up.</p>}</div>)}</div><form onSubmit={e=>{e.preventDefault();void sendQuestion();}} className="flex gap-2"><Input aria-label="Question about this proposal" value={question} maxLength={2000} onChange={e=>setQuestion(e.target.value)}/><Button type="submit" variant="outline" size="icon" aria-label="Ask question" disabled={busy||!question.trim()}><Send/></Button></form>{chatError&&<p role="alert" className="mt-2 text-sm text-destructive">{chatError}</p>}</div>:<Button variant="outline" className="bg-card" onClick={()=>setChatOpen(true)}><MessageCircle/>Ask about this proposal</Button>}</div>
 </main>;
}