import { useState, useEffect, useCallback, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw, DollarSign, TrendingUp, Building2, CreditCard, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  created_at: string;
  amount_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  net_amount_cents: number;
  type: string;
  status: string;
  description: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  tournament_id: string | null;
  organization_id: string;
  golfer_name: string | null;
  golfer_email: string | null;
  payout_method: string | null;
  failure_reason: string | null;
  registration_id: string | null;
  tournament_name?: string;
  org_name?: string;
}

const AdminTransactions = () => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [tournaments, setTournaments] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [dateFilter, setDateFilter] = useState("30");
  const [orgFilter, setOrgFilter] = useState("all");
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const fetchTransactions = useCallback(async () => {
    try {
      let query = supabase
        .from("platform_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (dateFilter === "custom" && customStart) {
        query = query.gte("created_at", new Date(customStart).toISOString());
        if (customEnd) query = query.lte("created_at", new Date(customEnd + "T23:59:59").toISOString());
      } else if (dateFilter !== "all") {
        const daysAgo = parseInt(dateFilter);
        const startDate = new Date(Date.now() - daysAgo * 86400000).toISOString();
        query = query.gte("created_at", startDate);
      }

      if (orgFilter !== "all") query = query.eq("organization_id", orgFilter);
      if (tournamentFilter !== "all") query = query.eq("tournament_id", tournamentFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;

      const orgIds = [...new Set((data || []).map(t => t.organization_id))];
      const tournIds = [...new Set((data || []).filter(t => t.tournament_id).map(t => t.tournament_id!))];

      const [orgsRes, tournsRes] = await Promise.all([
        orgIds.length > 0 ? supabase.from("organizations").select("id, name").in("id", orgIds) : { data: [] },
        tournIds.length > 0 ? supabase.from("tournaments").select("id, title").in("id", tournIds) : { data: [] },
      ]);

      const orgMap = new Map((orgsRes.data || []).map(o => [o.id, o.name]));
      const tournMap = new Map((tournsRes.data || []).map(t => [t.id, t.title]));

      const enriched = (data || []).map((t: any) => ({
        ...t,
        org_name: orgMap.get(t.organization_id) || "Unknown",
        tournament_name: t.tournament_id ? tournMap.get(t.tournament_id) || "—" : "—",
      })) as Transaction[];

      setTransactions(enriched);
    } catch (err: any) {
      console.error("Failed to fetch transactions:", err);
      toast({ title: "Error loading transactions", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [dateFilter, orgFilter, tournamentFilter, statusFilter, customStart, customEnd, toast]);

  const fetchFilters = useCallback(async () => {
    const [orgsRes, tournsRes] = await Promise.all([
      supabase.from("organizations").select("id, name").order("name"),
      supabase.from("tournaments").select("id, title").order("title"),
    ]);
    setOrganizations(orgsRes.data || []);
    setTournaments(tournsRes.data || []);
  }, []);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);
  useEffect(() => { setLoading(true); fetchTransactions(); }, [fetchTransactions]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTransactions]);

  // Summary calculations
  const totalGross = transactions.reduce((sum, t) => sum + t.amount_cents, 0);
  const totalPlatformFees = transactions.reduce((sum, t) => sum + t.platform_fee_cents, 0);
  const totalStripeFees = transactions.reduce((sum, t) => sum + (t.stripe_fee_cents || 0), 0);
  const totalNet = transactions.reduce((sum, t) => sum + t.net_amount_cents, 0);

  const exportCSV = () => {
    const headers = [
      "Date", "Organizer", "Tournament", "Golfer", "Golfer Email",
      "Gross ($)", "Platform Fee ($)", "Stripe Fee ($)", "Net to Org ($)",
      "Type", "Status", "Payout Method",
      "Stripe Payment Intent", "Stripe Session", "Stripe Transfer ID", "Failure Reason",
    ];
    const rows = transactions.map(t => [
      new Date(t.created_at).toLocaleString(),
      t.org_name || "",
      t.tournament_name || "",
      t.golfer_name || "",
      t.golfer_email || "",
      (t.amount_cents / 100).toFixed(2),
      (t.platform_fee_cents / 100).toFixed(2),
      ((t.stripe_fee_cents || 0) / 100).toFixed(2),
      (t.net_amount_cents / 100).toFixed(2),
      t.type,
      t.status,
      t.payout_method || "",
      t.stripe_payment_intent_id || "",
      t.stripe_session_id || "",
      "", // Stripe Transfer ID — not stored separately
      t.failure_reason || "",
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teevents-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported", description: `${rows.length} transactions exported.` });
  };

  const resetFilters = () => {
    setDateFilter("30");
    setOrgFilter("all");
    setTournamentFilter("all");
    setStatusFilter("all");
    setCustomStart("");
    setCustomEnd("");
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalGross / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Platform Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${(totalPlatformFees / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">5% platform revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stripe Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">${(totalStripeFees / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">2.9% + $0.30/txn</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net to Organizers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalNet / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">After all fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date Range</label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {dateFilter === "custom" && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-[140px]" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End</label>
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-[140px]" />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Organizer</label>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All organizers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizers</SelectItem>
                {organizations.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tournament</label>
            <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All tournaments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tournaments</SelectItem>
                {tournaments.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="held">Held</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={resetFilters}>Reset</Button>
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh (30s)
            </label>
            <Button variant="outline" size="sm" onClick={fetchTransactions}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading transactions...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Golfer</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(t => {
                  const expanded = expandedRows.has(t.id);
                  const totalFees = t.platform_fee_cents + (t.stripe_fee_cents || 0);
                  return (
                    <Fragment key={t.id}>
                      <TableRow className="cursor-pointer" onClick={() => toggleRow(t.id)}>
                        <TableCell>
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate">{t.org_name}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{t.tournament_name}</TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate">{t.golfer_name || "—"}</TableCell>
                        <TableCell className="text-right font-medium text-sm">${(t.amount_cents / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">${(totalFees / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">${(t.net_amount_cents / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={t.status === "failed" ? "destructive" : t.status === "released" ? "default" : "secondary"}
                            className="capitalize text-xs"
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="space-y-1">
                                <div><span className="text-muted-foreground">Transaction ID:</span> <code className="text-xs">{t.id}</code></div>
                                <div><span className="text-muted-foreground">Stripe Payment Intent:</span> <code className="text-xs">{t.stripe_payment_intent_id || "—"}</code></div>
                                <div><span className="text-muted-foreground">Stripe Session:</span> <code className="text-xs">{t.stripe_session_id || "—"}</code></div>
                                <div><span className="text-muted-foreground">Golfer Email:</span> {t.golfer_email || "—"}</div>
                                <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline" className="text-xs capitalize">{t.type}</Badge></div>
                              </div>
                              <div className="space-y-1">
                                <div><span className="text-muted-foreground">Gross Amount:</span> <strong>${(t.amount_cents / 100).toFixed(2)}</strong></div>
                                <div><span className="text-muted-foreground">Platform Fee (5%):</span> ${(t.platform_fee_cents / 100).toFixed(2)}</div>
                                <div><span className="text-muted-foreground">Stripe Fee:</span> ${((t.stripe_fee_cents || 0) / 100).toFixed(2)}</div>
                                <div><span className="text-muted-foreground">Net to Organizer:</span> <strong className="text-primary">${(t.net_amount_cents / 100).toFixed(2)}</strong></div>
                                <div><span className="text-muted-foreground">Payout Method:</span> <Badge variant="outline" className="text-xs capitalize">{t.payout_method || "unknown"}</Badge></div>
                                {t.failure_reason && (
                                  <div className="text-destructive"><span className="text-muted-foreground">Failure Reason:</span> {t.failure_reason}</div>
                                )}
                              </div>
                              {t.description && (
                                <div className="md:col-span-2 pt-2 border-t border-border">
                                  <span className="text-muted-foreground">Note:</span> {t.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No transactions found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground text-right">
          {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
};

export default AdminTransactions;
