import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DollarSign, TrendingUp, Download, Search, Loader2, AlertTriangle,
  Calendar, Info, ShieldCheck, Banknote, CreditCard, Clock, CheckCircle,
  XCircle, RotateCcw, FileText, Building2, Users,
} from "lucide-react";

interface Transaction {
  id: string;
  amount_cents: number;
  platform_fee_cents: number;
  net_amount_cents: number;
  hold_amount_cents: number | null;
  hold_status: string | null;
  hold_release_date: string | null;
  type: string;
  status: string;
  description: string | null;
  created_at: string;
  tournament_id: string | null;
  organization_id: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  payout_id: string | null;
}

interface Org {
  id: string;
  name: string;
  plan: string;
  stripe_account_id: string | null;
}

interface Tournament {
  id: string;
  title: string;
  organization_id: string;
}

interface Payout {
  id: string;
  amount_cents: number;
  platform_fees_cents: number;
  status: string;
  organization_id: string;
  created_at: string;
  stripe_transfer_id: string | null;
  transaction_count: number;
}

const AdminAccounting = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [txRes, orgRes, tRes, payRes] = await Promise.all([
      supabase.from("platform_transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("id, name, plan, stripe_account_id"),
      supabase.from("tournaments").select("id, title, organization_id"),
      supabase.from("organization_payouts").select("*").order("created_at", { ascending: false }),
    ]);
    setTransactions((txRes.data as Transaction[]) || []);
    setOrgs((orgRes.data as Org[]) || []);
    setTournaments((tRes.data as Tournament[]) || []);
    setPayouts((payRes.data as Payout[]) || []);
    setLoading(false);
  };

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);
  const tournamentMap = useMemo(() => Object.fromEntries(tournaments.map((t) => [t.id, t])), [tournaments]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "today": return { start: new Date(now.toDateString()), end: now };
      case "week": return { start: new Date(now.getTime() - 7 * 86400000), end: now };
      case "month": return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
      case "quarter": return { start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), end: now };
      case "year": return { start: new Date(now.getFullYear(), 0, 1), end: now };
      case "custom": return {
        start: customStart ? new Date(customStart) : null,
        end: customEnd ? new Date(customEnd + "T23:59:59") : now,
      };
      default: return { start: null, end: null };
    }
  };

  const filteredTx = useMemo(() => {
    const { start, end } = getDateFilter();
    return transactions.filter((tx) => {
      if (orgFilter !== "all" && tx.organization_id !== orgFilter) return false;
      if (tournamentFilter !== "all" && tx.tournament_id !== tournamentFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (start && new Date(tx.created_at) < start) return false;
      if (end && new Date(tx.created_at) > end) return false;
      if (search) {
        const q = search.toLowerCase();
        const org = orgMap[tx.organization_id];
        const t = tx.tournament_id ? tournamentMap[tx.tournament_id] : null;
        const match = tx.id.toLowerCase().includes(q)
          || (tx.stripe_payment_intent_id || "").toLowerCase().includes(q)
          || (tx.description || "").toLowerCase().includes(q)
          || (org?.name || "").toLowerCase().includes(q)
          || (t?.title || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [transactions, orgFilter, tournamentFilter, statusFilter, dateRange, customStart, customEnd, search, orgMap, tournamentMap]);

  // Summary stats
  const totalPlatformRevenue = filteredTx.reduce((s, t) => s + t.platform_fee_cents, 0);
  const totalGross = filteredTx.reduce((s, t) => s + t.amount_cents, 0);
  const totalHeld = filteredTx.filter((t) => t.hold_status === "active").reduce((s, t) => s + (t.hold_amount_cents || 0), 0);
  const totalPaidOut = payouts.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount_cents, 0);
  const pendingPayouts = filteredTx.filter((t) => t.status === "held" && t.hold_status !== "active").reduce((s, t) => s + t.net_amount_cents, 0);

  // Discrepancy check
  const discrepancies = filteredTx.filter((tx) => {
    const expected = tx.platform_fee_cents + tx.net_amount_cents;
    return Math.abs(tx.amount_cents - expected) > 1; // allow 1 cent rounding
  });

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTransactions = () => {
    const headers = [
      "Transaction ID", "Date", "Organizer", "Tournament", "Type", "Status",
      "Gross ($)", "Platform Fee 5% ($)", "Hold 15% ($)", "Net to Organizer ($)",
      "Hold Status", "Hold Release Date", "Stripe PI", "Stripe Session",
    ];
    const rows = filteredTx.map((tx) => [
      tx.id, new Date(tx.created_at).toLocaleDateString(),
      orgMap[tx.organization_id]?.name || tx.organization_id,
      tx.tournament_id ? (tournamentMap[tx.tournament_id]?.title || tx.tournament_id) : "-",
      tx.type, tx.status,
      (tx.amount_cents / 100).toFixed(2), (tx.platform_fee_cents / 100).toFixed(2),
      ((tx.hold_amount_cents || 0) / 100).toFixed(2), (tx.net_amount_cents / 100).toFixed(2),
      tx.hold_status || "-", tx.hold_release_date || "-",
      tx.stripe_payment_intent_id || "-", tx.stripe_session_id || "-",
    ]);
    downloadCSV(`teevents-transactions-${new Date().toISOString().split("T")[0]}.csv`, headers, rows);
    toast.success(`Exported ${rows.length} transactions`);
  };

  const handleExportPayouts = () => {
    const headers = ["Payout ID", "Date", "Organizer", "Amount ($)", "Platform Fees ($)", "Transactions", "Status", "Transfer ID"];
    const rows = payouts.map((p) => [
      p.id, new Date(p.created_at).toLocaleDateString(),
      orgMap[p.organization_id]?.name || p.organization_id,
      (p.amount_cents / 100).toFixed(2), (p.platform_fees_cents / 100).toFixed(2),
      String(p.transaction_count), p.status, p.stripe_transfer_id || "-",
    ]);
    downloadCSV(`teevents-payouts-${new Date().toISOString().split("T")[0]}.csv`, headers, rows);
    toast.success(`Exported ${rows.length} payouts`);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "held": return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs"><Clock className="h-3 w-3 mr-1" />Held</Badge>;
      case "paid_out": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Paid Out</Badge>;
      case "refunded": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-xs"><RotateCcw className="h-3 w-3 mr-1" />Refunded</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Accounting Department</h2>
        <p className="text-sm text-muted-foreground">Platform-wide transaction tracking, reconciliation, and tax reporting</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-emerald-100"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
            <span className="text-xs text-muted-foreground font-medium">Platform Revenue</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${(totalPlatformRevenue / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">5% of all registrations</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-blue-100"><DollarSign className="h-4 w-4 text-blue-600" /></div>
            <span className="text-xs text-muted-foreground font-medium">Total Gross</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${(totalGross / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{filteredTx.length} transactions</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-amber-100"><ShieldCheck className="h-4 w-4 text-amber-600" /></div>
            <span className="text-xs text-muted-foreground font-medium">Total Reserve Held</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">${(totalHeld / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">15% active holds</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-emerald-100"><Banknote className="h-4 w-4 text-emerald-600" /></div>
            <span className="text-xs text-muted-foreground font-medium">Total Paid Out</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${(totalPaidOut / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{payouts.filter((p) => p.status === "completed").length} payouts</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10"><Clock className="h-4 w-4 text-primary" /></div>
            <span className="text-xs text-muted-foreground font-medium">Pending Payouts</span>
          </div>
          <p className="text-2xl font-bold text-primary">${(pendingPayouts / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Awaiting payout cycle</p>
        </div>
      </div>

      {/* Discrepancy Alert */}
      {discrepancies.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{discrepancies.length} transaction(s) with fee discrepancies detected</p>
            <p className="text-xs text-muted-foreground">gross ≠ platform_fee + net_amount. Review these transactions.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 bg-card" />
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="bg-card"><Calendar className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="bg-card"><Building2 className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Organizer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizers</SelectItem>
            {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="held">Held</SelectItem>
            <SelectItem value="paid_out">Paid Out</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportTransactions} className="gap-1.5">
            <Download className="h-4 w-4" />CSV
          </Button>
        </div>
      </div>

      {dateRange === "custom" && (
        <div className="flex gap-3">
          <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-card max-w-[180px]" />
          <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-card max-w-[180px]" />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="transactions"><CreditCard className="h-4 w-4 mr-1.5" />Transactions ({filteredTx.length})</TabsTrigger>
          <TabsTrigger value="payouts"><Banknote className="h-4 w-4 mr-1.5" />Payouts ({payouts.length})</TabsTrigger>
          <TabsTrigger value="reserves"><ShieldCheck className="h-4 w-4 mr-1.5" />Reserves</TabsTrigger>
          <TabsTrigger value="reconciliation"><FileText className="h-4 w-4 mr-1.5" />Reconciliation</TabsTrigger>
        </TabsList>

        {/* Transactions */}
        <TabsContent value="transactions">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Organizer</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Tournament</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-3">Gross</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Fee (5%)</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Hold (15%)</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-3">Net</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.slice(0, 200).map((tx) => (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-sm font-medium text-foreground">{orgMap[tx.organization_id]?.name || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{tx.tournament_id ? (tournamentMap[tx.tournament_id]?.title || "—") : "—"}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs capitalize">{tx.type}</Badge></td>
                      <td className="p-3 text-sm font-semibold text-foreground text-right">${(tx.amount_cents / 100).toFixed(2)}</td>
                      <td className="p-3 text-sm text-muted-foreground text-right hidden md:table-cell">${(tx.platform_fee_cents / 100).toFixed(2)}</td>
                      <td className="p-3 text-sm text-amber-600 text-right hidden lg:table-cell">${((tx.hold_amount_cents || 0) / 100).toFixed(2)}</td>
                      <td className="p-3 text-sm font-medium text-primary text-right">${(tx.net_amount_cents / 100).toFixed(2)}</td>
                      <td className="p-3">{statusBadge(tx.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredTx.length > 200 && (
              <div className="p-3 text-center text-xs text-muted-foreground border-t border-border">
                Showing 200 of {filteredTx.length} — export CSV for full data
              </div>
            )}
          </div>
        </TabsContent>

        {/* Payouts */}
        <TabsContent value="payouts">
          <div className="flex justify-end mb-3">
            <Button variant="outline" size="sm" onClick={handleExportPayouts} className="gap-1.5"><Download className="h-4 w-4" />Export Payouts CSV</Button>
          </div>
          <div className="space-y-3">
            {payouts.map((p) => (
              <div key={p.id} className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground">${(p.amount_cents / 100).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{orgMap[p.organization_id]?.name || p.organization_id}</p>
                  </div>
                  <Badge className={p.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"} >{p.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground">Fees Collected</p><p className="font-medium">${(p.platform_fees_cents / 100).toFixed(2)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Transactions</p><p className="font-medium">{p.transaction_count}</p></div>
                  <div><p className="text-xs text-muted-foreground">Transfer</p><p className="font-medium text-xs">{p.stripe_transfer_id || "—"}</p></div>
                </div>
              </div>
            ))}
            {payouts.length === 0 && (
              <div className="text-center py-12 bg-muted/20 rounded-lg border border-border">
                <Banknote className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No payouts yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reserves */}
        <TabsContent value="reserves">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Organizer</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Tournament</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-3">Hold Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Release Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter((t) => (t.hold_amount_cents || 0) > 0).map((tx) => (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="p-3 text-sm font-medium text-foreground">{orgMap[tx.organization_id]?.name || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground">{tx.tournament_id ? (tournamentMap[tx.tournament_id]?.title || "—") : "—"}</td>
                      <td className="p-3 text-sm font-semibold text-amber-600 text-right">${((tx.hold_amount_cents || 0) / 100).toFixed(2)}</td>
                      <td className="p-3 text-sm text-muted-foreground">{tx.hold_release_date || "—"}</td>
                      <td className="p-3">
                        {tx.hold_status === "active" ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Active</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">Released</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Reconciliation */}
        <TabsContent value="reconciliation">
          <div className="space-y-4">
            {/* Per-organizer summary */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Organizer Payout Reconciliation</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Organizer</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Gross</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Fees (5%)</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Held</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Net Owed</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Paid Out</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((org) => {
                      const orgTx = transactions.filter((t) => t.organization_id === org.id);
                      const gross = orgTx.reduce((s, t) => s + t.amount_cents, 0);
                      if (gross === 0) return null;
                      const fees = orgTx.reduce((s, t) => s + t.platform_fee_cents, 0);
                      const held = orgTx.filter((t) => t.hold_status === "active").reduce((s, t) => s + (t.hold_amount_cents || 0), 0);
                      const netOwed = orgTx.reduce((s, t) => s + t.net_amount_cents, 0);
                      const paidOut = payouts.filter((p) => p.organization_id === org.id && p.status === "completed").reduce((s, p) => s + p.amount_cents, 0);
                      const balance = netOwed - paidOut;
                      return (
                        <tr key={org.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="p-3 text-sm font-medium text-foreground">{org.name}</td>
                          <td className="p-3 text-sm text-right">${(gross / 100).toFixed(2)}</td>
                          <td className="p-3 text-sm text-right text-muted-foreground">${(fees / 100).toFixed(2)}</td>
                          <td className="p-3 text-sm text-right text-amber-600">${(held / 100).toFixed(2)}</td>
                          <td className="p-3 text-sm text-right font-medium">${(netOwed / 100).toFixed(2)}</td>
                          <td className="p-3 text-sm text-right text-emerald-600">${(paidOut / 100).toFixed(2)}</td>
                          <td className="p-3 text-sm text-right font-bold text-primary">${(balance / 100).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Discrepancies */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Fee Discrepancies</h3>
              {discrepancies.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No discrepancies found. All transactions reconcile correctly.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {discrepancies.map((tx) => (
                    <div key={tx.id} className="p-3 bg-destructive/5 rounded-lg border border-destructive/20 text-sm">
                      <p className="font-medium text-foreground">{tx.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Gross: ${(tx.amount_cents / 100).toFixed(2)} ≠ Fee ${(tx.platform_fee_cents / 100).toFixed(2)} + Net ${(tx.net_amount_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAccounting;
