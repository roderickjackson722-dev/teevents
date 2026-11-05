import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { documentSchema, sensitiveQuestion, answerQuestion, shownPrograms } from "./content";
import { canChooseProgram, fullServiceTotals, money } from "./pricing";
import { choiceNotification } from "./choiceNotification";

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
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`proposal-choice-${saved.id}`},body:JSON.stringify({from:"TeeVents Golf Management <info@notifications.teevents.golf>",...choiceNotification(saved.payload,data.program,saved.chosen_at)}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error("Your choice was recorded, but Rod's email was not accepted. Please try the same button again.");
 const {error:ue}=await supabaseAdmin.from("proposal_web_documents").update({acceptance_email_sent_at:new Date().toISOString()}).eq("id",saved.id);
 if(ue)throw new Error("Your choice was recorded and Rod was emailed. Please refresh before retrying.");
 return {ok:true};
});
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
/** Admin-confirmed single-recipient send. Status becomes Sent only after Resend accepts the email. */
export const sendWebDocument=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid(),recipientEmail:z.string().trim().max(320).email(),note:z.string().max(2000).optional(),origin:z.string().url()}).parse(v)).handler(async({context,data})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
 if(role.error||role.data!==true)throw new Error("Platform admin access is required.");
 const allowed=["https://www.teevents.golf","https://teevents.golf","https://teevents.lovable.app"];
 const origin=allowed.includes(data.origin)||/^https:\/\/[a-z0-9-]+(--[a-z0-9-]+)?\.lovable\.app$/.test(data.origin)||data.origin.startsWith("http://localhost")?data.origin:"https://www.teevents.golf";
 const {data:row,error}=await context.supabase.from("proposal_web_documents").select("id,access_token,payload,send_count").eq("id",data.id).single();
 if(error||!row)throw new Error("Save the client copy before sending.");
 const d=documentSchema.parse(row.payload);
 const key=process.env["RESEND_API_KEY"];if(!key)throw new Error("Email is not configured. Nothing was sent.");
 const link=`${origin}/proposal/${row.access_token}`;const name=d.fields.preparedFor||"there";const ev=d.fields.event?` for ${d.fields.event}`:"";
 const note=(data.note||"").trim();
 const html=`<div style="font-family:Georgia,serif;color:#1a1a1a;max-width:560px"><p>Hello ${esc(name)},</p><p>Thank you for considering TeeVents. Your golf tournament proposal${esc(ev)} is ready to review.</p>${note?`<p>${esc(note).replace(/\n/g,"<br>")}</p>`:""}<p><a href="${link}" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:12px 20px;border-radius:6px;font-weight:bold;text-decoration:none">View Your Proposal</a></p><p>Rod Jackson<br>TeeVents Golf Management<br>info@teevents.golf</p></div>`;
 const text=`Hello ${name},\n\nThank you for considering TeeVents. Your golf tournament proposal${ev} is ready to review.\n\n${note?note+"\n\n":""}View your proposal: ${link}\n\nRod Jackson\nTeeVents Golf Management\ninfo@teevents.golf`;
 const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from:"TeeVents Golf Management <info@notifications.teevents.golf>",reply_to:"info@teevents.golf",to:[data.recipientEmail],subject:`Your TeeVents Proposal${ev}`,html,text}),signal:AbortSignal.timeout(15000)});
 if(!res.ok){const body=await res.text();console.error(`Proposal send failed [${res.status}]: ${body}`);throw new Error(`The email was not accepted (${res.status}). Nothing was marked Sent.`);}
 const now=new Date().toISOString();
 const {data:upd,error:ue}=await context.supabase.from("proposal_web_documents").update({status:"sent",sent_at:now,sent_to:data.recipientEmail,recipient_email:data.recipientEmail,send_count:(row.send_count||0)+1}).eq("id",row.id).select(COLS).single();
 if(ue||!upd)throw new Error("The email was sent, but the Sent status could not be saved. Refresh before sending again.");
 return {...upd,payload:documentSchema.parse(upd.payload)};
});
