import { useState } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Gavel, Ticket, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Auction() {
  const { org, loading: orgLoading } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewBidsItem, setViewBidsItem] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", type: "auction", starting_bid: "0", buy_now_price: "", raffle_ticket_price: "",
  });

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data } = await supabase.from("tournaments").select("id, title").eq("organization_id", org!.orgId).order("date", { ascending: false });
      return data || [];
    },
    enabled: !!org,
  });

  const { data: items } = useQuery({
    queryKey: ["auction-items", selectedTournament],
    queryFn: async () => {
      const { data } = await supabase.from("tournament_auction_items").select("*").eq("tournament_id", selectedTournament).order("sort_order");
      return data || [];
    },
    enabled: !!selectedTournament,
  });

  const { data: bids } = useQuery({
    queryKey: ["auction-bids", viewBidsItem],
    queryFn: async () => {
      const { data } = await supabase.from("tournament_auction_bids").select("*").eq("item_id", viewBidsItem!).order("amount", { ascending: false });
      return data || [];
    },
    enabled: !!viewBidsItem,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (demoGuard()) throw new Error("Demo mode");
      const { error } = await supabase.from("tournament_auction_items").insert({
        tournament_id: selectedTournament,
        title: form.title,
        description: form.description || null,
        type: form.type,
        starting_bid: parseFloat(form.starting_bid) || 0,
        buy_now_price: form.buy_now_price ? parseFloat(form.buy_now_price) : null,
        raffle_ticket_price: form.raffle_ticket_price ? parseFloat(form.raffle_ticket_price) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Item added!" });
      setDialogOpen(false);
      setForm({ title: "", description: "", type: "auction", starting_bid: "0", buy_now_price: "", raffle_ticket_price: "" });
      queryClient.invalidateQueries({ queryKey: ["auction-items"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tournament_auction_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction-items"] });
      toast({ title: "Item removed" });
    },
  });

  if (orgLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auction & Raffle</h1>
          <p className="text-muted-foreground">Manage auction items and raffle prizes.</p>
        </div>
        {selectedTournament && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Auction/Raffle Item</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Golf bag, Wine basket..." />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auction">Auction</SelectItem>
                      <SelectItem value="raffle">Raffle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.type === "auction" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Starting Bid ($)</Label>
                      <Input type="number" value={form.starting_bid} onChange={(e) => setForm({ ...form, starting_bid: e.target.value })} />
                    </div>
                    <div>
                      <Label>Buy Now Price ($)</Label>
                      <Input type="number" value={form.buy_now_price} onChange={(e) => setForm({ ...form, buy_now_price: e.target.value })} placeholder="Optional" />
                    </div>
                  </div>
                )}
                {form.type === "raffle" && (
                  <div>
                    <Label>Ticket Price ($)</Label>
                    <Input type="number" value={form.raffle_ticket_price} onChange={(e) => setForm({ ...form, raffle_ticket_price: e.target.value })} />
                  </div>
                )}
                <Button onClick={() => addMutation.mutate()} disabled={!form.title || addMutation.isPending} className="w-full">
                  {addMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Select value={selectedTournament} onValueChange={setSelectedTournament}>
        <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select a tournament" /></SelectTrigger>
        <SelectContent>
          {tournaments?.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
        </SelectContent>
      </Select>

      {selectedTournament && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items?.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {item.type === "auction" ? <Gavel className="h-4 w-4 text-primary" /> : <Ticket className="h-4 w-4 text-primary" />}
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </div>
                  <Badge variant={item.type === "auction" ? "default" : "secondary"}>{item.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                {item.type === "auction" && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Current bid: </span>
                    <span className="font-bold">${Number(item.current_bid).toFixed(2)}</span>
                    {item.buy_now_price && <span className="text-muted-foreground ml-2">(Buy now: ${Number(item.buy_now_price).toFixed(2)})</span>}
                  </div>
                )}
                {item.type === "raffle" && item.raffle_ticket_price && (
                  <p className="text-sm"><span className="text-muted-foreground">Ticket: </span><span className="font-bold">${Number(item.raffle_ticket_price).toFixed(2)}</span></p>
                )}
                {item.winner_name && (
                  <Badge variant="outline" className="text-xs">Winner: {item.winner_name}</Badge>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setViewBidsItem(item.id)}>
                    <Eye className="mr-1 h-3 w-3" /> Bids
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)} className="text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {items?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No auction or raffle items yet. Add one to get started.
            </div>
          )}
        </div>
      )}

      {viewBidsItem && (
        <Dialog open={!!viewBidsItem} onOpenChange={() => setViewBidsItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Bids</DialogTitle></DialogHeader>
            {bids && bids.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bidder</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bids.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.bidder_name}</TableCell>
                      <TableCell className="font-bold">${Number(b.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(b.created_at).toLocaleString()}
                      </TableCell>
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
