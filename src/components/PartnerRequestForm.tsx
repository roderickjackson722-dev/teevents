import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { submitPartnerRequest } from '@/lib/partnerRequests.functions';
import { partnerRequestSchema, validatePartnerAnswers } from '@/lib/partnerRequests.schema';
import ContactCaptcha from '@/components/marketing/ContactCaptcha';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
type Field = {id:string;label:string;field_type:string;is_required:boolean;is_enabled:boolean;options:string[]|null};
export default function PartnerRequestForm({tournamentId,sizes,fields}: {tournamentId:string;sizes:number[];fields:Field[]}) {
 const send = useServerFn(submitPartnerRequest);
 const [form,setForm] = useState({firstName:'',lastName:'',email:'',phone:'',teamSize:sizes[0] || 2,partnersNeeded:1,message:''});
 const [answers,setAnswers] = useState<Record<string,string>>({});
 const [token,setToken] = useState(''); const [reset,setReset] = useState(0); const [busy,setBusy] = useState(false); const [done,setDone] = useState(false); const [error,setError] = useState('');
 const enabled = fields.filter(f=>f.is_enabled);
 if(done) return <div role="status" className="border border-border rounded-md p-5"><h3 className="font-semibold">Partner request received</h3><p className="text-sm text-muted-foreground mt-2">Your details are on the organizer’s partner-request list. This is not a paid registration and does not reserve a place.</p></div>;
 return <form className="space-y-4" onSubmit={async e=>{e.preventDefault();setError('');try {const data=partnerRequestSchema.parse({...form,tournamentId,answers,captchaToken:token});validatePartnerAnswers(enabled,answers,form.phone);setBusy(true);await send({data});setDone(true);}catch(err){setError(err instanceof Error ? err.message : 'Please try again.');setReset(v=>v+1);}finally{setBusy(false);}}}>
 <h3 className="font-semibold">Looking for partners</h3><p className="text-sm text-muted-foreground">No payment is collected. A complete team is required before registering to play.</p>
 <div className="grid sm:grid-cols-2 gap-4">{(['firstName','lastName','email','phone'] as const).map(k=><div key={k}><Label htmlFor={`partner-${k}`}>{({firstName:'First name *',lastName:'Last name *',email:'Email *',phone:'Phone'})[k]}</Label><Input id={`partner-${k}`} required={k!=='phone'} type={k==='email'?'email':'text'} maxLength={k==='phone'?30:255} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}</div>
 <div className="grid sm:grid-cols-2 gap-4"><div><Label>Team size</Label><Select value={String(form.teamSize)} onValueChange={v=>setForm({...form,teamSize:Number(v),partnersNeeded:1})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{sizes.map(n=><SelectItem key={n} value={String(n)}>Team of {n}</SelectItem>)}</SelectContent></Select></div><div><Label>Partners needed</Label><Select value={String(form.partnersNeeded)} onValueChange={v=>setForm({...form,partnersNeeded:Number(v)})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Array.from({length:form.teamSize-1},(_,i)=>i+1).map(n=><SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent></Select></div></div>
 {enabled.filter(f=>f.label.toLowerCase()!=='phone').map(f=><div key={f.id}><Label htmlFor={`partner-${f.id}`}>{f.label}{f.is_required?' *':''}</Label>{f.field_type==='checkbox' ? <Checkbox id={`partner-${f.id}`} checked={answers[f.id]==='true'} onCheckedChange={v=>setAnswers({...answers,[f.id]:v===true?'true':''})}/> : f.field_type==='dropdown' && f.options ? <Select value={answers[f.id] || ''} onValueChange={v=>setAnswers({...answers,[f.id]:v})}><SelectTrigger id={`partner-${f.id}`}><SelectValue placeholder={`Select ${f.label}`}/></SelectTrigger><SelectContent>{f.options.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>:<Input id={`partner-${f.id}`} required={f.is_required} type={f.field_type==='number'?'number':'text'} maxLength={500} value={answers[f.id] || ''} onChange={e=>setAnswers({...answers,[f.id]:e.target.value})}/>}</div>)}
 <div><Label htmlFor="partner-message">Message to organizer</Label><Textarea id="partner-message" maxLength={1000} value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></div><ContactCaptcha onToken={setToken} resetKey={reset}/>{error && <p role="alert" className="text-destructive text-sm">{error}</p>}<Button disabled={busy || !token} type="submit">{busy?'Submitting…':'Submit partner request'}</Button>
 </form>;
}
