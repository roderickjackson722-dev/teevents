import { Fragment, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Download, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { formatCents } from "@/lib/formatCurrency";
import { adminListLeagueFinancials, type LeaguePaymentRow } from "@/lib/adminLeagueFinancials.functions";

type EventGroup = {
  key: string;
  league_name: string;
  event_name: string;
  event_date: string | null;
  rows: LeaguePaymentRow[];
  count: number;
  gross: number;
  platform: number;
  stripe: number;
  net: number;
};

const sum = (rows: LeaguePaymentRow[], pick: (r: LeaguePaymentRow) => number) =>
  rows.reduce((s, r) => s + (pick(r) || 0), 0);

export default function AdminLeagueFinancials() {
  const fetchRows = useServerFn(adminListLeagueFinancials);
  const [rows, setRows] = useState<LeaguePaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("paid");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await fetchRows({ data: {} } as any);
      setRows((res?.rows as LeaguePaymentRow[]) || []);
    } catch (e: any) {
      toast.error("Could not load league financials", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  const leagues = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.league_id, r.league_name));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (leagueFilter !== "all" && r.league_id !== leagueFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.league_name, r.event_name, r.member_name, r.payer_email, r.organization_name, r.kind, r.stripe_payment_intent]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [rows, leagueFilter, statusFilter, search]);

  const groups = useMemo<EventGroup[]>(() => {
    const map = new Map<string, EventGroup>();
    for (const r of filtered) {
      const key = `${r.league_id}::${r.event_id ?? r.kind}`;
      const g = map.get(key) || {
        key,
        league_name: r.league_name,
        event_name: r.event_name,
        event_date: r.event_date,
        rows: [],
        count: 0,
        gross: 0,
        platform: 0,
        stripe: 0,
        net: 0,
      };
      g.rows.push(r);
      g.count += 1;
      g.gross += r.gross_cents;
      g.platform += r.platform_fee_cents;
      g.stripe += r.stripe_fee_cents;
      g.net += r.net_cents;
      map.set(key, g);
    }
    return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
  }, [filtered]);

  const totals = useMemo(() => ({
    count: filtered.length,
    gross: sum(filtered, (r) => r.gross_cents),
    platform: sum(filtered, (r) => r.platform_fee_cents),
    stripe: sum(filtered, (r) => r.stripe_fee_cents),
    net: sum(filtered, (r) => r.net_cents),
  }), [filtered]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const exportCSV = () => {
    const headers = ["League", "Event", "Event Date", "Date Paid", "Kind", "Status", "Source", "Member", "Email", "Gross ($)", "Platform Fee ($)", "Stripe Fee ($)", "Net to League ($)", "Payment Intent"];
    const lines = filtered.map((r) => [
      r.league_name, r.event_name, r.event_date || "", new Date(r.created_at).toLocaleString(),
      r.kind, r.status, r.source, r.member_name || "", r.payer_email || "",
      (r.gross_cents / 100).toFixed(2), (r.platform_fee_cents / 100).toFixed(2),
      (r.stripe_fee_cents / 100).toFixed(2), (r.net_cents / 100).toFixed(2),
      r.stripe_payment_intent || "",
    ]);
    lines.push(["TOTAL", "", "", "", "", "", "", "", "",
      (totals.gross / 100).toFixed(2), (totals.platform / 100).toFixed(2),
      (totals.stripe / 100).toFixed(2), (totals.net / 100).toFixed(2), ""]);
    const csv = [headers, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `teevents-league-financials-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} league payments`);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Payments", value: String(totals.count), hint: "matching filters" },
          { label: "Gross collected", value: formatCents(totals.gross), hint: "paid by members" },
          { label: "Platform fees", value: formatCents(totals.platform), hint: "TeeVents 5%" },
          { label: "Stripe fees", value: formatCents(totals.stripe), hint: "card processing" },
          { label: "Net to leagues", value: formatCents(totals.net), hint: "after all fees" },
        ].map((c) => (
          <div key={c.label} className="bg-card rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search league, event, member..." className="pl-9 bg-card" />
        </div>
        <Select value={leagueFilter} onValueChange={setLeagueFilter}>
          <SelectTrigger className="w-[220px] bg-card"><SelectValue placeholder="All leagues" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All leagues</SelectItem>
            {leagues.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="paid">Paid only</SelectItem>
            <SelectItem value="pending">Pending only</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Breakdown by league event</h3>
          <p className="text-xs text-muted-foreground">Click an event to see every payment behind it. Totals for each numeric column are at the bottom.</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>League</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Platform fee</TableHead>
                <TableHead className="text-right">Stripe fee</TableHead>
                <TableHead className="text-right">Net (made)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No league payments match these filters.</TableCell></TableRow>
              )}
              {groups.map((g) => {
                const open = expanded.has(g.key);
                return (
                  <Fragment key={g.key}>
                    <TableRow className="cursor-pointer" onClick={() => toggle(g.key)}>
                      <TableCell>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="text-sm">{g.league_name}</TableCell>
                      <TableCell className="text-sm font-medium">{g.event_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{g.event_date || "—"}</TableCell>
                      <TableCell className="text-right text-sm">{g.count}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCents(g.gross)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{formatCents(g.platform)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{formatCents(g.stripe)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-primary">{formatCents(g.net)}</TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell />
                        <TableCell colSpan={8} className="p-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date paid</TableHead>
                                <TableHead>Member</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Kind</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Gross</TableHead>
                                <TableHead className="text-right">Platform fee</TableHead>
                                <TableHead className="text-right">Stripe fee</TableHead>
                                <TableHead className="text-right">Net</TableHead>
                                <TableHead>Reference</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {g.rows.map((r) => (
                                <TableRow key={r.id}>
                                  <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                                  <TableCell className="text-xs">{r.member_name || "—"}</TableCell>
                                  <TableCell className="text-xs">{r.payer_email || "—"}</TableCell>
                                  <TableCell className="text-xs capitalize">{r.kind}</TableCell>
                                  <TableCell><Badge variant={r.status === "paid" ? "default" : "secondary"} className="text-[10px] capitalize">{r.status}</Badge></TableCell>
                                  <TableCell className="text-right text-xs">{formatCents(r.gross_cents)}</TableCell>
                                  <TableCell className="text-right text-xs">{formatCents(r.platform_fee_cents)}</TableCell>
                                  <TableCell className="text-right text-xs">{formatCents(r.stripe_fee_cents)}</TableCell>
                                  <TableCell className="text-right text-xs font-medium">{formatCents(r.net_cents)}</TableCell>
                                  <TableCell className="font-mono text-[10px]">{r.stripe_payment_intent || "—"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell colSpan={5} className="text-xs font-semibold">Event total ({g.count})</TableCell>
                                <TableCell className="text-right text-xs font-semibold">{formatCents(g.gross)}</TableCell>
                                <TableCell className="text-right text-xs font-semibold">{formatCents(g.platform)}</TableCell>
                                <TableCell className="text-right text-xs font-semibold">{formatCents(g.stripe)}</TableCell>
                                <TableCell className="text-right text-xs font-semibold">{formatCents(g.net)}</TableCell>
                                <TableCell />
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell colSpan={3} className="font-semibold">All events total</TableCell>
                <TableCell className="text-right font-semibold">{totals.count}</TableCell>
                <TableCell className="text-right font-semibold">{formatCents(totals.gross)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCents(totals.platform)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCents(totals.stripe)}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{formatCents(totals.net)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </div>
  );
}
