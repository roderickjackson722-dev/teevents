import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Gavel, Ticket, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCents, formatMoney } from "@/lib/formatCurrency";

interface AuctionRow {
  id: string; item_name: string; description: string | null; images: string[];
  starting_bid_cents: number; current_bid_cents: number | null; minimum_increment_cents: number;
  buy_now_cents: number | null; end_time: string | null; status: string;
  winning_bidder_name: string | null; winning_bid_amount_cents: number | null;
}
interface RaffleRow {
  id: string; item_name: string; description: string | null; images: string[];
  ticket_price_cents: number; max_tickets: number | null; tickets_sold: number;
  draw_time: string | null; status: string; winner_name: string | null;
}

function money(c: number | null | undefined) { return `${formatCents((c ?? 0))}`; }

function Countdown({ to }: { to: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  if (!to) return <span className="text-xs text-gray-500">No end time</span>;
  const diff = new Date(to).getTime() - now;
  if (diff <= 0) return <span className="text-xs font-semibold text-red-600">Ended</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return <span className="font-mono text-sm font-semibold">{d > 0 ? `${d}d ` : ""}{h}h {m}m {s}s</span>;
}

export function PublicAuctionsRaffles({
  tournamentId, tournamentSlug, primary, secondary,
  auctionTitle = "Auction", raffleTitle = "Raffle",
}: {
  tournamentId: string; tournamentSlug: string;
  primary: string; secondary: string;
  auctionTitle?: string; raffleTitle?: string;
}) {
  const [auctions, setAuctions] = useState<AuctionRow[]>([]);
  const [raffles, setRaffles] = useState<RaffleRow[]>([]);
  const [bidOpen, setBidOpen] = useState<AuctionRow | null>(null);
  const [raffleOpen, setRaffleOpen] = useState<RaffleRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", amount: "", quantity: "1" });
  const [loading, setLoading] = useState<string | null>(null);

  const reload = async () => {
    // Use SECURITY DEFINER RPCs so that the public can read auctions/raffles
    // without being granted direct SELECT on the underlying tables (which
    // contain winner email PII that is intentionally hidden from the public).
    const [{ data: a }, { data: r }] = await Promise.all([
      (supabase as any).rpc("get_public_auctions", { _tournament_id: tournamentId }),
      (supabase as any).rpc("get_public_raffles", { _tournament_id: tournamentId }),
    ]);
    setAuctions((a as AuctionRow[]) || []);
    setRaffles((r as RaffleRow[]) || []);
  };
  useEffect(() => { reload(); const i = setInterval(reload, 30_000); return () => clearInterval(i); }, [tournamentId]);

  const minBid = useMemo(() => {
    if (!bidOpen) return 0;
    const cur = bidOpen.current_bid_cents ?? bidOpen.starting_bid_cents;
    return (cur + (bidOpen.minimum_increment_cents || 100)) / 100;
  }, [bidOpen]);

  const submitBid = async () => {
    if (!bidOpen) return;
    setLoading("bid");
    try {
      const { data, error } = await supabase.functions.invoke("place-auction-bid", {
        body: {
          auction_id: bidOpen.id,
          bidder_name: form.name,
          bidder_email: form.email,
          bidder_phone: form.phone || null,
          bid_amount_cents: Math.round(parseFloat(form.amount) * 100),
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast({ title: "Check your email", description: "Confirm your bid via the link we just sent." });
      setBidOpen(null);
      setForm({ name: "", email: "", phone: "", amount: "", quantity: "1" });
    } catch (e) {
      toast({ title: "Bid failed", description: (e as Error).message, variant: "destructive" });
    } finally { setLoading(null); }
  };

  const buyNow = async (a: AuctionRow) => {
    const email = window.prompt("Email for receipt:");
    if (!email) return;
    const name = window.prompt("Your name:") || "";
    setLoading(`bn-${a.id}`);
    try {
      const { data, error } = await supabase.functions.invoke("create-auction-buy-now", {
        body: { auction_id: a.id, buyer_name: name, buyer_email: email, tournament_slug: tournamentSlug },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      if ((data as any)?.url) window.location.href = (data as any).url;
    } catch (e) {
      toast({ title: "Buy Now failed", description: (e as Error).message, variant: "destructive" });
    } finally { setLoading(null); }
  };

  const buyRaffle = async () => {
    if (!raffleOpen) return;
    setLoading("raffle");
    try {
      const { data, error } = await supabase.functions.invoke("create-raffle-checkout", {
        body: {
          raffle_id: raffleOpen.id,
          buyer_name: form.name,
          buyer_email: form.email,
          buyer_phone: form.phone || null,
          quantity: Math.max(1, parseInt(form.quantity) || 1),
          tournament_slug: tournamentSlug,
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      if ((data as any)?.url) window.location.href = (data as any).url;
    } catch (e) {
      toast({ title: "Checkout failed", description: (e as Error).message, variant: "destructive" });
    } finally { setLoading(null); }
  };

  if (auctions.length === 0 && raffles.length === 0) return null;

  return (
    <>
      {auctions.length > 0 && (
        <section id="auctions" className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>{auctionTitle.toUpperCase()}</h2>
            <div className="w-16 h-0.5 mx-auto mb-8" style={{ backgroundColor: secondary }} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctions.map((a) => {
                const ended = a.status !== "active" || (a.end_time && new Date(a.end_time).getTime() <= Date.now());
                const current = a.current_bid_cents ?? a.starting_bid_cents;
                return (
                  <div key={a.id} className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: "#e5e5e5" }}>
                    {a.images?.[0] && <img src={a.images[0]} alt={a.item_name} className="w-full aspect-video object-cover rounded-lg" />}
                    {a.images && a.images.length > 1 && (
                      <div className="flex gap-1 overflow-x-auto">
                        {a.images.slice(1, 5).map((u, i) => <img key={i} src={u} alt="" className="w-12 h-12 object-cover rounded" />)}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Gavel className="h-4 w-4" style={{ color: secondary }} />
                      <h3 className="font-display font-bold" style={{ color: "#1a1a1a" }}>{a.item_name}</h3>
                    </div>
                    {a.description && <p className="text-sm text-gray-600">{a.description}</p>}
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-xs text-gray-500">Current bid</div>
                        <div className="font-bold text-lg" style={{ color: primary }}>{money(current)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Time left</div>
                        <Countdown to={a.end_time} />
                      </div>
                    </div>
                    {ended ? (
                      a.winning_bidder_name ? (
                        <div className="text-sm text-center bg-gray-50 rounded p-2">
                          <strong>Winner:</strong> {a.winning_bidder_name} — {money(a.winning_bid_amount_cents)}
                        </div>
                      ) : <div className="text-sm text-center text-gray-500">Auction ended</div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1"
                          onClick={() => { setForm({ ...form, amount: ((current + a.minimum_increment_cents) / 100).toFixed(2) }); setBidOpen(a); }}>
                          Place Bid
                        </Button>
                        {a.buy_now_cents && a.buy_now_cents > 0 && (
                          <Button size="sm" onClick={() => buyNow(a)} disabled={loading === `bn-${a.id}`}
                            style={{ backgroundColor: secondary, color: primary }}>
                            {loading === `bn-${a.id}` && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            Buy {money(a.buy_now_cents)}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {raffles.length > 0 && (
        <section id="raffles" className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-display font-bold text-center mb-2" style={{ color: "#1a1a1a" }}>{raffleTitle.toUpperCase()}</h2>
            <div className="w-16 h-0.5 mx-auto mb-8" style={{ backgroundColor: secondary }} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {raffles.map((r) => {
                const remaining = r.max_tickets ? Math.max(0, r.max_tickets - r.tickets_sold) : null;
                const ended = r.status !== "active";
                return (
                  <div key={r.id} className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: "#e5e5e5" }}>
                    {r.images?.[0] && <img src={r.images[0]} alt={r.item_name} className="w-full aspect-video object-cover rounded-lg" />}
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" style={{ color: secondary }} />
                      <h3 className="font-display font-bold" style={{ color: "#1a1a1a" }}>{r.item_name}</h3>
                    </div>
                    {r.description && <p className="text-sm text-gray-600">{r.description}</p>}
                    <div className="flex items-baseline justify-between text-sm">
                      <div><span className="text-gray-500">Ticket: </span><strong>{money(r.ticket_price_cents)}</strong></div>
                      {remaining !== null && <div><span className="text-gray-500">Left: </span><strong>{remaining}</strong></div>}
                    </div>
                    {r.draw_time && (
                      <div className="text-xs text-gray-500">
                        Draw: <Countdown to={r.draw_time} />
                      </div>
                    )}
                    {ended ? (
                      r.winner_name ? (
                        <div className="text-sm text-center bg-gray-50 rounded p-2"><strong>Winner:</strong> {r.winner_name}</div>
                      ) : <div className="text-sm text-center text-gray-500">Drawing complete</div>
                    ) : (
                      <Button size="sm" className="w-full"
                        onClick={() => { setForm({ name: "", email: "", phone: "", amount: "", quantity: "1" }); setRaffleOpen(r); }}
                        disabled={remaining === 0}
                        style={{ backgroundColor: primary, color: "white" }}>
                        {remaining === 0 ? "Sold out" : "Buy Tickets"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Dialog open={!!bidOpen} onOpenChange={(o) => !o && setBidOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Place Bid — {bidOpen?.item_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Minimum bid: <strong>{formatMoney(minBid)}</strong>. We'll email you a link to confirm.</p>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone (optional)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Bid amount ($)</Label><Input type="number" step="0.01" min={minBid} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBidOpen(null)}>Cancel</Button>
            <Button onClick={submitBid} disabled={loading === "bid" || !form.name || !form.email || !form.amount}>
              {loading === "bid" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Submit Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!raffleOpen} onOpenChange={(o) => !o && setRaffleOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Buy Tickets — {raffleOpen?.item_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{money(raffleOpen?.ticket_price_cents)} per ticket. You'll pay via Stripe Checkout.</p>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone (optional)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Number of tickets</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRaffleOpen(null)}>Cancel</Button>
            <Button onClick={buyRaffle} disabled={loading === "raffle" || !form.name || !form.email}>
              {loading === "raffle" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Continue to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
