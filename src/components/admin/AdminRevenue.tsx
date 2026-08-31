import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, DollarSign, Award, Users, Download } from "lucide-react";
import { formatCents } from "@/lib/formatCurrency";
import { getAdminRevenueOverview, type RevenueTournamentRow } from "@/lib/adminRevenue.functions";

interface Totals {
  brandingFeeCents: number;
  brandingCount: number;
  sponsorGrossCents: number;
  sponsorPlatformFeeCents: number;
  otherPlatformFeeCents: number;
  platformRevenueCents: number;
}

const AdminRevenue = () => {
  const [rows, setRows] = useState<RevenueTournamentRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res: any = await getAdminRevenueOverview({ data: {} } as any);
        setRows(res?.rows || []);
        setTotals(res?.totals || null);
      } catch (e: any) {
        setError(e?.message || "Could not load revenue data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        (r.organizationName || "").toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const downloadCsv = () => {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      "Tournament,Organization,Date,Branding fee,Sponsor payments (gross),Sponsor platform fee,Other platform fees,Total platform revenue",
      ...filtered.map((r) =>
        [
          r.title,
          r.organizationName || "—",
          r.date || "—",
          formatCents(r.brandingFeeCents),
          formatCents(r.sponsorGrossCents),
          formatCents(r.sponsorPlatformFeeCents),
          formatCents(r.otherPlatformFeeCents),
          formatCents(r.platformRevenueCents),
        ]
          .map(esc)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "teevents-revenue-by-tournament.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  const pct = (cents: number) =>
    totals && totals.platformRevenueCents > 0
      ? `${Math.round((cents / totals.platformRevenueCents) * 100)}%`
      : "0%";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total platform revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(totals?.platformRevenueCents || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" /> Branding removal fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(totals?.brandingFeeCents || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totals?.brandingCount || 0} event{(totals?.brandingCount || 0) === 1 ? "" : "s"} ·{" "}
              {pct(totals?.brandingFeeCents || 0)} of revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Sponsor payments (gross)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(totals?.sponsorGrossCents || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Platform fee: {formatCents(totals?.sponsorPlatformFeeCents || 0)} ·{" "}
              {pct(totals?.sponsorPlatformFeeCents || 0)} of revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Other platform fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(totals?.otherPlatformFeeCents || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Registrations, tickets, store · {pct(totals?.otherPlatformFeeCents || 0)} of revenue
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Revenue by tournament</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tournament or organization"
              className="w-56"
            />
            <Button variant="outline" size="sm" onClick={downloadCsv}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tournament</TableHead>
                <TableHead>Branding fee</TableHead>
                <TableHead>Sponsor payments</TableHead>
                <TableHead>Sponsor platform fee</TableHead>
                <TableHead>Other platform fees</TableHead>
                <TableHead className="text-right">Total revenue</TableHead>
                <TableHead className="text-right">% of total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No revenue recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.tournamentId}>
                  <TableCell>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.organizationName || "—"} · {r.date || "Date TBD"}
                    </p>
                  </TableCell>
                  <TableCell>
                    {r.brandingFeeCents > 0 ? (
                      <span className="font-medium">{formatCents(r.brandingFeeCents)}</span>
                    ) : r.brandingSource === "admin" ? (
                      <Badge variant="secondary">Admin comp</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{formatCents(r.sponsorGrossCents)}</TableCell>
                  <TableCell>{formatCents(r.sponsorPlatformFeeCents)}</TableCell>
                  <TableCell>{formatCents(r.otherPlatformFeeCents)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCents(r.platformRevenueCents)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {pct(r.platformRevenueCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRevenue;
