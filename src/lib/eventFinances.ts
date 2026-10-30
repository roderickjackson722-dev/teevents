export function eventTransactions<T extends {tournament_id:string|null}>(rows:T[], eventId:string):T[] {
 return eventId ? rows.filter(r=>r.tournament_id===eventId) : [];
}
