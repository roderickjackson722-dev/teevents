import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Phone, Check, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DemoRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tournament_name: string | null;
  expected_players: number | null;
  role: string | null;
  heard_from: string | null;
  planning_status: string | null;
  status: string;
  notes: string | null;
  contacted_at: string | null;
  created_at: string;
};

const STATUS_OPTIONS = ["pending", "contacted", "converted", "lost"];

const AdminDemoRequests = () => {
  const [rows, setRows] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("demo_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setRows((data || []) as any);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "contacted") updates.contacted_at = new Date().toISOString();
    const { error } = await supabase.from("demo_requests" as any).update(updates).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this demo request?")) return;
    const { error } = await supabase.from("demo_requests" as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else load();
  };

  if (loading) return <div className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold">Demo Requests</h2>
        <p className="text-sm text-muted-foreground">Prospects who signed up without a confirmed tournament date.</p>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">No demo requests yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Tournament</th>
                <th className="p-3">Players</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">
                    <a href={`mailto:${r.email}`} className="text-primary inline-flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</a>
                    {r.phone && <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />{r.phone}</div>}
                  </td>
                  <td className="p-3">{r.tournament_name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3">{r.expected_players ?? "—"}</td>
                  <td className="p-3 text-xs">{r.role || "—"}</td>
                  <td className="p-3">
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      className="bg-background border border-border rounded px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "contacted")}>
                        <Check className="h-3 w-3 mr-1" />Mark Contacted
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDemoRequests;
