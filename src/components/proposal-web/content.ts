import { z } from "zod";
export const programs = {
  "No Cost to Start": {
    "Price": "$0 to start",
    "Platform fee": "5%, paid by players at checkout",
    "Includes": "10 manual entries, dedicated rep, event page built for you, live in 7 days or less",
    "What We Provide": "Branded event page, registration, sponsor tiers, pairings, check in, live scoring only if the $99 Live Leaderboard and Mobile Scoring add on is added, sponsor and auction tools, live budget tracking",
    "Payment Schedule": "No plan purchase due at signing. Platform fee is paid by players at checkout. Stripe processing is separate.",
    "Cancellation": "Plan purchases are non refundable on cancellation. If a golfer registration is refunded, the 5% platform fee stays with TeeVents. TeeVents does not issue refunds directly to golfers. Refunds to golfers are at the organizer discretion, and are issued by the organizer."
  },
  "Per Event": {
    "Price": "$399 per event",
    "Platform fee": "0% TeeVents platform fee",
    "Includes": "Live Leaderboard and Mobile Scoring included, unlimited manual entries, dedicated rep, event page built for you, live in 7 days or less",
    "What We Provide": "Branded event page, registration, sponsor tiers, pairings, check in, live scoring, sponsor and auction tools, live budget tracking",
    "Payment Schedule": "$399 per event. Stripe processing is separate.",
    "Cancellation": "The $399 Per Event purchase is non refundable on cancellation. A postponed event $399 moves to the new date at no extra charge. If a golfer registration is refunded, the organizer absorbs Stripe processing. TeeVents does not issue refunds directly to golfers."
  },
  "Per League": {
    "Price": "$599 per league",
    "Includes": "Core platform tools for league play, dedicated rep",
    "What We Provide": "Branded event page, registration, sponsor tiers, pairings, check in, live scoring, sponsor and auction tools, live budget tracking, for league play",
    "Payment Schedule": "$599 per league. Stripe processing is separate.",
    "Cancellation": "Plan purchases are non refundable on cancellation. TeeVents does not issue refunds directly to golfers."
  },
  "Enterprise": {
    "Price": "$2,999 per year, for 10 or more events",
    "Platform fee": "0% TeeVents platform fee",
    "Includes": "Annual plan for golf courses, whole calendar in one place, dedicated rep",
    "What We Provide": "Branded event pages, registration, sponsor tiers, pairings, check in, live scoring, sponsor and auction tools, live budget tracking, for the whole course calendar",
    "Payment Schedule": "$2,999 per year. Stripe processing is separate.",
    "Cancellation": "Plan purchases are non refundable on cancellation. TeeVents does not issue refunds directly to golfers."
  },
  "Hybrid Managed": {
    "Price": "Starting at $5,000 per event, plus travel quoted separately",
    "Platform fee": "Platform stays No Cost to Start. Players pay the 5% platform fee at checkout. Stripe processing is separate. The $5,000 management fee is separate from, and in addition to, the 5% platform fee. The platform fee is paid by players at checkout, not by the organizer, and it does not reduce the $5,000 management fee.",
    "Includes": "Dedicated manager from agreement through event day, minimum field of 50 players, events planned months in advance, signed agreement required before management work starts",
    "What We Provide": "Branded TeeVents event page, registration, sponsor tiers, course negotiation and course communication, food, awards, and vendor recommendations and negotiations, sponsor packets and tiers provided for the group to sell, pairings, check in setup, live scoring, timeline and consulting throughout, on site event day coordination, post event closeout",
    "Your Group Handles": "Recruiting players, selling sponsorships, paying course, food, awards, and vendor costs directly, providing logo, tournament details, and one board contact who can approve decisions",
    "Limits": "TeeVents negotiates on your behalf, but does not pay for course, food, awards, or vendor costs. TeeVents does not guarantee a player count, sponsorship dollars, or profit. TeeVents does not sell sponsorships for the group.",
    "Payment Schedule": "$0 due at signing. $1,875 is due when $3,750 in registrations and sponsorships has been collected through TeeVents. Remaining $3,125 is due 7 days before event day. Only registrations and sponsorships collected through TeeVents count toward the $3,750 trigger. Payments taken outside TeeVents do not count toward the trigger and do not reduce the fee. The organizer is liable for the full $5,000, even if proceeds are low.",
    "Cancellation": "If the event cancels, a work fee applies for work already done: $1,500 after course negotiation and platform build, $3,000 after registration launch and sponsor packet, and the full $5,000 within 30 days of the event. If the event postpones once to a new date, the fee moves with it at no extra charge."
  },
  "Full Service Planning": {
    "Price": "Starting at $5,000 per event, plus travel quoted separately",
    "Platform fee": "Platform stays No Cost to Start. Players pay the 5% platform fee at checkout. Stripe processing is separate.",
    "Includes": "Dedicated manager from agreement through event day",
    "What We Provide": "Branded TeeVents event page, registration, sponsor tiers, course negotiation and course communication, food, awards, and vendor recommendations and negotiations, sponsor packets and tiers, pairings, check in setup, live scoring, timeline and consulting throughout, on site event day coordination, post event closeout",
    "Your Group Handles": "Recruiting players, selling sponsorships, paying course, food, awards, and vendor costs directly, providing logo, tournament details, and one contact who can approve decisions",
    "Limits": "TeeVents negotiates on your behalf, but does not pay for course, food, awards, or vendor costs. TeeVents does not guarantee a player count, sponsorship dollars, or profit.",
    "Payment Schedule": "$0 due at signing. $1,875 is due when $3,750 in registrations and sponsorships has been collected through TeeVents. Remaining $3,125 is due 7 days before event day. Only collections through TeeVents count toward the trigger. The organizer is liable for the full $5,000, even if proceeds are low.",
    "Cancellation": "If the event cancels, a work fee applies for work already done: $1,500 after course negotiation and platform build, $3,000 after registration launch and sponsor packet, and the full $5,000 within 30 days of the event. If the event postpones once to a new date, the fee moves with it at no extra charge."
  }
} as const;
export const programNames = Object.keys(programs) as Array<keyof typeof programs>;
export const faq = [
  [
    "Do we need money up front to start?",
    "No money is due at signing on No Cost to Start, Hybrid Managed, and Full Service Planning, as stated in each program detail. The management fee on Hybrid Managed and Full Service Planning is approved in the event budget at signing, and is paid from event proceeds."
  ],
  [
    "What happens if we raise less than expected on Hybrid Managed?",
    "The organizer is liable for the full $5,000 management fee, even if proceeds are low."
  ],
  [
    "Who pays the golf course, food, awards, and vendors?",
    "The group pays those costs directly. TeeVents negotiates on your behalf, but does not pay for them."
  ],
  [
    "Do you sell sponsorships for us?",
    "No. TeeVents provides sponsor packets and tiers, and your group sells sponsorships."
  ],
  [
    "What if we cancel?",
    "See the Cancellation section in the selected program detail. For Hybrid Managed and Full Service Planning, a work fee applies for work already done, starting at $1,500, and up to the full $5,000 within 30 days of the event."
  ],
  [
    "Is travel included?",
    "No. Travel is quoted separately, on top of the $5,000 management fee on Hybrid Managed and Full Service Planning."
  ]
];
export const about = ["I am Rod, founder of TeeVents. I have run golf tournaments for more than a decade, including some of the largest HBCU tournaments, so I built TeeVents for the work I was doing by hand.", "TeeVents is a golf tournament and event management platform, built for organizers who want one branded page for the whole event, from registration and sponsorships to pairings, live scoring, and check in.", "At TeeVents, we are a team of golf tournament directors, and every plan includes a dedicated rep who builds your event page for you, so you are live in 7 days or less."];
export const fields = { preparedFor: "[Client or Organization Name]", event: "[Event Name]", date: "[Event Date, or TBD]", contact: "[Contact Name]", proposalDate: "[Proposal Date]", validUntil: "[Valid Until, or blank]", conversationDate: "[Date You Spoke With The Client]" };
export const introExample = "It was great speaking with you on [Conversation Date]. Based on what I understand, I feel the [Recommended Program] package will be best for your organization.";
export const reasonExample = "[Personalized Reason: in 1 to 2 short sentences, say why this program fits this organization, based on your conversation, for example, no money up front, a single event, a full calendar, or a full tournament manager with no money up front.]";
const programEnum=z.enum(["No Cost to Start","Per Event","Per League","Enterprise","Hybrid Managed","Full Service Planning"]);
export const documentSchema = z.object({ fields: z.object({preparedFor:z.string().max(300),event:z.string().max(300),date:z.string().max(300),contact:z.string().max(300),proposalDate:z.string().max(300),validUntil:z.string().max(300),conversationDate:z.string().max(300)}), recommended: z.union([programEnum,z.literal("")]), packages: z.array(programEnum).max(6).optional(), intro:z.string().max(10000), reason:z.string().max(10000) });
export type WebDocument = z.infer<typeof documentSchema>;
export const emptyDocument = ():WebDocument => ({fields:Object.fromEntries(Object.keys(fields).map(k=>[k,""])) as WebDocument["fields"],recommended:"",packages:[...programNames],intro:introExample,reason:reasonExample});
export const fallbackAnswer = "That is not in this proposal, so I will pass that question to Rod, and he will follow up. Thank you for asking.";
export function sensitiveQuestion(q:string) { return /(password|bank account|card number|routing number|cvv|social security)|(?:\d[ -]?){12,19}/i.test(q); }
export function calculator(players:number,fee:number) { const registrations=Math.max(0,players)*Math.max(0,fee); return {registrations,trigger:registrations>=3750,first:1875,balance:3125}; }
export function introText(d:WebDocument) { return d.intro.replaceAll("[Conversation Date]",d.fields.conversationDate||"[Conversation Date]").replaceAll("[Recommended Program]",d.recommended||"[Recommended Program]"); }
export function answerQuestion(q:string,d:WebDocument) {
 const n=q.toLowerCase().trim().replace(/[?!.]+$/g,"");
 if (/discount|custom price|guarantee|change|different|reduce|waive|book|accept|pay now/.test(n)) return fallbackAnswer;
 const f=faq.find(([question])=>question.toLowerCase().replace(/\?$/," ").trim()===n);
 if(f)return `${f[1]}\n\nFrom Common Questions in this proposal.`;
 if(n==="what program do you recommend" || n==="what is the recommended program") return `${introText(d)}\n${d.reason}\n\nFrom A Quick Note From Rod in this proposal.`;
 const p=programNames.find(name=>n.includes(name.toLowerCase()));
 if(p){const key=n.includes("cancel")?"Cancellation":n.includes("payment")?"Payment Schedule":n.includes("price")||n.includes("cost")?"Price":n.includes("include")?"Includes":null;
 if(key) return `${programs[p][key]}\n\nFrom the ${p} ${key} in this proposal.`;}
 return fallbackAnswer;
}

/** Packages shown to the client; older copies without a choice show all six. */
export function shownPrograms(d:WebDocument){const set=d.packages;return set?programNames.filter(p=>set.includes(p)):programNames;}
