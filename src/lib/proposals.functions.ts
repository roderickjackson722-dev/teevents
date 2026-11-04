import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertProposalAdmin, proposalSchema, proposalStatuses, type ProposalRow } from "./proposals";
import type { Json } from "@/integrations/supabase/types";

export const listProposals = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"}); assertProposalAdmin(role.error ? false : role.data);
 const rows:ProposalRow[]=[];
 for(let start=0;;start+=1000){
  const {data,error}=await context.supabase.from("admin_proposals").select("id,created_at,updated_at,status,payload,sent_at,accepted_at,status_changed_at").order("created_at",{ascending:false}).order("id").range(start,start+999);
  if(error) throw new Error("Could not load proposals.");
  rows.push(...(data||[]).map(row=>({...row,status:z.enum(proposalStatuses).parse(row.status),payload:proposalSchema.parse(row.payload)})));
  if((data?.length||0)<1000) return rows;
 }
});
export const saveProposal = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({id:z.string().uuid().optional(),status:z.enum(proposalStatuses),payload:proposalSchema}).parse(input)).handler(async({context,data})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"}); assertProposalAdmin(role.error ? false : role.data);
 const value={status:data.status,payload:data.payload as unknown as Json,updated_at:new Date().toISOString()};
 const query=data.id ? context.supabase.from("admin_proposals").update(value).eq("id",data.id) : context.supabase.from("admin_proposals").insert({...value,created_by:context.userId});
 const {data:row,error}=await query.select("id,created_at,updated_at,status,payload,sent_at,accepted_at,status_changed_at").single();
 if(error||!row) throw new Error("Could not save proposal.");
 return {...row,status:z.enum(proposalStatuses).parse(row.status),payload:proposalSchema.parse(row.payload)};
});
export const deleteProposal = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({id:z.string().uuid()}).parse(input)).handler(async({context,data})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"}); assertProposalAdmin(role.error ? false : role.data);
 const {data:rows,error}=await context.supabase.from("admin_proposals").delete().eq("id",data.id).select("id");
 if(error||!rows?.length) throw new Error("Could not delete proposal."); return {ok:true};
});
export const listProposalTemplates = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"}); assertProposalAdmin(role.error ? false : role.data);
 const {data,error}=await context.supabase.from("admin_proposal_templates").select("id,name,payload").order("name");
 if(error)throw new Error("Could not load proposal templates.");
 return (data||[]).map(row=>({...row,payload:proposalSchema.parse(row.payload)}));
});
export const saveProposalTemplate = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({id:z.string().uuid().optional(),name:z.string().trim().min(1).max(120),payload:proposalSchema}).parse(input)).handler(async({context,data})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"}); assertProposalAdmin(role.error ? false : role.data);
 const value={name:data.name,payload:data.payload as unknown as Json,updated_at:new Date().toISOString()};
 const query=data.id?context.supabase.from("admin_proposal_templates").update(value).eq("id",data.id):context.supabase.from("admin_proposal_templates").insert({...value,created_by:context.userId});
 const {error}=await query.select("id").single();if(error)throw new Error("Could not save template.");return {ok:true};
});
export const deleteProposalTemplate = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({id:z.string().uuid()}).parse(input)).handler(async({context,data})=>{
 const role=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"}); assertProposalAdmin(role.error ? false : role.data);
 const {error}=await context.supabase.from("admin_proposal_templates").delete().eq("id",data.id);if(error)throw new Error("Could not delete template.");return {ok:true};
});
