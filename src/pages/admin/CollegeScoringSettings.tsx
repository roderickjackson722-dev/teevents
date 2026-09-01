import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, GraduationCap, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatCents } from "@/lib/formatCurrency";
import { COLLEGE_SCORING_CENTS, collegeScoringKey } from "@/lib/addonPricing";

interface Row {
  id: string;
  title: string;
  date: string | null;
  college_scoring_enabled: boolean;
  college_scoring_paid: boolean;
  college_scoring_divisions: number | null;
}

interface CodeRow {
  id: string;
  code: string;
  discount_percent: number | null;
  expires_at: string | null;
}

/** Admin → College Golf Scoring: availability, pricing overrides, and discount codes. */
const CollegeScoringSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [prices, setPrices] = useState<Record<number, string>>({
    1: "199", 2: "375", 3: "550", 4: "720",
  });
  const [savingPrices, setSavingPrices] = useState(false);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("20");
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: tRows }, { data: priceRows }, { data: codeRows }] = await Promise.all([
      (supabase.from("tournaments") as any)
        .select("id, title, date, college_scoring_enabled, college_scoring_paid, college_scoring_divisions")
        .order("date", { ascending: false })
        .limit(300),
      supabase.from("admin_addon_pricing").select("addon_key, price_cents"),
      supabase
        .from("addon_discount_codes")
        .select("id, code, discount_percent, expires_at")
        .eq("addon_key", "college_scoring")
        .order("created_at", { ascending: false }),
    ]);
    setRows((tRows || []) as Row[]);
    const next = { ...prices };
    for (const p of (priceRows as any[]) || []) {
      for (const d of [1, 2, 3, 4]) {
        if (p.addon_key === collegeScoringKey(d)) next[d] = String(Math.round(p.price_cents / 100));
      }
    }
    setPrices(next);
    setCodes((codeRows || []) as CodeRow[]);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin-login"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id, _role: "admin",
      });
      if (!isAdmin) { toast.error("Admin access required"); navigate("/"); return; }
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePrices = async () => {
    setSavingPrices(true);
    const payload = [1, 2, 3, 4].map((d) => ({
      addon_key: collegeScoringKey(d),
      price_cents: Math.max(0, Math.round(parseFloat(prices[d] || "0") * 100)) ||
        COLLEGE_SCORING_CENTS[d],
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("admin_addon_pricing")
      .upsert(payload as any, { onConflict: "addon_key" });
    if (error) toast.error(error.message);
    else toast.success("College Golf Scoring pricing saved");
    setSavingPrices(false);
  };

  const toggleAvailability = async (row: Row, enabled: boolean) => {
    setSavingId(row.id);
    const { error } = await (supabase.from("tournaments") as any)
      .update({ college_scoring_enabled: enabled })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, college_scoring_enabled: enabled } : r)),
      );
      toast.success(enabled ? "Add-on offered to this organizer" : "Add-on hidden for this event");
    }
    setSavingId(null);
  };

  const createCode = async () => {
    const code = newCode.trim().toUpperCase();
    const percent = parseInt(newPercent, 10);
    if (!code) return toast.error("Enter a code");
    if (!Number.isFinite(percent) || percent < 1 || percent > 100)
      return toast.error("Discount must be between 1 and 100");
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("addon_discount_codes").insert({
      code,
      addon_key: "college_scoring",
      discount_percent: percent,
      created_by: session?.user.id ?? null,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success(`Code ${code} created`);
      setNewCode("");
      load();
    }
    setCreating(false);
  };

  const filtered = rows.filter((r) =>
    r.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
        </Button>

        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> College Golf Scoring Add-on
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control which events can buy the add-on, override pricing, and issue discount codes.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing by divisions</CardTitle>
            <CardDescription>
              Defaults: 1 — $199, 2 — $375, 3 — $550, 4 — $720. Values are per event, in dollars.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((d) => (
                <div key={d}>
                  <Label htmlFor={`price-${d}`} className="text-xs">
                    {d} division{d > 1 ? "s" : ""}
                  </Label>
                  <Input
                    id={`price-${d}`}
                    type="number"
                    min="0"
                    value={prices[d]}
                    onChange={(e) => setPrices((p) => ({ ...p, [d]: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Default {formatCents(COLLEGE_SCORING_CENTS[d])}
                  </p>
                </div>
              ))}
            </div>
            <Button onClick={savePrices} disabled={savingPrices} size="sm">
              {savingPrices && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save pricing
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discount codes</CardTitle>
            <CardDescription>Percentage off the College Golf Scoring add-on at checkout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label htmlFor="new-code" className="text-xs">Code</Label>
                <Input
                  id="new-code"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="COLLEGE20"
                  className="w-40"
                />
              </div>
              <div>
                <Label htmlFor="new-percent" className="text-xs">Discount %</Label>
                <Input
                  id="new-percent"
                  type="number"
                  min="1"
                  max="100"
                  value={newPercent}
                  onChange={(e) => setNewPercent(e.target.value)}
                  className="w-28"
                />
              </div>
              <Button onClick={createCode} disabled={creating} size="sm">
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create code
              </Button>
            </div>
            {codes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No discount codes yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {codes.map((c) => (
                  <Badge key={c.id} variant="secondary" className="font-mono">
                    {c.code} — {c.discount_percent}% off
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Availability by event</CardTitle>
            <CardDescription>
              Organizers only see the College Golf Scoring add-on when you enable it for their event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search tournaments…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Purchased</TableHead>
                      <TableHead className="text-right">Offer add-on</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 100).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell className="text-muted-foreground">{r.date ?? "—"}</TableCell>
                        <TableCell>
                          {r.college_scoring_paid ? (
                            <Badge variant="secondary">
                              Paid{r.college_scoring_divisions ? ` — ${r.college_scoring_divisions} div` : ""}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not purchased</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={!!r.college_scoring_enabled}
                            disabled={savingId === r.id}
                            onCheckedChange={(v) => toggleAvailability(r, v)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CollegeScoringSettings;
