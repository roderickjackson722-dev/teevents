import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({deliver:vi.fn(),writes:vi.fn(),unsubscribed:false}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{const chain={middleware:()=>chain,inputValidator:()=>chain,handler:(fn:any)=>fn};return chain;}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:{}}));
vi.mock('./emailLibrary.server',()=>({
 access:async()=>({admin:{from:()=>({insert:(row:any)=>{mocks.writes(row);return Promise.resolve({error:null});}})},organization:{name:'Course'},senderLabel:'Organizer'}),
 ownedEvent:async()=>({id:'event'}),pastAudience:async()=>({rows:[{first_name:'Real',last_name:'Sample'}]}),
 preference:async()=>({token:'opaque-token',unsubscribed_at:mocks.unsubscribed?'2026-01-01':null}),
 rendered:async()=>({subject:'Previewed subject',senderName:'Course',html:'Previewed email',from:'Course <info@notifications.teevents.golf>'}),deliver:mocks.deliver,
}));
import { testLibraryEmail } from './emailLibrary.functions';
const input={organizationId:'org',eventId:'event',enterprise:true,template:{name:'My Template',config:{body_text:'Hello'},source_kind:'custom'},recipient:'one@example.com',filters:{year:'2025',eventIds:['event'],status:'played'},requestId:'test-id'};
const invoke=()=> (testLibraryEmail as unknown as (arg:any)=>Promise<any>)({data:input,context:{userId:'organizer'}});
describe('Enterprise test-send log',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.unsubscribed=false;vi.stubEnv('RESEND_API_KEY','test-only');mocks.deliver.mockResolvedValue(undefined);});
 it('saves one test recipient with filters and sender only after acceptance',async()=>{const result=await invoke();expect(result.recipient).toBe('one@example.com');expect(mocks.deliver.mock.calls[0][1]).toBe('one@example.com');expect(mocks.writes.mock.calls[0][0]).toMatchObject({is_test:true,audience_count:1,sent_count:1,status:'sent',created_by:'organizer',sender_label:'Organizer',filters:input.filters,template_name:'My Template'});expect(mocks.deliver.mock.invocationCallOrder[0]).toBeLessThan(mocks.writes.mock.invocationCallOrder[0]);});
 it('does not save a sent log when delivery fails',async()=>{mocks.deliver.mockRejectedValue(new Error('Rejected'));await expect(invoke()).rejects.toThrow('Rejected');expect(mocks.writes).not.toHaveBeenCalled();});
 it('cannot test-send to an unsubscribed address',async()=>{mocks.unsubscribed=true;await expect(invoke()).rejects.toThrow('unsubscribed');expect(mocks.deliver).not.toHaveBeenCalled();expect(mocks.writes).not.toHaveBeenCalled();});
});