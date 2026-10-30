import {beforeEach,describe,it,expect,vi} from 'vitest';
const state = vi.hoisted(()=>({handler: undefined as undefined | ((input:{data:unknown})=>Promise<unknown>), inserts:[] as Record<string,unknown>[], updates:[] as Record<string,unknown>[], enabled:true, sends:[] as Record<string,unknown>[]}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>({inputValidator:()=>({handler:(fn:typeof state.handler)=>{state.handler=fn;return fn;}})})}));
vi.mock('@/integrations/supabase/client.server',()=>({supabaseAdmin:{
 from:(table:string)=>{
  const query:any={select:()=>query,eq:()=>query,single:async()=>({data:table==='tournaments'?{id:'f3c60b6c-ed43-4f74-8268-e5e0de1b7629',title:'QA Team Event',organization_id:'org',registration_open:true,site_published:true,max_group_size:2,allowed_group_sizes:[2]}:{id:'qa-request'},error:null}),maybeSingle:async()=>({data:{enabled:state.enabled}}),insert:(row:Record<string,unknown>)=>{state.inserts.push({table,...row});return query;},update:(row:Record<string,unknown>)=>{state.updates.push({table,...row});return query;},then:(resolve:(v:unknown)=>void)=>resolve({data:table==='org_members'?[{user_id:'owner'}]:[],error:null})};return query;
 },auth:{admin:{getUserById:async()=>({data:{user:{email:'owner@example.com',email_confirmed_at:'2026-01-01'}}})}}
}}));
import './partnerRequests.functions';
const input={tournamentId:'f3c60b6c-ed43-4f74-8268-e5e0de1b7629',firstName:'QA',lastName:'Player',email:'player@example.com',phone:'5550100',teamSize:2,partnersNeeded:1,answers:{},message:'Looking for one teammate',captchaToken:'test-token'};
beforeEach(()=>{state.inserts=[];state.updates=[];state.sends=[];state.enabled=true;vi.stubEnv('HCAPTCHA_SECRET_KEY','mock');vi.stubEnv('RESEND_API_KEY','mock');vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit)=>{if(url.includes('hcaptcha'))return Response.json({success:true});state.sends.push(JSON.parse(String(init.body)));return Response.json({id:'test-email'});}));});
describe('partner holding flow without real sends',()=>{
 it('stores only a partner request and notifies the verified organizer',async()=>{
  const handler=state.handler;if(!handler)throw new Error('Missing handler');
  await expect(handler({data:input})).resolves.toEqual({received:true,notified:true});
  expect(state.inserts).toHaveLength(1);expect(state.inserts[0]).toMatchObject({table:'tournament_partner_requests',partners_needed:1,team_size:2});
  expect(state.sends[0]).toMatchObject({to:['owner@example.com'],reply_to:'player@example.com'});
  expect(state.updates[0]).toMatchObject({notification_status:'sent'});
 });
 it('rejects disabled events before any holding record or email',async()=>{state.enabled=false;const handler=state.handler;if(!handler)throw new Error('Missing handler');await expect(handler({data:input})).rejects.toThrow('not open');expect(state.inserts).toHaveLength(0);expect(state.sends).toHaveLength(0);});
 it('retains the holding request when organizer email fails',async()=>{vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.includes('hcaptcha')?Response.json({success:true}):new Response('Unavailable',{status:503})));const handler=state.handler;if(!handler)throw new Error('Missing handler');await expect(handler({data:input})).resolves.toEqual({received:true,notified:false});expect(state.inserts).toHaveLength(1);expect(state.updates[0]).toMatchObject({notification_status:'failed'});});
});
