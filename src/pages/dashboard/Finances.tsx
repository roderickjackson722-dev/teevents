import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  DollarSign, TrendingUp, CreditCard, RotateCcw, Loader2, Search,
  Trophy, Download, Receipt, Mail, CheckCircle, XCircle, Clock,
  ArrowUpRight, ArrowDownRight, Users, RefreshCw, Wallet, Calendar,
  Banknote, Info, ShieldCheck,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  payment_status: string;
  created_at: string;
  tier_id: string | null;
}

interface RefundRequest {
  id: string;
  registration_id: string;
  amount_cents: number;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  registration?: {
    first_name: string;
    last_name: string;
    email: string;
    payment_status: string;
  };
}

interface Tournament {
  id: string;
  title: string;
  registration_fee_cents: number | null;
}

interface Tier {
  id: string;
  name: string;
  price_cents: number;
  tournament_id: string;
}

interface PlatformTransaction {
  id: string;
  amount_cents: number;
  platform_fee_cents: number;
  net_amount_cents: number;
  type: string;
  status: string;
  description: string | null;
  created_at: string;
}

interface Payout {
  id: string;
  amount_cents: number;
  platform_fees_cents: number;
  status: string;
  period_start: string;
  period_end: string;
  transaction_count: number;
  notes: string | null;
  created_at: string;
}

const RESERVE_PERCENT = 15;

