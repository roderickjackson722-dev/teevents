import { z } from "zod";
import { fullServiceSchema, defaultFullService, fullServiceTotals, money, managementLimits, managementPlatformFee } from "./pricing";
import { SOFTWARE_TAG, MANAGED_TAG, SOFTWARE_DEFINITION, MANAGED_DEFINITION, ON_SITE_HEADING, ON_SITE_BULLETS, FULL_SERVICE_PRICE, FULL_SERVICE_SCOPE, FULL_SERVICE_GROUP, FULL_SERVICE_LIMITS } from "@/lib/programTypes";
export const programs = {
  "Full Service Management": {
    "Type": MANAGED_TAG,
    "Price": FULL_SERVICE_PRICE,
    "Definition": MANAGED_DEFINITION,
    "What We Provide": FULL_SERVICE_SCOPE,
    [ON_SITE_HEADING]: ON_SITE_BULLETS.join(". ") + ".",
    "Your Group Handles": FULL_SERVICE_GROUP,
    "Limits": FULL_SERVICE_LIMITS,
  },
  "No Cost to Start": {
    "Type": SOFTWARE_TAG,
    "Price": "$0 to start",
    "Definition": SOFTWARE_DEFINITION,
    "Platform fee": "5%, paid by players at checkout",
    "Includes": "10 manual entries, dedicated rep, event page built for you, live in 7 days or less",
    "What We Provide": "Branded event page, registration, sponsor tiers, pairings, check in, live scoring only if the $99 Live Leaderboard and Mobile Scoring add on is added, sponsor and auction tools, live budget tracking",
    "Payment Schedule": "No plan purchase due at signing. Platform fee is paid by players at checkout. Stripe processing is separate.",
    "Cancellation": "Plan purchases are non refundable on cancellation. If a golfer registration is refunded, the 5% platform fee stays with TeeVents. TeeVents does not issue refunds directly to golfers. Refunds to golfers are at the organizer discretion, and are issued by the organizer."
  },
  "Per Event": {
    "Type": SOFTWARE_TAG,
    "Price": "$399 per event",
    "Definition": SOFTWARE_DEFINITION,
    "Platform fee": "0% TeeVents platform fee",
    "Includes": "Live Leaderboard and Mobile Scoring included, unlimited manual entries, dedicated rep, event page built for you, live in 7 days or less",
    "What We Provide": "Branded event page, registration, sponsor tiers, pairings, check in, live scoring, sponsor and auction tools, live budget tracking",
    "Payment Schedule": "$399 per event. Stripe processing is separate.",
    "Cancellation": "The $399 Per Event purchase is non refundable on cancellation. A postponed event $399 moves to the new date at no extra charge. If a golfer registration is refunded, the organizer absorbs Stripe processing. TeeVents does not issue refunds directly to golfers."
  },
  "Per League": {
    "Type": SOFTWARE_TAG,
    "Price": "$599 per league",
    "Definition": SOFTWARE_DEFINITION,
    "Includes": "Core platform tools for league play, dedicated rep",
    "What We Provide": "Branded event page, registration, sponsor tiers, pairings, check in, live scoring, sponsor and auction tools, live budget tracking, for league play",
    "Payment Schedule": "$599 per league. Stripe processing is separate.",
    "Cancellation": "Plan purchases are non refundable on cancellation. TeeVents does not issue refunds directly to golfers."
  },
  "Enterprise": {
    "Type": SOFTWARE_TAG,
    "Price": "$2,999 per year, for 10 or more events",
    "Definition": SOFTWARE_DEFINITION,
    "Platform fee": "0% TeeVents platform fee",
    "Includes": "Annual plan for golf courses, whole calendar in one place, dedicated rep",
    "What We Provide": "Branded event pages, registration, sponsor tiers, pairings, check in, live scoring, sponsor and auction tools, live budget tracking, for the whole course calendar",
    "Payment Schedule": "$2,999 per year. Stripe processing is separate.",
    "Cancellation": "Plan purchases are non refundable on cancellation. TeeVents does not issue refunds directly to golfers."
  },
  "Hybrid Managed": {
    "Type": MANAGED_TAG,
    "Price": "Starting at $5,000 per event, plus travel quoted separately",
    "Definition": MANAGED_DEFINITION,
    "Platform fee": "Platform stays No Cost to Start. Players pay the 5% platform fee at checkout. Stripe processing is separate. The $5,000 management fee is separate from, and in addition to, the 5% platform fee. The platform fee is paid by players at checkout, not by the organizer, and it does not reduce the $5,000 management fee.",
    "Includes": "Dedicated manager from agreement through event day, minimum field of 50 players, events planned months in advance, signed agreement required before management work starts",
    "What We Provide": "Branded TeeVents event page, registration, sponsor tiers, course negotiation and course communication, food, awards, and vendor recommendations and negotiations, sponsor packets and tiers provided for the group to sell, pairings, check in setup, live scoring, timeline and consulting throughout, on site event day coordination, post event closeout",
    [ON_SITE_HEADING]: ON_SITE_BULLETS.join(". ") + ".",
    "Your Group Handles": "Recruiting players, selling sponsorships, paying course, food, awards, and vendor costs directly, providing logo, tournament details, and one board contact who can approve decisions",
    "Limits": "TeeVents negotiates on your behalf, but does not pay for course, food, awards, or vendor costs. TeeVents does not guarantee a player count, sponsorship dollars, or profit. TeeVents does not sell sponsorships for the group.",
    "Payment Schedule": "$0 due at signing. $1,875 is due when $3,750 in registrations and sponsorships has been collected through TeeVents. Remaining $3,125 is due 7 days before event day. Only registrations and sponsorships collected through TeeVents count toward the $3,750 trigger. Payments taken outside TeeVents do not count toward the trigger and do not reduce the fee. The organizer is liable for the full $5,000, even if proceeds are low.",
    "Cancellation": "If the event cancels, a work fee applies for work already done: $1,500 after course negotiation and platform build, $3,000 after registration launch and sponsor packet, and the full $5,000 within 30 days of the event. If the event postpones once to a new date, the fee moves with it at no extra charge."
  },
  "Full Service Planning": {
    "Type": MANAGED_TAG,
    "Price": "Starting at $5,000 per event, plus travel quoted separately",
    "Definition": MANAGED_DEFINITION,
    "Platform fee": "Platform stays No Cost to Start. Players pay the 5% platform fee at checkout. Stripe processing is separate.",
    "Includes": "Dedicated manager from agreement through event day",
    "What We Provide": "Branded TeeVents event page, registration, sponsor tiers, course negotiation and course communication, food, awards, and vendor recommendations and negotiations, sponsor packets and tiers, pairings, check in setup, live scoring, timeline and consulting throughout, on site event day coordination, post event closeout",
    [ON_SITE_HEADING]: ON_SITE_BULLETS.join(". ") + ".",
    "Your Group Handles": "Recruiting players, selling sponsorships, paying course, food, awards, and vendor costs directly, providing logo, tournament details, and one contact who can approve decisions",
    "Limits": "TeeVents negotiates on your behalf, but does not pay for course, food, awards, or vendor costs. TeeVents does not guarantee a player count, sponsorship dollars, or profit.",
    "Payment Schedule": "A 50% deposit of the management fee is due at initial sign up ($2,500 on a $5,000 fee). The remaining 50% ($2,500) is due 7 days before event day. The organizer is liable for the full management fee, even if proceeds are low.",
    "Cancellation": "If the event cancels, a work fee applies for work already done: $1,500 after course negotiation and platform build, $3,000 after registration launch and sponsor packet, and the full $5,000 within 30 days of the event. If the event postpones once to a new date, the fee moves with it at no extra charge."
  }
} as const;
export const programNames = ["No Cost to Start", "Per Event", "Per League", "Enterprise", "Hybrid Managed", "Full Service Planning", "Full Service Management"] as const;
export const currentProgramNames = ["No Cost to Start", "Per Event", "Per League", "Enterprise", "Full Service Management"] as const;
export const currentFaq = [
 ["How do I request Full Service Management?", "Full Service Management is quoted in this proposal, after a meeting. The price, deposit, and terms are in the Full Service Management details above. No payment is taken on this page."],
 ["Who pays the golf course, food, awards, and vendors?", FULL_SERVICE_LIMITS],
 ["What if we cancel?", "Software cancellation terms remain in the selected program detail. Full Service Management terms are quoted individually after the meeting, in a written proposal."],
 ["Is travel included?", "Travel is quoted separately."],
];
export const faq = [
  [
    "Do we need money up front to start?",
    "No money is due at signing on No Cost to Start and Hybrid Managed. Full Service Planning takes a 50% deposit of the management fee at initial sign up ($2,500 on a $5,000 fee), as stated in its program detail. The Hybrid Managed management fee is approved in the event budget at signing, and is paid from event proceeds."
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
/**
 * Starting points for the Personalized Reason box. Each one fills the box with
 * editable text; bracketed tokens such as [Organization] are for the admin to
 * replace or delete before saving. Nothing here is sent automatically.
 */
export const reasonTemplates: Array<{ program: keyof typeof programs; label: string; text: string }> = [
  {
    program: "No Cost to Start",
    label: "Experienced group, new platform",
    text: "You have run tournaments before, likely on another platform, so you do not need to be walked through the process — you want one page that works and a cost you can see before you commit. No Cost to Start puts your branded event page, registration, sponsorships, pairings, check in, and live budget tracking in one place with no plan purchase up front, and players pay the 5% platform fee at checkout. A dedicated TeeVents rep still builds the event page for you."
  },
  {
    program: "No Cost to Start",
    label: "Wants to see the cost to start",
    text: "You asked what it costs to get an event live, so I want to be plain about it: No Cost to Start has no plan purchase, and players pay the 5% platform fee at checkout. Your group still gets a branded event page built for you by a dedicated TeeVents rep, along with registration and sponsorships, pairings, check in, and live budget tracking, so you can see how the event performs before deciding on a paid plan."
  },
  {
    program: "Per Event",
    label: "Experienced group, known field",
    text: "Your group already knows its field — roughly [number of golfers] players for one event — and that makes a flat plan the cleaner fit. Per Event is $399 for the event with no TeeVents platform fee, so your net stays predictable, and Live Leaderboard and Mobile Scoring plus unlimited manual entries are included. A dedicated TeeVents rep still builds the event page for you."
  },
  {
    program: "Per League",
    label: "Many events under one master title",
    text: "You are not planning a single tournament — you are running a season of events under one master title. Per League covers that at $599 for the league, so your dates, rosters, and registrations sit under one branded page instead of a separate setup each time. A dedicated TeeVents rep builds the league page with you and stays on the account through the season."
  },
  {
    program: "Enterprise",
    label: "Ten or more events, or a course calendar",
    text: "You are running 10 or more events, which is a calendar to manage rather than an event to plan. Enterprise puts the whole calendar on one annual plan at $2,999 with no TeeVents platform fee, so every date carries the same branded page, registration, sponsorships, pairings, check in, live scoring, and budget tracking. A dedicated TeeVents rep works with your team across the year, and new dates go up without starting over."
  },
  {
    program: "Full Service Planning",
    label: "New to running a golf tournament",
    text: "[Organization] has not run a golf tournament before, and the work behind one is easy to underestimate: course negotiation and communication, tee times and pairings, food and vendor arrangements, sponsor packets, and weeks of back and forth with participants. Full Service Planning puts a dedicated manager on your event from agreement through event day, starting at $5,000 with a 50% deposit at initial sign up. Your group keeps the parts that matter to you — recruiting players, selling sponsorships, and approving decisions."
  },
  {
    program: "Full Service Planning",
    label: "Experienced committee, no time",
    text: "Your committee has run events before, but the hours behind one land on the same few people every year. Full Service Planning hands the logistics to a dedicated manager — course communication, vendors, sponsor packets, pairings, check in, and event day coordination — starting at $5,000 with a 50% deposit at initial sign up, so your team can stay focused on recruiting players and selling sponsorships."
  },
  {
    program: "Hybrid Managed",
    label: "Personalized offer for a special audience",
    text: "Your audience is a specific one, so I built this for [Organization] rather than pointing at a standard package. Hybrid Managed covers the same ground as Full Service Planning — course negotiation and communication, vendors, sponsor packets, pairings, check in, live scoring, event day coordination, and closeout — at a management rate that reflects the extra attention your event needs, with a dedicated TeeVents manager handling your registration and payment flow end to end. It starts at $5,000 with nothing due at signing, and the management fee is approved in the event budget."
  },
  { program: "Full Service Management", label: "Dedicated manager, quoted for your event", text: "Full Service Management gives [Organization] a dedicated manager from agreement through on site event day coordination and post event closeout. Your group recruits players, sells sponsorships, and approves decisions. Contact us for a quote tailored to your event." }
];
/** Templates for the program picked in Recommended Program come first in the editor. */
export function orderedReasonTemplates(recommended: string, current = false) {
  const available = current ? reasonTemplates.filter(t => currentProgramNames.includes(t.program as never)) : reasonTemplates;
  return [...available.filter(t => t.program === recommended), ...available.filter(t => t.program !== recommended)];
}
/** Fills the Personalized Reason box: replaces the placeholder, otherwise appends, and never repeats. */
export function withReason(current: string, text: string) {
  if (!text.trim()) return current;
  if (current.includes(text)) return current;
  const base = current.trim() && current !== reasonExample ? current.trimEnd() : "";
  return base ? `${base}\n\n${text}` : text;
}
const programEnum=z.enum(["No Cost to Start","Per Event","Per League","Enterprise","Hybrid Managed","Full Service Planning","Full Service Management"]);
export const documentSchema = z.object({ fields: z.object({preparedFor:z.string().max(300),event:z.string().max(300),date:z.string().max(300),contact:z.string().max(300),proposalDate:z.string().max(300),validUntil:z.string().max(300),conversationDate:z.string().max(300)}), recommended: z.union([programEnum,z.literal("")]), packages: z.array(programEnum).max(7).optional(), intro:z.string().max(10000), reason:z.string().max(10000), fullService:fullServiceSchema.optional(), closureEnabled:z.boolean().optional() });
export type WebDocument = z.infer<typeof documentSchema>;
export const emptyDocument = ():WebDocument => ({fields:Object.fromEntries(Object.keys(fields).map(k=>[k,""])) as WebDocument["fields"],recommended:"",packages:["No Cost to Start","Per Event","Full Service Management"],intro:introExample,reason:reasonExample,fullService:defaultFullService(),closureEnabled:true});
export const fallbackAnswer = "That is not in this proposal, so I will pass that question to Rod, and he will follow up. Thank you for asking.";
export function sensitiveQuestion(q:string) { return /(password|bank account|card number|routing number|cvv|social security)|(?:\d[ -]?){12,19}/i.test(q); }
export function calculator(players:number,fee:number) { const registrations=Math.max(0,players)*Math.max(0,fee); return {registrations,trigger:registrations>=3750,first:1875,balance:3125}; }
export const founderExperience = "I have over a decade of experience as a tournament director and in organizing golf tournaments, after working in the golf industry for more than 20 years, including time with the largest golf management company in the world and one of the largest golf manufacturers in the world. That experience is built into every TeeVents event.";
/** Fills [Organization] in the Personalized Reason with the Prepared for name. */
export function reasonText(d:WebDocument) { return d.reason.replaceAll("[Organization]",d.fields.preparedFor||"[Organization]"); }
export function introText(d:WebDocument) { return d.intro.replaceAll("[Conversation Date]",d.fields.conversationDate||"[Conversation Date]").replaceAll("[Recommended Program]",d.recommended||"[Recommended Program]"); }
export function answerQuestion(q:string,d:WebDocument) {
 const n=q.toLowerCase().trim().replace(/[?!.]+$/g,"");
 if (/discount|custom price|guarantee|change|different|reduce|waive|book|accept|pay now/.test(n)) return fallbackAnswer;
 const availableFaq = isCurrentDocument(d) ? currentFaq : faq;
 const f=availableFaq.find(([question])=>question.toLowerCase().replace(/\?$/," ").trim()===n);
 if(f)return `${f[1]}\n\nFrom Common Questions in this proposal.`;
 if(n==="what program do you recommend" || n==="what is the recommended program") return `${introText(d)}\n${reasonText(d)}\n\nFrom A Quick Note From Rod in this proposal.`;
 const p=shownPrograms(d).find(name=>n.includes(name.toLowerCase()));
 if(p){const key=n.includes("cancel")?"Cancellation":n.includes("payment")?"Payment Schedule":n.includes("price")||n.includes("cost")?"Price":n.includes("include")?"Includes":null;
 if(key && key in programDetails(d,p)) return `${programDetails(d,p)[key]}\n\nFrom the ${p} ${key} in this proposal.`;}
 return fallbackAnswer;
}

/** Packages shown to the client; older copies without a choice show all six. */
export function shownPrograms(d:WebDocument){const set=d.packages;return set?programNames.filter(p=>set.includes(p)):programNames.filter(p=>p!=="Full Service Management");}
export function isCurrentDocument(d:WebDocument) { return !!d.packages && !d.packages.some(p=>p==="Hybrid Managed"||p==="Full Service Planning"); }

export function programDetails(d:WebDocument,p:(typeof programNames)[number]):Record<string,string> {
 const original=programs[p];
 if(p!=="Full Service Management"||!d.fullService)return {...original};
 const t=fullServiceTotals(d.fullService);
 return {...original,Price:`${money(t.final)} per event`,"Platform fee":managementPlatformFee,Includes:"Dedicated manager from agreement through event day",Limits:managementLimits,"Payment Schedule":d.fullService.paymentTerms,Cancellation:d.fullService.cancellationTerms};
}

/** Starting text in the proposal email's Optional note box; the admin edits or deletes it before sending. */
export const defaultEmailNote = "Please don’t hesitate to reach out if you have any questions after reviewing the attached proposal.";
