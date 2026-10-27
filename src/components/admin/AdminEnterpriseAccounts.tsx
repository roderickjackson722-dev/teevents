import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, Loader2, Search, ShieldCheck, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { approveEnterpriseAccount, listEnterpriseAccounts } from "@/lib/enterpriseAccounts.functions";

type Account = Awaited<ReturnType<typeof listEnterpriseAccounts>>[number];
type Selection = { account: Account; owner: Account["owners"][number] };

export default function AdminEnterpriseAccounts() {
  const list = useServerFn(listEnterpriseAccounts);
  const approve = useServerFn(approveEnterpriseAccount);
  const { data: accounts = [], isPending, error, refetch, isFetching } = useQuery({ queryKey: ["admin-enterprise-accounts"], queryFn: () => list(), staleTime: 0 });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("enterprise");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const enterprise = (account: Account) => !!account.approval || account.pricing_model === "enterprise" || account.plan === "enterprise" || account.tournaments.some((event) => event.is_enterprise);
  const visible = accounts.filter((account) => {
    const match = `${account.name} ${account.owners.map((owner) => owner.email).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase());
    return match && (filter === "all" || (filter === "enterprise" ? enterprise(account) : !enterprise(account)));
  });
  async function confirmApproval() {
    if (!selection?.owner.email) return;
    setBusy(true);
    try {
      await approve({ data: { organizationId: selection.account.id, ownerUserId: selection.owner.user_id, email: selection.owner.email } });
      await refetch();
      toast.success(`Enterprise access approved for ${selection.owner.email}`);
      setSelection(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not approve this account."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-display text-2xl font-bold text-foreground">Enterprise accounts</h2><p className="text-sm text-muted-foreground">{accounts.filter(enterprise).length} Enterprise accounts · {accounts.length} total accounts</p></div>
      <Button variant="outline" disabled={isFetching} onClick={() => refetch()}>{isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Refresh</Button>
    </div>
    <div className="flex flex-wrap gap-3">
      <div className="relative min-w-0 flex-1 basis-64"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search account email or organization" placeholder="Search email or organization" className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); if (event.target.value) setFilter("all"); }} /></div>
      <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-52" aria-label="Account filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="enterprise">Enterprise accounts</SelectItem><SelectItem value="all">All accounts</SelectItem><SelectItem value="eligible">Not yet Enterprise</SelectItem></SelectContent></Select>
    </div>
    {isPending ? <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading accounts…</p> : error ? <p role="alert" className="text-destructive">{error.message}</p> : visible.length === 0 ? <p className="py-10 text-center text-muted-foreground">No matching accounts.</p> : <div className="divide-y divide-border border-y border-border">
      {visible.map((account) => <article key={account.id} className="space-y-3 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="break-words font-semibold text-foreground">{account.name}</h3><div className="mt-1 flex flex-wrap gap-2">
            {account.approval ? <Badge variant="secondary"><CheckCircle2 className="mr-1 h-3 w-3" />Approved Enterprise</Badge> : enterprise(account) ? <Badge variant="outline">Existing Enterprise</Badge> : <Badge variant="outline">Not approved</Badge>}
            {account.enterprise_subscription_status && <Badge variant="outline">Subscription: {account.enterprise_subscription_status}</Badge>}
          </div>{account.approval && <p className="mt-2 break-all text-xs text-muted-foreground">Approved email: {account.approval.approved_email}</p>}</div>
          {enterprise(account) && <Button asChild variant="outline" size="sm"><Link to={`/enterprise?admin_org=${account.id}`}><ExternalLink className="mr-2 h-4 w-4" />Open Enterprise</Link></Button>}
        </div>
        {account.owners.length === 0 ? <p className="text-sm text-muted-foreground">No owner account on file.</p> : account.owners.map((owner) => <div key={owner.user_id} className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0"><p className="break-all text-sm text-foreground">{owner.email || "No email on file"}</p><p className="text-xs text-muted-foreground">Owner · {owner.verified ? "Verified email" : "Email not verified"}</p></div>
          {!account.approval && <Button variant="outline" size="sm" disabled={!owner.verified || !owner.email} onClick={() => setSelection({ account, owner })}><ShieldCheck className="mr-2 h-4 w-4" />Approve Enterprise</Button>}
        </div>)}
        <Button variant="ghost" size="sm" aria-expanded={expanded === account.id} onClick={() => setExpanded(expanded === account.id ? null : account.id)}><Trophy className="mr-2 h-4 w-4" />Platform tournaments ({account.tournaments.length})</Button>
        {expanded === account.id && <div className="space-y-2 border-l-2 border-border pl-4">{account.tournaments.length === 0 ? <p className="text-sm text-muted-foreground">No tournaments yet.</p> : account.tournaments.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><div className="min-w-0"><p className="break-words font-medium">{event.title}</p><p className="text-xs text-muted-foreground">{event.date || "No date"} · {event.status} · {event.is_enterprise ? "Enterprise" : "Standard tournament"}</p></div><Button asChild variant="outline" size="sm"><Link to={event.is_enterprise ? `/enterprise/create?admin_org=${account.id}&tournament_id=${event.id}` : `/dashboard/tournaments?admin_org=${account.id}&tournament_id=${event.id}`}><ExternalLink className="mr-1 h-3 w-3" />Open tournament</Link></Button></div>)}</div>}
      </article>)}
    </div>}
    <Dialog open={!!selection} onOpenChange={(open) => { if (!open && !busy) setSelection(null); }}><DialogContent><DialogHeader><DialogTitle>Approve Enterprise access?</DialogTitle><DialogDescription>This grants access to the selected workspace. Existing tournaments, prices, payments and subscriptions stay unchanged. No email will be sent.</DialogDescription></DialogHeader><div className="min-w-0"><p className="font-semibold">{selection?.account.name}</p><p className="break-all text-sm">{selection?.owner.email}</p></div><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setSelection(null)}>Cancel</Button><Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" disabled={busy} onClick={confirmApproval}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Approve Enterprise access</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}