import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({access:vi.fn(),event:vi.fn(),resolve:vi.fn(),rendered:vi.fn(),deliver:vi.fn(),rows:[] as any[],preference:null as any,readError:null as any}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{const chain={middleware:()=>chain,inputValidator:()=>chain,handler:(fn:any)=>fn};return chain;}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:{}}));
vi.mock('./emailLibrary.server',()=>({access:mocks.access,ownedEvent:mocks.event,resolveTemplate:mocks.resolve,rendered:mocks.rendered,deliver:mocks.deliver}));
import { sendSavedTemplateEmail } from './emailLibrary.functions';
const template={id:'saved',updated_at:'version-1',subject:'Organizer subject',config:{body_text:'Organizer body'},source_kind:'custom'};
const input={organizationId:'org',eventId:'event',templateId:'saved',expectedUpdatedAt:'version-1',registrationIds:['player'],requestId:'request'};
const invoke=(changes={})=>(sendSavedTemplateEmail as unknown as (args:any)=>Promise<any>)({data:{...input,...changes},context:{userId:'organizer'}});
describe('Send Email saved templates',()=>{
 beforeEach(()=>{
  vi.clearAllMocks(); vi.stubEnv('RESEND_API_KEY','test-only');
  mocks.rows=[{id:'player',email:'player@example.com'}];mocks.preference=null;mocks.readError=null;
  const from=(table:string)=>{const q:any={select:()=>q,eq:()=>q,in:async()=>({data:mocks.rows,error:mocks.readError}),maybeSingle:async()=>({data:mocks.preference,error:null})};return q;};
  mocks.access.mockResolvedValue({admin:{from},organization:{name:'Organizer'}});
  mocks.event.mockResolvedValue({id:'event'});mocks.resolve.mockResolvedValue(template);
  mocks.rendered.mockResolvedValue({subject:'Organizer subject',html:'Organizer body'});mocks.deliver.mockResolvedValue(undefined);
 });
 it('sends the selected My Templates content without writing event settings',async()=>{
  expect(await invoke()).toEqual({sent:1,failed:0,suppressed:0});
  expect(mocks.resolve).toHaveBeenCalledWith(expect.anything(),'org',{id:'event'},'saved');
  expect(mocks.rendered.mock.calls[0][3]).toEqual(template);
  expect(mocks.deliver.mock.calls[0][2]).toEqual({subject:'Organizer subject',html:'Organizer body'});
 });
 it('stops if the opened template changed since review',async()=>{
  await expect(invoke({expectedUpdatedAt:'old-version'})).rejects.toThrow('changed');expect(mocks.deliver).not.toHaveBeenCalled();
 });
 it('rejects recipients not belonging to the selected event',async()=>{
  mocks.rows=[];await expect(invoke()).rejects.toThrow('belonging');expect(mocks.deliver).not.toHaveBeenCalled();
 });
 it('preserves account unsubscribes',async()=>{
  mocks.preference={unsubscribed_at:'2026-11-01'};expect(await invoke()).toEqual({sent:0,failed:0,suppressed:1});expect(mocks.deliver).not.toHaveBeenCalled();
 });
 it('preserves registration opt-outs',async()=>{
  mocks.rows[0].enterprise_email_opt_out=true;expect((await invoke()).suppressed).toBe(1);expect(mocks.deliver).not.toHaveBeenCalled();
 });
 it('does not count rejected delivery as sent',async()=>{
  mocks.deliver.mockRejectedValue(new Error('Rejected'));expect(await invoke()).toEqual({sent:0,failed:1,suppressed:0});
 });
});