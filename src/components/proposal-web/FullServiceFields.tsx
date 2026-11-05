import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { defaultFullService, fullServiceTotals, money, travelNote, platformNote, type FullServicePricing } from "./pricing";
export default function FullServiceFields({value=defaultFullService(),onChange}:{value?:FullServicePricing;onChange:(p:FullServicePricing)=>void}) {
 const p=value,t=fullServiceTotals(p);
 const update=(patch:Partial<FullServicePricing>)=>onChange({...p,...patch});
 return <fieldset className="web-controls mt-6 space-y-4 border border-border p-5"><legend className="font-semibold">Full Service Management pricing</legend>
 <label className="grid gap-2">Full Service Base Price<Input aria-label="Full Service Base Price" type="number" min="0" step="0.01" required value={p.basePrice} onChange={e=>update({basePrice:Number(e.target.value)})}/><span className="text-sm text-muted-foreground">Typical starting price, change per proposal if needed.</span></label>
 <label className="grid gap-2">Discount Type<select aria-label="Discount Type" className="rounded-md border border-input bg-background p-3" value={p.discountType} onChange={e=>update({discountType:e.target.value as FullServicePricing["discountType"]})}><option value="none">No discount</option><option value="dollar">Dollar amount</option><option value="percentage">Percentage</option></select></label>
 {p.discountType!=="none"&&<><label className="grid gap-2">Discount Amount<Input aria-label="Discount Amount" type="number" min="0" step="0.01" value={p.discountAmount} onChange={e=>update({discountAmount:Number(e.target.value)})}/></label><label className="grid gap-2">Discount Reason<Input value={p.discountReason} onChange={e=>update({discountReason:e.target.value})}/></label><p role="alert">Discount applied, check the Final Price, Deposit, and Valid Until date before sending.</p></>}
 <dl className="space-y-2"><div>Full Service Final Price: {money(t.base)} − {p.discountType==="percentage"?`${p.discountAmount}% (${money(t.discount)})`:money(t.discount)} = {money(t.final)}</div><div>Deposit Due At Agreement: {money(t.final)} × 50% = {money(t.deposit)}, due at agreement</div><div>Balance Due: {money(t.final)} − {money(t.deposit)} = {money(t.balance)}</div></dl>
 <label className="grid gap-2">Balance Due Date<Input value={p.balanceDueDate} onChange={e=>update({balanceDueDate:e.target.value})}/></label>
 <label className="grid gap-2">Payment Terms<Textarea value={p.paymentTerms} onChange={e=>update({paymentTerms:e.target.value})}/></label>
 <label className="grid gap-2">Cancellation Terms<Textarea rows={6} value={p.cancellationTerms} onChange={e=>update({cancellationTerms:e.target.value})}/></label>
 <p>{travelNote}</p><p>{platformNote}</p></fieldset>;
}