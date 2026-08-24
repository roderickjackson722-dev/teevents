import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listFlatRateTournaments, setFlatRateOverride } from "@/lib/flatRate.functions";

type Row = Awaited<ReturnType<typeof listFlatRateTournaments>>[number];

/**
 * Admin-only Flat-Rate Override: grants Flat-Rate Pro (no 5% platform fee) to a
 * tournament at no charge. Every change is written to tournament_flat_rate_log.
 */
const FlatRateOverride = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = async (term?: string) => {
    setLoading(true);
    try {
      setRows(await listFlatRateTournaments({ data: { search: term } }));
    } catch (err: any) {
      toast.error(err?.message || "Could not load tournaments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (row: Row, enabled: boolean) => {
    setSaving(row.id);
    try {
      await setFlatRateOverride({
        data: { tournamentId: row.id, enabled, reason: reasons[row.id] || undefined },
      });
      toast.success(enabled ? "Flat-Rate Pro granted" : "Override removed");
      await load(search || undefined);
    } catch (err: any) {
      toast.error(err?.message || "Could not save override");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
        </Button>

        <h1 className="text-3xl font-display font-bold text-foreground mb-1">Flat-Rate Override</h1>
        <p className="text-muted-foreground mb-6">
          Grant Flat-Rate Pro (no 5% platform fee) to a tournament at no charge. Organizers never see this screen.
        </p>

        <form
          className="flex gap-2 mb-6"
          onSubmit={(e) => {
            e.preventDefault();
            load(search || undefined);
          }}
        >
          <Input
            placeholder="Search tournaments by title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4 mr-2" /> Search
          </Button>
        </form>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading tournaments
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <Card key={row.id} className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-foreground">{row.title}</p>
                    <p className="text-xs text-muted-foreground">{row.date || "No date set"}</p>
                    <div className="flex gap-2 mt-2">
                      {row.flat_rate_enabled && <Badge>Flat-Rate active</Badge>}
                      {row.flat_rate_paid && <Badge variant="secondary">Paid $299</Badge>}
                      {row.flat_rate_admin_override && <Badge variant="outline">Admin override</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {saving === row.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">Enable (no charge)</span>
                    <Switch
                      checked={!!row.flat_rate_admin_override}
                      disabled={saving === row.id}
                      onCheckedChange={(v) => toggle(row, v)}
                    />
                  </div>
                </div>
                {!row.flat_rate_admin_override && (
                  <Input
                    className="mt-3"
                    placeholder="Reason (government contract / institutional client / promotional offer)"
                    value={reasons[row.id] ?? ""}
                    onChange={(e) => setReasons((p) => ({ ...p, [row.id]: e.target.value }))}
                  />
                )}
                {row.flat_rate_admin_override && row.flat_rate_override_reason && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Reason: {row.flat_rate_override_reason}
                  </p>
                )}
              </Card>
            ))}
            {!rows.length && <p className="text-sm text-muted-foreground">No tournaments found.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlatRateOverride;
