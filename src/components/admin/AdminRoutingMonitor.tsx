import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, RefreshCw, PlayCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type RoutingLog = {
  id: string;
  created_at: string;
  context: string;
  tournament_id: string | null;
  organization_id: string | null;
  organizer_stripe_account_id: string | null;
  organizer_charges_ready: boolean;
  payment_method_override: string;
  routing_decision: string;
  gross_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  application_fee_cents: number;
  pass_fees_to_participants: boolean | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  buyer_email: string | null;
  notes: string | null;
};

type VerificationRun = {
  id: string;
  started_at: string;
  completed_at: string | null;
  window_start: string;
  window_end: string;
  total_payments: number;
  ok_count: number;
  misrouted_count: number;
  fee_mismatch_count: number;
  error_count: number;
  status: string;
  error: string | null;
};

type Finding = {
  id: string;
  verification_id: string;
  created_at: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number | null;
  expected_destination: string | null;
  actual_destination: string | null;
  expected_application_fee_cents: number | null;
  actual_application_fee_cents: number | null;
  context: string | null;
  organization_id: string | null;
  status: string;
  detail: string | null;
};

const fmtUsd = (c: number | null | undefined) => `$${(((c ?? 0) as number) / 100).toFixed(2)}`;

const decisionBadge = (d: string) =>
  d === "destination" ? (
    <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Organizer</Badge>
  ) : (
    <Badge variant="destructive">Platform escrow</Badge>
  );

