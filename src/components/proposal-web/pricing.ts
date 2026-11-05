import { z } from "zod";

export const fullServiceSchema = z.object({
 basePrice: z.number().finite().min(0).max(10000000),
 discountType: z.enum(["none", "dollar", "percentage"]),
 discountAmount: z.number().finite().min(0).max(10000000),
 discountReason: z.string().max(1000),
 balanceDueDate: z.string().trim().min(1).max(1000),
 paymentTerms: z.string().trim().min(1).max(10000),
 cancellationTerms: z.string().trim().min(1).max(10000),
}).superRefine((p, ctx) => {
 if (p.discountType === "percentage" && p.discountAmount > 100) ctx.addIssue({code:"custom",path:["discountAmount"],message:"Percentage discount cannot exceed 100%."});
 if (p.discountType === "dollar" && p.discountAmount > p.basePrice) ctx.addIssue({code:"custom",path:["discountAmount"],message:"Discount cannot exceed the base price."});
});
export type FullServicePricing = z.infer<typeof fullServiceSchema>;
export const defaultFullService = (): FullServicePricing => ({
 basePrice:5000,discountType:"none",discountAmount:0,discountReason:"",balanceDueDate:"7 days before event day",
 paymentTerms:"50 percent deposit due at agreement. Balance due 7 days before event day. Deposit is non refundable after agreement.",
 cancellationTerms:"If the event cancels, the deposit is non refundable after agreement, and a work fee applies for work already done, starting at $1,500 after course negotiation and platform build, $3,000 after registration launch and sponsor packet, and the full Full Service Final Price within 30 days of the event. If the event postpones once to a new date, the fee moves with it at no extra charge.",
});
export const travelNote="Travel is quoted separately, on top of the Full Service Management price.";
export const platformNote="The Full Service Management price is the management fee only. The 5 percent platform fee is paid by players at checkout, not by the organizer, and it does not reduce the Full Service Management price. Stripe processing, 2.9 percent plus $0.30, is separate.";
export const managementLimits="TeeVents negotiates on your behalf, but does not pay for course, food, awards, or vendor costs. TeeVents does not guarantee a player count, sponsorship dollars, or profit. Travel is quoted separately.";
export const managementPlatformFee="Platform stays No Cost to Start. Players pay the 5 percent platform fee at checkout. Stripe processing is separate. The Full Service Management price does not reduce, and is not reduced by, the 5 percent platform fee.";
export const choiceConfirmation="Thanks, we received your choice. Rod will follow up to confirm and send your next steps.";
export function fullServiceTotals(p:FullServicePricing) {
 const base=Math.round(p.basePrice*100);
 const discount=p.discountType==="none"?0:p.discountType==="dollar"?Math.round(p.discountAmount*100):Math.round(base*p.discountAmount/100);
 const final=base-discount;const deposit=Math.round(final/2);
 return {base:base/100,discount:discount/100,final:final/100,deposit:deposit/100,balance:(final-deposit)/100};
}
export const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n);
export function canChooseProgram(status:string, selected:readonly string[], chosen:string, validUntil:string, now=new Date()) {
 if(status!=="sent"||!selected.includes(chosen))return false;
 const date=validUntil.trim();
 if(!date)return true;
 const parsed=Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(date)?`${date}T23:59:59.999Z`:date);
 return !Number.isFinite(parsed)||now.getTime()<=parsed;
}