const Finances = () => {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [platformTransactions, setPlatformTransactions] = useState<PlatformTransaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, registration_fee_cents")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setTournaments(list);
        if (list.length > 0) setSelectedTournament(list[0].id);
        setLoading(false);
      });

    Promise.all([
      supabase
        .from("platform_transactions")
        .select("*")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false }),
      supabase
        .from("organization_payouts")
        .select("*")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false }),
    ]).then(([txRes, payoutRes]) => {
      setPlatformTransactions((txRes.data as PlatformTransaction[]) || []);
      setPayouts((payoutRes.data as Payout[]) || []);
    });
  }, [org]);

  const fetchData = useCallback(async () => {
    if (!selectedTournament) return;
    setLoading(true);
    const [regRes, refundRes, tierRes] = await Promise.all([
      supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, email, payment_status, created_at, tier_id")
        .eq("tournament_id", selectedTournament)
        .order("created_at", { ascending: false }),
      supabase
        .from("tournament_refund_requests")
        .select("*, tournament_registrations(first_name, last_name, email, payment_status)")
        .eq("tournament_id", selectedTournament)
        .order("created_at", { ascending: false }),
      supabase
        .from("tournament_registration_tiers")
        .select("id, name, price_cents, tournament_id")
        .eq("tournament_id", selectedTournament),
    ]);
    setRegistrations((regRes.data as Registration[]) || []);
    setRefundRequests(
      ((refundRes.data as any[]) || []).map((r: any) => ({
        ...r,
        registration: r.tournament_registrations,
      }))
    );
    setTiers((tierRes.data as Tier[]) || []);
    setLoading(false);
  }, [selectedTournament]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedTournamentData = tournaments.find((t) => t.id === selectedTournament);

  const getRegistrationAmount = (reg: Registration) => {
    if (reg.tier_id) {
      const tier = tiers.find((t) => t.id === reg.tier_id);
      if (tier) return tier.price_cents;
    }
    return selectedTournamentData?.registration_fee_cents || 0;
  };

  const paidRegistrations = registrations.filter((r) => r.payment_status === "paid");
  const refundedRegistrations = registrations.filter((r) => r.payment_status === "refunded");
  const pendingRegistrations = registrations.filter((r) => r.payment_status === "pending");

  const totalRevenue = paidRegistrations.reduce((sum, r) => sum + getRegistrationAmount(r), 0);
  const totalRefunded = refundedRegistrations.reduce((sum, r) => sum + getRegistrationAmount(r), 0);
  const netRevenue = totalRevenue - totalRefunded;
  const pendingRefunds = refundRequests.filter((r) => r.status === "pending");

  // Escrow calculations
  const heldFunds = platformTransactions
    .filter((t) => t.status === "held")
    .reduce((sum, t) => sum + t.net_amount_cents, 0);

  const totalPlatformFees = platformTransactions
    .filter((t) => t.status === "held")
    .reduce((sum, t) => sum + t.platform_fee_cents, 0);

  const reserveAmount = Math.round(heldFunds * (RESERVE_PERCENT / 100));
  const availableForPayout = heldFunds - reserveAmount;

  const totalPaidOut = payouts
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  // Next payout date
  const getNextPayoutDate = () => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();
    if (day < 15) return new Date(year, month, 15);
    return new Date(year, month + 1, 1);
  };
  const nextPayoutDate = getNextPayoutDate();

  // Refund actions
  const handleRefundAction = async (requestId: string, action: "approved" | "denied") => {
    if (demoGuard()) return;
    setProcessingId(requestId);
    try {
      if (action === "approved") {
        const { data, error } = await supabase.functions.invoke("process-refund", {
          body: { refund_request_id: requestId, admin_notes: adminNotes[requestId] || "" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success("Refund processed successfully!");
      } else {
        const { error } = await supabase
          .from("tournament_refund_requests")
          .update({
            status: "denied",
            admin_notes: adminNotes[requestId] || null,
            resolved_at: new Date().toISOString(),
          } as any)
          .eq("id", requestId);
        if (error) throw error;
        toast.success("Refund request denied.");
      }
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process refund");
    }
    setProcessingId(null);
  };

  const handleDirectRefund = async (registrationId: string) => {
    if (demoGuard()) return;
    setProcessingId(registrationId);
    try {
      const { data, error } = await supabase.functions.invoke("process-refund", {
        body: { registration_id: registrationId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Refund processed successfully!");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process refund");
    }
    setProcessingId(null);
  };

  const handleResendConfirmation = async (registrationId: string) => {
    if (demoGuard()) return;
    setResendingId(registrationId);
    try {
      const { data, error } = await supabase.functions.invoke("resend-confirmation", {
        body: { registration_ids: [registrationId] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Confirmation email sent!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send confirmation email");
    }
    setResendingId(null);
  };

  const handleResendAll = async () => {
    if (demoGuard()) return;
    const paidIds = paidRegistrations.map((r) => r.id);
    if (paidIds.length === 0) {
      toast.info("No paid registrations to send to.");
      return;
    }
    setResendingId("all");
    try {
      const { data, error } = await supabase.functions.invoke("resend-confirmation", {
        body: { registration_ids: paidIds },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Confirmation emails sent to ${data.sent} participant(s)!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send confirmation emails");
    }
    setResendingId(null);
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Amount", "Status", "Date"];
    const rows = registrations.map((r) => [
      `${r.first_name} ${r.last_name}`,
      r.email,
      `$${(getRegistrationAmount(r) / 100).toFixed(2)}`,
      r.payment_status,
      new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finances-${selectedTournamentData?.title || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRegistrations = registrations.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q)
    );
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case "pending": return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "refunded": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50"><RotateCcw className="h-3 w-3 mr-1" />Refunded</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const refundStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle className="h-3 w-3 mr-1" />Refunded</Badge>;
      case "denied": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const payoutStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case "processing": return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case "pending_setup": return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><Clock className="h-3 w-3 mr-1" />Setup Required</Badge>;
      case "failed": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  if (loading && tournaments.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-20 bg-card rounded-lg border border-border">
        <DollarSign className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-display font-bold text-foreground mb-2">No tournaments yet</h3>
        <p className="text-muted-foreground">Create a tournament first to view finances.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Finances</h1>
          <p className="text-muted-foreground mt-1">Revenue, payouts, reserves, and refund management</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-[240px] bg-card">
              <Trophy className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder="Select tournament" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Escrow Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">All funds are collected and held securely by TeeVents.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Transparent 4% platform fee applied. 15% reserve held until 15 days post-event. Net payouts every two weeks on the 1st and 15th.
          </p>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-emerald-100">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${(totalRevenue / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{paidRegistrations.length} paid</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-lg border border-border p-4 border-secondary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-secondary/10">
              <Wallet className="h-4 w-4 text-secondary" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Held Funds</span>
          </div>
          <p className="text-2xl font-bold text-secondary">${(heldFunds / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">After 4% fee</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-lg border border-border p-4 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-amber-100">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Reserve (15%)</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">${(reserveAmount / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Refund & chargeback protection</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Available for Payout</span>
          </div>
          <p className="text-2xl font-bold text-primary">${(Math.max(0, availableForPayout) / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Net after reserve</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-blue-100">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Next Payout</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {nextPayoutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {availableForPayout > 0 ? `~$${(availableForPayout / 100).toFixed(2)}` : "No funds available"}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-emerald-100">
              <Banknote className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Total Paid Out</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${(totalPaidOut / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{payouts.filter((p) => p.status === "completed").length} payouts</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="transactions">
              <CreditCard className="h-4 w-4 mr-1.5" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="payouts">
              <Banknote className="h-4 w-4 mr-1.5" />
              Payouts
            </TabsTrigger>
            <TabsTrigger value="refunds">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Refunds
              {pendingRefunds.length > 0 && (
                <Badge className="ml-1.5 bg-amber-500 text-white text-xs h-5 min-w-[20px] flex items-center justify-center">
                  {pendingRefunds.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendAll}
              disabled={resendingId === "all" || paidRegistrations.length === 0}
            >
              {resendingId === "all" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Mail className="h-4 w-4 mr-1.5" />}
              Resend All Confirmations
            </Button>
          </div>
        </div>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="pl-9 bg-card"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg border border-border">
              <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No transactions found.</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Participant</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Amount</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Date</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <p className="font-medium text-sm text-foreground">{reg.first_name} {reg.last_name}</p>
                          <p className="text-xs text-muted-foreground">{reg.email}</p>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-sm text-foreground">
                            ${(getRegistrationAmount(reg) / 100).toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3">{statusBadge(reg.payment_status)}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(reg.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            {reg.payment_status === "paid" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs gap-1"
                                  onClick={() => handleResendConfirmation(reg.id)}
                                  disabled={resendingId === reg.id}
                                  title="Resend confirmation email"
                                >
                                  {resendingId === reg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                                  <span className="hidden sm:inline">Resend</span>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs text-destructive hover:text-destructive gap-1"
                                      disabled={processingId === reg.id}
                                      title="Issue a refund"
                                    >
                                      {processingId === reg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                      <span className="hidden sm:inline">Refund</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Initiate Refund</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to refund <span className="font-semibold">{reg.first_name} {reg.last_name}</span>
                                        {" "}(${(getRegistrationAmount(reg) / 100).toFixed(2)})? This will process the refund from held funds and cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDirectRefund(reg.id)}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        Yes, Process Refund
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          {payouts.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg border border-border">
              <Banknote className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No payouts yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Payouts are processed automatically on the 1st and 15th of each month. A 15% reserve is held until 60 days post-event.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div key={payout.id} className="bg-card rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground text-lg">${(payout.amount_cents / 100).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payout.period_start).toLocaleDateString()} — {new Date(payout.period_end).toLocaleDateString()}
                      </p>
                    </div>
                    {payoutStatusBadge(payout.status)}
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Transactions</p>
                      <p className="font-medium text-foreground">{payout.transaction_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Platform Fee (4%)</p>
                      <p className="font-medium text-foreground">${(payout.platform_fees_cents / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reserve (15%)</p>
                      <p className="font-medium text-amber-600">Held</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net Payout</p>
                      <p className="font-bold text-primary">${(payout.amount_cents / 100).toFixed(2)}</p>
                    </div>
                  </div>
                  {payout.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{payout.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Refunds Tab */}
        <TabsContent value="refunds" className="space-y-4">
          {refundRequests.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg border border-border">
              <RotateCcw className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No refund requests yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {refundRequests.map((req) => (
                <div key={req.id} className="bg-card rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">
                        {req.registration?.first_name} {req.registration?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{req.registration?.email}</p>
                      <p className="text-sm font-medium text-foreground mt-1">
                        ${(req.amount_cents / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {refundStatusBadge(req.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Reason:</p>
                    <p className="text-sm text-foreground">{req.reason}</p>
                  </div>

                  {req.admin_notes && (
                    <div className="bg-primary/5 rounded p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Admin Notes:</p>
                      <p className="text-sm text-foreground">{req.admin_notes}</p>
                    </div>
                  )}

                  {req.status === "pending" && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <Textarea
                        placeholder="Add notes (optional)..."
                        value={adminNotes[req.id] || ""}
                        onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" disabled={processingId === req.id} className="bg-emerald-600 hover:bg-emerald-700">
                              {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                              Approve & Refund
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to approve a ${(req.amount_cents / 100).toFixed(2)} refund for{" "}
                                <span className="font-semibold">{req.registration?.first_name} {req.registration?.last_name}</span>?
                                This will be deducted from held funds and cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRefundAction(req.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700">
                                Yes, Process Refund
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={processingId === req.id} className="text-destructive border-destructive/20 hover:bg-destructive/10">
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Deny
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deny Refund Request</AlertDialogTitle>
                              <AlertDialogDescription>
                                Deny the refund request from <span className="font-semibold">{req.registration?.first_name} {req.registration?.last_name}</span>?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRefundAction(req.id, "denied")} className="bg-destructive hover:bg-destructive/90">
                                Yes, Deny
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finances;
