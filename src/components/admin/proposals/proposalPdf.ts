import { jsPDF } from "jspdf";
import { useGaramond } from "./pdfFonts";
import { basicFields, footerNote, itemAmount, money, proposalTotal, type ProposalRow } from "@/lib/proposals";
export async function proposalPdf(row:ProposalRow):Promise<Blob> {
 const doc=new jsPDF({unit:"mm",format:"a4"});const F=await useGaramond(doc);const p=row.payload;let y=25;
 const green=[26,92,56] as const;const muted=[90,100,94] as const;
 function page(){doc.addPage();y=22;}
 function text(value:string,size=10,bold=false){doc.setFont(F,bold?"bold":"normal");doc.setFontSize(size);const color=bold?green:muted;doc.setTextColor(color[0],color[1],color[2]);const lines=doc.splitTextToSize(value||" ",174) as string[];for(const line of lines){if(y>275)page();doc.text(line,18,y);y+=size*0.45+1;}y+=2;}
 function heading(value:string){if(y>255)page();y+=4;text(value,14,true);}
 doc.setProperties({title:`Proposal — ${p.basic["Event Name"]||p.basic["Client or Organization Name"]||"TeeVents"}`,author:p.basic["Prepared By"]||""});
 text("TeeVents",23,true);text("EVENT PROPOSAL",10,true);doc.setDrawColor(...green);doc.line(18,y,192,y);y+=9;
 text(`Status: ${row.status}    Proposal Date: ${p.basic["Proposal Date"]||""}    Valid Until: ${p.basic["Valid Until"]||""}`);
 heading("Basic information");for(const k of basicFields)text(`${k}: ${p.basic[k]||""}`);
 heading("About TeeVents");text(p.about);
 heading("Proposal Type");text(p.type);
 for(const group of [{title:"Pricing",keys:["Price","Platform fee"]},{title:"Scope",keys:["Includes","Minimum field and lead time","Scope","Group handles","Limits"]},{title:"Payment Schedule",keys:["Payment schedule"]},{title:"Cancellation",keys:["Cancellation"]}]){heading(group.title);for(const k of group.keys)if(k in p.sections)text(`${k}: ${p.sections[k]}`);}
 heading("Line Items and Total");
 for(const item of p.items){text(item.description,11,true);text(`${item.quantity} × ${money(item.unitPrice)}    Amount: ${money(itemAmount(item))}`);}
 text(`Total: ${money(proposalTotal(p))}`,16,true);text("Stripe processing is separate. Stripe processing: 2.9% plus $0.30.");
 heading("Add ons");for(const item of p.items.filter(i=>i.kind==="addon"))text(`${item.description}: ${money(itemAmount(item))}`);
 if(p.type&&p.type!=="No Cost to Start")text("Live Leaderboard and Mobile Scoring included.");text("Page build out is included in done for you setup, not a separate add on.");y+=6;text(footerNote,9);
 const count=doc.getNumberOfPages();for(let n=1;n<=count;n++){doc.setPage(n);doc.setFontSize(8);doc.setTextColor(...muted);doc.text(`${p.basic["Prepared By"]||""} | Proposal`,18,289);doc.text(`${n} / ${count}`,190,289,{align:"right"});}
 return doc.output("blob");
}
export async function downloadProposalPdf(row:ProposalRow){
 const blob=await proposalPdf(row);const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`Proposal-${(row.payload.basic["Event Name"]||row.payload.basic["Client or Organization Name"]||"TeeVents").replace(/[^a-z0-9_-]/gi,"-").slice(0,100)}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
