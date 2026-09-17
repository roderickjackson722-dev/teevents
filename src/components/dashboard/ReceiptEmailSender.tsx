import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Download, FileText, Loader2, Receipt, Send } from "lucide-react";

export type ReceiptType = "registration" | "addon" | "sponsorship" | "tax_deductible";

export const RECEIPT_TYPE_LABELS: Record<ReceiptType, string> = {
  registration: "Registration",
  addon: "Add-On / Extras",
  sponsorship: "Sponsorship",
  tax_deductible: "Tax-Deductible Donation",
};

/** platform_transactions.type values that belong to each receipt type. */
const TX_TYPES: Record<ReceiptType, string[]> = {
  registration: ["registration"],
  addon: ["addon_purchase", "store_purchase", "side_event_ticket", "director_shop_order", "event_ticket", "auction", "raffle"],
  sponsorship: ["sponsorship", "donation", "vendor_booth_fee", "vendor_registration"],
  tax_deductible: ["donation", "sponsorship", "registration"],
};

interface Props {
  tournamentId: string;
  receiptType: ReceiptType;
  onReceiptTypeChange: (t: ReceiptType) => void;
  /** Renders the full branded email HTML with the receipt merge variables. */
  renderHtml: (vars: Record<string, string>) => string;
  /** Subject line template (may contain {{...}} variables). */
  subjectTemplate: string;
  /** Base variables (event name, date, course, contact, etc.). */
  baseVars: Record<string, string>;
}

interface Tx {
  id: string;
  amount_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  net_amount_cents: number;
  type: string;
  status: string;
  description: string | null;
  golfer_name: string | null;
  golfer_email: string | null;
  created_at: string;
}

interface Reg {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? "");

