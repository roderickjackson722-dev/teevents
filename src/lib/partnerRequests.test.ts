import { describe,it,expect } from 'vitest';
import { partnerTeamSizes,partnerRequestSchema,validatePartnerAnswers } from './partnerRequests.schema';
describe('partner request rules',()=>{
 for(const n of [2,3,4]) it(`offers team of ${n}`,()=>expect(partnerTeamSizes(n,[n])).toEqual([n]));
 it('never offers individual checkout',()=>expect(partnerTeamSizes(4,[1,4])).toEqual([4]));
 it('rejects enough partners to equal the whole team',()=>expect(partnerRequestSchema.safeParse({tournamentId:'f3c60b6c-ed43-4f74-8268-e5e0de1b7629',firstName:'Test',lastName:'Player',email:'test@example.com',phone:'',teamSize:2,partnersNeeded:2,answers:{},message:'',captchaToken:'token'}).success).toBe(false));
 it('requires configured player answers',()=>expect(()=>validatePartnerAnswers([{id:'age',label:'Age',is_required:true,field_type:'number',options:null}],{},'')).toThrow('Age is required'));
 it('requires checked required acknowledgments',()=>expect(()=>validatePartnerAnswers([{id:'accept',label:'Accept terms',is_required:true,field_type:'checkbox',options:null}],{accept:'false'},'')).toThrow('Accept terms is required'));
});
