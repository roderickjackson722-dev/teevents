import { z } from "zod";
export const proposalTypes = ["No Cost to Start", "Per Event", "Per League", "Enterprise", "Hybrid Managed", "Full Service Planning"] as const;
export const proposalStatuses = ["Draft", "Sent", "Accepted", "Declined", "Expired"] as const;
export const aboutTemplate = "I am Rod, founder of TeeVents. I have run golf tournaments for more than a decade, including some of the largest HBCU tournaments, so I built TeeVents for the work I was doing by hand.\n\nTeeVents is a golf tournament and event management platform, built for organizers who want one branded page for the whole event, from registration and sponsorships to pairings, live scoring, and check in.\n\nAt TeeVents, we are a team of golf tournament directors, and every plan includes a dedicated rep. We bring that tournament day experience to your event, from planning through event day.\n\n- Tournament director for more than 10 years\n- Organizing golf tournaments since 2017\n- Worked for Troon Golf and Cleveland Golf\n- Golfer since the late 1990s";
export const templates: Record<string, Record<string,string>> = {
  "No Cost to Start": {
    "Price": "$0 to start",
    "Platform fee": "5 percent, paid by players at checkout",
    "Includes": "10 manual entries, dedicated rep, event page built for you, live in 7 days or less",
    "Scope": "Branded event page, registration, sponsor tiers, pairings, check in, live scoring only if the $99 Live Leaderboard and Mobile Scoring add on is added, sponsor and auction tools, live budget tracking",
    "Payment schedule": "No plan purchase due at signing. Platform fee is paid by players at checkout. Stripe processing is separate.",
    "Cancellation": "Plan purchases are non refundable on cancellation. If a golfer registration is refunded, the 5 percent platform fee stays with TeeVents. TeeVents does not issue refunds directly to golfers. Refunds to golfers are at the organizer discretion, and are issued by the organizer."
  },
  "Per Event": {
    "Price": "$399 per event — MOST POPULAR",
    "Platform fee": "0 percent TeeVents platform fee",
    "Includes": "Live Leaderboard and Mobile Scoring included, unlimited manual entries, dedicated rep, event page built for you, live in 7 days or less",
    "Scope": "Branded event page, registration, sponsor tiers, pairings, check in, live scoring, sponsor and auction tools, live budget tracking",
    "Payment schedule": "$399 per event. Stripe processing is separate.",
    "Cancellation": "The $399 Per Event purchase is non refundable on cancellation. A postponed event $399 moves to the new date at no extra charge. If a golfer registration is refunded, the organizer absorbs Stripe processing. TeeVents does not issue refunds directly to golfers."
  },
  "Per League": {
    "Price": "$599 per league",
    "Platform fee": "",
    "Includes": "Core platform tools for league play, dedicated rep",
    "Scope": "Branded event page, registration, sponsor tiers, pairings, check in, live scoring, sponsor and auction tools, live budget tracking, for league play",
    "Payment schedule": "$599 per league. Stripe processing is separate.",
    "Cancellation": "Plan purchases are non refundable on cancellation. TeeVents does not issue refunds directly to golfers."
  },
  "Enterprise": {
    "Price": "$2,999 per year, for 10 or more events",
    "Platform fee": "0 percent TeeVents platform fee",
    "Includes": "Annual plan for golf courses, whole calendar in one place, dedicated rep",
    "Scope": "Branded event pages, registration, sponsor tiers, pairings, check in, live scoring, sponsor and auction tools, live budget tracking, for the whole course calendar",
    "Payment schedule": "$2,999 per year. Stripe processing is separate.",
    "Cancellation": "Plan purchases are non refundable on cancellation. TeeVents does not issue refunds directly to golfers."
  },
  "Hybrid Managed": {
    "Price": "Starting at $5,000 per event, plus travel quoted separately",
    "Platform fee": "Platform stays No Cost to Start. Players pay the 5 percent platform fee at checkout. Stripe processing is separate. The $5,000 management fee is separate from, and in addition to, the 5 percent platform fee. The platform fee is paid by players at checkout, not by the organizer, and it does not reduce the $5,000 management fee.",
    "Includes": "Dedicated manager from agreement through event day, minimum field of 50 players, events planned months in advance, signed agreement required before management work starts",
    "Scope": "Branded TeeVents event page, registration, and sponsor tiers, course negotiation and course communication, food, awards, and vendor recommendations and negotiations, sponsor packets and tiers provided for the group to sell, pairings, check in setup, and live scoring, timeline and consulting throughout, on site event day coordination, post event closeout",
    "Group handles": "Recruiting players, selling sponsorships, paying course, food, awards, and vendor costs directly, providing logo, tournament details, and one board contact who can approve decisions",
    "Limits": "TeeVents negotiates on your behalf, but does not pay for course, food, awards, or vendor costs. TeeVents does not guarantee a player count, sponsorship dollars, or profit. TeeVents does not sell sponsorships for the group.",
    "Payment schedule": "$0 due at signing. $1,875 is due when $3,750 in registrations and sponsorships has been collected through TeeVents. Remaining $3,125 is due 7 days before event day. Only registrations and sponsorships collected through TeeVents count toward the $3,750 trigger. Payments taken outside TeeVents do not count toward the trigger and do not reduce the fee. The organizer is liable for the full $5,000, even if proceeds are low.",
    "Cancellation": "If the event cancels, a work fee applies for work already done: $1,500 after course negotiation and platform build, $3,000 after registration launch and sponsor packet, and the full $5,000 within 30 days of the event. If the event postpones once to a new date, the fee moves with it at no extra charge."
  },
  "Full Service Planning": {
    "Price": "Starting at $5,000 per event, plus travel quoted separately",
    "Platform fee": "Platform stays No Cost to Start. Players pay the 5 percent platform fee at checkout. Stripe processing is separate.",
    "Includes": "Dedicated manager from agreement through event day",
    "Minimum field and lead time": "",
    "Scope": "Branded TeeVents event page, registration, and sponsor tiers, course negotiation and course communication, food, awards, and vendor recommendations and negotiations, sponsor packets and tiers, pairings, check in setup, and live scoring, timeline and consulting throughout, on site event day coordination, post event closeout",
    "Group handles": "Recruiting players, selling sponsorships, paying course, food, awards, and vendor costs directly, providing logo, tournament details, and one contact who can approve decisions",
    "Limits": "TeeVents negotiates on your behalf, but does not pay for course, food, awards, or vendor costs. TeeVents does not guarantee a player count, sponsorship dollars, or profit.",
    "Payment schedule": "$0 due at signing. $1,875 is due when $3,750 in registrations and sponsorships has been collected through TeeVents. Remaining $3,125 is due 7 days before event day. Only collections through TeeVents count toward the trigger. The organizer is liable for the full $5,000, even if proceeds are low.",
    "Cancellation": "If the event cancels, a work fee applies for work already done: $1,500 after course negotiation and platform build, $3,000 after registration launch and sponsor packet, and the full $5,000 within 30 days of the event. If the event postpones once to a new date, the fee moves with it at no extra charge."
  }
};
export const typeWarning = "Changing the proposal type will replace the template pricing, scope, payment, and cancellation text. Your custom line items, About text, and basic information will stay.";
export const deleteWarning = "Are you sure you want to delete this proposal? This does not delete any tournament or event.";
export const footerNote = "This proposal is a draft until accepted in writing. Prices, travel, and third party costs are as stated in this proposal, and third party costs are paid directly by the organizer unless stated otherwise in a custom line item.";
export const basicFields = ["Client or Organization Name", "Contact Name", "Contact Email", "Event Name", "Event Date", "Course", "Location", "Expected Field or Players", "Proposal Date", "Valid Until", "Prepared By"] as const;
export const addonNames = ["Live Leaderboard and Mobile Scoring", "Unlimited Manual Entries", "Auction Dashboard", "Branding Removal and Digital Sponsor", "Custom Domain"];
const itemSchema = z.object({ id:z.string(), description:z.string().max(2000), quantity:z.number().finite().min(0).max(1000000), unitPrice:z.number().finite().min(0).max(100000000), kind:z.enum(["package","travel","custom","addon"]) });
export const proposalSchema = z.object({ basic:z.record(z.string().max(10000)), about:z.string().max(50000), type:z.union([z.enum(proposalTypes), z.literal("")]), sections:z.record(z.string().max(50000)), items:z.array(itemSchema).max(300) });
export type Proposal = z.infer<typeof proposalSchema>;
export type ProposalRow = { id:string; created_at:string; updated_at:string; status:typeof proposalStatuses[number]; payload:Proposal };
export const packagePrices: Record<string,number> = {"No Cost to Start":0,"Per Event":399,"Per League":599,"Enterprise":2999,"Hybrid Managed":5000,"Full Service Planning":5000};
export function newProposal():Proposal { return { basic:{"Prepared By":"TeeVents"}, about:aboutTemplate, type:"", sections:{}, items:[{id:crypto.randomUUID(),description:"Travel",quantity:1,unitPrice:0,kind:"travel"}] }; }
export function changeProposalType(p:Proposal,type:typeof proposalTypes[number]):Proposal {
 const sections={...templates[type]};
 if(type === "Per League") sections["Platform fee"]="";
 return {...p,type,sections,items:[{id:crypto.randomUUID(),description:type,quantity:1,unitPrice:packagePrices[type],kind:"package"},...p.items.filter(i=>i.kind!=="package" && !(i.kind==="addon" && i.description===addonNames[0] && type!=="No Cost to Start"))]};
}
export function itemAmount(item:Proposal["items"][number]) { return Math.round(item.quantity*item.unitPrice*100)/100; }
export function proposalTotal(p:Proposal) { return Math.round(p.items.reduce((sum,i)=>sum+itemAmount(i),0)*100)/100; }
export function duplicateProposal(row:ProposalRow) { return {status:"Draft" as const,payload:structuredClone(row.payload)}; }
export function assertProposalAdmin(isAdmin:unknown) { if(isAdmin!==true) throw new Error("Platform admin access is required."); }
export const money = (amount:number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(amount);
