import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileText, Loader2, Mail, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { emailEnterpriseInvoice } from "@/lib/enterpriseOperations.functions";

type Invoice = { id: string; invoice_number: string; billing_name: string; billing_email: string; billing_address: string; amount_cents: number; status: string; due_date: string; created_at: string };
type EventRow = { id: string; title: string; date: string | null };
type Transaction = { golfer_name: string | null; golfer_email: string | null; amount_cents: number; created_at: string; stripe_payment_intent_id: string | null; payout_method: string | null; tournament_id: string | null; status: string | null };

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const downloadCsv = (name: string, rows: unknown[][]) => {
  const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
};

export default function EnterpriseOperations() {
  const { org } = useOrgContext();
  const sendInvoice = useServerFn(emailEnterpriseInvoice);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [eventId, setEventId] = useState("all");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [settings, setSettings] = useState({ acceptInvoicePayments: false, processingFeeHandling: "absorb" });
  const [form, setForm] = useState({ billing_name: "", billing_email: "", billing_address: "", amount: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!org) return;
    setLoading(true);
    const [eventRes, invoiceRes, txRes] = await Promise.all([
      (supabase.from("tournaments") as any).select("id, title, date").eq("organization_id", org.orgId).eq("is_enterprise", true).order("date", { ascending: false }),
      (supabase.from("enterprise_invoices") as any).select("*").eq("organization_id", org.orgId).order("created_at", { ascending: false }),
      (supabase.from("platform_transactions") as any).select("golfer_name, golfer_email, amount_cents, created_at, stripe_payment_intent_id, payout_method, tournament_id, status").eq("organization_id", org.orgId).order("created_at", { ascending: false }).limit(5000),
    ]);
    setEvents(eventRes.data || []); setInvoices(invoiceRes.data || []); setTransactions(txRes.data || []);
    const raw = org.enterpriseSettings || {};
    setSettings({ acceptInvoicePayments: Boolean(raw.acceptInvoicePayments), processingFeeHandling: raw.processingFeeHandling === "pass_through" ? "pass_through" : "absorb" });
    setLoading(false);
  };
  useEffect(() => { load(); }, [org]);

  const selectedTransactions = useMemo(() => transactions.filter((tx) => (eventId === "all" || tx.tournament_id === eventId) && tx.created_at.startsWith(year)), [transactions, eventId, year]);
  const paidTransactions = selectedTransactions.filter((tx) => ["paid", "succeeded", "complete", "completed"].includes(String(tx.status || "").toLowerCase()));
  const total = paidTransactions.reduce((sum, tx) => sum + tx.amount_cents, 0);

  const saveSettings = async () => {
    if (!org) return; setSaving(true);
    const { error } = await (supabase.from("organizations") as any).update({ enterprise_settings: { ...org.enterpriseSettings, ...settings } }).eq("id", org.orgId);
    setSaving(false); if (error) toast.error(error.message); else toast.success("Enterprise payment settings saved.");
  };

  const createInvoice = async () => {
    if (!org || !form.billing_name.trim() || !form.billing_email.trim() || !form.billing_address.trim() || Number(form.amount) <= 0) { toast.error("Complete every invoice field."); return; }
    setSaving(true);
    const invoiceNumber = `ENT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const due = new Date(); due.setDate(due.getDate() + 30);
    const { data, error } = await (supabase.from("enterprise_invoices") as any).insert({ organization_id: org.orgId, tournament_id: eventId === "all" ? null : eventId, invoice_number: invoiceNumber, billing_name: form.billing_name.trim(), billing_email: form.billing_email.trim(), billing_address: form.billing_address.trim(), amount_cents: Math.round(Number(form.amount) * 100), due_date: due.toISOString().slice(0, 10), created_by: org.userId }).select("*").single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    await (supabase.from("enterprise_invoice_audit_log") as any).insert({ invoice_id: data.id, organization_id: org.orgId, actor_id: org.userId, action: "created" });
    try { await sendInvoice({ data: { organizationId: org.orgId, invoiceId: data.id } }); toast.success(`${invoiceNumber} created and emailed.`); } catch { toast.success(`${invoiceNumber} created. Email it from the invoice list.`); }
    setForm({ billing_name: "", billing_email: "", billing_address: "", amount: "" }); await load(); setSaving(false);
  };

  const markPaid = async (invoice: Invoice) => {
    if (!org) return;
    const { error } = await (supabase.from("enterprise_invoices") as any).update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", invoice.id);
    if (error) { toast.error(error.message); return; }
    await (supabase.from("enterprise_invoice_audit_log") as any).insert({ invoice_id: invoice.id, organization_id: org.orgId, actor_id: org.userId, action: "marked_paid" }); await load();
  };

  const printInvoice = (invoice: Invoice) => {
    const popup = window.open("", "_blank"); if (!popup) return;
    popup.document.write(`<html><body style="font-family:Arial;padding:40px"><h1>Invoice ${invoice.invoice_number}</h1><p>${org?.orgName || ""}</p><hr><p><strong>Bill to:</strong> ${invoice.billing_name}<br>${invoice.billing_address.replace(/\n/g, "<br>")}<br>${invoice.billing_email}</p><h2>$${(invoice.amount_cents / 100).toFixed(2)}</h2><p>Due ${invoice.due_date} · ${invoice.status.toUpperCase()}</p><script>window.onload=()=>window.print()<\/script></body></html>`); popup.document.close();
  };

  if (loading) return <EnterpriseLayout title="Operations"><Loader2 className="h-5 w-5 animate-spin" /></EnterpriseLayout>;
  return (
    <EnterpriseLayout title="Operations" description="Invoices, payment settings and annual reporting." crumbs={[{ label: "Operations" }]}>
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap"><TabsTrigger value="payments">Payment Settings</TabsTrigger><TabsTrigger value="invoices">Invoices</TabsTrigger><TabsTrigger value="reports">Reports &amp; POS</TabsTrigger></TabsList>
        <TabsContent value="payments"><Card><CardHeader><CardTitle className="text-base">Enterprise payment options</CardTitle></CardHeader><CardContent className="space-y-4"><label className="flex items-center justify-between gap-4 rounded-md border p-3"><span><strong className="block text-sm">Accept invoice payments</strong><span className="text-xs text-muted-foreground">Off by default. Staff can create net-30 invoices below.</span></span><Switch checked={settings.acceptInvoicePayments} onCheckedChange={(value) => setSettings((s) => ({ ...s, acceptInvoicePayments: value }))} /></label><div><Label>Card processing fee</Label><Select value={settings.processingFeeHandling} onValueChange={(value) => setSettings((s) => ({ ...s, processingFeeHandling: value }))}><SelectTrigger className="mt-1 max-w-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="absorb">Club absorbs processing fee</SelectItem><SelectItem value="pass_through">Pass processing fee to player</SelectItem></SelectContent></Select></div><p className="text-sm text-muted-foreground">New Enterprise tournaments and leagues have a 0% TeeVents transaction fee. Card payments continue through your connected payout account.</p><Button onClick={saveSettings} disabled={saving}><Save className="mr-2 h-4 w-4" />Save settings</Button></CardContent></Card></TabsContent>
        <TabsContent value="invoices" className="space-y-4"><Card><CardHeader><CardTitle className="text-base">Create net-30 invoice</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><Input placeholder="Billing contact or organization" value={form.billing_name} onChange={(e) => setForm({ ...form, billing_name: e.target.value })} /><Input type="email" placeholder="Billing email" value={form.billing_email} onChange={(e) => setForm({ ...form, billing_email: e.target.value })} /><Textarea className="md:col-span-2" placeholder="Billing address" value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} /><Input type="number" min="0.01" step="0.01" placeholder="Amount (USD)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /><Button onClick={createInvoice} disabled={saving || !settings.acceptInvoicePayments}><FileText className="mr-2 h-4 w-4" />Create and email invoice</Button>{!settings.acceptInvoicePayments && <p className="text-xs text-muted-foreground md:col-span-2">Turn on invoice payments in Payment Settings first.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Invoice history</CardTitle></CardHeader><CardContent>{invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices yet.</p> : <div className="divide-y">{invoices.map((invoice) => <div key={invoice.id} className="flex flex-wrap items-center gap-3 py-3 text-sm"><div className="min-w-48 flex-1"><strong>{invoice.invoice_number}</strong><p className="text-muted-foreground">{invoice.billing_name} · Due {invoice.due_date}</p></div><span>${(invoice.amount_cents / 100).toFixed(2)}</span><span className="font-semibold uppercase">{invoice.status}</span><Button size="icon" variant="ghost" onClick={() => printInvoice(invoice)} aria-label="Print invoice"><Printer className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={async () => { if (!org) return; await sendInvoice({ data: { organizationId: org.orgId, invoiceId: invoice.id } }); toast.success("Invoice emailed."); }} aria-label="Email invoice"><Mail className="h-4 w-4" /></Button>{invoice.status === "pending" && <Button size="sm" variant="outline" onClick={() => markPaid(invoice)}>Mark paid</Button>}</div>)}</div>}</CardContent></Card></TabsContent>
        <TabsContent value="reports"><Card><CardHeader><CardTitle className="text-base">Annual report and POS reconciliation</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-3"><Select value={year} onValueChange={setYear}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{[0,1,2,3,4].map((n) => { const value = String(new Date().getFullYear() - n); return <SelectItem key={value} value={value}>{value}</SelectItem>; })}</SelectContent></Select><Select value={eventId} onValueChange={setEventId}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Enterprise events</SelectItem>{events.map((event) => <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Events</p><p className="text-2xl font-semibold">{eventId === "all" ? events.filter((event) => event.date?.startsWith(year)).length : 1}</p></div><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Paid transactions</p><p className="text-2xl font-semibold">{paidTransactions.length}</p></div><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Collected</p><p className="text-2xl font-semibold">${(total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div></div><Button variant="outline" onClick={() => downloadCsv(`enterprise-pos-${year}.csv`, [["Player", "Email", "Paid amount", "Payment date", "Stripe transaction", "Payment method"], ...paidTransactions.map((tx) => [tx.golfer_name, tx.golfer_email, (tx.amount_cents / 100).toFixed(2), tx.created_at, tx.stripe_payment_intent_id, tx.payout_method])])}><Download className="mr-2 h-4 w-4" />Export POS CSV</Button><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print annual report</Button></CardContent></Card></TabsContent>
      </Tabs>
    </EnterpriseLayout>
  );
}