import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  DollarSign, Trophy, Plus, Loader2, TrendingUp, TrendingDown, Trash2,
  Download, FileText, Lightbulb, ArrowRight, Check, Save, Printer, FileSpreadsheet,
} from "lucide-react";
import {
  getDefaultExpenses, getDefaultIncome,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES,
} from "@/lib/budgetDefaults";

type Tournament = { id: string; title: string; scoring_format: string | null };
type Estimate = {
  id: string; budget_id: string; item_name: string; vendor_contact: string;
  estimated_amount: number; type: "expense" | "income"; notes: string; created_at: string;
};
type Expense = {
  id: string; budget_id: string; item_name: string; category: string;
  estimated_cost: number; actual_cost: number; is_paid: boolean;
  payment_due_date: string | null; notes: string; sort_order: number;
};
type Income = {
  id: string; budget_id: string; item_name: string; category: string;
  projected_amount: number; actual_amount: number; is_received: boolean;
  date_received: string | null; payer_source: string; notes: string; sort_order: number;
};
type Template = {
  id: string; template_name: string; tournament_format: string | null;
  expense_items: any[]; income_items: any[];
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

export default function Budget() {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<number | null>(null);

  const selected = tournaments.find((t) => t.id === selectedId) || null;

  // Load tournaments
  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, scoring_format")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data || []) as Tournament[];
        setTournaments(list);
        if (list.length) setSelectedId(list[0].id);
        else setLoading(false);
      });
    supabase
      .from("budget_templates")
      .select("*")
      .eq("user_id", org.userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTemplates((data as any[]) || []));
  }, [org]);

  // Load / create budget for selected tournament
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: existing } = await supabase
        .from("tournament_budgets")
        .select("id")
        .eq("tournament_id", selectedId)
        .maybeSingle();
      let bId = existing?.id as string | undefined;
      if (!bId && !demoGuard(true)) {
        const { data: created } = await supabase
          .from("tournament_budgets")
          .insert({ tournament_id: selectedId })
          .select("id")
          .single();
        bId = created?.id;
      }
      if (cancelled) return;
      setBudgetId(bId || null);
      if (bId) await loadBudgetData(bId);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function loadBudgetData(bId: string, opts?: { seedIfEmpty?: boolean }) {
    const [eRes, xRes, iRes] = await Promise.all([
      supabase.from("budget_estimates").select("*").eq("budget_id", bId).order("created_at", { ascending: false }),
      supabase.from("budget_expenses").select("*").eq("budget_id", bId).order("sort_order").order("created_at"),
      supabase.from("budget_income").select("*").eq("budget_id", bId).order("sort_order").order("created_at"),
    ]);
    setEstimates((eRes.data as any) || []);
    let xs = (xRes.data as any[]) || [];
    let is = (iRes.data as any[]) || [];

    // Auto-seed defaults on first load (only if both empty and we have no data)
    if (xs.length === 0 && is.length === 0 && selected) {
      const expDefaults = getDefaultExpenses(selected.scoring_format).map((d, idx) => ({
        budget_id: bId, item_name: d.item_name, category: d.category, sort_order: idx,
      }));
      const incDefaults = getDefaultIncome(selected.scoring_format).map((d, idx) => ({
        budget_id: bId, item_name: d.item_name, category: d.category, sort_order: idx,
      }));
      const [xIns, iIns] = await Promise.all([
        supabase.from("budget_expenses").insert(expDefaults).select(),
        supabase.from("budget_income").insert(incDefaults).select(),
      ]);
      xs = (xIns.data as any[]) || [];
      is = (iIns.data as any[]) || [];
    }
    setExpenses(xs as any);
    setIncome(is as any);
  }

  function flashSaved() {
    setSavedFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1500);
  }

  // Totals
  const totalEstIncome = useMemo(() => income.reduce((s, i) => s + Number(i.projected_amount), 0), [income]);
  const totalEstExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.estimated_cost), 0), [expenses]);
  const totalActIncome = useMemo(() => income.reduce((s, i) => s + Number(i.actual_amount), 0), [income]);
  const totalActExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.actual_cost), 0), [expenses]);
  const netProfit = totalActIncome - totalActExpenses;
  const margin = totalActIncome > 0 ? (netProfit / totalActIncome) * 100 : 0;
  const profitable = netProfit > 0;
  const breakEven = netProfit === 0;

  // Mutations -----------------------------------------------------------
  async function updateExpense(id: string, patch: Partial<Expense>) {
    if (demoGuard()) return;
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } as Expense : e)));
    const { error } = await supabase.from("budget_expenses").update(patch as any).eq("id", id);
    if (error) toast.error("Save failed"); else flashSaved();
  }
  async function updateIncome(id: string, patch: Partial<Income>) {
    if (demoGuard()) return;
    setIncome((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } as Income : i)));
    const { error } = await supabase.from("budget_income").update(patch as any).eq("id", id);
    if (error) toast.error("Save failed"); else flashSaved();
  }
  async function addExpense() {
    if (!budgetId || demoGuard()) return;
    const { data } = await supabase
      .from("budget_expenses")
      .insert({ budget_id: budgetId, item_name: "New expense", category: "Other", sort_order: expenses.length })
      .select().single();
    if (data) setExpenses((p) => [...p, data as any]);
  }
  async function addIncome() {
    if (!budgetId || demoGuard()) return;
    const { data } = await supabase
      .from("budget_income")
      .insert({ budget_id: budgetId, item_name: "New income", category: "Other", sort_order: income.length })
      .select().single();
    if (data) setIncome((p) => [...p, data as any]);
  }
  async function delExpense(id: string) {
    if (demoGuard()) return;
    await supabase.from("budget_expenses").delete().eq("id", id);
    setExpenses((p) => p.filter((e) => e.id !== id));
  }
  async function delIncome(id: string) {
    if (demoGuard()) return;
    await supabase.from("budget_income").delete().eq("id", id);
    setIncome((p) => p.filter((i) => i.id !== id));
  }

  // Estimates
  async function addEstimate() {
    if (!budgetId || demoGuard()) return;
    const { data } = await supabase
      .from("budget_estimates")
      .insert({ budget_id: budgetId, item_name: "", type: "expense" })
      .select().single();
    if (data) setEstimates((p) => [data as any, ...p]);
  }
  async function updateEstimate(id: string, patch: Partial<Estimate>) {
    if (demoGuard()) return;
    setEstimates((p) => p.map((e) => (e.id === id ? { ...e, ...patch } as Estimate : e)));
    const { error } = await supabase.from("budget_estimates").update(patch as any).eq("id", id);
    if (error) toast.error("Save failed"); else flashSaved();
  }
  async function delEstimate(id: string) {
    if (demoGuard()) return;
    await supabase.from("budget_estimates").delete().eq("id", id);
    setEstimates((p) => p.filter((e) => e.id !== id));
  }
  async function moveEstimate(est: Estimate) {
    if (!budgetId || demoGuard()) return;
    if (est.type === "expense") {
      const { data } = await supabase.from("budget_expenses").insert({
        budget_id: budgetId, item_name: est.item_name || "Untitled",
        category: "Other", estimated_cost: est.estimated_amount,
        notes: est.notes, sort_order: expenses.length,
      }).select().single();
      if (data) setExpenses((p) => [...p, data as any]);
    } else {
      const { data } = await supabase.from("budget_income").insert({
        budget_id: budgetId, item_name: est.item_name || "Untitled",
        category: "Other", projected_amount: est.estimated_amount,
        notes: est.notes, payer_source: est.vendor_contact, sort_order: income.length,
      }).select().single();
      if (data) setIncome((p) => [...p, data as any]);
    }
    await supabase.from("budget_estimates").delete().eq("id", est.id);
    setEstimates((p) => p.filter((e) => e.id !== est.id));
    toast.success(`Moved to ${est.type === "expense" ? "Expenses" : "Income"}`);
  }

  // Templates
  async function saveTemplate(name: string) {
    if (!org || demoGuard()) return;
    const payload = {
      user_id: org.userId,
      template_name: name,
      tournament_format: selected?.scoring_format ?? null,
      expense_items: expenses.map((e) => ({ item_name: e.item_name, category: e.category })),
      income_items: income.map((i) => ({ item_name: i.item_name, category: i.category })),
    };
    const { data, error } = await supabase.from("budget_templates").insert(payload).select().single();
    if (error) { toast.error(error.message); return; }
    setTemplates((p) => [data as any, ...p]);
    toast.success("Template saved");
  }
  async function loadTemplate(t: Template) {
    if (!budgetId || demoGuard()) return;
    if (!confirm(`Replace current line items with template "${t.template_name}"? This deletes current line items.`)) return;
    await Promise.all([
      supabase.from("budget_expenses").delete().eq("budget_id", budgetId),
      supabase.from("budget_income").delete().eq("budget_id", budgetId),
    ]);
    const ex = (t.expense_items || []).map((d: any, idx: number) => ({
      budget_id: budgetId, item_name: d.item_name, category: d.category || "Other", sort_order: idx,
    }));
    const inc = (t.income_items || []).map((d: any, idx: number) => ({
      budget_id: budgetId, item_name: d.item_name, category: d.category || "Other", sort_order: idx,
    }));
    const [xR, iR] = await Promise.all([
      ex.length ? supabase.from("budget_expenses").insert(ex).select() : { data: [], error: null } as any,
      inc.length ? supabase.from("budget_income").insert(inc).select() : { data: [], error: null } as any,
    ]);
    setExpenses((xR.data as any) || []);
    setIncome((iR.data as any) || []);
    toast.success(`Loaded "${t.template_name}"`);
  }

  // Export
  function exportCSV() {
    const lines: string[] = [];
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    lines.push("ESTIMATES");
    lines.push(["Item", "Vendor", "Type", "Amount", "Notes"].join(","));
    estimates.forEach((e) => lines.push([q(e.item_name), q(e.vendor_contact), e.type, e.estimated_amount, q(e.notes)].join(",")));
    lines.push("");
    lines.push("EXPENSES");
    lines.push(["Item", "Category", "Estimated", "Actual", "Variance", "Paid", "Due Date", "Notes"].join(","));
    expenses.forEach((e) => lines.push([
      q(e.item_name), e.category, e.estimated_cost, e.actual_cost,
      Number(e.actual_cost) - Number(e.estimated_cost),
      e.is_paid ? "Yes" : "No", e.payment_due_date || "", q(e.notes),
    ].join(",")));
    lines.push("");
    lines.push("INCOME");
    lines.push(["Item", "Category", "Projected", "Actual", "Variance", "Received", "Date", "Source", "Notes"].join(","));
    income.forEach((i) => lines.push([
      q(i.item_name), i.category, i.projected_amount, i.actual_amount,
      Number(i.actual_amount) - Number(i.projected_amount),
      i.is_received ? "Yes" : "No", i.date_received || "", q(i.payer_source), q(i.notes),
    ].join(",")));
    lines.push("");
    lines.push("PROFIT & LOSS");
    lines.push(`Total Actual Income,${totalActIncome}`);
    lines.push(`Total Actual Expenses,${totalActExpenses}`);
    lines.push(`Net Profit/Loss,${netProfit}`);
    lines.push(`Profit Margin,${margin.toFixed(1)}%`);

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-${selected?.title || "tournament"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ----- Render -----
  if (!org) return null;
  if (tournaments.length === 0 && !loading) {
    return (
      <div className="text-center py-20 bg-card rounded-lg border border-border">
        <DollarSign className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-display font-bold text-foreground mb-2">No tournaments yet</h3>
        <p className="text-muted-foreground">Create a tournament first to build a budget.</p>
      </div>
    );
  }

  return (
    <div className="budget-page space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Budget</h1>
          <p className="text-muted-foreground mt-1">
            Track estimates, expenses and income for each tournament. Changes save automatically.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {savedFlash && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3 text-primary" /> Saved
            </span>
          )}
          <Select value={selectedId} onValueChange={setSelectedId}>
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
          <TemplateMenu
            templates={templates}
            onSave={saveTemplate}
            onLoad={loadTemplate}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Download as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Print header (only visible when printing) */}
      <div className="print-only mb-4">
        <h1 className="text-2xl font-bold">TeeVents Budget Report</h1>
        <p>{selected?.title}</p>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Summary bar */}
          <SummaryBar
            income={totalEstIncome} expenses={totalEstExpenses}
            net={totalEstIncome - totalEstExpenses}
            margin={totalEstIncome > 0 ? ((totalEstIncome - totalEstExpenses) / totalEstIncome) * 100 : 0}
          />

          {/* Estimates */}
          <section>
            <header className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-secondary" />
                <h2 className="text-xl font-display font-bold">Estimates</h2>
              </div>
              <Button size="sm" variant="outline" onClick={addEstimate} className="no-print">
                <Plus className="h-4 w-4 mr-1" /> Add Estimate
              </Button>
            </header>
            <p className="text-sm text-muted-foreground mb-3">
              Collect quotes, vendor estimates and pricing research here. Move items to Expenses or Income when confirmed.
            </p>
            {estimates.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                No estimates yet. Click "Add Estimate" to capture a quote.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {estimates.map((e) => (
                  <EstimateCard key={e.id} est={e} onChange={updateEstimate} onMove={moveEstimate} onDelete={delEstimate} />
                ))}
              </div>
            )}
          </section>

          {/* Expenses */}
          <section>
            <header className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <h2 className="text-xl font-display font-bold">Expenses</h2>
              </div>
              <Button size="sm" variant="outline" onClick={addExpense} className="no-print">
                <Plus className="h-4 w-4 mr-1" /> Add Expense Line
              </Button>
            </header>
            <ExpensesTable items={expenses} onChange={updateExpense} onDelete={delExpense} />
          </section>

          {/* Income */}
          <section>
            <header className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-display font-bold">Income</h2>
              </div>
              <Button size="sm" variant="outline" onClick={addIncome} className="no-print">
                <Plus className="h-4 w-4 mr-1" /> Add Income Line
              </Button>
            </header>
            <IncomeTable items={income} onChange={updateIncome} onDelete={delIncome} />
          </section>

          {/* P&L */}
          <ProfitLossCard
            actIncome={totalActIncome}
            actExpenses={totalActExpenses}
            net={netProfit}
            margin={margin}
            profitable={profitable}
            breakEven={breakEven}
          />
        </>
      )}
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function SummaryBar({ income, expenses, net, margin }: { income: number; expenses: number; net: number; margin: number }) {
  const positive = net >= 0;
  return (
    <div className="sticky top-0 z-20 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-background/95 backdrop-blur py-3 -mx-1 px-1">
      <SummaryCard label="Estimated Income" value={fmt(income)} tint="text-primary" />
      <SummaryCard label="Estimated Expenses" value={fmt(expenses)} tint="text-destructive" />
      <SummaryCard
        label="Net Profit / Loss" value={fmt(net)}
        tint={positive ? "text-primary" : "text-destructive"}
        border={positive ? "border-primary" : "border-destructive"}
      />
      <SummaryCard
        label="Profit Margin" value={`${margin.toFixed(1)}%`}
        tint={positive ? "text-primary" : "text-destructive"}
      />
    </div>
  );
}

