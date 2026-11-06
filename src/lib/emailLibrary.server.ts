import sanitizeHtml from "sanitize-html";
import { audienceFrom, type AudienceFilters, normalizedEmail } from "./emailLibraryRules";
import { catalogForEvent, renderEmailHtml, replaceVariablesPlain, TEMPLATE_HEADERS, type TemplateKind } from "./emailLibraryContent";
import { brandEmailHtml, brandSender, whiteLabelFrom } from "./whiteLabel";
import { formatTournamentDate } from "./formatDate";
import { parsePairingsConfig, dayCfgOf, teeTimeForGroup, startingHoleLabelForGroup } from "./pairingsConfig";

export async function access(context: any, organizationId: string, enterprise = false) {
 const [role, member, organization, approval] = await Promise.all([
  context.supabase.rpc("has_role", {_user_id: context.userId, _role: "admin"}),
  context.supabase.from("org_members").select("role,permissions,name").eq("organization_id",organizationId).eq("user_id",context.userId).maybeSingle(),
  context.supabase.from("organizations").select("id,name,plan,pricing_model,enterprise_subscription_status").eq("id",organizationId).maybeSingle(),
  context.supabase.from("enterprise_account_approvals").select("organization_id").eq("organization_id",organizationId).maybeSingle(),
 ]);
 if (!organization.data || (!role.data && (!member.data || (!['owner','admin'].includes(member.data.role) && !member.data.permissions?.includes('manage_messages'))))) throw new Error("Email permission is required for this account.");
 if (enterprise && !approval.data && organization.data.plan !== 'enterprise' && organization.data.pricing_model !== 'enterprise' && !['active','trialing'].includes(organization.data.enterprise_subscription_status)) throw new Error("Past Players is available only to Enterprise accounts.");
 const {supabaseAdmin: admin} = await import("@/integrations/supabase/client.server");
 return {admin, organization: organization.data, senderLabel: member.data?.name || "TeeVents administrator"};
}
export async function allRows(query: () => any) {
 const rows: any[] = [];
 for(let start=0;;start+=1000) { const {data,error}=await query().range(start,start+999); if(error) throw new Error("Email records could not be loaded."); rows.push(...(data||[])); if((data?.length||0)<1000) return rows; }
}
export async function ownedEvent(admin: any, orgId: string, eventId: string, enterprise = false) {
 const {data,error}=await admin.from("tournaments").select("*").eq("organization_id",orgId).eq("id",eventId).maybeSingle();
 if(error || !data || (enterprise && !data.is_enterprise)) throw new Error("Choose an event belonging to this account."); return data;
}
export async function resolveTemplate(admin: any, orgId: string, event: any, id: string) {
 if(id.startsWith('builtin:')) { const item=catalogForEvent(event).find(t=>t.id===id); if(!item) throw new Error("Template not found."); return {...item,subject:item.config.subject}; }
 const {data,error}=await admin.from("organizer_email_templates").select("*").eq("organization_id",orgId).eq("id",id).maybeSingle();
 if(error || !data) throw new Error("Template not found."); return data;
}
export async function pastAudience(admin: any, organizationId: string, filters: AudienceFilters) {
 const events = await allRows(()=>admin.from("tournaments").select("id,title,date,post_event_email_opt_out").eq("organization_id",organizationId).eq("is_enterprise",true).order("id"));
 const rows: any[]=[];
 for (const event of events) rows.push(...await allRows(()=>admin.from("tournament_registrations").select("id,tournament_id,first_name,last_name,email,enterprise_email_opt_out,checked_in,group_score,team_score_count,status").eq("tournament_id",event.id).order("id")));
 const preferences = await allRows(()=>admin.from("enterprise_email_preferences").select("email").eq("organization_id",organizationId).not("unsubscribed_at","is",null).order("email"));
 // Existing newsletter opt-outs are a conservative global suppression source too.
 const newsletter = await allRows(()=>admin.from("newsletter_subscribers").select("email").not("unsubscribed_at","is",null).order("email"));
 return {events,rows:audienceFrom(rows,events,filters,[...preferences,...newsletter].map(p=>p.email))};
}
export async function mergeVars(admin: any, event: any, org: any, reg?: any) {
 const {data:course}=await admin.from("golf_courses").select("course_address").eq("tournament_id",event.id).limit(1).maybeSingle();
 const homepage=`https://www.teevents.golf/t/${event.slug}`;
 const pairings=parsePairingsConfig(event.pairings_config); const cfg=dayCfgOf(pairings,0);
 const vars: Record<string,string>={first_name:reg?.first_name||"",last_name:reg?.last_name||"",event_name:event.title,event_date:event.date?formatTournamentDate(event.date,{weekday:"long",year:"numeric",month:"long",day:"numeric"}):"",event_location:[event.location,event.state].filter(Boolean).join(", "),course_name:event.course_name||event.location||"",course_address:course?.course_address||"",event_schedule:event.schedule_info_html||event.schedule_info||"",event_homepage:homepage,registration_link:homepage,scoring_link:`${homepage}/scoring`,leaderboard_link:`https://www.teevents.golf/live/${event.slug}`,pairings_link:`https://www.teevents.golf/pairings/${event.slug}`,tee_time:teeTimeForGroup(pairings,reg?.group_number,0)||cfg.shotgunTime||reg?.tee_time||"TBD",hole_number:startingHoleLabelForGroup(pairings,reg?.group_number,0)||"TBD",team_name:reg?.group_label||"",group_number:String(reg?.group_number||""),scoring_code:reg?.group_scoring_code||reg?.scoring_code||"",contact_name:event.contact_name||"",contact_phone:event.contact_phone||"",contact_email:event.contact_email||event.org_contact_email||"",organization_name:org.name,payer_name:`${reg?.first_name||""} ${reg?.last_name||""}`.trim(),survey_link:reg?.survey_response_token?`https://www.teevents.golf/survey/${reg.survey_response_token}`:homepage};
 return vars;
}
export async function rendered(admin: any, event: any, org: any, template: any, reg: any, unsubscribeUrl?: string) {
 const vars=await mergeVars(admin,event,org,reg); const wl=whiteLabelFrom(event);
 const config={...template.config,subject:template.subject||template.config.subject};
 const html=brandEmailHtml(renderEmailHtml(config,vars,config.header_title||TEMPLATE_HEADERS[template.source_kind as TemplateKind]||org.name),wl);
 const safe=sanitizeHtml(html,{allowedTags:sanitizeHtml.defaults.allowedTags.concat(['img','table','thead','tbody','tr','td','th']),allowedAttributes:{'*':['style','class'],a:['href','target'],img:['src','alt','width','height'],table:['width','cellpadding','cellspacing'],td:['align']},allowedSchemes:['https','http','mailto'],allowProtocolRelative:false});
 const senderName=wl?.name||"TeeVents Golf Management";
 const esc=(s:string)=>sanitizeHtml(s,{allowedTags:[],allowedAttributes:{}}).replace(/"/g,'&quot;');
 return {subject:replaceVariablesPlain(config.subject,vars),html:safe+(unsubscribeUrl?`<p style="text-align:center;font-family:Arial;font-size:12px">${esc(senderName)} · <a href="${esc(unsubscribeUrl)}">Unsubscribe from this account's future emails</a></p>`:''),senderName,from:brandSender('TeeVents Golf Management <info@notifications.teevents.golf>',wl),sampleName:`${reg?.first_name||""} ${reg?.last_name||""}`.trim()};
}
export async function preference(admin:any, orgId:string,email:string) {
 const normalized=normalizedEmail(email);
 const found=await admin.from('enterprise_email_preferences').select('*').eq('organization_id',orgId).eq('email',normalized).maybeSingle();
 if(found.error) throw new Error("Could not verify email preferences."); if(found.data) return found.data;
 const result=await admin.from('enterprise_email_preferences').upsert({organization_id:orgId,email:normalized},{onConflict:'organization_id,email',ignoreDuplicates:true});
 if(result.error) throw new Error("Could not prepare unsubscribe preferences.");
 const saved=await admin.from('enterprise_email_preferences').select('*').eq('organization_id',orgId).eq('email',normalized).single(); if(saved.error) throw new Error("Could not verify email preferences."); return saved.data;
}
export async function deliver(key:string,to:string,out:any,idempotencyKey:string) {
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from:out.from,reply_to:'info@teevents.golf',to:[to],subject:out.subject,html:out.html})});
 if(!response.ok) throw new Error("The email provider did not accept the message. Nothing is marked sent.");
}