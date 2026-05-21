import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DollarSign, Trophy, Plus, Loader2, TrendingUp, TrendingDown, Trash2,
  Download, Check, Printer, FileSpreadsheet, Lightbulb, ArrowRight,
  ClipboardList, PieChart,
} from "lucide-react";
import {
  DEFAULT_EXPENSES, DEFAULT_INCOME, DEFAULT_ESTIMATES,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES,
  type ExpenseCategory, type IncomeCategory,
} from "@/lib/budgetDefaults";

type Tournament = { id: string; title: string; scoring_format: string | null };
type Budget = {
  id: string;
  estimated_golfers: number;
  actual_golfers: number;
};
type Estimate = {
  id: string; budget_id: string; item_name: string;
  vendor_a_name: string; vendor_a_price: number;
  vendor_b_name: string; vendor_b_price: number;
  vendor_c_name: string; vendor_c_price: number;
  sponsorable: boolean;
  notes: string; sort_order: number; created_at: string;
  // legacy fields kept for movement to expenses/income
  estimated_amount: number; vendor_contact: string; type: "expense" | "income";
};
type Expense = {
  id: string; budget_id: string; item_name: string; category: ExpenseCategory;
  estimated_cost: number; actual_cost: number; is_paid: boolean;
  payment_due_date: string | null; notes: string; sort_order: number;
};
type Income = {
  id: string; budget_id: string; item_name: string; category: IncomeCategory;
  quantity_estimated: number; quantity_actual: number; unit_price: number;
  projected_amount: number; actual_amount: number;
  is_received: boolean; date_received: string | null;
  payer_source: string; notes: string; sort_order: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

// Computed totals helpers (income uses qty × price when qty>0, otherwise raw amounts)
const incomeProjected = (i: Income) =>
  i.quantity_estimated > 0 ? Number(i.quantity_estimated) * Number(i.unit_price) : Number(i.projected_amount);
const incomeActual = (i: Income) =>
  i.quantity_actual > 0 ? Number(i.quantity_actual) * Number(i.unit_price) : Number(i.actual_amount);

export default function BudgetPage() {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<number | null>(null);

  const selected = tournaments.find((t) => t.id === selectedId) || null;

  // Load tournaments for org
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
  }, [org]);

  // Load / create budget for selected tournament
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: existing, error: exErr } = await supabase
        .from("tournament_budgets")
        .select("id, estimated_golfers, actual_golfers")
        .eq("tournament_id", selectedId)
        .maybeSingle();
      if (exErr) console.error("budget lookup", exErr);
      let b: any = existing;
      if (!b) {
        const { data: created, error: cErr } = await supabase
          .from("tournament_budgets")
          .insert({ tournament_id: selectedId })
          .select("id, estimated_golfers, actual_golfers")
          .single();
        if (cErr) {
          console.error("budget create", cErr);
          toast.error(`Could not create budget: ${cErr.message}`);
          if (!cancelled) setLoading(false);
          return;
        }
        b = created;
      }
      if (cancelled) return;
      setBudget(b as Budget);
      await loadBudgetData(b.id);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  async function loadBudgetData(bId: string) {
    const [eRes, xRes, iRes] = await Promise.all([
      supabase.from("budget_estimates").select("*").eq("budget_id", bId).order("sort_order").order("created_at"),
      supabase.from("budget_expenses").select("*").eq("budget_id", bId).order("sort_order").order("created_at"),
      supabase.from("budget_income").select("*").eq("budget_id", bId).order("sort_order").order("created_at"),
    ]);

    let es = (eRes.data as any[]) || [];
    let xs = (xRes.data as any[]) || [];
    let is = (iRes.data as any[]) || [];

    // Seed defaults on first ever load
    if (xs.length === 0 && is.length === 0 && es.length === 0) {
      const expDefaults = DEFAULT_EXPENSES.map((d, idx) => ({
        budget_id: bId, item_name: d.item_name, category: d.category, sort_order: idx,
      }));
      const incDefaults = DEFAULT_INCOME.map((d, idx) => ({
        budget_id: bId, item_name: d.item_name, category: d.category, sort_order: idx,
      }));
      const estDefaults = DEFAULT_ESTIMATES.map((d, idx) => ({
        budget_id: bId, item_name: d.item_name, sponsorable: !!d.sponsorable, sort_order: idx,
      }));
      const [xIns, iIns, eIns] = await Promise.all([
        supabase.from("budget_expenses").insert(expDefaults).select(),
        supabase.from("budget_income").insert(incDefaults).select(),
        supabase.from("budget_estimates").insert(estDefaults).select(),
      ]);
      if (xIns.error) console.error(xIns.error);
      if (iIns.error) console.error(iIns.error);
      if (eIns.error) console.error(eIns.error);
      xs = (xIns.data as any[]) || [];
      is = (iIns.data as any[]) || [];
      es = (eIns.data as any[]) || [];
    }
    setEstimates(es as any);
    setExpenses(xs as any);
    setIncome(is as any);
  }

  function flashSaved() {
    setSavedFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1500);
  }

  // ---- Totals ----
  const totalEstExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.estimated_cost), 0), [expenses]);
  const totalActExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.actual_cost), 0), [expenses]);
  const totalEstIncome = useMemo(() => income.reduce((s, i) => s + incomeProjected(i), 0), [income]);
  const totalActIncome = useMemo(() => income.reduce((s, i) => s + incomeActual(i), 0), [income]);
  const netEst = totalEstIncome - totalEstExpenses;
  const netAct = totalActIncome - totalActExpenses;
  const margin = totalActIncome > 0 ? (netAct / totalActIncome) * 100 : 0;

  // Cost per person
  const estGolfers = budget?.estimated_golfers || 0;
  const actGolfers = budget?.actual_golfers || 0;
  const estCostPerPerson = estGolfers > 0 ? totalEstExpenses / estGolfers : 0;
  const actCostPerPerson = actGolfers > 0 ? totalActExpenses / actGolfers : 0;

  // ---- Mutations ----
  async function updateBudget(patch: Partial<Budget>) {
    if (!budget || demoGuard()) return;
    setBudget({ ...budget, ...patch } as Budget);
    const { error } = await supabase.from("tournament_budgets").update(patch as any).eq("id", budget.id);
    if (error) toast.error("Save failed"); else flashSaved();
  }
  async function updateExpense(id: string, patch: Partial<Expense>) {
    if (demoGuard()) return;
    setExpenses((p) => p.map((e) => (e.id === id ? { ...e, ...patch } as Expense : e)));
    const { error } = await supabase.from("budget_expenses").update(patch as any).eq("id", id);
    if (error) { console.error(error); toast.error(`Save failed: ${error.message}`); } else flashSaved();
  }
  async function updateIncome(id: string, patch: Partial<Income>) {
    if (demoGuard()) return;
    setIncome((p) => p.map((i) => (i.id === id ? { ...i, ...patch } as Income : i)));
    const { error } = await supabase.from("budget_income").update(patch as any).eq("id", id);
    if (error) { console.error(error); toast.error(`Save failed: ${error.message}`); } else flashSaved();
  }
  async function updateEstimate(id: string, patch: Partial<Estimate>) {
    if (demoGuard()) return;
    setEstimates((p) => p.map((e) => (e.id === id ? { ...e, ...patch } as Estimate : e)));
    const { error } = await supabase.from("budget_estimates").update(patch as any).eq("id", id);
    if (error) { console.error(error); toast.error(`Save failed: ${error.message}`); } else flashSaved();
  }

  async function addExpenseInSection(category: ExpenseCategory) {
    if (!budget || demoGuard()) return;
    const { data, error } = await supabase
      .from("budget_expenses")
      .insert({ budget_id: budget.id, item_name: "", category, sort_order: expenses.length })
      .select().single();
    if (error) { console.error(error); toast.error(`Add failed: ${error.message}`); return; }
    if (data) setExpenses((p) => [...p, data as any]);
  }
  async function addIncomeInSection(category: IncomeCategory) {
    if (!budget || demoGuard()) return;
    const { data, error } = await supabase
      .from("budget_income")
      .insert({ budget_id: budget.id, item_name: "", category, sort_order: income.length })
      .select().single();
    if (error) { console.error(error); toast.error(`Add failed: ${error.message}`); return; }
    if (data) setIncome((p) => [...p, data as any]);
  }
  async function addEstimate() {
    if (!budget || demoGuard()) return;
    const { data, error } = await supabase
      .from("budget_estimates")
      .insert({ budget_id: budget.id, item_name: "", sort_order: estimates.length })
      .select().single();
    if (error) { console.error(error); toast.error(`Add failed: ${error.message}`); return; }
    if (data) setEstimates((p) => [...p, data as any]);
  }
  async function delExpense(id: string) {
    if (demoGuard()) return;
    const { error } = await supabase.from("budget_expenses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setExpenses((p) => p.filter((e) => e.id !== id));
  }
  async function delIncome(id: string) {
    if (demoGuard()) return;
    const { error } = await supabase.from("budget_income").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setIncome((p) => p.filter((i) => i.id !== id));
  }
  async function delEstimate(id: string) {
    if (demoGuard()) return;
    const { error } = await supabase.from("budget_estimates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEstimates((p) => p.filter((e) => e.id !== id));
  }

  async function resetToTemplate() {
    if (!budget || demoGuard()) return;
    if (!confirm("Reset this budget to the default template? Your existing line items will be deleted.")) return;
    await Promise.all([
      supabase.from("budget_expenses").delete().eq("budget_id", budget.id),
      supabase.from("budget_income").delete().eq("budget_id", budget.id),
      supabase.from("budget_estimates").delete().eq("budget_id", budget.id),
    ]);
    setExpenses([]); setIncome([]); setEstimates([]);
    await loadBudgetData(budget.id);
    toast.success("Reset to template");
  }

  // Move an estimate's best (lowest) vendor price to an expense line.
  async function moveEstimateToExpense(est: Estimate) {
    if (!budget || demoGuard()) return;
    const prices = [est.vendor_a_price, est.vendor_b_price, est.vendor_c_price]
      .map(Number).filter((n) => n > 0);
    const best = prices.length ? Math.min(...prices) : Number(est.estimated_amount) || 0;
    const { data, error } = await supabase.from("budget_expenses").insert({
      budget_id: budget.id, item_name: est.item_name || "Untitled", category: "Misc",
      estimated_cost: best, notes: est.notes, sort_order: expenses.length,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) setExpenses((p) => [...p, data as any]);
    toast.success(`Moved "${est.item_name || "Untitled"}" to Expenses`);
  }

  // CSV export
  function exportCSV() {
    const lines: string[] = [];
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    lines.push("VENDOR ESTIMATES");
    lines.push(["Item", "Vendor A", "Price A", "Vendor B", "Price B", "Vendor C", "Price C", "Sponsorable", "Notes"].join(","));
    estimates.forEach((e) => lines.push([
      q(e.item_name), q(e.vendor_a_name), e.vendor_a_price,
      q(e.vendor_b_name), e.vendor_b_price, q(e.vendor_c_name), e.vendor_c_price,
      e.sponsorable ? "Yes" : "No", q(e.notes),
    ].join(",")));
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
    lines.push(["Item", "Category", "Est #", "Actual #", "Price", "Est Income", "Actual Income", "Received", "Date", "Notes"].join(","));
    income.forEach((i) => lines.push([
      q(i.item_name), i.category, i.quantity_estimated, i.quantity_actual, i.unit_price,
      incomeProjected(i), incomeActual(i),
      i.is_received ? "Yes" : "No", i.date_received || "", q(i.notes),
    ].join(",")));
    lines.push("");
    lines.push("PROFIT & LOSS");
    lines.push(`Total Estimated Income,${totalEstIncome}`);
    lines.push(`Total Estimated Expenses,${totalEstExpenses}`);
    lines.push(`Estimated Net,${netEst}`);
    lines.push(`Total Actual Income,${totalActIncome}`);
    lines.push(`Total Actual Expenses,${totalActExpenses}`);
    lines.push(`Actual Net,${netAct}`);
    lines.push(`Margin,${margin.toFixed(1)}%`);

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
      <div className="no-print flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Budget</h1>
          <p className="text-muted-foreground mt-1">
            Template-based event budget. Edit any line, add new ones, and totals update automatically.
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
          <Button variant="outline" size="sm" onClick={resetToTemplate}>Reset to Template</Button>
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

      {/* Print header */}
      <div className="print-only mb-4">
        <h1 className="text-2xl font-bold">{selected?.title} — Budget</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
        <>
          {/* Summary bar (always visible above tabs) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="Estimated Income" value={fmt(totalEstIncome)} tint="text-primary" />
            <SummaryCard label="Estimated Expenses" value={fmt(totalEstExpenses)} tint="text-destructive" />
            <SummaryCard
              label="Net (Estimated)" value={fmt(netEst)}
              tint={netEst >= 0 ? "text-primary" : "text-destructive"}
              border={netEst >= 0 ? "border-primary" : "border-destructive"}
            />
            <SummaryCard
              label="Actual Margin" value={`${margin.toFixed(1)}%`}
              tint={netAct >= 0 ? "text-primary" : "text-destructive"}
            />
          </div>

          <Tabs defaultValue="estimates" className="no-print">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto">
              <TabsTrigger value="estimates" className="gap-1.5 py-2">
                <Lightbulb className="h-4 w-4" /> Estimates
              </TabsTrigger>
              <TabsTrigger value="expenses" className="gap-1.5 py-2">
                <TrendingDown className="h-4 w-4" /> Expenses
              </TabsTrigger>
              <TabsTrigger value="income" className="gap-1.5 py-2">
                <TrendingUp className="h-4 w-4" /> Income
              </TabsTrigger>
              <TabsTrigger value="pnl" className="gap-1.5 py-2">
                <PieChart className="h-4 w-4" /> Profit / Loss
              </TabsTrigger>
            </TabsList>

            <TabsContent value="estimates" className="mt-4">
              <SectionCard
                icon={<Lightbulb className="h-5 w-5 text-secondary" />}
                title="Vendor Estimates"
                description="Compare quotes from up to three vendors per item. Move the winning quote into your Expense plan."
                action={
                  <Button size="sm" variant="outline" onClick={addEstimate}>
                    <Plus className="h-4 w-4 mr-1" /> Add Estimate Line
                  </Button>
                }
              >
                <EstimatesTable
                  items={estimates}
                  onChange={updateEstimate}
                  onMove={moveEstimateToExpense}
                  onDelete={delEstimate}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="expenses" className="mt-4 space-y-4">
              {/* Golfer inputs — dedicated card for reliable typing */}
              <div className="bg-card border border-border rounded-lg p-4 grid sm:grid-cols-4 gap-3">
                <GolferInput
                  label="Est. # of Golfers"
                  value={estGolfers}
                  onCommit={(v) => updateBudget({ estimated_golfers: v })}
                />
                <div className="bg-muted/40 rounded-md px-3 py-2 flex flex-col">
                  <span className="text-xs text-muted-foreground">Est. cost / person</span>
                  <span className="font-mono font-semibold text-lg">{fmt(estCostPerPerson)}</span>
                </div>
                <GolferInput
                  label="Actual # of Golfers"
                  value={actGolfers}
                  onCommit={(v) => updateBudget({ actual_golfers: v })}
                />
                <div className="bg-muted/40 rounded-md px-3 py-2 flex flex-col">
                  <span className="text-xs text-muted-foreground">Actual cost / person</span>
                  <span className="font-mono font-semibold text-lg">{fmt(actCostPerPerson)}</span>
                </div>
              </div>

              <SectionCard
                icon={<TrendingDown className="h-5 w-5 text-destructive" />}
                title="Expenses"
                description="Pre-filled by section. Add or rename rows as needed."
                kpis={
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <KpiPill label="Estimated" value={fmt(totalEstExpenses)} />
                    <KpiPill label="Actual" value={fmt(totalActExpenses)} />
                  </div>
                }
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <ExpenseSection
                    key={cat}
                    category={cat}
                    items={expenses.filter((e) => e.category === cat)}
                    onChange={updateExpense}
                    onDelete={delExpense}
                    onAdd={() => addExpenseInSection(cat)}
                  />
                ))}
              </SectionCard>
            </TabsContent>

            <TabsContent value="income" className="mt-4">
              <SectionCard
                icon={<TrendingUp className="h-5 w-5 text-primary" />}
                title="Income"
                description="Enter quantity and price — totals fill in automatically. Rows without a price use the raw amount."
                kpis={
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <KpiPill label="Estimated Income" value={fmt(totalEstIncome)} />
                    <KpiPill label="Actual Income" value={fmt(totalActIncome)} />
                  </div>
                }
              >
                {INCOME_CATEGORIES.map((cat) => (
                  <IncomeSection
                    key={cat}
                    category={cat}
                    items={income.filter((i) => i.category === cat)}
                    onChange={updateIncome}
                    onDelete={delIncome}
                    onAdd={() => addIncomeInSection(cat)}
                  />
                ))}
              </SectionCard>
            </TabsContent>

            <TabsContent value="pnl" className="mt-4">
              <ProfitLossSummary
                expenses={expenses}
                income={income}
                totalEstIncome={totalEstIncome}
                totalActIncome={totalActIncome}
                totalEstExpenses={totalEstExpenses}
                totalActExpenses={totalActExpenses}
                netEst={netEst}
                netAct={netAct}
              />
            </TabsContent>
          </Tabs>

          {/* Print view shows everything in order */}
          <div className="hidden print:block space-y-6">
            <EstimatesTable items={estimates} onChange={() => {}} onMove={() => {}} onDelete={() => {}} />
            {EXPENSE_CATEGORIES.map((cat) => (
              <ExpenseSection key={cat} category={cat}
                items={expenses.filter((e) => e.category === cat)}
                onChange={() => {}} onDelete={() => {}} onAdd={() => {}} />
            ))}
            {INCOME_CATEGORIES.map((cat) => (
              <IncomeSection key={cat} category={cat}
                items={income.filter((i) => i.category === cat)}
                onChange={() => {}} onDelete={() => {}} onAdd={() => {}} />
            ))}
            <ProfitLossSummary
              expenses={expenses} income={income}
              totalEstIncome={totalEstIncome} totalActIncome={totalActIncome}
              totalEstExpenses={totalEstExpenses} totalActExpenses={totalActExpenses}
              netEst={netEst} netAct={netAct}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ============================== Subcomponents ============================== */

function SummaryCard({ label, value, tint, border }: { label: string; value: string; tint: string; border?: string }) {
  return (
    <div className={`bg-card border ${border ? `border-2 ${border}` : "border-border"} rounded-lg p-4`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-display font-bold ${tint}`}>{value}</div>
    </div>
  );
}

function KpiPill({ label, value, input }: { label: string; value?: string; input?: React.ReactNode }) {
  return (
    <div className="bg-muted/40 rounded-md px-3 py-2 flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      {input ? input : <span className="font-mono font-semibold">{value}</span>}
    </div>
  );
}

function SectionCard({
  icon, title, description, action, kpis, children,
}: {
  icon: React.ReactNode; title: string; description?: string;
  action?: React.ReactNode; kpis?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden">
      <header className="p-4 border-b border-border flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2">
            {icon}
            <div>
              <h2 className="text-xl font-display font-bold leading-tight">{title}</h2>
              {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
            </div>
          </div>
          {action && <div className="no-print">{action}</div>}
        </div>
        {kpis}
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

/* -------- Vendor Estimates Table -------- */
function EstimatesTable({
  items, onChange, onMove, onDelete,
}: {
  items: Estimate[];
  onChange: (id: string, patch: Partial<Estimate>) => void;
  onMove: (e: Estimate) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No estimate lines. Click "Add Estimate Line" to add one.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-primary text-primary-foreground">
          <tr>
            <th className="p-2 text-left font-semibold w-48">Item</th>
            <th className="p-2 text-left font-semibold">Vendor A</th>
            <th className="p-2 text-right font-semibold w-24">Price A</th>
            <th className="p-2 text-left font-semibold">Vendor B</th>
            <th className="p-2 text-right font-semibold w-24">Price B</th>
            <th className="p-2 text-left font-semibold">Vendor C</th>
            <th className="p-2 text-right font-semibold w-24">Price C</th>
            <th className="p-2 text-center font-semibold">Sponsorable?</th>
            <th className="p-2 text-left font-semibold">Notes</th>
            <th className="p-2 no-print"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id} className="border-t border-border hover:bg-muted/30">
              <td className="p-1.5"><BareInput value={e.item_name} onCommit={(v) => onChange(e.id, { item_name: v })} placeholder="Item" /></td>
              <td className="p-1.5"><BareInput value={e.vendor_a_name} onCommit={(v) => onChange(e.id, { vendor_a_name: v })} /></td>
              <td className="p-1.5"><BareNumber value={e.vendor_a_price} onCommit={(v) => onChange(e.id, { vendor_a_price: v })} /></td>
              <td className="p-1.5"><BareInput value={e.vendor_b_name} onCommit={(v) => onChange(e.id, { vendor_b_name: v })} /></td>
              <td className="p-1.5"><BareNumber value={e.vendor_b_price} onCommit={(v) => onChange(e.id, { vendor_b_price: v })} /></td>
              <td className="p-1.5"><BareInput value={e.vendor_c_name} onCommit={(v) => onChange(e.id, { vendor_c_name: v })} /></td>
              <td className="p-1.5"><BareNumber value={e.vendor_c_price} onCommit={(v) => onChange(e.id, { vendor_c_price: v })} /></td>
              <td className="p-1.5 text-center">
                <Checkbox checked={e.sponsorable} onCheckedChange={(c) => onChange(e.id, { sponsorable: !!c })} />
              </td>
              <td className="p-1.5"><BareInput value={e.notes} onCommit={(v) => onChange(e.id, { notes: v })} /></td>
              <td className="p-1.5 no-print whitespace-nowrap">
                <Button size="sm" variant="ghost" onClick={() => onMove(e)} title="Move best price to Expenses">
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(e.id)} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------- Expense Section -------- */
function ExpenseSection({
  category, items, onChange, onDelete, onAdd,
}: {
  category: ExpenseCategory;
  items: Expense[];
  onChange: (id: string, patch: Partial<Expense>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const totalEst = items.reduce((s, e) => s + Number(e.estimated_cost), 0);
  const totalAct = items.reduce((s, e) => s + Number(e.actual_cost), 0);
  return (
    <div>
      <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
        <h3 className="font-semibold uppercase tracking-wide text-sm">{category}</h3>
        <Button size="sm" variant="ghost" onClick={onAdd}
          className="h-7 text-primary-foreground hover:bg-primary-foreground/15">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add line
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left p-2 font-medium w-1/3">Item</th>
              <th className="text-right p-2 font-medium w-28">Estimated</th>
              <th className="text-right p-2 font-medium w-28">Actual</th>
              <th className="text-right p-2 font-medium w-28">Variance</th>
              <th className="text-center p-2 font-medium w-20">Paid</th>
              <th className="text-left p-2 font-medium w-36">Date Paid</th>
              <th className="text-left p-2 font-medium">Notes</th>
              <th className="no-print w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center text-muted-foreground text-xs">No items. Click "Add line".</td></tr>
            ) : items.map((e) => {
              const v = Number(e.actual_cost) - Number(e.estimated_cost);
              return (
                <tr key={e.id} className={`border-t border-border ${e.is_paid ? "bg-primary/5" : ""}`}>
                  <td className="p-1.5"><BareInput value={e.item_name} onCommit={(val) => onChange(e.id, { item_name: val })} placeholder="Item" /></td>
                  <td className="p-1.5"><BareNumber value={e.estimated_cost} onCommit={(val) => onChange(e.id, { estimated_cost: val })} /></td>
                  <td className="p-1.5"><BareNumber value={e.actual_cost} onCommit={(val) => onChange(e.id, { actual_cost: val })} /></td>
                  <td className={`p-1.5 text-right font-mono text-xs ${v > 0 ? "text-destructive" : v < 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {fmt(v)}
                  </td>
                  <td className="p-1.5 text-center">
                    <Checkbox checked={e.is_paid} onCheckedChange={(c) => onChange(e.id, { is_paid: !!c })} />
                  </td>
                  <td className="p-1.5">
                    <Input type="date" className="h-8"
                      value={e.payment_due_date || ""}
                      onChange={(ev) => onChange(e.id, { payment_due_date: ev.target.value || null })}
                    />
                  </td>
                  <td className="p-1.5"><BareInput value={e.notes} onCommit={(val) => onChange(e.id, { notes: val })} placeholder="Notes (sponsor underwriter)" /></td>
                  <td className="p-1.5 no-print">
                    <Button size="sm" variant="ghost" onClick={() => onDelete(e.id)} className="text-destructive h-8 w-8 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted/30 font-medium">
            <tr>
              <td className="p-2 text-right uppercase text-xs">Total</td>
              <td className="p-2 text-right font-mono">{fmt(totalEst)}</td>
              <td className="p-2 text-right font-mono">{fmt(totalAct)}</td>
              <td colSpan={5}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* -------- Income Section -------- */
function IncomeSection({
  category, items, onChange, onDelete, onAdd,
}: {
  category: IncomeCategory;
  items: Income[];
  onChange: (id: string, patch: Partial<Income>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const totEst = items.reduce((s, i) => s + incomeProjected(i), 0);
  const totAct = items.reduce((s, i) => s + incomeActual(i), 0);
  return (
    <div>
      <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
        <h3 className="font-semibold uppercase tracking-wide text-sm">{category}</h3>
        <Button size="sm" variant="ghost" onClick={onAdd}
          className="h-7 text-primary-foreground hover:bg-primary-foreground/15">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add line
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left p-2 font-medium w-1/4">Item</th>
              <th className="text-right p-2 font-medium w-20">Est. #</th>
              <th className="text-right p-2 font-medium w-20">Actual #</th>
              <th className="text-right p-2 font-medium w-24">Price</th>
              <th className="text-right p-2 font-medium w-28">Est. Income</th>
              <th className="text-right p-2 font-medium w-28">Actual Income</th>
              <th className="text-center p-2 font-medium w-20">Received</th>
              <th className="text-left p-2 font-medium">Notes</th>
              <th className="no-print w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={9} className="p-4 text-center text-muted-foreground text-xs">No items. Click "Add line".</td></tr>
            ) : items.map((i) => {
              const est = incomeProjected(i);
              const act = incomeActual(i);
              return (
                <tr key={i.id} className={`border-t border-border ${i.is_received ? "bg-primary/5" : ""}`}>
                  <td className="p-1.5"><BareInput value={i.item_name} onCommit={(v) => onChange(i.id, { item_name: v })} placeholder="Item" /></td>
                  <td className="p-1.5"><BareNumber value={i.quantity_estimated} integer onCommit={(v) => onChange(i.id, { quantity_estimated: v })} /></td>
                  <td className="p-1.5"><BareNumber value={i.quantity_actual} integer onCommit={(v) => onChange(i.id, { quantity_actual: v })} /></td>
                  <td className="p-1.5"><BareNumber value={i.unit_price} onCommit={(v) => onChange(i.id, { unit_price: v })} /></td>
                  <td className="p-1.5 text-right font-mono text-primary">{fmt(est)}</td>
                  <td className="p-1.5 text-right font-mono text-primary">{fmt(act)}</td>
                  <td className="p-1.5 text-center">
                    <Checkbox checked={i.is_received} onCheckedChange={(c) => onChange(i.id, { is_received: !!c })} />
                  </td>
                  <td className="p-1.5"><BareInput value={i.notes} onCommit={(v) => onChange(i.id, { notes: v })} placeholder="Notes" /></td>
                  <td className="p-1.5 no-print">
                    <Button size="sm" variant="ghost" onClick={() => onDelete(i.id)} className="text-destructive h-8 w-8 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted/30 font-medium">
            <tr>
              <td colSpan={4} className="p-2 text-right uppercase text-xs">Total</td>
              <td className="p-2 text-right font-mono">{fmt(totEst)}</td>
              <td className="p-2 text-right font-mono">{fmt(totAct)}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* -------- Profit / Loss Summary -------- */
function ProfitLossSummary({
  expenses, income, totalEstIncome, totalActIncome,
  totalEstExpenses, totalActExpenses, netEst, netAct,
}: {
  expenses: Expense[]; income: Income[];
  totalEstIncome: number; totalActIncome: number;
  totalEstExpenses: number; totalActExpenses: number;
  netEst: number; netAct: number;
}) {
  const incByCat = INCOME_CATEGORIES.map((c) => {
    const rows = income.filter((i) => i.category === c);
    return {
      category: c,
      est: rows.reduce((s, i) => s + incomeProjected(i), 0),
      act: rows.reduce((s, i) => s + incomeActual(i), 0),
    };
  });
  const expByCat = EXPENSE_CATEGORIES.map((c) => {
    const rows = expenses.filter((e) => e.category === c);
    return {
      category: c,
      est: rows.reduce((s, e) => s + Number(e.estimated_cost), 0),
      act: rows.reduce((s, e) => s + Number(e.actual_cost), 0),
    };
  });

  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden">
      <header className="p-4 border-b border-border">
        <h2 className="text-xl font-display font-bold">Profit / Loss Summary</h2>
        <p className="text-sm text-muted-foreground mt-0.5">A breakdown of your event's totals by section.</p>
      </header>
      <div className="grid lg:grid-cols-2 gap-px bg-border">
        <PLTable title="Income Summary" rows={incByCat}
          totalEst={totalEstIncome} totalAct={totalActIncome}
          positiveIsGood />
        <PLTable title="Expense Summary" rows={expByCat}
          totalEst={totalEstExpenses} totalAct={totalActExpenses}
          positiveIsGood={false} />
      </div>
      <div className="p-4 grid sm:grid-cols-3 gap-3 bg-muted/20">
        <PLBigNumber label="Total Income" est={totalEstIncome} act={totalActIncome} />
        <PLBigNumber label="Total Expenses" est={totalEstExpenses} act={totalActExpenses} />
        <PLBigNumber
          label="Total Profit (or Loss)"
          est={netEst} act={netAct}
          highlight={netAct >= 0 ? "border-primary text-primary" : "border-destructive text-destructive"}
        />
      </div>
    </section>
  );
}

function PLTable({
  title, rows, totalEst, totalAct, positiveIsGood,
}: {
  title: string;
  rows: { category: string; est: number; act: number }[];
  totalEst: number; totalAct: number;
  positiveIsGood: boolean;
}) {
  return (
    <div className="bg-card p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs uppercase border-b border-border">
            <th className="text-left py-1">Category</th>
            <th className="text-right py-1">Estimated</th>
            <th className="text-right py-1">Actual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category} className="border-b border-border/50">
              <td className="py-1.5">{r.category}</td>
              <td className="py-1.5 text-right font-mono">{fmt(r.est)}</td>
              <td className="py-1.5 text-right font-mono">{fmt(r.act)}</td>
            </tr>
          ))}
          <tr className="font-semibold bg-muted/30">
            <td className="py-1.5">Total</td>
            <td className={`py-1.5 text-right font-mono ${positiveIsGood ? "text-primary" : "text-destructive"}`}>{fmt(totalEst)}</td>
            <td className={`py-1.5 text-right font-mono ${positiveIsGood ? "text-primary" : "text-destructive"}`}>{fmt(totalAct)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PLBigNumber({
  label, est, act, highlight,
}: { label: string; est: number; act: number; highlight?: string }) {
  return (
    <div className={`bg-card rounded-md border ${highlight ? `border-2 ${highlight}` : "border-border"} p-3`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase">Est.</div>
          <div className="text-xl font-display font-bold font-mono">{fmt(est)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase">Actual</div>
          <div className="text-xl font-display font-bold font-mono">{fmt(act)}</div>
        </div>
      </div>
    </div>
  );
}

/* -------- Bare input helpers (autosave on blur) -------- */
function BareInput({
  value, onCommit, placeholder,
}: { value: string; onCommit: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value || "");
  useEffect(() => setLocal(value || ""), [value]);
  return (
    <input
      className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-input focus:border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onCommit(local); }}
    />
  );
}
function BareNumber({
  value, onCommit, integer,
}: { value: number; onCommit: (v: number) => void; integer?: boolean }) {
  const [local, setLocal] = useState<string>(value ? String(value) : "");
  useEffect(() => setLocal(value ? String(value) : ""), [value]);
  return (
    <input
      type="number" inputMode="decimal" step={integer ? "1" : "0.01"} min={0}
      className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-input focus:border-input rounded text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-ring"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = integer ? parseInt(local) || 0 : parseFloat(local) || 0;
        if (n !== Number(value)) onCommit(n);
      }}
    />
  );
}
