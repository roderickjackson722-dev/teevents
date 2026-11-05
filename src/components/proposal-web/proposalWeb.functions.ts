import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { documentSchema, sensitiveQuestion, answerQuestion, shownPrograms } from "./content";
import { canChooseProgram, fullServiceTotals, money } from "./pricing";

const COLS="id,access_token,payload,updated_at,recipient_email,status,sent_at,sent_to,send_count,program_chosen,program_chosen_at";
const tokenSchema=z.string().regex(/^[a-f0-9]{64}$/);
// Narrow capability RPCs return only the linked document, never activity or tokens.
function publicClient() {
 const key=process.env['SUPABASE_PUBLISHABLE_KEY']!;
 return createClient<Database>(process.env['SUPABASE_URL']!,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{const h=new Headers(init?.headers);if(key.startsWith('sb_')&&h.get('Authorization')===`Bearer ${key}`)h.delete('Authorization');h.set('apikey',key);return fetch(input,{...init,headers:h});}}});
}
export const listWebDocuments=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
 if(role.error||role.data!==true)throw new Error("Platform admin access is required.");
 const {data,error}=await context.supabase.from("proposal_web_documents").select(COLS).order("updated_at",{ascending:false});
 if(error)throw new Error("Could not load client proposals.");
 return (data||[]).map(r=>({...r,payload:documentSchema.parse(r.payload)}));
});
export const saveWebDocument=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid().optional(),payload:documentSchema,recipientEmail:z.string().trim().max(320).email().or(z.literal("")).optional(),status:z.enum(["draft","sent","accepted","declined","accepted_pending_confirmation"]).optional()}).parse(v)).handler(async({context,data})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
 if(role.error||role.data!==true)throw new Error("Platform admin access is required.");
 if(!shownPrograms(data.payload).length)throw new Error("Select at least one program.");
 if(data.payload.closureEnabled&&shownPrograms(data.payload).includes("Full Service Management")&&!data.payload.fullService)throw new Error("Full Service pricing is required.");
 const value={payload:data.payload as unknown as Json,updated_at:new Date().toISOString(),...(data.recipientEmail!==undefined?{recipient_email:data.recipientEmail||null}:{}),...(data.status?{status:data.status}:{})};
 const q=data.id?context.supabase.from("proposal_web_documents").update(value).eq("id",data.id):context.supabase.from("proposal_web_documents").insert({...value,created_by:context.userId});
 const {data:row,error}=await q.select(COLS).single();
 if(error||!row)throw new Error("Could not save client proposal.");
 return {...row,payload:documentSchema.parse(row.payload)};
});
export const deleteWebDocument=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v)).handler(async({context,data})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
 if(role.error||role.data!==true)throw new Error("Platform admin access is required.");
 const {error}=await context.supabase.from("proposal_web_documents").delete().eq("id",data.id);
 if(error)throw new Error("Could not remove client link.");return {ok:true};
});
export const getWebActivity=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v)).handler(async({context,data})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
 if(role.error||role.data!==true)throw new Error("Platform admin access is required.");
 const rows=[];
 for(let offset=0;;offset+=1000){const {data:batch,error}=await context.supabase.from("proposal_web_activity").select("recorded_at,visit_id,kind,value").eq("proposal_id",data.id).order("recorded_at").range(offset,offset+999);if(error)throw new Error("Could not load viewing activity.");rows.push(...(batch||[]));if((batch?.length||0)<1000)return rows;}
});
export const readWebDocument=createServerFn({method:"GET"}).inputValidator((v:unknown)=>z.object({token:tokenSchema}).parse(v)).handler(async({data})=>{
 const {data:payload,error}=await publicClient().rpc("read_proposal_web",{_token:data.token});
 if(error)throw new Error("Could not load this proposal.");if(!payload)return null;return documentSchema.parse(payload);
});
const eventSchema=z.object({token:tokenSchema,visit:z.string().uuid(),kind:z.enum(["open","section","time","call","print"]),value:z.string().max(2000).default("")});
export const trackWebDocument=createServerFn({method:"POST"}).inputValidator((v:unknown)=>eventSchema.parse(v)).handler(async({data})=>{
 const {data:ok,error}=await publicClient().rpc("record_proposal_web",{_token:data.token,_visit:data.visit,_kind:data.kind,_value:data.value});
 if(error||!ok)throw new Error("Viewing activity could not be saved.");return {ok:true};
});
export const askWebQuestion=createServerFn({method:"POST"}).inputValidator((v:unknown)=>z.object({token:tokenSchema,visit:z.string().uuid(),question:z.string().trim().min(1).max(2000)}).parse(v)).handler(async({data})=>{
 if(sensitiveQuestion(data.question))throw new Error("Please do not include sensitive information in your question.");
 const client=publicClient();const {data:payload,error}=await client.rpc("read_proposal_web",{_token:data.token});
 if(error||!payload)throw new Error("This proposal link is unavailable.");
 const {data:ok,error:saveError}=await client.rpc("record_proposal_web",{_token:data.token,_visit:data.visit,_kind:"question",_value:data.question});
 if(saveError||!ok)throw new Error("Your question could not be saved. Please try again.");
 return {answer:answerQuestion(data.question,documentSchema.parse(payload))};
});
const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
/** Admin-only: emails one client their private proposal link and records the send. */
export const sendWebDocument=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid(),to:z.string().trim().email().max(320),origin:z.string().url(),note:z.string().max(2000).default("")}).parse(v)).handler(async({context,data})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
 if(role.error||role.data!==true)throw new Error("Platform admin access is required.");
 throw new Error("Proposal sending is disabled. Save and Mark as Sent only changes status.");
 /* Legacy email implementation retained for historical audit; never executed.
 const origin=new URL(data.origin).origin;
 if(!/^(https:\/\/([a-z0-9-]+\.)*(teevents\.golf|lovable\.app)|http:\/\/localhost(:\d+)?)$/.test(origin))throw new Error("Unknown site address.");
 const {data:row,error}=await context.supabase.from("proposal_web_documents").select(COLS).eq("id",data.id).single();
 if(error||!row)throw new Error("Save the client copy before sending.");
 const doc=documentSchema.parse(row.payload);const key=process.env["RESEND_API_KEY"];
 if(!key)throw new Error("Email is not available right now. Copy the link and send it yourself.");
 const link=`${origin}/proposal/${row.access_token}`;const who=doc.fields.preparedFor||"there";const ev=doc.fields.event?` for ${doc.fields.event}`:"";
 const text=[`Hi ${who},`,"",`Thank you for talking with us. Here is your TeeVents proposal${ev}:`,link,...(data.note.trim()?["",data.note.trim()]:[]),"","Questions? Reply to this email or call (602) 413-1338.","","Rod Jackson","TeeVents Golf Management"].join("\n");
 const html=`<div style="font-family:Georgia,serif;font-size:16px;color:#1a5c38;max-width:560px"><p>Hi ${esc(who)},</p><p>Thank you for talking with us. Here is your TeeVents proposal${esc(ev)}.</p><p><a href="${esc(link)}" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:12px 22px;border-radius:6px;font-weight:bold;text-decoration:none">View your proposal</a></p>${data.note.trim()?`<p style="white-space:pre-line">${esc(data.note.trim())}</p>`:""}<p>Questions? Reply to this email or call (602) 413-1338.</p><p>Rod Jackson<br>TeeVents Golf Management</p></div>`;
 const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from:"TeeVents Golf Management <info@notifications.teevents.golf>",to:[data.to],reply_to:"info@teevents.golf",subject:`Your TeeVents proposal${doc.fields.event?` — ${doc.fields.event}`:""}`,text,html}),signal:AbortSignal.timeout(15000)});
 if(!sent.ok)throw new Error("The email could not be sent. Nothing was marked as sent.");
 const now=new Date().toISOString();
 const {data:upd,error:ue}=await context.supabase.from("proposal_web_documents").update({recipient_email:data.to,sent_to:data.to,sent_at:now,status:row.status==="draft"?"sent":row.status,send_count:(row.send_count||0)+1}).eq("id",data.id).select(COLS).single();
 if(ue||!upd)throw new Error("Email sent, but the status could not be saved.");
 return {...upd,payload:documentSchema.parse(upd.payload)}; */
});

