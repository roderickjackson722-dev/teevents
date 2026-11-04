import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog,DialogContent,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { listProposalTemplates,saveProposalTemplate,deleteProposalTemplate } from "@/lib/proposals.functions";
import { changeProposalType,draftFromTemplate,newProposal,proposalTypes,type Proposal,type ProposalTemplate } from "@/lib/proposals";
import ProposalEditor from "./ProposalEditor";
export default function ProposalTemplates({open,onClose,onStart}:{open:boolean;onClose:()=>void;onStart:(p:Proposal)=>void}){
 const list=useServerFn(listProposalTemplates),save=useServerFn(saveProposalTemplate),remove=useServerFn(deleteProposalTemplate);
 const {data:rows=[],refetch,error}=useQuery({queryKey:["admin-proposal-templates"],queryFn:()=>list(),enabled:open});
 const [editing,setEditing]=useState<ProposalTemplate|null>(null);const [name,setName]=useState("");const [busy,setBusy]=useState(false);
 return <Dialog open={open} onOpenChange={v=>{if(!v){setEditing(null);onClose();}}}><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit proposal template":"Proposal templates"}</DialogTitle></DialogHeader>{error&&<p role="alert">{error.message}</p>}{editing?<><Input aria-label="Template name" value={name} maxLength={120} onChange={e=>setName(e.target.value)}/><ProposalEditor initial={editing.payload} status="Draft" busy={busy} onCancel={()=>setEditing(null)} onSave={async(p)=>{if(!name.trim()){toast.error("Enter a template name.");return;}setBusy(true);try{await save({data:{id:editing.id,name,payload:draftFromTemplate(p)}});await refetch();setEditing(null);toast.success("Template saved.");}catch(e){toast.error(e instanceof Error?e.message:"Could not save template.");}finally{setBusy(false);}}}/></>:<div className="divide-y divide-border">{proposalTypes.map(t=><div key={t} className="flex flex-wrap items-center justify-between gap-2 py-3"><span>{t}</span><Button variant="outline" onClick={()=>{onStart(changeProposalType(newProposal(),t));onClose();}}>Use package</Button></div>)}{rows.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span>{row.name}</span><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>{onStart(draftFromTemplate(row.payload));onClose();}}>Use template</Button><Button variant="ghost" onClick={()=>{setEditing(row);setName(row.name);}}>Edit</Button><Button variant="ghost" disabled={busy} onClick={async()=>{if(!window.confirm(`Delete template "${row.name}"? Existing proposals will stay unchanged.`))return;setBusy(true);try{await remove({data:{id:row.id}});await refetch();}catch(e){toast.error(e instanceof Error?e.message:"Could not delete template.");}finally{setBusy(false);}}}>Delete</Button></div></div>)}</div>}</DialogContent></Dialog>;
}
