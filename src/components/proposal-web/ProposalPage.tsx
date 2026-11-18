import { useEffect,useRef,useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle,Send,X,Download,Mail } from "lucide-react";
import portrait from "@/assets/trust/roderick-jackson.jpg.asset.json";
import logo from "@/assets/teevents-logo-final.png.asset.json";
import { programDetails,programSubsections,programNames,currentProgramNames,isCurrentDocument,shownPrograms,fields,calculator,introText,reasonText,answerQuestion,sensitiveQuestion,orderedReasonTemplates,withReason,reasonExample,programPanelClass,proposalFaq,proposalPageContent,sectionShown,websiteHref,safeExternalUrl,type WebDocument } from "./content";
import { trackWebDocument,askWebQuestion } from "./proposalWeb.functions";
import "./print.css";
import FullServiceFields from "./FullServiceFields";
import ProposalClosure from "./ProposalClosure";
import ProposalExtraPages from "./ProposalExtraPages";
import ProposalWordingEditor from "./ProposalWordingEditor";
import { fullServiceTotals, money } from "./pricing";
/** Keep the admin's own line breaks; older single-paragraph terms still split by sentence. */
const termLines=(text:string)=>/\n/.test(text)?text.split(/\n+/).map(l=>l.trim()).filter(Boolean):text.split(/(?<=\.)\s+(?=[A-Z])/);
import { proposalScreens } from "./screens";

