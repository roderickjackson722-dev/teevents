import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";
import RfpAdminGate from "@/components/admin/RfpAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCents } from "@/lib/formatCurrency";
import { getFinancialReport, type FinancialLine } from "@/lib/rfp.functions";

export default function FinancialReports() {
  const [lines, setLines] = useState<FinancialLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [program, setProgram] = useState("all");
  const [sport, setSport] = useState("all");
  const [season, setSeason] = useState("all");
  const [category, setCategory] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await getFinancialReport({ data: { from: from || undefined, to: to || undefined } } as any);
      setLines(res.lines || []);
    } catch (e: any) {
      toast.error(e?.message || "Could not build report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const uniq = (pick: (l: FinancialLine) => string | null) =>
    Array.from(new Set(lines.map(pick).filter(Boolean) as string[])).sort();

  const filtered = useMemo(
    () =>
      lines.filter(
        (l) =>
          (program === "all" || l.program === program) &&
          (sport === "all" || l.sport_type === sport) &&
          (season === "all" || (l.season || "—") === season) &&
          (category === "all" || l.category === category),
      ),
    [lines, program, sport, season, category],
  );

  const byCategory = useMemo(() => {
    const m = new Map<string, { gross: number; fee: number; net: number; count: number }>();
    filtered.forEach((l) => {
      const c = m.get(l.category) || { gross: 0, fee: 0, net: 0, count: 0 };
      c.gross += l.gross_cents; c.fee += l.platform_fee_cents; c.net += l.net_cents; c.count += 1;
      m.set(l.category, c);
    });
    return Array.from(m, ([name, v]) => ({ name, ...v })).sort((a, b) => b.gross - a.gross);
  }, [filtered]);

  const totals = byCategory.reduce(
    (a, c) => ({ gross: a.gross + c.gross, fee: a.fee + c.fee, net: a.net + c.net, count: a.count + c.count }),
    { gross: 0, fee: 0, net: 0, count: 0 },
  );

  const exportCSV = () => {
    const headers = ["Date", "Category", "Program", "Sport", "Season", "Gross ($)", "Platform Fee ($)", "Net ($)"];
    const rows = filtered.map((l) => [
      new Date(l.date).toISOString().split("T")[0], l.category, l.program, l.sport_type, l.season || "",
      (l.gross_cents / 100).toFixed(2), (l.platform_fee_cents / 100).toFixed(2), (l.net_cents / 100).toFixed(2),
    ]);
    rows.push(["TOTAL", "", "", "", "", (totals.gross / 100).toFixed(2), (totals.fee / 100).toFixed(2), (totals.net / 100).toFixed(2)]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `gaap-gasb-financial-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => window.print();

  return (
    <RfpAdminGate
      title="Financial Reports (GAAP / GASB)"
      subtitle="Revenue by program, sport, season and revenue stream, with fund-accounting style category summaries."
    >
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          <Card className="p-4 space-y-4 print:hidden">
            <div className="grid gap-3 md:grid-cols-6">
              <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
              <div>
                <Label>Program</Label>
                <Select value={program} onValueChange={setProgram}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All programs</SelectItem>{uniq((l) => l.program).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sport</Label>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All sports</SelectItem>{uniq((l) => l.sport_type).map((v) => <SelectItem key={v} value={v}>{v.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Season</Label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All seasons</SelectItem>{uniq((l) => l.season).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Revenue type</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All types</SelectItem>{uniq((l) => l.category).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-1" />Apply date range</Button>
              <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
              <Button variant="outline" size="sm" onClick={exportPDF}><FileText className="h-4 w-4 mr-1" />PDF</Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border"><h2 className="font-semibold text-foreground">Summary by revenue category</h2></div>
            <Table>
              <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Transactions</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Platform fees</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader>
              <TableBody>
                {byCategory.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No revenue matches these filters.</TableCell></TableRow>}
                {byCategory.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{c.count}</TableCell>
                    <TableCell className="text-right">{formatCents(c.gross)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCents(c.fee)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCents(c.net)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{totals.count}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCents(totals.gross)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCents(totals.fee)}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{formatCents(totals.net)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border"><h2 className="font-semibold text-foreground">Detail ({filtered.length} lines)</h2></div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Program</TableHead><TableHead>Sport</TableHead><TableHead>Season</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Fees</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.slice(0, 500).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(l.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">{l.category}</TableCell>
                      <TableCell className="text-xs">{l.program}</TableCell>
                      <TableCell className="text-xs capitalize">{l.sport_type.replace("_", " ")}</TableCell>
                      <TableCell className="text-xs">{l.season || "—"}</TableCell>
                      <TableCell className="text-right text-xs">{formatCents(l.gross_cents)}</TableCell>
                      <TableCell className="text-right text-xs">{formatCents(l.platform_fee_cents)}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{formatCents(l.net_cents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </RfpAdminGate>
  );
}
