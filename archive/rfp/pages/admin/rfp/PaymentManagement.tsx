import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Printer, RefreshCw, Undo2 } from "lucide-react";
import RfpAdminGate from "@/components/admin/RfpAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCents } from "@/lib/formatCurrency";
import { downloadCsvStream } from "@/lib/streamCsv";
import { listRfpRegistrations, refundRfpRegistration } from "@/lib/rfpPrograms.functions";

export default function RfpPaymentManagement() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ registrations: [], seasons: [] });
  const [status, setStatus] = useState("");
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await listRfpRegistrations({ data: {} } as any));
    } catch (error: any) {
      toast.error(error?.message || "Could not load payments");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const rows = useMemo(
    () => (data.registrations as any[]).filter((r) => !status || r.payment_status === status),
    [data.registrations, status],
  );

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.payment_status === "paid");
    return {
      collected: paid.reduce((sum, r) => sum + (r.payment_amount_cents || 0), 0),
      refunded: rows.reduce((sum, r) => sum + (r.refund_amount_cents || 0), 0),
      pending: rows.filter((r) => r.payment_status === "pending").length,
    };
  }, [rows]);

  const seasonName = (id: string | null) => (data.seasons as any[]).find((s) => s.id === id)?.name || "—";

  const issueRefund = async (row: any) => {
    const raw = refundAmounts[row.id];
    const cents = raw ? Math.round(parseFloat(raw) * 100) : undefined;
    if (!window.confirm(cents ? `Refund ${formatCents(cents)} to ${row.participant_name}?` : `Refund the full amount to ${row.participant_name}?`)) return;
    setBusyId(row.id);
    try {
      const result: any = await refundRfpRegistration({ data: { id: row.id, amountCents: cents } } as any);
      toast.success(`Refunded ${formatCents(result.refunded_cents)}${result.simulated ? " (recorded manually — no card charge on file)" : ""}`);
      setRefundAmounts((c) => ({ ...c, [row.id]: "" }));
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not issue refund");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = async () => {
    await downloadCsvStream(
      `rfp-payments-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Participant", "Email", "Season", "Amount", "Status", "Refunded", "Refund status", "Payment reference", "Date"],
      rows.map((r) => [
        r.participant_name, r.participant_email, seasonName(r.season_id),
        formatCents(r.payment_amount_cents), r.payment_status, formatCents(r.refund_amount_cents),
        r.refund_status, r.stripe_payment_intent_id || r.stripe_session_id || "",
        new Date(r.registration_date).toLocaleString(),
      ]),
    );
    toast.success("Payments exported");
  };

  return (
    <RfpAdminGate title="Payment Management" subtitle="Private transaction ledger, refunds, and financial exports for county program registrations.">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4"><p className="text-sm text-muted-foreground">Collected</p><p className="text-2xl font-bold">{formatCents(totals.collected)}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Refunded</p><p className="text-2xl font-bold">{formatCents(totals.refunded)}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Awaiting payment</p><p className="text-2xl font-bold">{totals.pending}</p></Card>
          </div>

          <Card className="p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="refunded">Refunded</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Refresh</Button>
            <Button variant="outline" size="sm" onClick={() => void exportCsv()}><Download className="h-4 w-4" />Export CSV</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />Print / Save as PDF</Button>
          </Card>

          <Card className="overflow-hidden"><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Participant</TableHead><TableHead>Season</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Refunded</TableHead><TableHead className="text-right">Refund</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><div className="font-medium">{r.participant_name}</div><div className="text-xs text-muted-foreground">{r.participant_email}</div></TableCell>
                  <TableCell className="text-sm">{seasonName(r.season_id)}</TableCell>
                  <TableCell className="text-sm">{formatCents(r.payment_amount_cents)}</TableCell>
                  <TableCell className="text-sm">{r.payment_status}</TableCell>
                  <TableCell className="text-sm">{formatCents(r.refund_amount_cents)}<div className="text-xs text-muted-foreground">{r.refund_status}</div></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Input className="w-24" placeholder="Full" value={refundAmounts[r.id] || ""} onChange={(e) => setRefundAmounts((c) => ({ ...c, [r.id]: e.target.value }))} />
                      <Button size="sm" variant="outline" disabled={busyId === r.id || !r.payment_amount_cents} onClick={() => void issueRefund(r)}><Undo2 className="h-4 w-4" />Refund</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions yet.</TableCell></TableRow>}
            </TableBody>
          </Table></div></Card>
        </div>
      )}
    </RfpAdminGate>
  );
}
