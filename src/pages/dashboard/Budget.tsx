import { useEffect, useState } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DollarSign,
  Trophy,
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  Trash2,
  Download,
  Pencil,
} from "lucide-react";

interface BudgetItem {
  id: string;
  tournament_id: string;
  category: string;
  description: string;
  type: string;
  amount: number;
  is_paid: boolean | null;
  notes: string | null;
  sort_order: number | null;
}

interface Tournament {
  id: string;
  title: string;
}

const categories = [
  "Sponsorships",
  "Registration Fees",
  "Donations",
  "Golf Course",
  "Food & Beverage",
  "Awards & Prizes",
  "Signage & Print",
  "Merchandise",
  "Entertainment",
  "Marketing",
  "Insurance",
  "Staffing",
  "Rentals",
  "Other",
];

const Budget = () => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: "",
    type: "expense",
    category: "Other",
    amount: "",
    notes: "",
  });

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setTournaments(list);
        if (list.length > 0) setSelectedTournament(list[0].id);
        setLoading(false);
      });
  }, [org]);

  const fetchItems = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    const { data } = await supabase
      .from("tournament_budget_items")
      .select("*")
      .eq("tournament_id", selectedTournament)
      .order("type", { ascending: true })
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    setItems((data as BudgetItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [selectedTournament]);

  const resetForm = () => {
    setForm({ description: "", type: "expense", category: "Other", amount: "", notes: "" });
    setEditItem(null);
  };

  const handleOpenEdit = (item: BudgetItem) => {
    setEditItem(item);
    setForm({
      description: item.description,
      type: item.type,
      category: item.category,
      amount: item.amount.toString(),
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !form.description.trim() || !form.amount || demoGuard()) return;
    setSaving(true);

    const payload = {
      tournament_id: selectedTournament,
      description: form.description.trim(),
      type: form.type,
      category: form.category,
      amount: parseFloat(form.amount),
      notes: form.notes.trim() || null,
    };

    if (editItem) {
      const { error } = await supabase
        .from("tournament_budget_items")
        .update(payload)
        .eq("id", editItem.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Item updated" });
    } else {
      const { error } = await supabase.from("tournament_budget_items").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Item added" });
    }

    resetForm();
    setDialogOpen(false);
    fetchItems();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (demoGuard()) return;
    await supabase.from("tournament_budget_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Item removed" });
  };

  const togglePaid = async (item: BudgetItem) => {
    const newVal = !item.is_paid;
    await supabase.from("tournament_budget_items").update({ is_paid: newVal }).eq("id", item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_paid: newVal } : i)));
  };

  const handleExportCSV = () => {
    const headers = ["Type", "Category", "Description", "Amount", "Paid", "Notes"];
    const rows = items.map((i) => [
      i.type, i.category, i.description,
      i.amount.toFixed(2), i.is_paid ? "Yes" : "No", i.notes || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "budget.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculations
  const revenueItems = items.filter((i) => i.type === "revenue");
  const expenseItems = items.filter((i) => i.type === "expense");
  const totalRevenue = revenueItems.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = expenseItems.reduce((s, i) => s + Number(i.amount), 0);
  const netIncome = totalRevenue - totalExpenses;
  const paidRevenue = revenueItems.filter((i) => i.is_paid).reduce((s, i) => s + Number(i.amount), 0);
  const paidExpenses = expenseItems.filter((i) => i.is_paid).reduce((s, i) => s + Number(i.amount), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  if (loading && tournaments.length === 0) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-20 bg-card rounded-lg border border-border">
        <DollarSign className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-display font-bold text-foreground mb-2">No tournaments yet</h3>
        <p className="text-muted-foreground">Create a tournament first to track your budget.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Budget Tracker</h1>
          <p className="text-muted-foreground mt-1">Track revenue and expenses in real time.</p>
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

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Revenue", value: fmt(totalRevenue), sub: `${fmt(paidRevenue)} collected`, icon: TrendingUp, color: "text-primary" },
          { label: "Total Expenses", value: fmt(totalExpenses), sub: `${fmt(paidExpenses)} paid`, icon: TrendingDown, color: "text-destructive" },
          { label: "Net Income", value: fmt(netIncome), sub: netIncome >= 0 ? "Surplus" : "Deficit", icon: DollarSign, color: netIncome >= 0 ? "text-primary" : "text-destructive" },
          { label: "Line Items", value: items.length.toString(), sub: `${revenueItems.length} revenue · ${expenseItems.length} expense`, icon: DollarSign, color: "text-secondary" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card rounded-lg border border-border p-5"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className={`text-2xl font-display font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-6">
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" />Add Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">{editItem ? "Edit Item" : "Add Budget Item"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description *</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Hole Sponsorship - ABC Corp"
                  required
                  maxLength={200}
                />
              </div>
              <div>
                <Label>Amount ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes..."
                  maxLength={500}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editItem ? "Update Item" : "Add Item"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-1.5" />Export CSV
        </Button>
      </div>

      {/* Budget Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <DollarSign className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold text-foreground mb-2">No budget items yet</h3>
          <p className="text-muted-foreground mb-4">Start tracking your revenue and expenses.</p>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add First Item</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Revenue Section */}
          {revenueItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Revenue ({fmt(totalRevenue)})
              </h3>
              <BudgetTable items={revenueItems} onTogglePaid={togglePaid} onEdit={handleOpenEdit} onDelete={handleDelete} fmt={fmt} />
            </div>
          )}

          {/* Expense Section */}
          {expenseItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-destructive mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" /> Expenses ({fmt(totalExpenses)})
              </h3>
              <BudgetTable items={expenseItems} onTogglePaid={togglePaid} onEdit={handleOpenEdit} onDelete={handleDelete} fmt={fmt} />
            </div>
          )}

          {/* Bottom Summary */}
          <div className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-foreground text-lg">Net Income</span>
              <span className={`font-display font-bold text-2xl ${netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                {fmt(netIncome)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for the budget table
function BudgetTable({
  items,
  onTogglePaid,
  onEdit,
  onDelete,
  fmt,
}: {
  items: BudgetItem[];
  onTogglePaid: (item: BudgetItem) => void;
  onEdit: (item: BudgetItem) => void;
  onDelete: (id: string) => void;
  fmt: (n: number) => string;
}) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left font-semibold px-4 py-3 w-10">Paid</th>
              <th className="text-left font-semibold px-4 py-3">Category</th>
              <th className="text-left font-semibold px-4 py-3">Description</th>
              <th className="text-right font-semibold px-4 py-3">Amount</th>
              <th className="text-left font-semibold px-4 py-3">Notes</th>
              <th className="text-center font-semibold px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Checkbox
                    checked={!!item.is_paid}
                    onCheckedChange={() => onTogglePaid(item)}
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                    {item.category}
                  </span>
                </td>
                <td className={`px-4 py-3 font-medium ${item.is_paid ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {item.description}
                </td>
                <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                  {fmt(Number(item.amount))}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                  {item.notes || "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => onEdit(item)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Item</AlertDialogTitle>
                          <AlertDialogDescription>Remove "{item.description}" from the budget?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(item.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Budget;