import shotDashboard from "@/assets/proposal-Event_management_dashboard.png.asset.json";
const slotImages:Record<string,string>={"Event management dashboard":shotDashboard.url};
export function ScreenshotSlot({name,caption="Sample"}:{name:string;caption?:string}) {
 const label=name.split(" — ")[0];const src=slotImages[label];
 if(src) return <figure className="my-8"><img src={src} alt={label} loading="lazy" className="h-auto w-full max-w-full rounded-lg border border-border object-contain"/><figcaption className="mt-2 text-sm text-muted-foreground">{label} · {caption}</figcaption></figure>;
 return <figure className="my-8"><div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted px-6 py-12 text-center text-muted-foreground"><span>{name}</span></div><figcaption className="mt-2 text-sm text-muted-foreground">{caption}</figcaption></figure>;
}
const cash=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n);
export default function ProposalPage({document:d,token,edit,onEdit}:{document:WebDocument;token?:string;edit?:boolean;onEdit?:(d:WebDocument)=>void}) {
 const [players,setPlayers]=useState(0),[fee,setFee]=useState(0);
 const [chatOpen,setChatOpen]=useState(false),[question,setQuestion]=useState(""),[busy,setBusy]=useState(false),[chatError,setChatError]=useState("");
 const [messages,setMessages]=useState<Array<{question:string;answer:string;saved:boolean}>>([]);
 const visit=useRef(crypto.randomUUID()),track=useServerFn(trackWebDocument),ask=useServerFn(askWebQuestion);
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
 const copy=proposalPageContent(d);
 const isCurrent = isCurrentDocument(d);
 const choices = isCurrent ? currentProgramNames : programNames.filter(p=>p!=="Full Service Management");
 const displayedFaq = proposalFaq(d).filter(item=>!item.question.includes("Full Service Management")||shown.includes("Full Service Management"));
 const togglePackage=(p:(typeof programNames)[number])=>{const next=shown.includes(p)?shown.filter(x=>x!==p):programNames.filter(x=>x===p||shown.includes(x));onEdit?.({...d,packages:next,recommended:next.includes(d.recommended as never)?d.recommended:""});};
 const value=(key:keyof typeof fields)=>d.fields[key]||fields[key];
 const has=(key:keyof typeof fields)=>edit||!!d.fields[key]?.trim();
 const calc=calculator(players,fee);
 const editField=(key:keyof typeof fields,v:string)=>onEdit?.({...d,fields:{...d.fields,[key]:v}});
 async function sendQuestion(){
  if(!question.trim()||busy)return;if(sensitiveQuestion(question)){setChatError("Please do not include sensitive information in your question.");return;}
  setBusy(true);setChatError("");try{const answer=token?(await ask({data:{token,visit:visit.current,question}})).answer:answerQuestion(question,d);setMessages(m=>[...m,{question,answer,saved:!!token}]);setQuestion("");}catch(e){setChatError(e instanceof Error?e.message:"Your question could not be saved.");}finally{setBusy(false);}
 }
  return <main className="proposal-web bg-background text-foreground">
  {edit&&onEdit&&<div className="web-controls border-b border-border bg-muted/40 px-5 py-8 sm:px-8"><div className="mx-auto max-w-6xl"><ProposalWordingEditor document={d} onChange={onEdit}/></div></div>}
  <div className="proposal-doc mx-auto max-w-5xl px-5 sm:px-8">
   <section id="cover" data-track className="web-cover border-b border-border py-12 md:py-16">
    <img src={logo.url} alt="TeeVents logo" className="mb-8 h-16 max-w-full object-contain object-left"/>
    <h1 className="font-display text-5xl font-bold text-primary">TeeVents</h1>
    <p className="mt-5 whitespace-pre-wrap font-display text-2xl">{copy.coverSubtitle}</p>
    <p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed">{copy.coverPromise}</p>
    <dl className="mt-8 grid gap-3 text-lg">{has("preparedFor")&&<div>Prepared for: {value("preparedFor")}</div>}{has("event")&&<div>Event: {value("event")}</div>}{has("date")&&<div>Date: {value("date")}</div>}</dl>
    <p className="mt-6 flex flex-wrap gap-x-2 text-sm leading-7 text-muted-foreground">{[copy.contactWebsite&&(websiteHref(copy.contactWebsite)?<a key="w" href={websiteHref(copy.contactWebsite)!} target="_blank" rel="noopener noreferrer" className="text-primary underline">{copy.contactWebsite}</a>:<span key="w">{copy.contactWebsite}</span>),copy.contactEmail&&<a key="e" href={`mailto:${copy.contactEmail}`} className="underline">{copy.contactEmail}</a>,copy.contactPhone&&<a key="p" href={`tel:${copy.contactPhone.replace(/[^\d+]/g,"")}`} className="underline">{copy.contactPhone}</a>].filter(Boolean).flatMap((n,i)=>i?[<span key={`s${i}`} aria-hidden="true">·</span>,n]:[n])}</p>
    {edit&&<div className="web-controls grid gap-4 border-t border-border pt-6 sm:grid-cols-2">{Object.entries(fields).map(([key,placeholder])=><label key={key} className="space-y-2 text-sm"><span>{({preparedFor:"Prepared for",event:"Event",date:"Date",contact:"Contact",proposalDate:"Proposal Date",validUntil:"Valid Until",conversationDate:"Conversation Date"} as Record<string,string>)[key]}</span><Input value={d.fields[key as keyof typeof fields]} placeholder={placeholder} onChange={e=>editField(key as keyof typeof fields,e.target.value)}/></label>)}</div>}
    <div className="mt-6 grid gap-2 text-sm text-muted-foreground">{has("contact")&&<p>Contact: {value("contact")}</p>}{has("proposalDate")&&<p>Proposal Date: {value("proposalDate")}</p>}{has("validUntil")&&<p>Valid Until: {value("validUntil")}</p>}</div>
   </section>
   {sectionShown(d,"about")&&<section id="about" data-track className="border-b border-border py-12">
    <h2 className="font-display text-3xl font-bold text-primary">{copy.aboutHeading}</h2>
    <div className="mt-8 grid gap-8 md:grid-cols-[240px_minmax(0,1fr)]"><figure><img src={portrait.url} alt="Rod, founder of TeeVents" className="aspect-[3/4] w-full rounded-lg object-cover" loading="lazy"/><figcaption className="mt-3 text-sm text-muted-foreground">Rod, founder of TeeVents</figcaption></figure><div className="space-y-5 text-lg leading-8">{copy.aboutBody.split(/\n\s*\n/).map((paragraph,index)=><p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div></div>
    <p className="mt-8 whitespace-pre-wrap text-lg leading-8">{copy.aboutIncludes}</p>
   </section>}
   {(sectionShown(d,"intro")||edit)&&<section id="intro" data-track className="border-b border-border py-12">
    {edit&&!sectionShown(d,"intro")&&<p className="web-controls mb-4 rounded-md bg-muted p-3 text-sm font-semibold">Hidden from the client. Check "Show" in the editor above to include it.</p>}
    <h2 className="font-display text-3xl font-bold text-primary">{copy.introHeading}</h2>
    {has("preparedFor")&&<p className="mt-4 text-xl">Personalized for {value("preparedFor")}</p>}
    {edit?<div className="web-controls mt-6 space-y-5"><label className="block space-y-2"><span>Recommended Program</span><select aria-label="Recommended Program" className="w-full rounded-md border border-input bg-background p-3" value={d.recommended} onChange={e=>onEdit?.({...d,recommended:e.target.value as WebDocument["recommended"]})}><option value="">[Recommended Program, one of the packages below]</option>{shown.map(p=><option key={p}>{p}</option>)}</select></label><label className="block space-y-2"><span>Personalized intro</span><Textarea aria-label="Personalized intro" rows={5} value={d.intro} onChange={e=>onEdit?.({...d,intro:e.target.value})}/></label><label className="block space-y-2"><span>Personalized Reason</span><Textarea aria-label="Personalized Reason" rows={8} value={d.reason} onChange={e=>onEdit?.({...d,reason:e.target.value})}/></label><details className="rounded-lg border border-border bg-background p-3"><summary className="cursor-pointer font-semibold text-sm">Reason templates</summary><p className="mt-2 text-xs leading-6 text-muted-foreground">Click one to fill the box above, then edit every word before saving. Text in [brackets] is for you to replace or delete.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{orderedReasonTemplates(d.recommended,isCurrent).map(t=><Button key={t.label} type="button" variant="outline" size="sm" className="h-auto justify-start whitespace-normal py-2 text-left text-xs" onClick={()=>onEdit?.({...d,reason:withReason(d.reason,t.text)})}><span><span className="font-semibold">{t.program}</span> — {t.label}</span></Button>)}</div><Button type="button" variant="ghost" size="sm" className="mt-3 px-0 text-xs" onClick={()=>onEdit?.({...d,reason:reasonExample})}>Clear the reason box</Button></details></div>:null}
    <p className="mt-6 whitespace-pre-wrap text-lg leading-8">{introText(d)}</p><p className="mt-5 whitespace-pre-wrap text-lg leading-8">{reasonText(d)}</p>
    {d.recommended&&<a href={`#program-${d.recommended.replaceAll(" ","-")}`} className="mt-5 inline-block text-primary underline">See the {d.recommended} details below</a>}
   </section>}
   {(sectionShown(d,"programs")||edit)&&<section id="programs" data-track className="border-b border-border py-12">
    {edit&&!sectionShown(d,"programs")&&<p className="web-controls mb-4 rounded-md bg-muted p-3 text-sm font-semibold">Hidden from the client. Check "Show" in the editor above to include it.</p>}
    <h2 className="font-display text-3xl font-bold text-primary">{copy.programsHeading}</h2>
    {edit&&<fieldset className="web-controls mt-6 rounded-lg border border-border p-4"><legend className="px-1 font-semibold">Program Selection</legend><div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="ghost" size="sm" onClick={()=>onEdit?.({...d,packages:[...choices]})}>Select all</Button><Button type="button" variant="ghost" size="sm" onClick={()=>onEdit?.({...d,packages:[],recommended:""})}>Clear</Button></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{choices.map(p=><label key={p} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={shown.includes(p)} onChange={()=>togglePackage(p)}/>{p}</label>)}</div>{!shown.length&&<p role="alert" className="mt-3 text-sm text-destructive">Pick at least one package before saving.</p>}</fieldset>}
    <div className="program-jumps mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Programs at a Glance">{shown.map(p=><Button asChild key={p} variant="outline" className={`h-auto min-h-28 flex-col items-start whitespace-normal p-4 text-left ${p===d.recommended?"border-2 border-primary bg-primary/10 ring-2 ring-primary/30":""}`}><a href={`#program-${p.replaceAll(" ","-")}`} aria-label={p===d.recommended?`${p}, Recommended for you`:undefined}>{p===d.recommended&&<span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">Recommended for You</span>}<span className="font-semibold">{p}</span><span className="text-xs leading-5">{programDetails(d,p).Type}</span><span className="text-xs leading-5">{programDetails(d,p).Price}</span><span className="whitespace-normal text-xs leading-5">{programDetails(d,p).Definition}</span></a></Button>)}</div>
   </section>}
   {(sectionShown(d,"details")||edit)&&<section id="details" data-track className="border-b border-border py-12">
    {edit&&!sectionShown(d,"details")&&<p className="web-controls mb-4 rounded-md bg-muted p-3 text-sm font-semibold">Hidden from the client. Check "Show" in the editor above to include it.</p>}
    {shown.map((p,i)=><article key={p} id={`program-${p.replaceAll(" ","-")}`} className={`program-detail mb-14 px-6 py-9 sm:px-9 sm:py-10 ${programPanelClass(i)}`}><h2 className="font-display text-3xl font-bold text-primary">{p}</h2>{p===d.recommended&&<p className="mt-3 inline-block rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">Recommended for You</p>}<p className="mt-2 text-xs font-bold text-primary">{programDetails(d,p).Type}</p><div className="mt-7 space-y-6">{programSubsections(d,p).filter(x=>x.shown).map(({label,text,title})=><div className="program-term" key={label}><h3 className="font-display text-xl font-bold">{title}</h3>{p==="Full Service Management"&&label==="Price"&&d.fullService&&fullServiceTotals(d.fullService).discount>0?p==="Full Service Management"&&d.fullService&&<div className="program-term mt-6 space-y-3">{(()=>{const t=fullServiceTotals(d.fullService);return <>{t.discount>0&&<><p>Full Service Management price: <s>{money(t.base)} per event</s></p><p>Discount: -{money(t.discount)}{d.fullService.discountReason?`, ${d.fullService.discountReason}`:""}</p><p>Your price: {money(t.final)} per event</p></>}<p>Deposit due at agreement: {money(t.deposit)}, 50 percent</p><p>Balance due: {money(t.balance)}, due {d.fullService.balanceDueDate}</p></>;})()}</div>:<ul className="mt-2 list-disc space-y-2 pl-5 text-base leading-8">{termLines(text).map((t,i)=><li key={i} className="whitespace-pre-wrap">{t}</li>)}</ul>}{p==="Full Service Management"&&label==="Price"&&d.fullService&&fullServiceTotals(d.fullService).discount===0&&<div className="mt-3 space-y-2"><p>Deposit due at agreement: {money(fullServiceTotals(d.fullService).deposit)}, 50 percent</p><p>Balance due: {money(fullServiceTotals(d.fullService).balance)}, due {d.fullService.balanceDueDate}</p></div>}</div>)}</div>
    

    {edit&&p==="Full Service Management"&&<FullServiceFields value={d.fullService} onChange={fullService=>onEdit?.({...d,fullService,closureEnabled:true})}/> }
    {(p==="Hybrid Managed"||p==="Full Service Planning")&&<ScreenshotSlot name="Event management dashboard — timeline, communications or event setup" caption="Test data only"/>}</article>)}
   </section>}
   {sectionShown(d,"addons")&&<section id="addons" data-track className="border-b border-border py-12"><h2 className="font-display text-3xl font-bold text-primary">{copy.addonsHeading}</h2><ul className="mt-6 list-disc space-y-3 pl-5 text-lg">{copy.addonsItems.split("\n").filter(item=>item.trim()).map((t,index)=><li key={index} className="whitespace-pre-wrap">{t}</li>)}</ul><p className="mt-6 whitespace-pre-wrap text-lg">{copy.addonsNote}</p></section>}
   {sectionShown(d,"screens")&&proposalScreens(d).some(x=>safeExternalUrl(x.url))&&<section id="screens" data-track className="border-b border-border py-12"><h2 className="font-display text-3xl font-bold text-primary">{copy.screensHeading}</h2>
    {proposalScreens(d).filter(x=>safeExternalUrl(x.url)).map(x=><figure key={x.id} className="my-8"><img src={x.url} alt={x.title||"Proposal photo"} loading="lazy" className="h-auto w-full max-w-full rounded-lg border border-border object-contain"/>{(x.title||x.caption)&&<figcaption className="mt-2 text-sm text-muted-foreground">{[x.title,x.caption].filter(Boolean).join(" · ")}</figcaption>}</figure>)}
   </section>}
   {sectionShown(d,"questions")&&<section id="questions" data-track className="border-b border-border py-12"><h2 className="font-display text-3xl font-bold text-primary">{copy.questionsHeading}</h2><div className="mt-6">{displayedFaq.map(item=><details key={item.id} className="border-b border-border py-5"><summary className="cursor-pointer text-lg font-semibold">{item.question}</summary><p className="mt-4 whitespace-pre-wrap text-base leading-8">{item.answer}</p></details>)}</div></section>}
   {sectionShown(d,"sample-event")&&<section id="sample-event" data-track className="border-b border-border py-12"><h2 className="font-display text-3xl font-bold text-primary">{copy.sampleEventHeading}</h2><p className="mt-6 whitespace-pre-wrap text-lg leading-8">{copy.sampleEventBody}</p><div className="mt-6"><Button asChild><a href={copy.sampleEventUrl} target="_blank" rel="noopener noreferrer">{copy.sampleEventButton}</a></Button></div><p className="mt-4 break-all text-sm text-muted-foreground">{copy.sampleEventUrl.replace(/^https?:\/\//,"")}</p></section>}
   <ProposalExtraPages document={d}/>
   {sectionShown(d,"next")&&<section id="next" data-track className="border-b border-border py-12"><h2 className="font-display text-3xl font-bold text-primary">{copy.nextStepsHeading}</h2><ul className="mt-6 list-disc space-y-3 pl-5 text-lg">{copy.nextStepsItems.split("\n").filter(item=>item.trim()).map((t,index)=><li key={index} className="whitespace-pre-wrap">{t}</li>)}</ul><div className="web-controls mt-8 flex flex-wrap items-center gap-3"><Button variant="ghost" onClick={()=>{void record("print").catch(()=>{});window.print();}}><Download/>Download PDF</Button><Button asChild variant="secondary"><a href={`mailto:${copy.contactEmail||"info@teevents.golf"}?subject=${encodeURIComponent("Proposal follow up")}`} onClick={()=>void record("call").catch(()=>{})}><Mail/>Contact TeeVents</a></Button></div><p className="mt-8 whitespace-pre-wrap leading-8">{copy.nextStepsContact}</p><p className="mt-5 whitespace-pre-wrap text-sm leading-7">{copy.nextStepsFooter}</p></section>}
   {d.closureEnabled!==false&&<ProposalClosure document={d} token={token}/> }
   {sectionShown(d,"notice")&&<section id="notice" data-track className="pb-24 pt-8 text-sm leading-7 text-muted-foreground">{copy.noticeText.replaceAll("[Client or Organization Name]",d.fields.preparedFor?.trim()||(edit?fields.preparedFor:"your organization"))}</section>}
  </div>
 </main>;
}