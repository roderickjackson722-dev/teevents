import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, DollarSign, TrendingUp, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  created_at: string;
  amount_cents: number;
  platform_fee_cents: number;
  net_amount_cents: number;
  type: string;
  status: string;
  description: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  tournament_id: string | null;
  organization_id: string;
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

  // Filters
  const [dateFilter, setDateFilter] = useState("30");
  const [orgFilter, setOrgFilter] = useState("all");
  const [tournamentFilter, setTournamentFilter] = useState("all");

  const fetchTransactions = useCallback(async () => {
    try {
      const now = new Date();
      const daysAgo = parseInt(dateFilter);
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from("platform_transactions")
        .select("*")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (orgFilter !== "all") {
        query = query.eq("organization_id", orgFilter);
      }
      if (tournamentFilter !== "all") {
        query = query.eq("tournament_id", tournamentFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch org & tournament names
      const orgIds = [...new Set((data || []).map(t => t.organization_id))];
      const tournIds = [...new Set((data || []).filter(t => t.tournament_id).map(t => t.tournament_id!))];

      const [orgsRes, tournsRes] = await Promise.all([
        orgIds.length > 0
          ? supabase.from("organizations").select("id, name").in("id", orgIds)
          : { data: [] },
        tournIds.length > 0
          ? supabase.from("tournaments").select("id, title").in("id", tournIds)
          : { data: [] },
      ]);

      const orgMap = new Map((orgsRes.data || []).map(o => [o.id, o.name]));
      const tournMap = new Map((tournsRes.data || []).map(t => [t.id, t.title]));

      const enriched = (data || []).map(t => ({
        ...t,
        org_name: orgMap.get(t.organization_id) || "Unknown",
        tournament_name: t.tournament_id ? tournMap.get(t.tournament_id) || "—" : "—",
      }));

      setTransactions(enriched);
    } catch (err: any) {
      console.error("Failed to fetch transactions:", err);
      toast({ title: "Error loading transactions", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [dateFilter, orgFilter, tournamentFilter, toast]);

  const fetchFilters = useCallback(async () => {
    const [orgsRes, tournsRes] = await Promise.all([
      supabase.from("organizations").select("id, name").order("name"),
      supabase.from("tournaments").select("id, title").order("title"),
    ]);
    setOrganizations(orgsRes.data || []);
    setTournaments(tournsRes.data || []);
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    setLoading(true);
    fetchTransactions();
  }, [fetchTransactions]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTransactions]);

  // Summary calculations
  const totalCollected = transactions.reduce((sum, t) => sum + t.amount_cents, 0);
  const totalFees = transactions.reduce((sum, t) => sum + t.platform_fee_cents, 0);
  const totalNet = transactions.reduce((sum, t) => sum + t.net_amount_cents, 0);

  const exportCSV = () => {
    const headers = ["Date", "Tournament", "Organizer", "Gross Amount", "Platform Fee (5%)", "Net to Organizer", "Type", "Status", "Stripe Payment Intent", "Description"];
    const rows = transactions.map(t => [
      new Date(t.created_at).toLocaleString(),
      t.tournament_name || "",
      t.org_name || "",
      `$${(t.amount_cents / 100).toFixed(2)}`,
      `$${(t.platform_fee_cents / 100).toFixed(2)}`,
      `$${(t.net_amount_cents / 100).toFixed(2)}`,
      t.type,
      t.status,
      t.stripe_payment_intent_id || "",
      t.description || "",
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teevents-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const resetFilters = () => {
    setDateFilter("30");
    setOrgFilter("all");
    setTournamentFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalCollected / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees (5%)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${(totalFees / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Platform revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net to Organizers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalNet / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">After platform fees</p>
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
              </SelectContent>
            </Select>
          </div>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Platform Fee</TableHead>
                  <TableHead className="text-right">Net to Org</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{t.tournament_name}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{t.org_name}</TableCell>
                    <TableCell className="text-right font-medium text-sm">${(t.amount_cents / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm text-primary">${(t.platform_fee_cents / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm">${(t.net_amount_cents / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">{t.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={t.status === "held" ? "secondary" : t.status === "released" ? "default" : "outline"}
                        className="capitalize text-xs"
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
