import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { documentSchema, sensitiveQuestion, answerQuestion } from "./content";

const tokenSchema=z.string().regex(/^[a-f0-9]{64}$/);
// Narrow capability RPCs return only the linked document, never activity or tokens.
function publicClient() {
 const key=process.env['SUPABASE_PUBLISHABLE_KEY']!;
 return createClient<Database>(process.env['SUPABASE_URL']!,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{const h=new Headers(init?.headers);if(key.startsWith('sb_')&&h.get('Authorization')===`Bearer ${key}`)h.delete('Authorization');h.set('apikey',key);return fetch(input,{...init,headers:h});}}});
}
export const listWebDocuments=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
 if(role.error||role.data!==true)throw new Error("Platform admin access is required.");
 const {data,error}=await context.supabase.from("proposal_web_documents").select("id,access_token,payload,updated_at").order("updated_at",{ascending:false});
 if(error)throw new Error("Could not load client proposals.");
 return (data||[]).map(r=>({...r,payload:documentSchema.parse(r.payload)}));
});
export const saveWebDocument=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid().optional(),payload:documentSchema}).parse(v)).handler(async({context,data})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
 if(role.error||role.data!==true)throw new Error("Platform admin access is required.");
 const value={payload:data.payload as unknown as Json,updated_at:new Date().toISOString()};
 const q=data.id?context.supabase.from("proposal_web_documents").update(value).eq("id",data.id):context.supabase.from("proposal_web_documents").insert({...value,created_by:context.userId});
 const {data:row,error}=await q.select("id,access_token,payload,updated_at").single();
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
 if(error||!payload)throw new Error("This proposal link is unavailable.");return documentSchema.parse(payload);
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