export const chooseWebProgram=createServerFn({method:"POST"}).inputValidator((v:unknown)=>z.object({token:tokenSchema,program:z.enum(["No Cost to Start","Per Event","Per League","Enterprise","Full Service Management"])}).parse(v)).handler(async({data})=>{
 const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
 const {data:row,error}=await supabaseAdmin.from("proposal_web_documents").select("id,payload,status,updated_at,program_chosen,acceptance_email_sent_at").eq("access_token",data.token).single();
 if(error||!row)throw new Error("This proposal is unavailable.");
 const d=documentSchema.parse(row.payload);
 if(!d.closureEnabled)throw new Error("This proposal is not available for a start choice.");
 if(row.program_chosen&&row.program_chosen!==data.program)throw new Error("Your choice has already been recorded. Rod will follow up.");
 if(!row.program_chosen&&!canChooseProgram(row.status,shownPrograms(d),data.program,d.fields.validUntil))throw new Error("This proposal must be marked Sent and still valid before you can choose a program. Please contact Rod.");
 const key=process.env["RESEND_API_KEY"];
 if(!key)throw new Error("Your choice could not be sent to Rod. Please contact info@teevents.golf.");
 const {data:choice,error:ce}=await supabaseAdmin.rpc("choose_proposal_program",{_token:data.token,_program:data.program,_expected_updated_at:row.updated_at});
 if(ce||!choice)throw new Error("The proposal changed or is not available. Refresh and try again.");
 const saved=z.object({id:z.string().uuid(),payload:documentSchema,chosen_at:z.string(),email_sent_at:z.string().nullable()}).parse(choice);
 if(saved.email_sent_at)return {ok:true};
 const t=saved.payload.fullService?fullServiceTotals(saved.payload.fullService):null;
 const text=[`Client: ${saved.payload.fields.preparedFor}`,`Event: ${saved.payload.fields.event}`,`Program chosen: ${data.program}`,...(data.program==="Full Service Management"&&t?[`Full Service Final Price: ${money(t.final)}`,`Deposit due at agreement: ${money(t.deposit)}`]:[]),`Date and time: ${saved.chosen_at}`].join("\n");
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`proposal-choice-${saved.id}`},body:JSON.stringify({from:"TeeVents Golf Management <info@notifications.teevents.golf>",to:["info@teevents.golf"],subject:`Proposal acceptance, ${saved.payload.fields.preparedFor.replace(/[\r\n]/g," ")}, ${data.program}`,text}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error("Your choice was recorded, but Rod's email was not accepted. Please try the same button again.");
 const {error:ue}=await supabaseAdmin.from("proposal_web_documents").update({acceptance_email_sent_at:new Date().toISOString()}).eq("id",saved.id);
 if(ue)throw new Error("Your choice was recorded and Rod was emailed. Please refresh before retrying.");
 return {ok:true};
});
