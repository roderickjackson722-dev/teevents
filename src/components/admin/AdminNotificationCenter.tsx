import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bell, Loader2, CheckCheck, Trash2, Eye, EyeOff, RefreshCw,
  UserPlus, DollarSign, Handshake, Banknote, AlertTriangle, Sparkles, Users,
} from "lucide-react";

export interface AdminNotificationRow {
  id: string;
  type: string;
  title: string | null;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { label: string; icon: typeof Bell; className: string }> = {
  registration: { label: "Registration", icon: Users, className: "bg-emerald-500/15 text-emerald-700" },
  organizer: { label: "Organizer Signup", icon: UserPlus, className: "bg-blue-500/15 text-blue-700" },
  payout: { label: "Payout Request", icon: DollarSign, className: "bg-amber-500/15 text-amber-700" },
  sponsor: { label: "Sponsor Registration", icon: Handshake, className: "bg-purple-500/15 text-purple-700" },
  manual_entry: { label: "Manual Entry", icon: Banknote, className: "bg-teal-500/15 text-teal-700" },
  payment_failed: { label: "Payment Failed", icon: AlertTriangle, className: "bg-destructive/15 text-destructive" },
  demo_convert: { label: "Demo Converter", icon: Sparkles, className: "bg-secondary/20 text-foreground" },
};

const FILTERS = ["all", ...Object.keys(TYPE_META)] as const;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

/** Lightweight unread counter for the sidebar badge. */
export function useAdminNotificationCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const { count: c } = await supabase
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    setCount(c ?? 0);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, [refresh]);

  return { count, refresh };
}

export default function AdminNotificationCenter({ onCountChange }: { onCountChange?: () => void }) {
  const [rows, setRows] = useState<AdminNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("id, type, title, message, link, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Could not load notifications", { description: error.message });
    setRows((data as AdminNotificationRow[]) || []);
    setLoading(false);
    onCountChange?.();
  }, [onCountChange]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.type === filter)),
    [rows, filter],
  );
  const visible = showAll ? filtered : filtered.slice(0, 25);
  const unread = rows.filter((r) => !r.is_read).length;

  async function setRead(id: string, is_read: boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_read } : r)));
    const { error } = await supabase.from("admin_notifications").update({ is_read }).eq("id", id);
    if (error) { toast.error("Update failed", { description: error.message }); load(); return; }
    onCountChange?.();
  }

  async function markAllRead() {
    const ids = filtered.filter((r) => !r.is_read).map((r) => r.id);
    if (ids.length === 0) { toast.info("Nothing unread"); return; }
    setRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, is_read: true } : r)));
    const { error } = await supabase.from("admin_notifications").update({ is_read: true }).in("id", ids);
    if (error) { toast.error("Update failed", { description: error.message }); load(); return; }
    toast.success(`${ids.length} marked as read`);
    onCountChange?.();
  }

  async function clearAll() {
    const scope = filter === "all" ? "all notifications" : `all ${TYPE_META[filter]?.label ?? filter} notifications`;
    if (!confirm(`Clear ${scope}? This cannot be undone.`)) return;
    const ids = filtered.map((r) => r.id);
    if (ids.length === 0) return;
    const { error } = await supabase.from("admin_notifications").delete().in("id", ids);
    if (error) { toast.error("Clear failed", { description: error.message }); return; }
    toast.success("Notifications cleared");
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
            {unread > 0 && <Badge className="ml-1">{unread} unread</Badge>}
          </CardTitle>
          <CardDescription>
            All platform activity in one place. These stay inside the dashboard — no emails are sent.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={markAllRead} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold">
            <CheckCheck className="h-4 w-4 mr-1" /> Mark All Read
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <Select value={filter} onValueChange={(v) => { setFilter(v); setShowAll(false); }}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => (
                <SelectItem key={f} value={f}>{f === "all" ? "All" : TYPE_META[f].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "notification" : "notifications"}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No notifications here yet.</div>
        ) : (
          <div className="space-y-2">
            {visible.map((n) => {
              const meta = TYPE_META[n.type] ?? { label: n.type, icon: Bell, className: "bg-muted text-foreground" };
              const Icon = meta.icon;
              return (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 flex items-start gap-3 ${n.is_read ? "border-border bg-card" : "border-secondary/40 bg-secondary/5"}`}
                >
                  <div className={`rounded-md p-2 ${meta.className}`}><Icon className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{n.title || meta.label}</span>
                      <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                      <Badge variant={n.is_read ? "secondary" : "default"} className="text-[10px]">
                        {n.is_read ? "Read" : "Unread"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 break-words">{n.message}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {relativeTime(n.created_at)} · {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {n.link && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={n.link}>Open</a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setRead(n.id, !n.is_read)}>
                      {n.is_read ? <><EyeOff className="h-3 w-3 mr-1" /> Unread</> : <><Eye className="h-3 w-3 mr-1" /> Read</>}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {filtered.length > visible.length && (
            <Button variant="outline" onClick={() => setShowAll(true)}>View All ({filtered.length})</Button>
          )}
          <Button variant="outline" onClick={markAllRead}><CheckCheck className="h-4 w-4 mr-1" /> Mark All Read</Button>
          <Button variant="ghost" className="text-destructive" onClick={clearAll}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
