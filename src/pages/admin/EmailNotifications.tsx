import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bell, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type PrefRow = {
  id: string;
  email: string;
  label: string | null;
  [key: string]: any;
};

const TYPES = [
  { key: "notify_registration", label: "Registrations" },
  { key: "notify_donation", label: "Donations" },
  { key: "notify_sponsorship", label: "Sponsorships" },
  { key: "notify_vendor", label: "Vendor Registrations" },
  { key: "notify_side_event", label: "Side Events" },
  { key: "notify_store", label: "Store Purchases" },
  { key: "notify_auction", label: "Auction Activity" },
  { key: "notify_refund", label: "Refund Requests" },
  { key: "notify_payout", label: "Payout Notices" },
  { key: "notify_other", label: "Other Transactions" },
] as const;

const AdminEmailNotifications = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PrefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("admin_notification_preferences")
      .select("*")
      .order("created_at");
    setRows((data as PrefRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin-login"); return; }
      const { data: adminCheck } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (!adminCheck) { toast.error("Admin access required"); navigate("/"); return; }
      setIsAdmin(true);
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setAdding(true);
    const { error } = await (supabase as any)
      .from("admin_notification_preferences")
      .insert({ email, label: newLabel.trim() || null });
    setAdding(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That email is already on the list" : error.message);
      return;
    }
    setNewEmail("");
    setNewLabel("");
    toast.success("Email added");
    load();
  };

  const toggle = async (row: PrefRow, key: string, value: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [key]: value } : r)));
    const { error } = await (supabase as any)
      .from("admin_notification_preferences")
      .update({ [key]: value })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const remove = async (row: PrefRow) => {
    const { error } = await (supabase as any)
      .from("admin_notification_preferences")
      .delete()
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Email removed");
    load();
  };

  const setAll = async (row: PrefRow, value: boolean) => {
    const patch: Record<string, boolean> = {};
    for (const t of TYPES) patch[t.key] = value;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
    const { error } = await (supabase as any)
      .from("admin_notification_preferences")
      .update(patch)
      .eq("id", row.id);
    if (error) { toast.error(error.message); load(); }
  };

  if (isAdmin === null) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate("/admin")} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Admin Dashboard
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Bell className="h-6 w-6 text-secondary" />
          <h1 className="text-2xl font-display font-bold">Platform Email Notifications</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Choose which platform inboxes get copied on transaction notifications, and which types each address
          receives. Turn a type off and no admin copy is sent for it — organizer notifications are unaffected.
          If every address is removed, notifications fall back to info@teevents.golf.
        </p>

        <Card className="p-4 mb-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label className="text-xs">Email address</Label>
              <Input type="email" placeholder="you@teevents.golf" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Label (optional)</Label>
              <Input placeholder="Owner inbox" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            </div>
            <Button onClick={handleAdd} disabled={adding || !newEmail.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add
            </Button>
          </div>
        </Card>

        {loading ? (
          <p className="text-center text-muted-foreground py-12 inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</p>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No admin notification emails configured. Notifications currently default to info@teevents.golf.
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <Card key={row.id} className="p-4">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold">{row.email}</div>
                    {row.label && <div className="text-xs text-muted-foreground">{row.label}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAll(row, true)}>All on</Button>
                    <Button variant="outline" size="sm" onClick={() => setAll(row, false)}>All off</Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(row)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {TYPES.map((t) => (
                    <div key={t.key} className="flex items-center gap-2">
                      <Switch checked={!!row[t.key]} onCheckedChange={(v) => toggle(row, t.key, v)} />
                      <Label className="text-xs text-muted-foreground cursor-pointer">{t.label}</Label>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEmailNotifications;
