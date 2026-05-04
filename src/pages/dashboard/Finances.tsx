import { useEffect, useState, useCallback, Fragment } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  ArrowUpRight, Users, FileText, Info, ExternalLink, ChevronDown, ChevronRight,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

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
  stripe_fee_cents: number;
  net_amount_cents: number;
  type: string;
  status: string;
  description: string | null;
  created_at: string;
  tournament_id: string | null;
  metadata: any;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  golfer_name: string | null;
  golfer_email: string | null;
  payout_method: string | null;
  failure_reason: string | null;
}

const Finances = () => {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [platformTransactions, setPlatformTransactions] = useState<PlatformTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [expandedTxRows, setExpandedTxRows] = useState<Set<string>>(new Set());
  const [stripeBalance, setStripeBalance] = useState<{
    connected: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    payout_schedule?: { interval?: string; delay_days?: number } | null;
    available?: Record<string, number>;
    pending?: Record<string, number>;
    next_payout?: { amount: number; currency: string; arrival_date: number } | null;
    error?: string;
  } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<{
    title: string;
    description: string;
    column: "amount_cents" | "platform_fee_cents" | "net_amount_cents";
    items: PlatformTransaction[];
  } | null>(null);

  useEffect(() => {
    if (!org) return;
    setBalanceLoading(true);
    supabase.functions
      .invoke("stripe-connect-balance", { body: { organization_id: org.orgId } })
      .then(({ data, error }) => {
        if (error) {
          setStripeBalance({ connected: false, error: error.message });
        } else {
          setStripeBalance(data);
        }
        setBalanceLoading(false);
      });
  }, [org]);

  const toggleTxRow = (id: string) => {
    setExpandedTxRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportMyTransactionsCSV = () => {
    const headers = [
      "Date", "Golfer Name", "Golfer Email",
      "Gross ($)", "Platform Fee ($)", "Stripe Fee ($)", "Net to You ($)",
      "Payout Method", "Status", "Stripe Payment Intent", "Stripe Session",
    ];
    const rows = platformTransactions.map(t => [
      new Date(t.created_at).toLocaleString(),
      t.golfer_name || "",
      t.golfer_email || "",
      (t.amount_cents / 100).toFixed(2),
      (t.platform_fee_cents / 100).toFixed(2),
      ((t.stripe_fee_cents || 0) / 100).toFixed(2),
      (t.net_amount_cents / 100).toFixed(2),
      t.payout_method || "",
      t.status,
      t.stripe_payment_intent_id || "",
      t.stripe_session_id || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} transactions`);
  };

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

    supabase
      .from("platform_transactions")
      .select("*")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPlatformTransactions((data as PlatformTransaction[]) || []);
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
  const pendingRefunds = refundRequests.filter((r) => r.status === "pending");

  // Summary stats from platform_transactions
  const succeededTx = platformTransactions.filter((t) => t.status === "succeeded" || t.status === "paid");
  const totalCollected = platformTransactions.reduce((sum, t) => sum + t.amount_cents, 0);
  const totalPlatformFees = platformTransactions.reduce((sum, t) => sum + t.platform_fee_cents, 0);
  const totalNetToOrganizer = platformTransactions.reduce((sum, t) => sum + t.net_amount_cents, 0);

  // Approximate split: new Stripe Connect accounts hold funds for up to 7 days while the
  // platform clears. Charges newer than that window are shown as "pending (clearing)";
  // older charges are shown as likely "available". Stripe is the source of truth — these
  // local breakdowns are best-effort to help organizers identify which transactions
  // contribute to each balance bucket.
  const PENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const settlementCutoff = Date.now() - PENDING_WINDOW_MS;
  let availableTx = succeededTx.filter((t) => new Date(t.created_at).getTime() <= settlementCutoff);
  let pendingTx = succeededTx.filter((t) => new Date(t.created_at).getTime() > settlementCutoff);
  // Fallback: if the heuristic produced an empty bucket but recent succeeded charges exist,
  // show the most recent succeeded transactions so the breakdown isn't misleadingly empty.
  if (pendingTx.length === 0 && succeededTx.length > 0) {
    pendingTx = succeededTx.slice(0, 20);
  }
  if (availableTx.length === 0 && succeededTx.length > 0) {
    availableTx = succeededTx.slice(0, 20);
  }
  // Next payout window is typically the most recent 24h of available funds — approximate by top-of-available.
  const nextPayoutTx = availableTx.slice(0, 50);

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
    if (reportType === "transactions") {
      const filtered = filterByDate(platformTransactions);
      const headers = [
        "Date", "Type", "Description", "Gross Amount ($)", "Platform Fee ($)",
        "Net to Organizer ($)", "Status",
      ];
      const rows = filtered.map((tx) => [
        new Date(tx.created_at).toLocaleDateString(),
        tx.type,
        tx.description || "-",
        (tx.amount_cents / 100).toFixed(2),
        (tx.platform_fee_cents / 100).toFixed(2),
        (tx.net_amount_cents / 100).toFixed(2),
        tx.status,
      ]);
      downloadCSV("transaction-history.csv", headers, rows);
      toast.success(`Exported ${rows.length} transactions`);
    } else if (reportType === "summary") {
      const headers = [
        "Event Name", "Total Transactions", "Gross Revenue ($)",
        "Platform Fees ($)", "Net to Organizer ($)",
      ];
      const rows = tournaments.map((t) => {
        const txs = platformTransactions.filter((tx) => tx.tournament_id === t.id);
        const gross = txs.reduce((s, tx) => s + tx.amount_cents, 0);
        const fees = txs.reduce((s, tx) => s + tx.platform_fee_cents, 0);
        const net = txs.reduce((s, tx) => s + tx.net_amount_cents, 0);
        return [
          t.title, String(txs.length),
          (gross / 100).toFixed(2), (fees / 100).toFixed(2), (net / 100).toFixed(2),
        ];
      });
      downloadCSV("event-summary.csv", headers, rows);
      toast.success(`Exported ${rows.length} events`);
    } else if (reportType === "tax") {
      const year = new Date().getFullYear();
      const gross = platformTransactions.reduce((s, t) => s + t.amount_cents, 0);
      const fees = platformTransactions.reduce((s, t) => s + t.platform_fee_cents, 0);
      const net = platformTransactions.reduce((s, t) => s + t.net_amount_cents, 0);
      const headers = ["Year", "Total Gross Revenue ($)", "Total Platform Fees ($)", "Total Net to Organizer ($)"];
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
          <p className="text-muted-foreground mt-1">Transaction history and revenue tracking</p>
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

      {/* Payment Flow Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Transaction history — all payments processed through your tournament.</p>
          <p className="text-xs text-muted-foreground mt-1">
            A 5% platform fee + Stripe processing fee is deducted per transaction. How you receive funds depends on your payout method (Stripe Connect, PayPal, or Check).{" "}
            <a href="/dashboard/payout-settings" className="text-primary underline">Manage payout settings</a>
            {" · "}
            <a href="/help/fees-and-hold" target="_blank" rel="noopener noreferrer" className="text-primary underline">Learn more</a>
          </p>
        </div>
      </div>

      {/* New-account payout timing banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Understanding your payouts</p>
          <p className="text-xs text-muted-foreground mt-1">
            Payments appear in this dashboard <strong>immediately</strong> and net proceeds are routed to your Stripe account at the moment of checkout.
            However, <strong>Stripe holds funds for 2–7 business days on brand-new Connect accounts</strong> as part of their standard risk review.
            This hold applies only to your first few payouts and is not a TeeVents hold.{" "}
            <a href="/help/understanding-payout-timing" target="_blank" rel="noopener noreferrer" className="text-primary underline">Learn more about Stripe payouts</a>
          </p>
        </div>
      </div>


      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => setBreakdown({
            title: "Total Collected",
            description: `All ${platformTransactions.length} transactions processed for this organization (gross amount before fees).`,
            column: "amount_cents",
            items: platformTransactions,
          })}
          className="bg-card rounded-lg border border-border p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-emerald-100">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              Total Collected <Info className="h-3 w-3" />
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">${(totalCollected / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{platformTransactions.length} transactions · click for details</p>
        </motion.button>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          onClick={() => setBreakdown({
            title: "Platform Fees (5%)",
            description: "5% platform fee deducted from each transaction at checkout.",
            column: "platform_fee_cents",
            items: platformTransactions.filter((t) => t.platform_fee_cents > 0),
          })}
          className="bg-card rounded-lg border border-border p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-amber-100">
              <Receipt className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              Platform Fees <Info className="h-3 w-3" />
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600">${(totalPlatformFees / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">5% per transaction · click for details</p>
        </motion.button>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onClick={() => setBreakdown({
            title: "Net to Your Stripe",
            description: "Net amount deposited to your connected Stripe account after platform and processing fees.",
            column: "net_amount_cents",
            items: platformTransactions,
          })}
          className="bg-card rounded-lg border border-border p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              Net to Your Stripe <Info className="h-3 w-3" />
            </span>
          </div>
          <p className="text-2xl font-bold text-primary">${(totalNetToOrganizer / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Deposited to your Stripe · click for details</p>
        </motion.button>
      </div>

      {/* Stripe Balance & Payout Timing */}
      {(() => {
        const fmt = (cents: number, currency = "usd") =>
          new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
        const sumAll = (m?: Record<string, number>) => Object.values(m || {}).reduce((a, b) => a + b, 0);
        const availTotal = sumAll(stripeBalance?.available);
        const pendingTotal = sumAll(stripeBalance?.pending);
        const currency =
          Object.keys(stripeBalance?.available || {})[0] ||
          Object.keys(stripeBalance?.pending || {})[0] ||
          "usd";
        const sched = stripeBalance?.payout_schedule;
        const scheduleLabel = sched
          ? sched.interval === "manual"
            ? "Manual payouts"
            : `${sched.interval || "daily"}${sched.delay_days ? ` (T+${sched.delay_days} days)` : ""}`
          : "Standard (T+2 business days for new accounts)";

        return (
          <div className="bg-card rounded-lg border border-border p-5 mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Stripe Balance & Payout Timing
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Live balance from your connected Stripe account. Funds appear under <em>Balances</em>, not <em>Payments</em>.
                </p>
              </div>
              {balanceLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {!stripeBalance?.connected ? (
              <div className="text-sm text-muted-foreground bg-muted/30 rounded p-3">
                Connect a Stripe account in{" "}
                <a href="/dashboard/payout-settings" className="text-primary underline">Payout Settings</a>{" "}
                to see live balances and payout timing.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setBreakdown({
                      title: "Available to pay out",
                      description: `Cleared funds Stripe can transfer to your bank on the next payout. Stripe reports ${fmt(availTotal, currency)} available. Showing your most recent settled transactions that likely contributed to this balance — Stripe Dashboard is the source of truth for the exact split.`,
                      column: "net_amount_cents",
                      items: availableTx,
                    })}
                    className="rounded-lg border border-border bg-muted/20 p-3 text-left hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
                  >
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      Available to pay out <Info className="h-3 w-3" />
                    </div>
                    <p className="text-xl font-bold text-emerald-600 mt-1">{fmt(availTotal, currency)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Click for transactions</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakdown({
                      title: "Pending (clearing)",
                      description: `Recently captured charges still clearing through Stripe. New Connect accounts can hold funds for up to 7 days. Stripe reports ${fmt(pendingTotal, currency)} pending. Showing your most recent succeeded charges that are likely contributing to this balance — Stripe Dashboard shows the exact list.`,
                      column: "net_amount_cents",
                      items: pendingTx,
                    })}
                    className="rounded-lg border border-border bg-muted/20 p-3 text-left hover:border-amber-300 hover:bg-amber-50/30 transition-colors"
                  >
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      Pending (clearing) <Info className="h-3 w-3" />
                    </div>
                    <p className="text-xl font-bold text-amber-600 mt-1">{fmt(pendingTotal, currency)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Click for transactions</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakdown({
                      title: "Next payout",
                      description: stripeBalance.next_payout
                        ? `Estimated next payout of ${fmt(stripeBalance.next_payout.amount, stripeBalance.next_payout.currency)} arriving ${new Date(stripeBalance.next_payout.arrival_date * 1000).toLocaleDateString()}. Approximate breakdown of contributing settled transactions:`
                        : "No scheduled payout yet. Once funds clear, they will be grouped into your next payout.",
                      column: "net_amount_cents",
                      items: nextPayoutTx,
                    })}
                    className="rounded-lg border border-border bg-muted/20 p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      Next payout <Info className="h-3 w-3" />
                    </div>
                    {stripeBalance.next_payout ? (
                      <>
                        <p className="text-xl font-bold text-primary mt-1">
                          {fmt(stripeBalance.next_payout.amount, stripeBalance.next_payout.currency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Arrives {new Date(stripeBalance.next_payout.arrival_date * 1000).toLocaleDateString()} · Click for details
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">No scheduled payout yet</p>
                    )}
                  </button>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span><strong>Payout schedule:</strong> {scheduleLabel}</span>
                  </div>
                  {!stripeBalance.charges_enabled && (
                    <div className="text-amber-700">⚠ Charges not yet enabled on your Stripe account — finish onboarding in Payout Settings.</div>
                  )}
                  {stripeBalance.charges_enabled && !stripeBalance.payouts_enabled && (
                    <div className="text-amber-700">⚠ Stripe is holding payouts until verification clears (usually 2–7 days for new accounts).</div>
                  )}
                  {availTotal === 0 && pendingTotal === 0 && (
                    <div>
                      Newly connected Stripe accounts can show $0 for 2–7 days after the first charge while Stripe clears the platform's funds. This is normal.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Stripe Dashboard Link */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Manage Your Funds</p>
            <p className="text-xs text-muted-foreground">View balances, payout history, and transfer funds to your bank in your Stripe Dashboard.</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={async () => {
            try {
              const { data, error } = await supabase.functions.invoke("stripe-connect-dashboard");
              if (error || !data?.url) {
                toast.error("Unable to open Stripe Dashboard. Please ensure Stripe is connected in Payout Settings.");
                return;
              }
              window.open(data.url, "_blank");
            } catch {
              toast.error("Unable to open Stripe Dashboard.");
            }
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Stripe Dashboard
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="transactions">
              <CreditCard className="h-4 w-4 mr-1.5" />
              Transactions
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
              onClick={exportMyTransactionsCSV}
              disabled={platformTransactions.length === 0}
            >
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
              placeholder="Search by name or email..."
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
                      <th className="w-8 p-3"></th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Participant</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Gross</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Platform Fee</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Net to Stripe</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Date</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((reg) => {
                      const gross = getRegistrationAmount(reg);
                      const fee = Math.round(gross * 0.05); // 5% platform fee
                      const net = gross - fee;
                      const matchingTx = platformTransactions.find(
                        (tx: any) => tx.metadata?.registration_ids?.includes?.(reg.id) || (tx as any).registration_id === reg.id
                      );
                      const expanded = expandedTxRows.has(reg.id);
                      return (
                        <Fragment key={reg.id}>
                        <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => toggleTxRow(reg.id)}>
                          <td className="p-3">
                            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-sm text-foreground">{reg.first_name} {reg.last_name}</p>
                            <p className="text-xs text-muted-foreground">{reg.email}</p>
                          </td>
                          <td className="p-3 font-semibold text-sm text-foreground">${(gross / 100).toFixed(2)}</td>
                          <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">${(fee / 100).toFixed(2)}</td>
                          <td className="p-3 text-sm font-medium text-primary hidden lg:table-cell">${(net / 100).toFixed(2)}</td>
                          <td className="p-3">{statusBadge(reg.payment_status)}</td>
                          <td className="p-3 text-sm text-muted-foreground">{new Date(reg.created_at).toLocaleDateString()}</td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
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
                                          {" "}(${(gross / 100).toFixed(2)})? The refund will be processed through Stripe and cannot be undone.
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
                        {expanded && (
                          <tr className="bg-muted/20 border-b border-border">
                            <td colSpan={8} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                  <div><span className="text-muted-foreground">Stripe Payment Intent:</span> <code className="text-xs">{matchingTx?.stripe_payment_intent_id || "—"}</code></div>
                                  <div><span className="text-muted-foreground">Stripe Session:</span> <code className="text-xs">{matchingTx?.stripe_session_id || "—"}</code></div>
                                  <div><span className="text-muted-foreground">Registration ID:</span> <code className="text-xs">{reg.id}</code></div>
                                </div>
                                <div className="space-y-1">
                                  <div><span className="text-muted-foreground">Payout Method:</span> <Badge variant="outline" className="text-xs capitalize ml-1">{matchingTx?.payout_method || "—"}</Badge></div>
                                  <div><span className="text-muted-foreground">Payout Status:</span> <Badge variant="outline" className="text-xs capitalize ml-1">{matchingTx?.status || "—"}</Badge></div>
                                  <div><span className="text-muted-foreground">Stripe Fee:</span> ${((matchingTx?.stripe_fee_cents || 0) / 100).toFixed(2)}</div>
                                  {matchingTx?.failure_reason && (
                                    <div className="text-destructive"><span className="text-muted-foreground">Failure:</span> {matchingTx.failure_reason}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                                The refund will be processed through Stripe and cannot be undone.
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { type: "transactions", title: "Transaction History", desc: "All transactions with fee breakdown" },
                  { type: "summary", title: "Event Summary", desc: "Revenue totals per tournament" },
                  { type: "tax", title: "Tax Summary", desc: "Annual totals for tax reporting" },
                ].map((r) => (
                  <button
                    key={r.type}
                    onClick={() => { setReportType(r.type); handleGenerateReport(); }}
                    className="text-left p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
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

      {/* Breakdown Dialog */}
      <Dialog open={!!breakdown} onOpenChange={(o) => !o && setBreakdown(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{breakdown?.title}</DialogTitle>
            <DialogDescription>{breakdown?.description}</DialogDescription>
          </DialogHeader>
          {breakdown && (
            <div className="overflow-auto flex-1 -mx-6 px-6">
              {breakdown.items.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No transactions in this category yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b border-border">
                    <tr>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Participant</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">Gross</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">Fee (5%)</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">Net</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.items.map((tx) => (
                      <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <p className="font-medium text-foreground">{tx.golfer_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{tx.golfer_email || ""}</p>
                        </td>
                        <td className="p-2 text-xs capitalize text-muted-foreground">{tx.type}</td>
                        <td className={`p-2 text-right tabular-nums ${breakdown.column === "amount_cents" ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          ${(tx.amount_cents / 100).toFixed(2)}
                        </td>
                        <td className={`p-2 text-right tabular-nums ${breakdown.column === "platform_fee_cents" ? "font-bold text-amber-600" : "text-muted-foreground"}`}>
                          ${(tx.platform_fee_cents / 100).toFixed(2)}
                        </td>
                        <td className={`p-2 text-right tabular-nums ${breakdown.column === "net_amount_cents" ? "font-bold text-primary" : "text-muted-foreground"}`}>
                          ${(tx.net_amount_cents / 100).toFixed(2)}
                        </td>
                        <td className="p-2">{statusBadge(tx.status === "succeeded" ? "paid" : tx.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-background border-t-2 border-border">
                    <tr>
                      <td colSpan={3} className="p-2 text-xs font-semibold text-foreground text-right">Total:</td>
                      <td className={`p-2 text-right tabular-nums ${breakdown.column === "amount_cents" ? "font-bold text-foreground" : "text-muted-foreground text-xs"}`}>
                        ${(breakdown.items.reduce((s, t) => s + t.amount_cents, 0) / 100).toFixed(2)}
                      </td>
                      <td className={`p-2 text-right tabular-nums ${breakdown.column === "platform_fee_cents" ? "font-bold text-amber-600" : "text-muted-foreground text-xs"}`}>
                        ${(breakdown.items.reduce((s, t) => s + t.platform_fee_cents, 0) / 100).toFixed(2)}
                      </td>
                      <td className={`p-2 text-right tabular-nums ${breakdown.column === "net_amount_cents" ? "font-bold text-primary" : "text-muted-foreground text-xs"}`}>
                        ${(breakdown.items.reduce((s, t) => s + t.net_amount_cents, 0) / 100).toFixed(2)}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{breakdown.items.length} txn</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Finances;
