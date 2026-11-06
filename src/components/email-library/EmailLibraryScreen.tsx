import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useTournamentIdParam, pickTournamentId, getPreferredTournamentId } from "@/hooks/useTournamentIdParam";
import { supabase } from "@/integrations/supabase/client";
import { loadEmailLibrary } from "@/lib/emailLibrary.functions";
import TemplateLibrary from "./TemplateLibrary";
import EnterpriseBlast from "./EnterpriseBlast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, RefreshCw } from "lucide-react";
export default function EmailLibraryScreen({enterprise=false}:{enterprise?:boolean}) {
 const {org}=useOrgContext();const [eventId,setEventId]=useTournamentIdParam();const [events,setEvents]=useState<any[]>([]),[data,setData]=useState<any>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);const load=useServerFn(loadEmailLibrary);
 useEffect(()=>{if(!org)return;let live=true;setLoading(true);const q=supabase.from('tournaments').select('id,title').eq('organization_id',org.orgId).order('created_at',{ascending:false});q.then(({data:rows,error:e})=>{if(!live)return;if(e){setError('Events could not be loaded.');setLoading(false);return;}setEvents(rows||[]);const picked=pickTournamentId(rows||[],getPreferredTournamentId());if(picked)setEventId(picked);else {setEventId('');setError('');setLoading(false);}});return()=>{live=false;};},[org?.orgId,enterprise]);
 const reload=useCallback(async()=>{if(!org||!eventId)return;const result=await load({data:{organizationId:org.orgId,eventId,enterprise}});setData(result);},[org?.orgId,eventId,enterprise,load]);
 useEffect(()=>{let live=true;setData(null);if(!org||!eventId)return;setLoading(true);setError('');load({data:{organizationId:org.orgId,eventId,enterprise}}).then(result=>{if(live)setData(result);}).catch(e=>{if(live)setError(e instanceof Error?e.message:'Email templates could not be loaded.');}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[org?.orgId,eventId,enterprise]);
 return <div className="p-4 md:p-6 space-y-6 min-w-0"><header className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6 text-primary"/>Email Templates</h1><Select value={eventId||''} onValueChange={setEventId}><SelectTrigger className="w-full sm:w-72 h-auto min-h-10 [&>span]:whitespace-normal [&>span]:text-left"><SelectValue placeholder="Select event"/></SelectTrigger><SelectContent>{events.map(e=><SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent></Select></header>
 {loading?<div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>:error?<div role="alert" className="space-y-3"><p>{error}</p><Button variant="outline" onClick={()=>reload().catch(e=>setError(e.message))}><RefreshCw className="mr-2 h-4 w-4"/>Retry</Button></div>:!data?<p className="text-muted-foreground">No {enterprise?'Enterprise ':''}events available.</p>:org&&<><TemplateLibrary organizationId={org.orgId} event={data.event} data={data} reload={reload} enterprise={enterprise}/>{enterprise&&<EnterpriseBlast organizationId={org.orgId} event={data.event} data={data} reload={reload}/>}</>}
 </div>;
}