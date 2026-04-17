import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock, Users, Download, Loader2, Send, Trash2, Plus, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface WaitlistEntry {
  id: string;
  user_name: string;
  user_email: string;
  phone: string | null;
  group_size: number;
  position: number;
  deposit_paid: boolean;
  deposit_amount: number;
  status: string;
  offer_expires_at: string | null;
  created_at: string;
  notes?: string | null;
}

interface Tournament {
  id: string;
  title: string;
  waitlist_enabled: boolean;
  waitlist_deposit_cents: number;
  max_players: number | null;
}

export default function WaitlistManagement() {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
  const [form, setForm] = useState({ user_name: "", user_email: "", phone: "", group_size: 1, notes: "" });
  const [saving, setSaving] = useState(false);

  const resetForm = () => setForm({ user_name: "", user_email: "", phone: "", group_size: 1, notes: "" });
  const openAdd = () => { resetForm(); setEditingEntry(null); setAddOpen(true); };
  const openEdit = (e: WaitlistEntry) => {
    setEditingEntry(e);
    setForm({
      user_name: e.user_name, user_email: e.user_email, phone: e.phone || "",
      group_size: e.group_size || 1, notes: e.notes || "",
    });
    setAddOpen(true);
  };
  const saveEntry = async () => {
    if (demoGuard()) return;
    if (!form.user_name.trim() || !form.user_email.trim()) {
      toast({ title: "Name and email required", variant: "destructive" }); return;
    }
    setSaving(true);
    if (editingEntry) {
      const { error } = await supabase.from("tournament_waitlist").update({
        user_name: form.user_name, user_email: form.user_email,
        phone: form.phone || null, group_size: form.group_size, notes: form.notes || null,
      }).eq("id", editingEntry.id);
      setSaving(false);
      if (error) { toast({ title: "Error updating", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Entry updated" });
    } else {
      const { error } = await supabase.from("tournament_waitlist").insert({
        tournament_id: selectedTournament,
        user_name: form.user_name, user_email: form.user_email,
        phone: form.phone || null, group_size: form.group_size, notes: form.notes || null,
        status: "waiting", position: 0,
      });
      setSaving(false);
      if (error) { toast({ title: "Error adding player", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Player added to waitlist" });
    }
    setAddOpen(false); resetForm(); setEditingEntry(null);
    await loadEntries();
  };

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, waitlist_enabled, waitlist_deposit_cents, max_players")
      .eq("organization_id", org.orgId)
      .order("date", { ascending: false })
      .then(({ data }) => {
        const list = (data || []) as Tournament[];
        setTournaments(list);
        if (list.length > 0) setSelectedTournament(list[0].id);
        setLoading(false);
      });
  }, [org]);

  useEffect(() => {
    if (!selectedTournament) return;
    loadEntries();

    // Realtime subscription
    const channel = supabase
      .channel(`waitlist-${selectedTournament}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tournament_waitlist",
        filter: `tournament_id=eq.${selectedTournament}`,
      }, () => loadEntries())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTournament]);

  const loadEntries = async () => {
    const { data } = await supabase
      .from("tournament_waitlist")
      .select("*")
      .eq("tournament_id", selectedTournament)
      .order("position");
    setEntries((data as WaitlistEntry[]) || []);
  };

  const selectedT = tournaments.find((t) => t.id === selectedTournament);

  const toggleWaitlist = async (enabled: boolean) => {
    if (demoGuard()) return;
    await supabase.from("tournaments").update({ waitlist_enabled: enabled }).eq("id", selectedTournament);
    setTournaments((prev) => prev.map((t) => t.id === selectedTournament ? { ...t, waitlist_enabled: enabled } : t));
    toast({ title: enabled ? "Waitlist enabled" : "Waitlist disabled" });
  };

  const offerSpot = async (entryId: string) => {
    if (demoGuard()) return;
    setActionLoading(entryId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("tournament_waitlist").update({
      status: "offered",
      offer_expires_at: expiresAt,
    }).eq("id", entryId);

    // Send notification email via edge function
    const entry = entries.find((e) => e.id === entryId);
    if (entry && selectedT) {
      await supabase.functions.invoke("notify-waitlist-offer", {
        body: {
          email: entry.user_email,
          name: entry.user_name,
          tournament_title: selectedT.title,
          tournament_id: selectedT.id,
          waitlist_id: entryId,
        },
      }).catch(() => {});
    }

    await loadEntries();
    setActionLoading(null);
    toast({ title: "Spot offered", description: "The user has been notified and has 24 hours to claim." });
  };

  const removeEntry = async (entryId: string) => {
    if (demoGuard()) return;
    await supabase.from("tournament_waitlist").delete().eq("id", entryId);
    await loadEntries();
    toast({ title: "Entry removed" });
  };

  const clearExpired = async () => {
    if (demoGuard()) return;
    const now = new Date().toISOString();
    await supabase
      .from("tournament_waitlist")
      .update({ status: "expired" })
      .eq("tournament_id", selectedTournament)
      .eq("status", "offered")
      .lt("offer_expires_at", now);
    await loadEntries();
    toast({ title: "Expired offers cleared" });
  };

  const exportCSV = () => {
    const headers = ["Position", "Name", "Email", "Phone", "Group Size", "Status", "Deposit", "Signed Up"];
    const rows = entries.map((e) => [
      e.position.toString(),
      e.user_name,
      e.user_email,
      e.phone || "",
      e.group_size.toString(),
      e.status,
      e.deposit_paid ? `$${(e.deposit_amount / 100).toFixed(2)}` : "No",
      new Date(e.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "waitlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColors: Record<string, string> = {
    waiting: "bg-muted text-muted-foreground",
    offered: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    confirmed: "bg-primary/10 text-primary",
    expired: "bg-destructive/10 text-destructive",
  };

  if (loading) return <div className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Waitlist Management</h1>
        <p className="text-muted-foreground">Manage tournament waitlists and offer spots to waiting players.</p>
      </div>

      <div className="flex items-center gap-4">
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a tournament" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedT && (
        <>
          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Waitlist Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable Waitlist</Label>
                  <p className="text-xs text-muted-foreground">
                    Show "Join Waitlist" when tournament is full ({selectedT.max_players || "∞"} max players)
                  </p>
                </div>
                <Switch
                  checked={selectedT.waitlist_enabled}
                  onCheckedChange={toggleWaitlist}
                />
              </div>
            </CardContent>
          </Card>

          {/* Waitlist Entries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Waitlist
                    <Badge variant="secondary">{entries.filter((e) => e.status === "waiting").length} waiting</Badge>
                  </CardTitle>
                  <CardDescription>
                    {entries.filter((e) => e.status === "offered").length} offers pending
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearExpired}>
                    Clear Expired
                  </Button>
                  {entries.length > 0 && (
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                      <Download className="h-4 w-4 mr-1.5" /> CSV
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No one on the waitlist yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-center">Group</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-bold">{entry.position}</TableCell>
                          <TableCell className="font-medium">{entry.user_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{entry.user_email}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{entry.group_size}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[entry.status] || ""} variant="secondary">
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {entry.offer_expires_at
                              ? new Date(entry.offer_expires_at).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {entry.status === "waiting" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => offerSpot(entry.id)}
                                  disabled={actionLoading === entry.id}
                                >
                                  {actionLoading === entry.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  Offer Spot
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove from waitlist?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will remove {entry.user_name} from the waitlist.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => removeEntry(entry.id)}>
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