function SummaryCard({ label, value, tint, border }: { label: string; value: string; tint: string; border?: string }) {
  return (
    <div className={`bg-card border ${border ? `border-2 ${border}` : "border-border"} rounded-lg p-4`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-display font-bold transition-colors ${tint}`}>{value}</div>
    </div>
  );
}

function EstimateCard({
  est, onChange, onMove, onDelete,
}: {
  est: Estimate;
  onChange: (id: string, patch: Partial<Estimate>) => void;
  onMove: (est: Estimate) => void;
  onDelete: (id: string) => void;
}) {
  const [local, setLocal] = useState(est);
  useEffect(() => setLocal(est), [est.id]);
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-2">
      <Input
        value={local.item_name}
        placeholder="Item name"
        onChange={(e) => setLocal({ ...local, item_name: e.target.value })}
        onBlur={() => local.item_name !== est.item_name && onChange(est.id, { item_name: local.item_name })}
      />
      <Input
        value={local.vendor_contact}
        placeholder="Vendor / contact (optional)"
        onChange={(e) => setLocal({ ...local, vendor_contact: e.target.value })}
        onBlur={() => local.vendor_contact !== est.vendor_contact && onChange(est.id, { vendor_contact: local.vendor_contact })}
      />
      <div className="flex gap-2">
        <Input
          type="number" step="0.01" inputMode="decimal"
          value={local.estimated_amount}
          onChange={(e) => setLocal({ ...local, estimated_amount: parseFloat(e.target.value) || 0 })}
          onBlur={() => Number(local.estimated_amount) !== Number(est.estimated_amount) && onChange(est.id, { estimated_amount: Number(local.estimated_amount) })}
        />
        <Select
          value={local.type}
          onValueChange={(v) => { setLocal({ ...local, type: v as any }); onChange(est.id, { type: v as any }); }}
        >
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Textarea
        value={local.notes}
        placeholder="Notes"
        rows={2}
        onChange={(e) => setLocal({ ...local, notes: e.target.value })}
        onBlur={() => local.notes !== est.notes && onChange(est.id, { notes: local.notes })}
      />
      <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
        <span>{new Date(est.created_at).toLocaleDateString()}</span>
        <div className="flex items-center gap-1 no-print">
          <Button size="sm" variant="ghost" onClick={() => onMove(est)}>
            <ArrowRight className="h-3.5 w-3.5 mr-1" />
            Move to {est.type === "expense" ? "Expenses" : "Income"}
          </Button>
          <ConfirmDelete onConfirm={() => onDelete(est.id)} />
        </div>
      </div>
    </div>
  );
}

function ExpensesTable({
  items, onChange, onDelete,
}: {
  items: Expense[];
  onChange: (id: string, patch: Partial<Expense>) => void;
  onDelete: (id: string) => void;
}) {
  const [sort, setSort] = useState<{ key: keyof Expense; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return items;
    return [...items].sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      return 0;
    });
  }, [items, sort]);

  const totalEst = items.reduce((s, e) => s + Number(e.estimated_cost), 0);
  const totalAct = items.reduce((s, e) => s + Number(e.actual_cost), 0);
  const variance = totalAct - totalEst;
  const unpaid = items.filter((e) => !e.is_paid).length;

  function toggleSort(k: keyof Expense) {
    setSort((s) => (s?.key === k ? { key: k, dir: (s.dir * -1) as 1 | -1 } : { key: k, dir: 1 }));
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <Th onClick={() => toggleSort("item_name")}>Item</Th>
              <Th onClick={() => toggleSort("category")}>Category</Th>
              <Th onClick={() => toggleSort("estimated_cost")} right>Estimated</Th>
              <Th onClick={() => toggleSort("actual_cost")} right>Actual</Th>
              <Th right>Variance</Th>
              <Th>Paid</Th>
              <Th>Due</Th>
              <Th>Notes</Th>
              <th className="p-2 no-print"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => {
              const v = Number(e.actual_cost) - Number(e.estimated_cost);
              return (
                <tr key={e.id} className={`border-t border-border ${e.is_paid ? "bg-primary/5" : ""}`}>
                  <td className="p-2">
                    <CellInput value={e.item_name} onCommit={(val) => onChange(e.id, { item_name: val })} />
                  </td>
                  <td className="p-2">
                    <Select value={e.category} onValueChange={(v) => onChange(e.id, { category: v })}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-right">
                    <CellNumber value={e.estimated_cost} onCommit={(val) => onChange(e.id, { estimated_cost: val })} />
                  </td>
                  <td className="p-2 text-right">
                    <CellNumber value={e.actual_cost} onCommit={(val) => onChange(e.id, { actual_cost: val })} />
                  </td>
                  <td className={`p-2 text-right font-mono ${v > 0 ? "text-destructive" : v < 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {fmt(v)}
                  </td>
                  <td className="p-2 text-center">
                    <Checkbox checked={e.is_paid} onCheckedChange={(c) => onChange(e.id, { is_paid: !!c })} />
                  </td>
                  <td className="p-2">
                    <Input type="date" className="h-8 w-36"
                      value={e.payment_due_date || ""}
                      onChange={(ev) => onChange(e.id, { payment_due_date: ev.target.value || null })}
                    />
                  </td>
                  <td className="p-2 max-w-[200px]">
                    <CellInput value={e.notes} onCommit={(val) => onChange(e.id, { notes: val })} />
                  </td>
                  <td className="p-2 no-print">
                    <ConfirmDelete onConfirm={() => onDelete(e.id)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted/30 font-medium">
            <tr>
              <td className="p-2" colSpan={2}>
                Totals · {unpaid} unpaid
              </td>
              <td className="p-2 text-right font-mono">{fmt(totalEst)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalAct)}</td>
              <td className={`p-2 text-right font-mono ${variance > 0 ? "text-destructive" : variance < 0 ? "text-primary" : ""}`}>
                {fmt(variance)}
              </td>
              <td colSpan={4}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {/* Mobile card view */}
      <div className="md:hidden divide-y divide-border">
        {sorted.map((e) => {
          const v = Number(e.actual_cost) - Number(e.estimated_cost);
          return (
            <div key={e.id} className={`p-3 space-y-2 ${e.is_paid ? "bg-primary/5" : ""}`}>
              <CellInput value={e.item_name} onCommit={(val) => onChange(e.id, { item_name: val })} />
              <div className="flex gap-2">
                <Select value={e.category} onValueChange={(v) => onChange(e.id, { category: v })}>
                  <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1 text-xs">
                  <Checkbox checked={e.is_paid} onCheckedChange={(c) => onChange(e.id, { is_paid: !!c })} /> Paid
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Estimated</Label>
                  <CellNumber value={e.estimated_cost} onCommit={(val) => onChange(e.id, { estimated_cost: val })} />
                </div>
                <div>
                  <Label className="text-xs">Actual</Label>
                  <CellNumber value={e.actual_cost} onCommit={(val) => onChange(e.id, { actual_cost: val })} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-mono ${v > 0 ? "text-destructive" : v < 0 ? "text-primary" : "text-muted-foreground"}`}>
                  Variance {fmt(v)}
                </span>
                <ConfirmDelete onConfirm={() => onDelete(e.id)} />
              </div>
            </div>
          );
        })}
        <div className="p-3 bg-muted/30 text-sm flex justify-between">
          <span>Totals · {unpaid} unpaid</span>
          <span className="font-mono">{fmt(totalAct)} / {fmt(totalEst)}</span>
        </div>
      </div>
    </div>
  );
}

function IncomeTable({
  items, onChange, onDelete,
}: {
  items: Income[];
  onChange: (id: string, patch: Partial<Income>) => void;
  onDelete: (id: string) => void;
}) {
  const totalProj = items.reduce((s, i) => s + Number(i.projected_amount), 0);
  const totalAct = items.reduce((s, i) => s + Number(i.actual_amount), 0);
  const variance = totalAct - totalProj;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <Th>Item</Th><Th>Category</Th>
              <Th right>Projected</Th><Th right>Actual</Th><Th right>Variance</Th>
              <Th>Received</Th><Th>Date</Th><Th>Source</Th><Th>Notes</Th>
              <th className="p-2 no-print"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const v = Number(i.actual_amount) - Number(i.projected_amount);
              return (
                <tr key={i.id} className={`border-t border-border ${i.is_received ? "bg-primary/5" : ""}`}>
                  <td className="p-2"><CellInput value={i.item_name} onCommit={(val) => onChange(i.id, { item_name: val })} /></td>
                  <td className="p-2">
                    <Select value={i.category} onValueChange={(v) => onChange(i.id, { category: v })}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INCOME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-right"><CellNumber value={i.projected_amount} onCommit={(val) => onChange(i.id, { projected_amount: val })} /></td>
                  <td className="p-2 text-right"><CellNumber value={i.actual_amount} onCommit={(val) => onChange(i.id, { actual_amount: val })} /></td>
                  <td className={`p-2 text-right font-mono ${v > 0 ? "text-primary" : v < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {fmt(v)}
                  </td>
                  <td className="p-2 text-center">
                    <Checkbox checked={i.is_received} onCheckedChange={(c) => onChange(i.id, { is_received: !!c })} />
                  </td>
                  <td className="p-2">
                    <Input type="date" className="h-8 w-36"
                      value={i.date_received || ""}
                      onChange={(ev) => onChange(i.id, { date_received: ev.target.value || null })}
                    />
                  </td>
                  <td className="p-2"><CellInput value={i.payer_source} onCommit={(val) => onChange(i.id, { payer_source: val })} /></td>
                  <td className="p-2 max-w-[200px]"><CellInput value={i.notes} onCommit={(val) => onChange(i.id, { notes: val })} /></td>
                  <td className="p-2 no-print"><ConfirmDelete onConfirm={() => onDelete(i.id)} /></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted/30 font-medium">
            <tr>
              <td className="p-2" colSpan={2}>Totals</td>
              <td className="p-2 text-right font-mono">{fmt(totalProj)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalAct)}</td>
              <td className={`p-2 text-right font-mono ${variance > 0 ? "text-primary" : variance < 0 ? "text-destructive" : ""}`}>
                {fmt(variance)}
              </td>
              <td colSpan={5}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {/* Mobile */}
      <div className="md:hidden divide-y divide-border">
        {items.map((i) => {
          const v = Number(i.actual_amount) - Number(i.projected_amount);
          return (
            <div key={i.id} className={`p-3 space-y-2 ${i.is_received ? "bg-primary/5" : ""}`}>
              <CellInput value={i.item_name} onCommit={(val) => onChange(i.id, { item_name: val })} />
              <div className="flex gap-2">
                <Select value={i.category} onValueChange={(v) => onChange(i.id, { category: v })}>
                  <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCOME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1 text-xs">
                  <Checkbox checked={i.is_received} onCheckedChange={(c) => onChange(i.id, { is_received: !!c })} /> Received
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Projected</Label>
                  <CellNumber value={i.projected_amount} onCommit={(val) => onChange(i.id, { projected_amount: val })} />
                </div>
                <div>
                  <Label className="text-xs">Actual</Label>
                  <CellNumber value={i.actual_amount} onCommit={(val) => onChange(i.id, { actual_amount: val })} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-mono ${v > 0 ? "text-primary" : v < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  Variance {fmt(v)}
                </span>
                <ConfirmDelete onConfirm={() => onDelete(i.id)} />
              </div>
            </div>
          );
        })}
        <div className="p-3 bg-muted/30 text-sm flex justify-between">
          <span>Totals</span>
          <span className="font-mono">{fmt(totalAct)} / {fmt(totalProj)}</span>
        </div>
      </div>
    </div>
  );
}

function ProfitLossCard({
  actIncome, actExpenses, net, margin, profitable, breakEven,
}: {
  actIncome: number; actExpenses: number; net: number; margin: number;
  profitable: boolean; breakEven: boolean;
}) {
  const status = breakEven ? "BREAK-EVEN" : profitable ? "PROFITABLE" : "AT A LOSS";
  const borderCls = breakEven ? "border-muted-foreground/40" : profitable ? "border-primary" : "border-destructive";
  const bgCls = breakEven ? "bg-muted/30" : profitable ? "bg-primary/5" : "bg-destructive/5";
  const textCls = breakEven ? "text-muted-foreground" : profitable ? "text-primary" : "text-destructive";
  const barWidth = Math.min(Math.abs(margin), 100);

  return (
    <div className={`border-2 ${borderCls} ${bgCls} rounded-lg p-6`}>
      <h2 className="font-display font-bold text-lg uppercase tracking-wider mb-4">Profit & Loss Summary</h2>
      <div className="space-y-2 max-w-md font-mono text-sm">
        <Row label="Total Actual Income" value={fmt(actIncome)} valueClass="text-primary" />
        <Row label="Total Actual Expenses" value={`−${fmt(actExpenses)}`} valueClass="text-destructive" />
        <div className="border-t border-border my-2"></div>
        <Row label="NET PROFIT / LOSS" value={fmt(net)} valueClass={`${textCls} font-bold text-lg`} />
        <Row label="Profit Margin" value={`${margin.toFixed(1)}%`} valueClass={textCls} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={`text-sm font-bold ${textCls}`}>● {status}</span>
      </div>
      <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${profitable ? "bg-primary" : breakEven ? "bg-muted-foreground/40" : "bg-destructive"}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function Th({ children, right, onClick }: { children: any; right?: boolean; onClick?: () => void }) {
  return (
    <th
      className={`p-2 text-${right ? "right" : "left"} font-semibold text-muted-foreground ${onClick ? "cursor-pointer hover:text-foreground" : ""}`}
      onClick={onClick}
    >
      {children}
    </th>
  );
}

function CellInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <Input
      className="h-8"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== (value ?? "")) onCommit(v); }}
    />
  );
}

function CellNumber({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [v, setV] = useState<string>(String(value ?? 0));
  useEffect(() => setV(String(value ?? 0)), [value]);
  return (
    <Input
      className="h-8 text-right font-mono"
      type="number" step="0.01" inputMode="decimal"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = parseFloat(v) || 0;
        if (n !== Number(value)) onCommit(n);
      }}
    />
  );
}

function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="text-muted-foreground hover:text-destructive transition-colors p-1">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TemplateMenu({
  templates, onSave, onLoad,
}: {
  templates: Template[];
  onSave: (name: string) => void;
  onLoad: (t: Template) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1.5" />Templates</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Save className="h-4 w-4 mr-2" /> Save current as template
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Save budget template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label>Template name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Charity scramble baseline" />
            </div>
            <DialogFooter>
              <Button onClick={() => { if (name.trim()) { onSave(name.trim()); setName(""); setOpen(false); } }}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {templates.length > 0 && <div className="border-t border-border my-1" />}
        {templates.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => onLoad(t)}>
            <FileText className="h-4 w-4 mr-2" /> Load: {t.template_name}
          </DropdownMenuItem>
        ))}
        {templates.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">No saved templates yet.</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
