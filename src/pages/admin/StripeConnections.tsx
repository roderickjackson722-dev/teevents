import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Mail, RefreshCw, Search, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";

interface Row {
  organization_id: string;
  organization_name: string;
  created_at: string;
  stripe_account_id: string | null;
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  bank_last4: string | null;
  bank_brand: string | null;
  connection_notified_at: string | null;
  tournaments: { id: string; title: string; slug: string; published: boolean; date: string | null }[];
}

interface Stats { total: number; connected: number; fullyActive: number; notConnected: number; }

export default function AdminStripeConnections() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, connected: 0, fullyActive: 0, notConnected: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "connected" | "missing">("all");

  const load = async (sendDigest = false) => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-stripe-connections", {
      body: { send_digest: sendDigest },
    });
    setLoading(false);
    if (error) { toast({ title: "Error loading", description: error.message, variant: "destructive" }); return; }
    setRows(data.rows || []);
    setStats(data.stats || { total: 0, connected: 0, fullyActive: 0, notConnected: 0 });
    if (sendDigest) toast({ title: "Backfill digest sent", description: "Check info@teevents.golf" });
  };

  useEffect(() => { load(false); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      if (filter === "connected" && !r.connected) return false;
      if (filter === "missing" && r.connected) return false;
      if (!q) return true;
      return r.organization_name.toLowerCase().includes(q)
        || (r.stripe_account_id || "").toLowerCase().includes(q)
        || r.tournaments.some((t) => t.title.toLowerCase().includes(q));
    });
  }, [rows, search, filter]);

  const sendBackfill = async () => {
    setSending(true);
    await load(true);
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Stripe Connections | Admin" description="Stripe Connect status across organizations" path="/admin/stripe-connections" />
      <div className="container mx-auto p-6 max-w-7xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
        </Button>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Stripe Connections</h1>
            <p className="text-sm text-muted-foreground">Who has connected Stripe and who hasn't.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => load(false)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={sendBackfill} disabled={sending || loading}>
              {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
              Email Backfill Digest
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Total Orgs</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-600">{stats.connected}</div><div className="text-xs text-muted-foreground">Connected</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-amber-600">{stats.fullyActive}</div><div className="text-xs text-muted-foreground">Fully Active</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-destructive">{stats.notConnected}</div><div className="text-xs text-muted-foreground">Not Connected</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organizations</CardTitle>
            <div className="flex gap-2 flex-wrap mt-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search org, Stripe ID, tournament…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
              <Button size="sm" variant={filter === "connected" ? "default" : "outline"} onClick={() => setFilter("connected")}>Connected</Button>
              <Button size="sm" variant={filter === "missing" ? "default" : "outline"} onClick={() => setFilter("missing")}>Not Connected</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Tournaments</TableHead>
                      <TableHead>Stripe ID</TableHead>
                      <TableHead>First Connected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.organization_id}>
                        <TableCell className="font-medium">{r.organization_name}</TableCell>
                        <TableCell>
                          {r.connected ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant={r.charges_enabled ? "default" : "secondary"} className="w-fit">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {r.charges_enabled ? "Active" : "Pending"}
                              </Badge>
                              {r.payouts_enabled && <span className="text-xs text-muted-foreground">Payouts enabled</span>}
                            </div>
                          ) : (
                            <Badge variant="destructive" className="w-fit"><XCircle className="h-3 w-3 mr-1" /> Not connected</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.bank_last4 ? `${r.bank_brand || "Bank"} ••••${r.bank_last4}` : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            {r.tournaments.length === 0 && <span className="text-muted-foreground">None</span>}
                            {r.tournaments.map((t) => (
                              <div key={t.id}>
                                {t.title} {t.published && <Badge variant="outline" className="ml-1 text-[10px] px-1">published</Badge>}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.stripe_account_id || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.connection_notified_at ? new Date(r.connection_notified_at).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No results</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
