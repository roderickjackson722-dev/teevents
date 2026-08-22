import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Eye, Ticket, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { TabTitleInput } from "@/components/dashboard/TabTitleInput";

interface RaffleRow {
  id: string;
  item_name: string;
  description: string | null;
  images: string[];
  ticket_price_cents: number;
  max_tickets: number | null;
  tickets_sold: number;
  draw_time: string | null;
  winner_name: string | null;
  winner_ticket_number: number | null;
  status: string;
}
const emptyForm = {
  item_name: "", description: "", images: [] as string[],
  ticket_price: "", max_tickets: "", draw_time: "",
};
function money(c: number) { return `$${(c / 100).toFixed(2)}`; }

export default function Raffles() {
  const { org, loading } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const qc = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RaffleRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [viewTickets, setViewTickets] = useState<RaffleRow | null>(null);

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments").select("id, title")
        .eq("organization_id", org!.orgId).order("date", { ascending: false });
      return data || [];
    },
    enabled: !!org,
  });

  const { data: raffles } = useQuery({
    queryKey: ["raffles", selectedTournament],
    queryFn: async () => {
      const { data } = await supabase.from("raffles").select("*")
        .eq("tournament_id", selectedTournament).order("created_at", { ascending: false });
      return (data || []) as RaffleRow[];
    },
    enabled: !!selectedTournament,
    refetchInterval: 30_000,
  });

  const { data: tickets } = useQuery({
    queryKey: ["raffle-tickets", viewTickets?.id],
    queryFn: async () => {
      const { data } = await supabase.from("raffle_tickets").select("*")
        .eq("raffle_id", viewTickets!.id).order("ticket_number");
      return data || [];
    },
    enabled: !!viewTickets,
  });

  // Raffle tickets bought as registration add-ons
  const { data: addonBuyers } = useQuery({
    queryKey: ["raffle-addon-buyers", selectedTournament],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_registration_addon_purchases")
        .select("id, addon_name, quantity, unit_price_cents, created_at, registration:tournament_registrations!inner(first_name, last_name, email, payment_status, tournament_id)")
        .eq("registration.tournament_id", selectedTournament)
        .ilike("addon_name", "%raffle%")
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!selectedTournament,
    refetchInterval: 30_000,
  });

  const addonTicketCount = (name: string, qty: number) => {
    const m = name.match(/(\d+)/);
    return (m ? parseInt(m[1], 10) : 1) * (qty || 1);
  };
  const addonPaid = (addonBuyers || []).filter((b) => b.registration?.payment_status === "paid");
  const addonTotalTickets = addonPaid.reduce((a, b) => a + addonTicketCount(b.addon_name, b.quantity), 0);
  const addonTotalCents = addonPaid.reduce((a, b) => a + b.unit_price_cents * (b.quantity || 1), 0);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (r: RaffleRow) => {
    setEditing(r);
    setForm({
      item_name: r.item_name, description: r.description || "", images: r.images || [],
      ticket_price: (r.ticket_price_cents / 100).toString(),
      max_tickets: r.max_tickets?.toString() || "",
      draw_time: r.draw_time ? r.draw_time.slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (demoGuard()) throw new Error("Demo mode");
      if (!form.item_name.trim()) throw new Error("Item name is required");
      if (!form.ticket_price || parseFloat(form.ticket_price) <= 0) throw new Error("Ticket price required");
      const payload: any = {
        tournament_id: selectedTournament,
        item_name: form.item_name.trim(),
        description: form.description || null,
        images: form.images,
        ticket_price_cents: Math.round(parseFloat(form.ticket_price) * 100),
        max_tickets: form.max_tickets ? parseInt(form.max_tickets) : null,
        draw_time: form.draw_time ? new Date(form.draw_time).toISOString() : null,
      };
      if (editing) {
        const { error } = await supabase.from("raffles").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("raffles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast({ title: editing ? "Raffle updated" : "Raffle added" }); setDialogOpen(false); qc.invalidateQueries({ queryKey: ["raffles"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (demoGuard()) throw new Error("Demo mode");
      const { error } = await supabase.from("raffles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["raffles"] }); toast({ title: "Raffle removed" }); },
  });

  const drawMutation = useMutation({
    mutationFn: async (raffle: RaffleRow) => {
      if (demoGuard()) throw new Error("Demo mode");
      const { data: tks } = await supabase.from("raffle_tickets").select("ticket_number,buyer_name,buyer_email").eq("raffle_id", raffle.id);
      if (!tks || tks.length === 0) throw new Error("No tickets sold yet.");
      const win = tks[Math.floor(Math.random() * tks.length)];
      const { error } = await supabase.from("raffles").update({
        status: "drawn",
        winner_ticket_number: win.ticket_number,
        winner_name: win.buyer_name,
        winner_email: win.buyer_email,
        winner_notified_at: new Date().toISOString(),
      }).eq("id", raffle.id);
      if (error) throw error;
      return win;
    },
    onSuccess: (win) => { toast({ title: "Winner drawn!", description: `Ticket #${win.ticket_number} — ${win.buyer_name}` }); qc.invalidateQueries({ queryKey: ["raffles"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleImageUpload = async (file: File) => {
    if (!file || form.images.length >= 5 || !org?.orgId) return;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${org.orgId}/${selectedTournament}/raffles/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, file);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    const { data: pub } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    setForm((f) => ({ ...f, images: [...f.images, pub.publicUrl] }));
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Ticket className="h-6 w-6" /> Raffles
          </h1>
          <p className="text-muted-foreground">Sell raffle tickets and draw winners automatically.</p>
        </div>
        {selectedTournament && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Raffle</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit Raffle" : "Add Raffle"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Item Name</Label>
                  <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} /></div>
                <div><Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div><Label>Images ({form.images.length}/5)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.images.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded" />
                        <button type="button" onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {form.images.length < 5 && (
                      <label className="w-20 h-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-muted">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                      </label>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Ticket Price ($)</Label>
                    <Input type="number" step="0.01" value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: e.target.value })} /></div>
                  <div><Label>Max Tickets</Label>
                    <Input type="number" value={form.max_tickets} onChange={(e) => setForm({ ...form, max_tickets: e.target.value })} placeholder="Unlimited" /></div>
                </div>
                <div><Label>Draw Time</Label>
                  <Input type="datetime-local" value={form.draw_time} onChange={(e) => setForm({ ...form, draw_time: e.target.value })} /></div>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
                  {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Add Raffle"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Tournament</Label>
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select a tournament" /></SelectTrigger>
            <SelectContent>{tournaments?.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {selectedTournament && (
          <TabTitleInput tournamentId={selectedTournament} field="raffle_tab_title" defaultValue="Raffle" label="Raffle section title (public page)" />
        )}
      </div>

      {selectedTournament && (
        <div className="grid gap-4 lg:grid-cols-2">
          {raffles?.map((r) => {
            const pct = r.max_tickets ? Math.min(100, (r.tickets_sold / r.max_tickets) * 100) : 0;
            const collected = r.tickets_sold * r.ticket_price_cents;
            return (
              <Card key={r.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{r.item_name}</CardTitle>
                      {r.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description}</p>}
                    </div>
                    <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {r.images?.[0] && <img src={r.images[0]} alt="" className="w-full h-32 object-cover rounded" />}
                  <div className="text-sm space-y-1">
                    <div>Tickets: <strong>{money(r.ticket_price_cents)}</strong> each — {r.tickets_sold}{r.max_tickets ? ` / ${r.max_tickets}` : ""} sold — <strong>{money(collected)}</strong> collected</div>
                    {r.max_tickets && <Progress value={pct} className="h-2" />}
                    {r.draw_time && <div className="text-muted-foreground">Draw: {new Date(r.draw_time).toLocaleString()}</div>}
                  </div>
                  {r.winner_name && (
                    <Badge variant="outline">Winner: #{r.winner_ticket_number} — {r.winner_name}</Badge>
                  )}
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => setViewTickets(r)}>
                      <Eye className="mr-1 h-3 w-3" /> Tickets
                    </Button>
                    {r.status === "active" && (
                      <Button size="sm" onClick={() => confirm("Draw winner now?") && drawMutation.mutate(r)} disabled={drawMutation.isPending}>
                        Draw Winner
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => confirm("Delete raffle?") && deleteMutation.mutate(r.id)}
                      className="text-destructive ml-auto"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {raffles?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">No raffles yet. Click "Add Raffle".</div>
          )}
        </div>
      )}

      {viewTickets && (
        <Dialog open={!!viewTickets} onOpenChange={() => setViewTickets(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Tickets — {viewTickets.item_name}</DialogTitle></DialogHeader>
            {tickets && tickets.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Buyer</TableHead><TableHead>Email</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                <TableBody>
                  {tickets.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-bold">#{t.ticket_number}</TableCell>
                      <TableCell>{t.buyer_name}</TableCell>
                      <TableCell className="text-xs">{t.buyer_email}</TableCell>
                      <TableCell className="text-xs">{new Date(t.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <p className="text-center text-muted-foreground py-4">No tickets sold yet.</p>}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
