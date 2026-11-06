import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { filtersSchema, templateSchema, typedEmailSchema } from "./emailLibraryRules";
const scope=z.object({organizationId:z.string().uuid(),eventId:z.string().uuid(),enterprise:z.boolean().default(false)});
export const loadEmailLibrary=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>scope.parse(i)).handler(async({data,context})=>{
 const h=await import('./emailLibrary.server'); const {admin,organization}=await h.access(context,data.organizationId,data.enterprise);
 const event=await h.ownedEvent(admin,data.organizationId,data.eventId,data.enterprise);
 const [templates,events,sample,logs]=await Promise.all([
  h.allRows(()=>admin.from('organizer_email_templates').select('*').eq('organization_id',data.organizationId).order('updated_at',{ascending:false}).order('id')),
  h.allRows(()=>admin.from('tournaments').select('id,title,date,is_enterprise').eq('organization_id',data.organizationId).order('date',{ascending:false}).order('id')),
  admin.from('tournament_registrations').select('id,first_name,last_name,email').eq('tournament_id',event.id).order('created_at').limit(1).maybeSingle(),
  data.enterprise?admin.from('enterprise_email_blasts').select('id,created_at,sent_at,template_name,subject,sender_name,sender_label,audience_count,sent_count,failed_count,status,is_test,filters').eq('organization_id',data.organizationId).order('created_at',{ascending:false}).limit(100):Promise.resolve({data:[]}),
 ]);
 return {templates,events,sample:sample.data,logs:logs.data||[],event:{...event},organizationName:organization.name};
});
export const saveLibraryTemplate=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({organizationId:z.string().uuid(),id:z.string().uuid().optional(),template:templateSchema,expectedUpdatedAt:z.string().optional()}).parse(i)).handler(async({data,context})=>{
 const h=await import('./emailLibrary.server');const {admin}=await h.access(context,data.organizationId);
 const payload={...data.template,config:{...data.template.config,subject:data.template.subject},updated_at:new Date().toISOString()};
 let query=data.id?admin.from('organizer_email_templates').update(payload).eq('organization_id',data.organizationId).eq('id',data.id):admin.from('organizer_email_templates').insert({...payload,organization_id:data.organizationId,created_by:context.userId});
 if(data.id&&data.expectedUpdatedAt)query=query.eq('updated_at',data.expectedUpdatedAt);
 const result=await query.select('*').maybeSingle();if(result.error||!result.data)throw new Error('Template could not be saved, or was changed elsewhere. Reload before editing.');return result.data;
});
export const deleteLibraryTemplate=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({organizationId:z.string().uuid(),id:z.string().uuid()}).parse(i)).handler(async({data,context})=>{
 const h=await import('./emailLibrary.server');const {admin}=await h.access(context,data.organizationId);const {error}=await admin.from('organizer_email_templates').delete().eq('organization_id',data.organizationId).eq('id',data.id);if(error)throw new Error('Template could not be deleted.');return {deleted:true};
});
export const previewLibraryEmail=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>scope.extend({template:templateSchema,sampleRegistrationId:z.string().uuid().optional(),filters:filtersSchema.optional()}).parse(i)).handler(async({data,context})=>{
 const h=await import('./emailLibrary.server');const {admin,organization}=await h.access(context,data.organizationId,data.enterprise);const event=await h.ownedEvent(admin,data.organizationId,data.eventId,data.enterprise);
 let reg:any;
 if(data.enterprise&&data.filters){const audience=await h.pastAudience(admin,data.organizationId,data.filters);reg=audience.rows.find(r=>r.id===data.sampleRegistrationId)||audience.rows[0];}
 else {const {data:row}=await admin.from('tournament_registrations').select('*').eq('tournament_id',event.id).order('created_at').limit(1).maybeSingle();reg=row;}
 if(!reg) throw new Error('This event or audience has no sample participant to preview.');
 return {...await h.rendered(admin,event,organization,data.template,reg,data.enterprise?'https://www.teevents.golf/api/public/enterprise-email-unsubscribe?sample=1':undefined),sample:true};
});
export const buildPastAudience=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({organizationId:z.string().uuid(),filters:filtersSchema}).parse(i)).handler(async({data,context})=>{
 const h=await import('./emailLibrary.server');const {admin}=await h.access(context,data.organizationId,true);const out=await h.pastAudience(admin,data.organizationId,data.filters);
 return {recipients:out.rows.map(r=>({id:r.id,name:`${r.first_name} ${r.last_name}`.trim(),email:r.email})),events:out.events.filter(e=>out.rows.some(r=>r.tournament_id===e.id)).map(e=>({id:e.id,title:e.title,date:e.date}))};
});
export const testLibraryEmail=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>scope.extend({template:templateSchema,recipient:typedEmailSchema,filters:filtersSchema.optional(),requestId:z.string().uuid()}).parse(i)).handler(async({data,context})=>{
 const h=await import('./emailLibrary.server');const {admin,organization,senderLabel}=await h.access(context,data.organizationId,data.enterprise);const event=await h.ownedEvent(admin,data.organizationId,data.eventId,data.enterprise);
 const key=process.env['RESEND_API_KEY'];if(!key)throw new Error('Email sending is not configured.');
 let reg:any;
 if(data.enterprise&&data.filters)reg=(await h.pastAudience(admin,data.organizationId,data.filters)).rows[0];
 else reg=(await admin.from('tournament_registrations').select('*').eq('tournament_id',event.id).order('created_at').limit(1).maybeSingle()).data;
 if(!reg)throw new Error('No sample participant is available.');
 let unsubscribeUrl:string|undefined;
 if(data.enterprise){const pref=await h.preference(admin,data.organizationId,data.recipient);if(pref.unsubscribed_at)throw new Error('This address has unsubscribed from this account.');unsubscribeUrl=`https://www.teevents.golf/api/public/enterprise-email-unsubscribe?token=${pref.token}`;}
 const out=await h.rendered(admin,event,organization,data.template,reg,unsubscribeUrl);
 await h.deliver(key,data.recipient,out,`library-test-${context.userId}-${data.requestId}`);
 if(data.enterprise){const {error}=await admin.from('enterprise_email_blasts').upsert({id:data.requestId,organization_id:data.organizationId,tournament_id:event.id,template_name:data.template.name,subject:out.subject,sender_name:out.senderName,config:JSON.parse(JSON.stringify(data.template.config)),source_kind:data.template.source_kind,filters:data.filters||{},audience_count:1,sent_count:1,status:'sent',is_test:true,created_by:context.userId,sender_label:senderLabel,sent_at:new Date().toISOString()});if(error)throw new Error('Test was accepted, but its send log could not be saved.');}
 return {sent:true,recipient:data.recipient};
});
export const prepareEnterpriseBlast=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>scope.extend({templateId:z.string(),filters:filtersSchema}).parse(i)).handler(async({data,context})=>{
 const h=await import('./emailLibrary.server');const {admin,organization,senderLabel}=await h.access(context,data.organizationId,true);const event=await h.ownedEvent(admin,data.organizationId,data.eventId,true);const template=await h.resolveTemplate(admin,data.organizationId,event,data.templateId);const audience=await h.pastAudience(admin,data.organizationId,data.filters);
 if(!audience.rows.length)throw new Error('No eligible past players match these filters.');
 const sample=await h.rendered(admin,event,organization,template,audience.rows[0],'https://www.teevents.golf/api/public/enterprise-email-unsubscribe?sample=1');
 const {data:blast,error}=await admin.from('enterprise_email_blasts').insert({organization_id:data.organizationId,tournament_id:event.id,template_name:template.name,subject:template.subject||template.config.subject,sender_name:sample.senderName,config:template.config,source_kind:template.source_kind,filters:data.filters,audience_count:audience.rows.length,created_by:context.userId,sender_label:senderLabel}).select('id,created_at').single();if(error)throw new Error('Could not prepare the reviewed audience.');
 const saved=await admin.from('enterprise_email_blast_recipients').insert(audience.rows.map(r=>({blast_id:blast.id,email:r.email,registration_id:r.id,name:`${r.first_name} ${r.last_name}`.trim()})));if(saved.error)throw new Error('Could not save the reviewed audience.');
 return {id:blast.id,date:blast.created_at,templateName:template.name,subject:sample.subject,senderName:sample.senderName,audienceCount:audience.rows.length,recipients:audience.rows.map(r=>({name:`${r.first_name} ${r.last_name}`.trim(),email:r.email})),events:audience.events.filter(e=>audience.rows.some(r=>r.tournament_id===e.id)).map(e=>({title:e.title})),filters:data.filters};
});
export const sendEnterpriseBlast=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({organizationId:z.string().uuid(),blastId:z.string().uuid()}).parse(i)).handler(async({data,context})=>{
 const h=await import('./emailLibrary.server');const {admin,organization}=await h.access(context,data.organizationId,true);const key=process.env['RESEND_API_KEY'];if(!key)throw new Error('Email sending is not configured.');
 const {data:blast}=await admin.from('enterprise_email_blasts').select('*').eq('organization_id',data.organizationId).eq('id',data.blastId).eq('created_by',context.userId).single();if(!blast||blast.status!=='prepared')throw new Error('This review has already been sent or is no longer ready.');
 const event=await h.ownedEvent(admin,data.organizationId,blast.tournament_id,true);const eligible=await h.pastAudience(admin,data.organizationId,filtersSchema.parse(blast.filters));const allowed=new Map(eligible.rows.map(r=>[r.email,r]));
 const targets=await h.allRows(()=>admin.from('enterprise_email_blast_recipients').select('*').eq('blast_id',blast.id).order('email'));
 if(targets.length!==eligible.rows.length||targets.some(t=>!allowed.has(t.email)))throw new Error('The audience has changed. Go back and review it again.');
 const lock=await admin.from('enterprise_email_blasts').update({status:'sending'}).eq('id',blast.id).eq('status','prepared').select('id').maybeSingle();if(lock.error||!lock.data)throw new Error('This blast is already being sent.');
 let sent=0,failed=0;
 for(const target of targets){try{const pref=await h.preference(admin,data.organizationId,target.email);if(pref.unsubscribed_at){await admin.from('enterprise_email_blast_recipients').update({status:'suppressed'}).eq('blast_id',blast.id).eq('email',target.email);continue;}
  const out=await h.rendered(admin,event,organization,{config:blast.config,subject:blast.subject,source_kind:blast.source_kind},allowed.get(target.email),`https://www.teevents.golf/api/public/enterprise-email-unsubscribe?token=${pref.token}`);
  await h.deliver(key,target.email,out,`enterprise-blast-${blast.id}-${target.registration_id}`);sent++;await admin.from('enterprise_email_blast_recipients').update({status:'sent'}).eq('blast_id',blast.id).eq('email',target.email);
 }catch{failed++;await admin.from('enterprise_email_blast_recipients').update({status:'failed'}).eq('blast_id',blast.id).eq('email',target.email);}}
 const log=await admin.from('enterprise_email_blasts').update({status:failed?'partial':'sent',sent_count:sent,failed_count:failed,sent_at:new Date().toISOString()}).eq('id',blast.id);if(log.error)throw new Error('Delivery finished but its send log could not be updated.');return {sent,failed};
});