const htmlToText = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h1|h2|h3|li|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export default function ReceiptEmailSender({
  tournamentId,
  receiptType,
  onReceiptTypeChange,
  renderHtml,
  subjectTemplate,
  baseVars,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [txId, setTxId] = useState("");
  const [sending, setSending] = useState(false);

  // Recipient
  const [recipientMode, setRecipientMode] = useState<"list" | "manual">("list");
  const [regId, setRegId] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [payerName, setPayerName] = useState("");

  // Editable receipt figures (auto-filled from the selected payment)
  const [item, setItem] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [serviceFee, setServiceFee] = useState("");
  const [processingFee, setProcessingFee] = useState("");
  const [total, setTotal] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Credit card (Stripe)");

  // Nonprofit details used by the tax-deductible donation receipt.
  const [orgInfo, setOrgInfo] = useState<{ name: string; nonprofit_name: string; ein: string; address: string }>({
    name: "",
    nonprofit_name: "",
    ein: "",
    address: "",
  });

  useEffect(() => {
    if (!tournamentId) return;
    let active = true;
    (async () => {
      const { data: t } = await supabase
        .from("tournaments")
        .select("organization_id")
        .eq("id", tournamentId)
        .maybeSingle();
      const orgId = (t as any)?.organization_id;
      if (!orgId) return;
      const { data: o } = await supabase
        .from("organizations")
        .select("name, nonprofit_name, ein, mailing_address")
        .eq("id", orgId)
        .maybeSingle();
      if (!active || !o) return;
      setOrgInfo({
        name: (o as any).name || "",
        nonprofit_name: (o as any).nonprofit_name || "",
        ein: (o as any).ein || "",
        address: (o as any).mailing_address || "",
      });
    })();
    return () => { active = false; };
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: tx }, { data: r }] = await Promise.all([
        supabase
          .from("platform_transactions")
          .select("id, amount_cents, platform_fee_cents, stripe_fee_cents, net_amount_cents, type, status, description, golfer_name, golfer_email, created_at")
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("tournament_registrations")
          .select("id, first_name, last_name, email")
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      setTxs((tx || []) as unknown as Tx[]);
      setRegs((r || []) as unknown as Reg[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [tournamentId]);

  const filteredTxs = useMemo(
    () => txs.filter((t) => TX_TYPES[receiptType].includes(t.type)),
    [txs, receiptType],
  );

  /** Auto-fill every amount from the chosen payment. */
  const applyTx = (id: string) => {
    setTxId(id);
    const t = filteredTxs.find((x) => x.id === id);
    if (!t) return;
    const fees = (t.platform_fee_cents || 0) + (t.stripe_fee_cents || 0);
    const base = t.net_amount_cents && t.net_amount_cents > 0
      ? t.net_amount_cents
      : Math.max(0, (t.amount_cents || 0) - fees);
    setItem(t.description || `${RECEIPT_TYPE_LABELS[receiptType]} — ${baseVars.event_name || ""}`.trim());
    setSubtotal(money(base));
    setServiceFee(money(t.platform_fee_cents || 0));
    setProcessingFee(money(t.stripe_fee_cents || 0));
    setTotal(money(t.amount_cents || 0));
    setReceiptDate(new Date(t.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
    setReceiptNumber(`RCPT-${new Date(t.created_at).getFullYear()}-${t.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`);
    if (t.golfer_name) setPayerName(t.golfer_name);
    if (t.golfer_email && recipientMode === "manual") setManualEmail(t.golfer_email);
  };

  const selectedReg = regs.find((r) => r.id === regId);
  const recipientEmail = recipientMode === "manual"
    ? manualEmail.trim()
    : (selectedReg?.email || "").trim();
  const recipientName = recipientMode === "manual"
    ? (payerName || "there")
    : [selectedReg?.first_name, selectedReg?.last_name].filter(Boolean).join(" ") || payerName || "there";

  const receiptVars: Record<string, string> = {
    receipt_type: RECEIPT_TYPE_LABELS[receiptType],
    receipt_number: receiptNumber,
    receipt_date: receiptDate,
    receipt_item: item,
    receipt_subtotal: subtotal,
    service_fee: serviceFee,
    processing_fee: processingFee,
    receipt_total: total,
    payment_method: paymentMethod,
    payer_name: recipientName,
    first_name: recipientMode === "manual" ? (payerName || baseVars.first_name || "") : (selectedReg?.first_name || payerName || ""),
    last_name: recipientMode === "manual" ? "" : (selectedReg?.last_name || ""),
  };

  const html = renderHtml(receiptVars);
  const subject = fill(subjectTemplate || "Your receipt for {{event_name}}", { ...baseVars, ...receiptVars });

  const copyText = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${htmlToText(html)}`);
    toast.success("Receipt copied as text");
  };
  const copyHtml = () => {
    navigator.clipboard.writeText(html);
    toast.success("Receipt HTML copied");
  };
  const download = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${(receiptNumber || "draft").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded — open it in any browser to print or save as PDF");
  };

  const send = async () => {
    if (!recipientEmail) { toast.error("Choose a registrant or enter an email address"); return; }
    if (!total) { toast.error("Pick a payment, or fill in the amounts, first"); return; }
    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Please sign in again");
      const res = await fetch("/api/public/receipt-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ tournament_id: tournamentId, to: recipientEmail, subject, html }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.detail || payload?.error || `Send failed (${res.status})`);
      toast.success(`Receipt sent to ${recipientEmail}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send the receipt");
    }
    setSending(false);
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" /> Receipt details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Receipt for</Label>
            <Select value={receiptType} onValueChange={(v) => { onReceiptTypeChange(v as ReceiptType); setTxId(""); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="registration">{RECEIPT_TYPE_LABELS.registration}</SelectItem>
                <SelectItem value="addon">{RECEIPT_TYPE_LABELS.addon}</SelectItem>
                <SelectItem value="sponsorship">{RECEIPT_TYPE_LABELS.sponsorship}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Each type keeps its own saved wording.</p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Payment ({filteredTxs.length} on file)</Label>
            <Select value={txId} onValueChange={applyTx}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pick a payment to auto-fill amounts" /></SelectTrigger>
              <SelectContent>
                {filteredTxs.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {money(t.amount_cents)} — {t.golfer_name || t.golfer_email || "Unknown"} · {new Date(t.created_at).toLocaleDateString()}
                  </SelectItem>
                ))}
                {filteredTxs.length === 0 && <SelectItem value="none" disabled>No payments of this type yet</SelectItem>}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Fills in the item, fees, and total automatically. You can edit anything below.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3">
            <Label className="text-xs text-muted-foreground">Item / description</Label>
            <Input value={item} onChange={(e) => setItem(e.target.value)} className="mt-1" placeholder="Team registration — 4 players" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Amount</Label>
            <Input value={subtotal} onChange={(e) => setSubtotal(e.target.value)} className="mt-1" placeholder="$400.00" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Service fee</Label>
            <Input value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} className="mt-1" placeholder="$20.00" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Processing / credit card fee</Label>
            <Input value={processingFee} onChange={(e) => setProcessingFee(e.target.value)} className="mt-1" placeholder="$12.30" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Total charged</Label>
            <Input value={total} onChange={(e) => setTotal(e.target.value)} className="mt-1" placeholder="$432.30" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Payment date</Label>
            <Input value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Receipt number</Label>
            <Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} className="mt-1" />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs text-muted-foreground">Payment method / reference</Label>
            <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>

      {/* Recipient */}
      <div className="bg-card rounded-lg border p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Send to
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant={recipientMode === "list" ? "default" : "outline"} onClick={() => setRecipientMode("list")}>
            Pick from registrants
          </Button>
          <Button size="sm" variant={recipientMode === "manual" ? "default" : "outline"} onClick={() => setRecipientMode("manual")}>
            Enter an email
          </Button>
        </div>
        {recipientMode === "list" ? (
          <div>
            <Label className="text-xs text-muted-foreground">Registrant ({regs.filter((r) => r.email).length})</Label>
            <Select value={regId} onValueChange={setRegId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a registrant" /></SelectTrigger>
              <SelectContent>
                {regs.filter((r) => r.email).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.first_name} {r.last_name} — {r.email}
                  </SelectItem>
                ))}
                {regs.filter((r) => r.email).length === 0 && <SelectItem value="none" disabled>No registrants with an email</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Email address</Label>
              <Input value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="mt-1" placeholder="finance@company.com" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Name on the receipt</Label>
              <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} className="mt-1" placeholder="Acme Corporation" />
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={send} disabled={sending || !recipientEmail}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />} Send receipt
          </Button>
          <Button variant="outline" onClick={copyText}><Copy className="h-4 w-4 mr-1" /> Copy as text</Button>
          <Button variant="outline" onClick={copyHtml}><Copy className="h-4 w-4 mr-1" /> Copy HTML</Button>
          <Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-1" /> Download</Button>
          {recipientEmail && <Badge variant="secondary">{recipientEmail}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          Copy or download to send this receipt from your own email account, or print it to PDF from your browser.
        </p>
      </div>

      {/* Preview */}
      <div className="bg-card rounded-lg border p-5">
        <div className="text-xs text-muted-foreground mb-2">Subject: <span className="font-medium text-foreground">{subject}</span></div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  );
}
