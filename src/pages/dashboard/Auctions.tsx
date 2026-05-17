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
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Eye, Gavel, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { TabTitleInput } from "@/components/dashboard/TabTitleInput";

interface AuctionRow {
  id: string;
  item_name: string;
  description: string | null;
  images: string[];
  starting_bid_cents: number;
  current_bid_cents: number | null;
  minimum_increment_cents: number;
  buy_now_cents: number | null;
  start_time: string | null;
  end_time: string | null;
  auto_extend_minutes: number;
  status: string;
  winning_bidder_name: string | null;
  winning_bid_amount_cents: number | null;
}

const emptyForm = {
  item_name: "", description: "", images: [] as string[],
  starting_bid: "", minimum_increment: "1.00", buy_now: "",
  start_time: "", end_time: "", auto_extend_minutes: "5", auto_extend_enabled: true,
};

function fmtMoney(cents: number | null) {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}
function timeLeft(end: string | null) {
  if (!end) return "—";
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

export default function Auctions() {
  const { org, loading } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const qc = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AuctionRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [viewBids, setViewBids] = useState<AuctionRow | null>(null);

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      return data || [];
    },
    enabled: !!org,
  });

  const { data: auctions } = useQuery({
    queryKey: ["auctions", selectedTournament],
    queryFn: async () => {
      const { data } = await supabase
        .from("auctions")
        .select("*")
        .eq("tournament_id", selectedTournament)
        .order("created_at", { ascending: false });
      return (data || []) as AuctionRow[];
    },
    enabled: !!selectedTournament,
    refetchInterval: 30_000,
  });

  const { data: bids } = useQuery({
    queryKey: ["auction-bids-v2", viewBids?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("auction_bids")
        .select("*")
        .eq("auction_id", viewBids!.id)
        .order("bid_amount_cents", { ascending: false });
      return data || [];
    },
    enabled: !!viewBids,
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: AuctionRow) => {
    setEditing(a);
    setForm({
      item_name: a.item_name,
      description: a.description || "",
      images: a.images || [],
      starting_bid: ((a.starting_bid_cents || 0) / 100).toString(),
      minimum_increment: ((a.minimum_increment_cents || 100) / 100).toString(),
      buy_now: a.buy_now_cents ? (a.buy_now_cents / 100).toString() : "",
      start_time: a.start_time ? a.start_time.slice(0, 16) : "",
      end_time: a.end_time ? a.end_time.slice(0, 16) : "",
      auto_extend_minutes: String(a.auto_extend_minutes || 5),
      auto_extend_enabled: (a.auto_extend_minutes || 0) > 0,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (demoGuard()) throw new Error("Demo mode");
      if (!form.item_name.trim()) throw new Error("Item name is required");
      if (form.images.length > 5) throw new Error("Max 5 images");
      const payload: any = {
        tournament_id: selectedTournament,
        item_name: form.item_name.trim(),
        description: form.description || null,
        images: form.images,
        starting_bid_cents: Math.round((parseFloat(form.starting_bid) || 0) * 100),
        minimum_increment_cents: Math.round((parseFloat(form.minimum_increment) || 1) * 100),
        buy_now_cents: form.buy_now ? Math.round(parseFloat(form.buy_now) * 100) : null,
        start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        auto_extend_minutes: form.auto_extend_enabled ? (parseInt(form.auto_extend_minutes) || 5) : 0,
      };
      if (editing) {
        const { error } = await supabase.from("auctions").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("auctions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Auction updated" : "Auction added" });
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["auctions"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (demoGuard()) throw new Error("Demo mode");
      const { error } = await supabase.from("auctions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auctions"] });
      toast({ title: "Auction removed" });
    },
  });

  const endNowMutation = useMutation({
    mutationFn: async (id: string) => {
      if (demoGuard()) throw new Error("Demo mode");
      const { error } = await supabase
        .from("auctions")
        .update({ end_time: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auctions"] });
      toast({ title: "Auction ending — winner will be processed shortly" });
    },
  });

  const handleImageUpload = async (file: File) => {
    if (!file || form.images.length >= 5) return;
    const path = `auctions/${selectedTournament}/${Date.now()}-${file.name}`;
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
            <Gavel className="h-6 w-6" /> Auctions
          </h1>
          <p className="text-muted-foreground">Silent auction items with countdowns, bidding, and buy-now.</p>
        </div>
        {selectedTournament && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit Auction Item" : "Add Auction Item"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Item Name</Label>
                  <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div>
                  <Label>Images ({form.images.length}/5)</Label>
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
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Starting Bid ($)</Label>
                    <Input type="number" step="0.01" value={form.starting_bid} onChange={(e) => setForm({ ...form, starting_bid: e.target.value })} /></div>
                  <div><Label>Min Increment ($)</Label>
                    <Input type="number" step="0.01" value={form.minimum_increment} onChange={(e) => setForm({ ...form, minimum_increment: e.target.value })} /></div>
                  <div><Label>Buy Now ($)</Label>
                    <Input type="number" step="0.01" value={form.buy_now} onChange={(e) => setForm({ ...form, buy_now: e.target.value })} placeholder="Optional" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Time</Label>
                    <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div><Label>End Time</Label>
                    <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <Label>Auto-extend on last-minute bids</Label>
                    <p className="text-xs text-muted-foreground">If a bid is placed in the last minute, extend the end time.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.auto_extend_enabled} onCheckedChange={(v) => setForm({ ...form, auto_extend_enabled: v })} />
                    {form.auto_extend_enabled && (
                      <Input type="number" className="w-20" value={form.auto_extend_minutes}
                        onChange={(e) => setForm({ ...form, auto_extend_minutes: e.target.value })} />
                    )}
                    {form.auto_extend_enabled && <span className="text-sm">min</span>}
                  </div>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
                  {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Add Item"}
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
            <SelectContent>
              {tournaments?.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedTournament && (
          <TabTitleInput tournamentId={selectedTournament} field="auction_tab_title" defaultValue="Auction" label="Auction section title (public page)" />
        )}
      </div>

      {selectedTournament && (
        <div className="grid gap-4 lg:grid-cols-2">
          {auctions?.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{a.item_name}</CardTitle>
                    {a.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.description}</p>}
                  </div>
                  <Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {a.images?.[0] && <img src={a.images[0]} alt="" className="w-full h-32 object-cover rounded" />}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Current bid: </span><strong>{fmtMoney(a.current_bid_cents)}</strong></div>
                  <div><span className="text-muted-foreground">Time left: </span><strong>{timeLeft(a.end_time)}</strong></div>
                  <div><span className="text-muted-foreground">Starting: </span>{fmtMoney(a.starting_bid_cents)}</div>
                  {a.buy_now_cents && <div><span className="text-muted-foreground">Buy now: </span>{fmtMoney(a.buy_now_cents)}</div>}
                </div>
                {a.winning_bidder_name && (
                  <Badge variant="outline">Winner: {a.winning_bidder_name} — {fmtMoney(a.winning_bid_amount_cents)}</Badge>
                )}
                <div className="flex gap-2 pt-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => openEdit(a)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => setViewBids(a)}>
                    <Eye className="mr-1 h-3 w-3" /> Bids
                  </Button>
                  {a.status === "active" && a.end_time && (
                    <Button variant="outline" size="sm" onClick={() => endNowMutation.mutate(a.id)}>End now</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => confirm("Delete this auction?") && deleteMutation.mutate(a.id)}
                    className="text-destructive ml-auto">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {auctions?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No auction items yet. Click "Add Item" to start.
            </div>
          )}
        </div>
      )}

      {viewBids && (
        <Dialog open={!!viewBids} onOpenChange={() => setViewBids(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Bids — {viewBids.item_name}</DialogTitle></DialogHeader>
            {bids && bids.length > 0 ? (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Bidder</TableHead><TableHead>Email</TableHead>
                  <TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Time</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bids.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.bidder_name}</TableCell>
                      <TableCell className="text-xs">{b.bidder_email}</TableCell>
                      <TableCell className="font-bold">${(b.bid_amount_cents / 100).toFixed(2)}</TableCell>
                      <TableCell>{b.verified ? <Badge>Verified</Badge> : <Badge variant="outline">Pending</Badge>}</TableCell>
                      <TableCell className="text-xs">{new Date(b.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">No bids yet.</p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
