import { describe, it, expect } from "vitest";
import { audienceFrom, typedEmailSchema, insertAtCursor, filtersSchema } from './emailLibraryRules';
import { catalogForEvent, defaultsForTemplate } from './emailLibraryContent';
const events=[{id:'a',date:'2025-06-01',title:'Past'}, {id:'b',date:'2024-05-01',title:'Older'},{id:'future',date:'2027-06-01'}];
const now=new Date('2026-11-06');const filters={eventIds:[],year:'all',status:'registered' as const};
const row=(id:string,email:string,tournament_id='a',extra={})=>({id,email,tournament_id,first_name:id,last_name:'Player',...extra});
describe('Past Players rules',()=>{
 it('includes only participants from the supplied account Enterprise events',()=>expect(audienceFrom([row('a','a@test.com'),row('x','x@test.com','foreign')],events,filters,[],now).map(r=>r.email)).toEqual(['a@test.com']));
 it('deduplicates addresses despite whitespace, casing and repeated events',()=>expect(audienceFrom([row('a',' A@TEST.COM '),row('b','a@test.com','b')],events,filters,[],now)).toHaveLength(1));
 it('removes account unsubscribes',()=>expect(audienceFrom([row('a','a@test.com')],events,filters,['A@Test.com'],now)).toHaveLength(0));
 it('one registration opt-out suppresses every occurrence in that account',()=>expect(audienceFrom([row('a','a@test.com'),row('b','A@test.com','b',{enterprise_email_opt_out:true})],events,filters,[],now)).toHaveLength(0));
 it('excludes future events',()=>expect(audienceFrom([row('a','a@test.com','future')],events,filters,[],now)).toHaveLength(0));
 it('filters by event',()=>expect(audienceFrom([row('a','a@test.com'),row('b','b@test.com','b')],events,{...filters,eventIds:['b']},[],now).map(r=>r.id)).toEqual(['b']));
 it('filters by year',()=>expect(audienceFrom([row('a','a@test.com'),row('b','b@test.com','b')],events,{...filters,year:'2024'},[],now).map(r=>r.id)).toEqual(['b']));
 it('Played uses recorded check-in or scores',()=>expect(audienceFrom([row('a','a@test.com','a',{checked_in:true}),row('b','b@test.com','a',{group_score:0}),row('c','c@test.com')],events,{...filters,status:'played'},[],now).map(r=>r.id)).toEqual(['a','b']));
 it('did not play excludes recorded check-ins and scores',()=>expect(audienceFrom([row('a','a@test.com','a',{checked_in:true}),row('b','b@test.com')],events,{...filters,status:'did_not_play'},[],now).map(r=>r.id)).toEqual(['b']));
 it('respects existing event post-event opt-out',()=>expect(audienceFrom([row('a','a@test.com')],[{...events[0],post_event_email_opt_out:true}],filters,[],now)).toHaveLength(0));
 it('accepts exactly one typed email, never a recipient list',()=>{expect(typedEmailSchema.safeParse('one@test.com').success).toBe(true);expect(typedEmailSchema.safeParse('one@test.com,two@test.com').success).toBe(false);});
 it('does not accept arbitrary audiences from the client',()=>expect(filtersSchema.safeParse({...filters,emails:['foreign@test.com']}).success).toBe(false));
});
describe('Template isolation',()=>{
 it('keeps a saved event subject and body unchanged in the catalog',()=>{const event={confirmation_email_config:{subject:'My exact subject',body_text:'Hello {{first_name}}'}};const t=catalogForEvent(event)[0];expect(t.config.subject).toBe('My exact subject');expect(t.config.body_text).toBe('Hello {{first_name}}');});
 it('editing a copy cannot mutate the original',()=>{const original=defaultsForTemplate('confirmation');const copy=structuredClone(original);copy.subject='Changed';expect(original.subject).toBe("You're Registered — {{event_name}}");});
 it('merge fields insert at the chosen cursor instead of the end',()=>expect(insertAtCursor('Hi there','{{first_name}}',3,8)).toEqual({text:'Hi {{first_name}}',cursor:17}));
});
import { catalogForEvent as catalogWithThanks } from "./emailLibraryContent";
describe("Sponsor and vendor thank-you templates", () => {
  it("offers both thank-you templates in the TeeVents catalog", () => {
    const names = catalogWithThanks({}).map((t: any) => t.name);
    expect(names).toContain("Sponsor Thank You");
    expect(names).toContain("Vendor Thank You");
  });
});
