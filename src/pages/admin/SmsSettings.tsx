import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SmsTournament {
  id: string;
  title: string;
  date: string | null;
  sms_enabled: boolean;
  sms_plan: string;
  sms_credits_used: number;
  sms_credits_limit: number;
}

const PLAN_CREDITS: Record<string, number> = { none: 0, credits: 100, unlimited: 0 };

const AdminSmsSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [rows, setRows] = useState<SmsTournament[]>([]);
  const [search, setSearch] = useState("");
  const [priceCredits, setPriceCredits] = useState("29");
  const [priceUnlimited, setPriceUnlimited] = useState("99");
  const [savingPrices, setSavingPrices] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: tRows, error }, { data: settings }] = await Promise.all([
      (supabase.from("tournaments") as any)
        .select("id, title, date, sms_enabled, sms_plan, sms_credits_used, sms_credits_limit")
        .order("date", { ascending: false })
        .limit(300),
      supabase.from("platform_settings").select("key, value").in("key", ["sms_price_credits", "sms_price_unlimited"]),
    ]);
    if (error) toast.error(error.message);
    setRows((tRows || []) as SmsTournament[]);
    for (const s of settings || []) {
      const val = String((s as any).value ?? "").replace(/"/g, "");
      if ((s as any).key === "sms_price_credits" && val) setPriceCredits(val);
      if ((s as any).key === "sms_price_unlimited" && val) setPriceUnlimited(val);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin-login"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (!isAdmin) { toast.error("Admin access required"); navigate("/"); return; }
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = async (id: string, patchData: Record<string, unknown>) => {
    setSaving(id);
    const { error } = await (supabase.from("tournaments") as any).update(patchData).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...(patchData as any) } : r)));
      toast.success("SMS settings updated");
    }
    setSaving(null);
  };

  const savePrices = async () => {
    setSavingPrices(true);
    const { error } = await supabase.from("platform_settings").upsert(
      [
        { key: "sms_price_credits", value: priceCredits as any },
        { key: "sms_price_unlimited", value: priceUnlimited as any },
      ],
      { onConflict: "key" }
    );
    if (error) toast.error(error.message);
    else toast.success("Pricing saved");
    setSavingPrices(false);
  };

  const filtered = rows.filter((r) => r.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Admin
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MessageSquare className="h-5 w-5" /> SMS Settings
        </h1>
        <Button variant="outline" size="sm" className="ml-auto" onClick={load} disabled={loading}>
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
          <CardDescription>What organizers pay per event for SMS blasts.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">100 credits ($/event)</label>
            <Input className="w-32" value={priceCredits} onChange={(e) => setPriceCredits(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Unlimited ($/event)</label>
            <Input className="w-32" value={priceUnlimited} onChange={(e) => setPriceUnlimited(e.target.value)} />
          </div>
          <Button onClick={savePrices} disabled={savingPrices}>
            {savingPrices ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save pricing
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tournament access</CardTitle>
          <CardDescription>Enable SMS blasts and set the credit allowance per tournament.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search tournaments..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tournaments...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Credit limit</TableHead>
                  <TableHead>Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.date || "No date"}</div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={t.sms_enabled}
                        disabled={saving === t.id}
                        onCheckedChange={(on) =>
                          patch(t.id, {
                            sms_enabled: on,
                            ...(on && t.sms_plan === "none"
                              ? { sms_plan: "credits", sms_credits_limit: 100 }
                              : {}),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={t.sms_plan || "none"}
                        onValueChange={(plan) =>
                          patch(t.id, {
                            sms_plan: plan,
                            sms_credits_limit: plan === "credits" ? 100 : PLAN_CREDITS[plan] ?? 0,
                          })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="credits">100 credits</SelectItem>
                          <SelectItem value="unlimited">Unlimited</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {t.sms_plan === "unlimited" ? (
                        <Badge variant="secondary">Unlimited</Badge>
                      ) : (
                        <Input
                          type="number"
                          className="w-24"
                          defaultValue={t.sms_credits_limit}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10) || 0;
                            if (v !== t.sms_credits_limit) patch(t.id, { sms_credits_limit: v });
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>{t.sms_credits_used}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSmsSettings;