export default function AdminRoutingMonitor() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<RoutingLog[]>([]);
  const [orgs, setOrgs] = useState<Record<string, string>>({});
  const [tournaments, setTournaments] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [contextFilter, setContextFilter] = useState<string>("all");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");

  const [runs, setRuns] = useState<VerificationRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [findingsFilter, setFindingsFilter] = useState<string>("all");
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: l }, { data: o }, { data: t }, { data: r }] = await Promise.all([
      supabase.from("payment_routing_logs").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("organizations").select("id,name"),
      supabase.from("tournaments").select("id,title"),
      supabase.from("payment_routing_verifications").select("*").order("started_at", { ascending: false }).limit(20),
    ]);
    setLogs((l as RoutingLog[]) || []);
    const orgMap: Record<string, string> = {};
    (o || []).forEach((x: any) => (orgMap[x.id] = x.name));
    setOrgs(orgMap);
    const tMap: Record<string, string> = {};
    (t || []).forEach((x: any) => (tMap[x.id] = x.title));
    setTournaments(tMap);
    const runsList = (r as VerificationRun[]) || [];
    setRuns(runsList);
    if (runsList.length && !activeRunId) setActiveRunId(runsList[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!activeRunId) { setFindings([]); return; }
    supabase
      .from("payment_routing_verification_findings")
      .select("*")
      .eq("verification_id", activeRunId)
      .order("status", { ascending: false })
      .then(({ data }) => setFindings((data as Finding[]) || []));
  }, [activeRunId]);

  const filteredLogs = useMemo(() => {
    const s = search.trim().toLowerCase();
    return logs.filter((row) => {
      if (contextFilter !== "all" && row.context !== contextFilter) return false;
      if (decisionFilter !== "all" && row.routing_decision !== decisionFilter) return false;
      if (!s) return true;
      const haystack = [
        row.buyer_email,
        row.stripe_session_id,
        row.stripe_payment_intent_id,
        row.organizer_stripe_account_id,
        row.organization_id ? orgs[row.organization_id] : "",
        row.tournament_id ? tournaments[row.tournament_id] : "",
        row.context,
        row.notes,
      ].join(" ").toLowerCase();
      return haystack.includes(s);
    });
  }, [logs, search, contextFilter, decisionFilter, orgs, tournaments]);

  // Per-org rollup
  const byOrg = useMemo(() => {
    const map = new Map<string, {
      orgId: string; orgName: string; total: number; destination: number; escrow: number;
      grossCents: number; appFeeCents: number; lastReady: boolean | null; lastAcct: string | null;
    }>();
    for (const r of logs) {
      const key = r.organization_id || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          orgId: key, orgName: r.organization_id ? (orgs[r.organization_id] || "Unknown") : "(no org)",
          total: 0, destination: 0, escrow: 0, grossCents: 0, appFeeCents: 0,
          lastReady: null, lastAcct: null,
        });
      }
      const e = map.get(key)!;
      e.total++;
      if (r.routing_decision === "destination") e.destination++;
      else e.escrow++;
      e.grossCents += r.gross_cents;
      e.appFeeCents += r.application_fee_cents;
      if (e.lastReady === null) e.lastReady = r.organizer_charges_ready;
      if (!e.lastAcct) e.lastAcct = r.organizer_stripe_account_id;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [logs, orgs]);

  // Totals by context
  const byContext = useMemo(() => {
    const map = new Map<string, { context: string; count: number; gross: number; appFee: number; escrow: number }>();
    for (const r of logs) {
      if (!map.has(r.context)) map.set(r.context, { context: r.context, count: 0, gross: 0, appFee: 0, escrow: 0 });
      const e = map.get(r.context)!;
      e.count++;
      e.gross += r.gross_cents;
      e.appFee += r.application_fee_cents;
      if (r.routing_decision === "platform_escrow") e.escrow++;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [logs]);

  const totalEscrow = logs.filter((l) => l.routing_decision === "platform_escrow").length;

  const runVerifier = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment-routing", { body: { hours: 24 } });
      if (error) throw error;
      toast({
        title: "Verification complete",
        description: `Checked ${data.total_payments} payments • ${data.ok_count} ok • ${data.misrouted_count} misrouted • ${data.fee_mismatch_count} fee mismatch`,
      });
      await load();
      if (data.run_id) setActiveRunId(data.run_id);
    } catch (e: any) {
      toast({ title: "Verifier failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const filteredFindings = useMemo(() => {
    if (findingsFilter === "all") return findings;
    if (findingsFilter === "issues") return findings.filter((f) => f.status !== "ok");
    return findings.filter((f) => f.status === findingsFilter);
  }, [findings, findingsFilter]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Headline counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Recent decisions</div>
          <div className="text-2xl font-bold">{logs.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Routed to organizer</div>
          <div className="text-2xl font-bold text-emerald-700">{logs.length - totalEscrow}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Platform escrow</div>
          <div className={`text-2xl font-bold ${totalEscrow > 0 ? "text-destructive" : ""}`}>{totalEscrow}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">App fees collected</div>
          <div className="text-2xl font-bold">{fmtUsd(logs.reduce((a, b) => a + b.application_fee_cents, 0))}</div>
        </Card>
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Decisions</TabsTrigger>
          <TabsTrigger value="orgs">By organizer</TabsTrigger>
          <TabsTrigger value="contexts">By type</TabsTrigger>
          <TabsTrigger value="verify">Verifier</TabsTrigger>
        </TabsList>

        {/* DECISIONS TAB */}
        <TabsContent value="logs" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search email, session ID, organizer, tournament…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <select className="border rounded px-2 py-1 text-sm bg-background" value={contextFilter} onChange={(e) => setContextFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="registration">Registration</option>
              <option value="sponsor">Sponsor</option>
              <option value="store">Store</option>
              <option value="donation">Donation</option>
              <option value="auction">Auction</option>
            </select>
            <select className="border rounded px-2 py-1 text-sm bg-background" value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value)}>
              <option value="all">All decisions</option>
              <option value="destination">Organizer</option>
              <option value="platform_escrow">Platform escrow</option>
            </select>
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
            <div className="text-xs text-muted-foreground ml-auto">{filteredLogs.length} of {logs.length}</div>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">App fee</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead>Acct</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{r.context}</Badge></TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate" title={r.tournament_id ? tournaments[r.tournament_id] : ""}>
                      {r.tournament_id ? tournaments[r.tournament_id] || r.tournament_id.slice(0, 6) : "—"}
                    </TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate" title={r.organization_id ? orgs[r.organization_id] : ""}>
                      {r.organization_id ? orgs[r.organization_id] || r.organization_id.slice(0, 6) : "—"}
                    </TableCell>
                    <TableCell>{decisionBadge(r.routing_decision)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtUsd(r.gross_cents)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtUsd(r.application_fee_cents)}</TableCell>
                    <TableCell className="text-xs">{r.payment_method_override}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {r.organizer_stripe_account_id ? (
                        <span title={r.organizer_stripe_account_id} className={r.organizer_charges_ready ? "" : "text-destructive"}>
                          {r.organizer_stripe_account_id.slice(0, 12)}…{r.organizer_charges_ready ? " ✓" : " ⚠"}
                        </span>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No matching decisions</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* BY ORGANIZER */}
        <TabsContent value="orgs">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Connected acct</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Decisions</TableHead>
                  <TableHead className="text-right">To organizer</TableHead>
                  <TableHead className="text-right">Escrow fallback</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">App fees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byOrg.map((o) => (
                  <TableRow key={o.orgId}>
                    <TableCell className="font-medium">{o.orgName}</TableCell>
                    <TableCell className="text-xs font-mono">{o.lastAcct || "—"}</TableCell>
                    <TableCell>
                      {o.lastAcct == null ? <Badge variant="outline">No Stripe</Badge>
                        : o.lastReady ? <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Ready</Badge>
                        : <Badge variant="destructive">Not charge-ready</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{o.total}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{o.destination}</TableCell>
                    <TableCell className={`text-right tabular-nums ${o.escrow > 0 ? "text-destructive font-semibold" : ""}`}>{o.escrow}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtUsd(o.grossCents)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtUsd(o.appFeeCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* BY CONTEXT */}
        <TabsContent value="contexts">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">App fees</TableHead>
                  <TableHead className="text-right">Escrow fallback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byContext.map((c) => (
                  <TableRow key={c.context}>
                    <TableCell><Badge variant="outline">{c.context}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{c.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtUsd(c.gross)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtUsd(c.appFee)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${c.escrow > 0 ? "text-destructive font-semibold" : ""}`}>{c.escrow}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* VERIFIER */}
        <TabsContent value="verify" className="space-y-3">
          <div className="flex items-center gap-2">
            <Button onClick={runVerifier} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1" />}
              Run verifier on last 24h
            </Button>
            <div className="text-xs text-muted-foreground">Auto-runs daily at 09:00 UTC via cron.</div>
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">OK</TableHead>
                  <TableHead className="text-right">Misrouted</TableHead>
                  <TableHead className="text-right">Fee mismatch</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id} className={`cursor-pointer ${activeRunId === r.id ? "bg-muted" : ""}`} onClick={() => setActiveRunId(r.id)}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.started_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{Math.round((new Date(r.window_end).getTime() - new Date(r.window_start).getTime()) / 3600000)}h</TableCell>
                    <TableCell>
                      {r.status === "completed" ? <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Done</Badge>
                        : r.status === "failed" ? <Badge variant="destructive">Failed</Badge>
                        : <Badge variant="outline">{r.status}</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.total_payments}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{r.ok_count}</TableCell>
                    <TableCell className={`text-right tabular-nums ${r.misrouted_count > 0 ? "text-destructive font-semibold" : ""}`}>{r.misrouted_count}</TableCell>
                    <TableCell className={`text-right tabular-nums ${r.fee_mismatch_count > 0 ? "text-destructive font-semibold" : ""}`}>{r.fee_mismatch_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.error_count}</TableCell>
                  </TableRow>
                ))}
                {runs.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No runs yet — click "Run verifier" above.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {activeRunId && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <h3 className="font-semibold text-sm">Findings</h3>
                <select className="border rounded px-2 py-1 text-sm bg-background" value={findingsFilter} onChange={(e) => setFindingsFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="issues">Issues only</option>
                  <option value="ok">OK</option>
                  <option value="misrouted">Misrouted</option>
                  <option value="fee_mismatch">Fee mismatch</option>
                  <option value="error">Errors</option>
                </select>
                <span className="text-xs text-muted-foreground ml-auto">{filteredFindings.length} findings</span>
              </div>
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Payment intent</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Expected dest</TableHead>
                      <TableHead>Actual dest</TableHead>
                      <TableHead className="text-right">Exp app fee</TableHead>
                      <TableHead className="text-right">Act app fee</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFindings.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          {f.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <span className="inline-flex items-center gap-1 text-destructive text-xs font-semibold">
                                <AlertTriangle className="h-3 w-3" />{f.status}
                              </span>}
                        </TableCell>
                        <TableCell className="text-xs">{f.context || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{f.stripe_payment_intent_id?.slice(0, 18) || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtUsd(f.amount_cents)}</TableCell>
                        <TableCell className="text-xs font-mono">{f.expected_destination || "—"}</TableCell>
                        <TableCell className={`text-xs font-mono ${f.expected_destination && f.expected_destination !== f.actual_destination ? "text-destructive font-semibold" : ""}`}>{f.actual_destination || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{f.expected_application_fee_cents != null ? fmtUsd(f.expected_application_fee_cents) : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{f.actual_application_fee_cents != null ? fmtUsd(f.actual_application_fee_cents) : "—"}</TableCell>
                        <TableCell className="text-xs max-w-[240px] truncate" title={f.detail || ""}>{f.detail || ""}</TableCell>
                      </TableRow>
                    ))}
                    {filteredFindings.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No findings.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
