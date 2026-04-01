import { useEffect, useState, useCallback, useMemo } from "react";
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
  Banknote, Info, ShieldCheck, FileText, AlertTriangle,
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
  tournament_id: string | null;
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
  stripe_transfer_id: string | null;
}

const RESERVE_PERCENT = 15;
const MIN_WITHDRAWAL = 2500; // $25 in cents

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
  const [withdrawing, setWithdrawing] = useState(false);

  // CSV report state
  const [reportType, setReportType] = useState("transactions");
  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, registration_fee_cents")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data || []) as Tournament[];
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
  const totalRevenue = paidRegistrations.reduce((sum, r) => sum + getRegistrationAmount(r), 0);
  const totalRefunded = refundedRegistrations.reduce((sum, r) => sum + getRegistrationAmount(r), 0);
  const pendingRefunds = refundRequests.filter((r) => r.status === "pending");

  // Escrow calculations - use hold_status for accurate tracking
  const totalCollected = platformTransactions
    .reduce((sum, t) => sum + t.amount_cents, 0);

  const totalPlatformFees = platformTransactions
    .reduce((sum, t) => sum + t.platform_fee_cents, 0);

  // Pending hold = hold_amount on transactions where hold is still active
  const pendingHold = platformTransactions
    .filter((t: any) => (t.hold_status === "active") && t.status !== "paid_out")
    .reduce((sum, t: any) => sum + (t.hold_amount_cents || Math.round(t.net_amount_cents * (RESERVE_PERCENT / 100))), 0);

  // Available = released holds (full net) + held transactions (net minus hold) - already paid out
  const releasedAvailable = platformTransactions
    .filter((t: any) => t.hold_status === "released" && t.status !== "paid_out")
    .reduce((sum, t) => sum + t.net_amount_cents, 0);

  const heldAvailable = platformTransactions
    .filter((t: any) => t.hold_status === "active" && t.status === "held")
    .reduce((sum, t: any) => {
      const holdAmt = t.hold_amount_cents || Math.round(t.net_amount_cents * (RESERVE_PERCENT / 100));
      return sum + (t.net_amount_cents - holdAmt);
    }, 0);

  const availableForPayout = releasedAvailable + heldAvailable;

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

  // Manual withdrawal with 7-day dispute check
  const handleWithdraw = async () => {
    if (demoGuard()) return;
    if (availableForPayout < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is $${(MIN_WITHDRAWAL / 100).toFixed(2)}`);
      return;
    }
    setWithdrawing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-biweekly-payouts", {
        body: { manual: true, organization_id: org?.orgId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const amount = data?.results?.[0]?.amount;
      toast.success(amount ? `Withdrawal of $${(amount / 100).toFixed(2)} initiated! Funds arrive in 1-3 business days.` : "Withdrawal processed!");
      // Refresh data
      const [txRes, payoutRes] = await Promise.all([
        supabase.from("platform_transactions").select("*").eq("organization_id", org!.orgId).order("created_at", { ascending: false }),
        supabase.from("organization_payouts").select("*").eq("organization_id", org!.orgId).order("created_at", { ascending: false }),
      ]);
      setPlatformTransactions((txRes.data as PlatformTransaction[]) || []);
      setPayouts((payoutRes.data as Payout[]) || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to process withdrawal");
    }
    setWithdrawing(false);
  };

  // CSV report generation
  const getDateFilterRange = (): { start: Date | null; end: Date | null } => {
    const now = new Date();
    switch (dateRange) {
      case "30": return { start: new Date(now.getTime() - 30 * 86400000), end: now };
      case "90": return { start: new Date(now.getTime() - 90 * 86400000), end: now };
      case "custom":
        return {
          start: customStart ? new Date(customStart) : null,
          end: customEnd ? new Date(customEnd + "T23:59:59") : now,
        };
      default: return { start: null, end: null };
    }
  };

  const filterByDate = <T extends { created_at: string }>(items: T[]): T[] => {
    const { start, end } = getDateFilterRange();
    if (!start && !end) return items;
    return items.filter((item) => {
      const d = new Date(item.created_at);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = () => {
    const tournamentMap = Object.fromEntries(tournaments.map((t) => [t.id, t]));

    if (reportType === "transactions") {
      const filtered = filterByDate(platformTransactions);
      const headers = [
        "Transaction ID", "Type", "Date", "Gross Amount ($)", "Platform Fee 4% ($)",
        "Hold Amount 15% ($)", "Net Available ($)", "Status",
      ];
      const rows = filtered.map((tx) => {
        const holdAmt = Math.round(tx.net_amount_cents * (RESERVE_PERCENT / 100));
        const net = tx.net_amount_cents - holdAmt;
        return [
          tx.id, tx.type, new Date(tx.created_at).toLocaleDateString(),
          (tx.amount_cents / 100).toFixed(2), (tx.platform_fee_cents / 100).toFixed(2),
          (holdAmt / 100).toFixed(2), (net / 100).toFixed(2), tx.status,
        ];
      });
      downloadCSV("transaction-history.csv", headers, rows);
      toast.success(`Exported ${rows.length} transactions`);
    } else if (reportType === "payouts") {
      const filtered = filterByDate(payouts);
      const headers = [
        "Payout Date", "Amount ($)", "Method", "Transactions", "Status", "Transfer ID",
      ];
      const rows = filtered.map((p) => [
        new Date(p.created_at).toLocaleDateString(), (p.amount_cents / 100).toFixed(2),
        "Stripe", String(p.transaction_count), p.status, p.stripe_transfer_id || "-",
      ]);
      downloadCSV("payout-history.csv", headers, rows);
      toast.success(`Exported ${rows.length} payouts`);
    } else if (reportType === "summary") {
      const headers = [
        "Event Name", "Event Date", "Total Registrations", "Gross Revenue ($)",
        "Platform Fees ($)", "Held Amount ($)", "Released ($)", "Paid Out ($)",
      ];
      const rows = tournaments.map((t) => {
        const txs = platformTransactions.filter((tx) => tx.tournament_id === t.id);
        const gross = txs.reduce((s, tx) => s + tx.amount_cents, 0);
        const fees = txs.reduce((s, tx) => s + tx.platform_fee_cents, 0);
        const held = txs.filter((tx) => tx.status === "held").reduce((s, tx) => s + tx.net_amount_cents, 0);
        const paid = txs.filter((tx) => tx.status === "paid_out").reduce((s, tx) => s + tx.net_amount_cents, 0);
        return [
          t.title, "-", String(txs.length),
          (gross / 100).toFixed(2), (fees / 100).toFixed(2),
          (held / 100).toFixed(2), "0.00", (paid / 100).toFixed(2),
        ];
      });
      downloadCSV("event-summary.csv", headers, rows);
      toast.success(`Exported ${rows.length} events`);
    } else if (reportType === "tax") {
      const year = new Date().getFullYear();
      const gross = platformTransactions.reduce((s, t) => s + t.amount_cents, 0);
      const fees = platformTransactions.reduce((s, t) => s + t.platform_fee_cents, 0);
      const net = gross - fees;
      const headers = ["Year", "Total Gross Revenue ($)", "Total Platform Fees ($)", "Total Net Received ($)"];
      const rows = [[String(year), (gross / 100).toFixed(2), (fees / 100).toFixed(2), (net / 100).toFixed(2)]];
      downloadCSV("tax-summary.csv", headers, rows);
      toast.success("Tax summary exported");
    }
  };

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
            <span className="text-xs text-muted-foreground font-medium">Total Collected</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${(totalCollected / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{platformTransactions.length} transactions</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-lg border border-border p-4 border-secondary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-secondary/10">
              <Wallet className="h-4 w-4 text-secondary" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Pending Hold</span>
          </div>
          <p className="text-2xl font-bold text-secondary">${(pendingHold / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">15% reserve active</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-lg border border-border p-4 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-amber-100">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Fees Paid (4%)</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">${(totalPlatformFees / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Released 15 days post-event</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Available Now</span>
          </div>
          <p className="text-2xl font-bold text-primary">${(Math.max(0, availableForPayout) / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Ready for payout</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-blue-100">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Next Auto Payout</span>
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

      {/* Fees Paid Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-muted">
            <Receipt className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Platform Fees Paid (4%)</p>
            <p className="text-xl font-bold text-foreground">${(totalPlatformFees / 100).toFixed(2)}</p>
          </div>
        </div>

        {/* Manual withdrawal */}
        <div className="bg-card rounded-lg border border-border p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <ArrowUpRight className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Withdraw Funds</p>
              <p className="text-sm text-muted-foreground">Min $25.00 • Available: ${(Math.max(0, availableForPayout) / 100).toFixed(2)}</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                disabled={availableForPayout < MIN_WITHDRAWAL || withdrawing}
              >
                {withdrawing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Banknote className="h-4 w-4 mr-1" />}
                Withdraw
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Withdraw Funds</AlertDialogTitle>
                <AlertDialogDescription>
                  Transfer <span className="font-semibold">${(availableForPayout / 100).toFixed(2)}</span> to your connected Stripe account? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleWithdraw}>
                  Yes, Withdraw
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
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
            <TabsTrigger value="reports">
              <FileText className="h-4 w-4 mr-1.5" />
              Reports
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
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
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Gross</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Fee (4%)</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Hold (15%)</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Net</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Date</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((reg) => {
                      const gross = getRegistrationAmount(reg);
                      const fee = Math.round(gross * 0.04);
                      const afterFee = gross - fee;
                      const hold = Math.round(afterFee * 0.15);
                      const net = afterFee - hold;
                      return (
                        <tr key={reg.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <p className="font-medium text-sm text-foreground">{reg.first_name} {reg.last_name}</p>
                            <p className="text-xs text-muted-foreground">{reg.email}</p>
                          </td>
                          <td className="p-3 font-semibold text-sm text-foreground">${(gross / 100).toFixed(2)}</td>
                          <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">${(fee / 100).toFixed(2)}</td>
                          <td className="p-3 text-sm text-amber-600 hidden lg:table-cell">${(hold / 100).toFixed(2)}</td>
                          <td className="p-3 text-sm font-medium text-primary hidden lg:table-cell">${(net / 100).toFixed(2)}</td>
                          <td className="p-3">{statusBadge(reg.payment_status)}</td>
                          <td className="p-3 text-sm text-muted-foreground">{new Date(reg.created_at).toLocaleDateString()}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              {reg.payment_status === "paid" && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => handleResendConfirmation(reg.id)} disabled={resendingId === reg.id} title="Resend confirmation email">
                                    {resendingId === reg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                                    <span className="hidden sm:inline">Resend</span>
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive gap-1" disabled={processingId === reg.id} title="Issue a refund">
                                        {processingId === reg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                        <span className="hidden sm:inline">Refund</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Initiate Refund</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to refund <span className="font-semibold">{reg.first_name} {reg.last_name}</span>
                                          {" "}(${(gross / 100).toFixed(2)})? This will process the refund from held funds and cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDirectRefund(reg.id)} className="bg-destructive hover:bg-destructive/90">
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
                      );
                    })}
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
                Payouts are processed automatically on the 1st and 15th of each month. A 15% reserve is held until 15 days post-event.
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Transactions</p>
                      <p className="font-medium text-foreground">{payout.transaction_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Platform Fee (4%)</p>
                      <p className="font-medium text-foreground">${(payout.platform_fees_cents / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Method</p>
                      <p className="font-medium text-foreground">Stripe</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net Payout</p>
                      <p className="font-bold text-primary">${(payout.amount_cents / 100).toFixed(2)}</p>
                    </div>
                  </div>
                  {payout.stripe_transfer_id && (
                    <p className="text-xs text-muted-foreground mt-2">Transfer: {payout.stripe_transfer_id}</p>
                  )}
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

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Generate CSV Reports
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactions">Transaction History</SelectItem>
                    <SelectItem value="payouts">Payout History</SelectItem>
                    <SelectItem value="summary">Event Summary</SelectItem>
                    <SelectItem value="tax">Tax Summary (Annual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {dateRange === "custom" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
                    <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-background" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
                    <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-background" />
                  </div>
                </>
              )}
            </div>
            <Button onClick={handleGenerateReport} className="gap-2">
              <Download className="h-4 w-4" />
              Generate CSV
            </Button>

            <div className="mt-6 border-t border-border pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Available Reports</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { type: "transactions", title: "Transaction History", desc: "All registrations with fee & hold breakdown" },
                  { type: "payouts", title: "Payout History", desc: "All completed and pending payouts" },
                  { type: "summary", title: "Event Summary", desc: "Revenue totals per tournament" },
                  { type: "tax", title: "Tax Summary", desc: "Annual gross, fees, and net for tax reporting" },
                ].map((r) => (
                  <button
                    key={r.type}
                    onClick={() => { setReportType(r.type); handleGenerateReport(); }}
                    className="text-left p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finances;
