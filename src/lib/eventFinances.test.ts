import {it,expect} from 'vitest';
import {eventTransactions} from './eventFinances';
const rows=[{tournament_id:'atl-shamble',amount_cents:15000},{tournament_id:'atl-championships',amount_cents:17500},{tournament_id:null,amount_cents:999}];
it('ATL Shamble excludes Championships and account-only transactions',()=>expect(eventTransactions(rows,'atl-shamble').reduce((s,r)=>s+r.amount_cents,0)).toBe(15000));
it('switching to Championships changes totals',()=>expect(eventTransactions(rows,'atl-championships').reduce((s,r)=>s+r.amount_cents,0)).toBe(17500));
it('no valid event never exposes all-event totals as event totals',()=>expect(eventTransactions(rows,'')).toEqual([]));
