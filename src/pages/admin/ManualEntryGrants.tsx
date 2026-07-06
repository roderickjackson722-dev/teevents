import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

interface Grant {
  id: string;
  tournament_id: string;
  additional_entries: number;
  reason: string | null;
  created_at: string;
}

interface Tournament {
  id: string;
  title: string;
  manual_entries_used: number;
  manual_entries_free_limit: number;
  manual_entries_admin_override: number;
}

const ManualEntryGrants = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [extra, setExtra] = useState<number>(5);
  const [reason, setReason] = useState("");
  const [grants, setGrants] = useState<Grant[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase.from("tournaments") as any)
      .select("id, title, manual_entries_used, manual_entries_free_limit, manual_entries_admin_override")
      .order("created_at", { ascending: false })
      .limit(200);
    setTournaments((data as Tournament[]) || []);
    const { data: g } = await (supabase.from("manual_entry_grants") as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setGrants((g as Grant[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = tournaments.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
  const selected = tournaments.find((t) => t.id === selectedId);

  const handleGrant = async () => {
    if (!selectedId || extra < 1) return toast.error("Pick a tournament and enter a positive number");
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      const { error: insertErr } = await (supabase.from("manual_entry_grants") as any).insert({
        tournament_id: selectedId,
        additional_entries: extra,
        reason: reason || null,
        granted_by: userId,
      });
      if (insertErr) throw insertErr;
      const current = selected?.manual_entries_admin_override ?? 0;
      const { error: updErr } = await (supabase.from("tournaments") as any)
        .update({ manual_entries_admin_override: current + extra })
        .eq("id", selectedId);
      if (updErr) throw updErr;
      toast.success(`Granted ${extra} additional free entries.`);
      setExtra(5);
      setReason("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to grant entries");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-display font-bold mb-1">Manual Entry Grants</h1>
      <p className="text-muted-foreground mb-6">
        Grant additional free manual entries to a tournament. This adds to the tournament's admin override count.
      </p>

      <div className="bg-card border border-border rounded-xl p-6 mb-6 space-y-4">
        <div>
          <Label>Search tournament</Label>
          <Input placeholder="Search by title…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <Label>Tournament</Label>
          <select
            className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">Select…</option>
            {filtered.slice(0, 100).map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} — used {t.manual_entries_used}/{t.manual_entries_free_limit + t.manual_entries_admin_override}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Additional free entries</Label>
            <Input type="number" min={1} value={extra} onChange={(e) => setExtra(parseInt(e.target.value || "0", 10))} />
          </div>
          <div>
            <Label>Reason (optional)</Label>
            <Input placeholder="e.g. sponsorship comp, sales concession" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleGrant} disabled={saving || !selectedId}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Grant additional free entries
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-bold mb-3">Recent grants</h2>
        {grants.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No grants yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {grants.map((g) => (
              <li key={g.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">+{g.additional_entries} entries</p>
                  <p className="text-xs text-muted-foreground">
                    Tournament {g.tournament_id.slice(0, 8)}… • {new Date(g.created_at).toLocaleString()}
                  </p>
                  {g.reason && <p className="text-xs text-muted-foreground italic">"{g.reason}"</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ManualEntryGrants;
