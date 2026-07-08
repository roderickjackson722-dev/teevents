import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Ticket, DollarSign, Users, Clock } from "lucide-react";
import { formatTournamentDate } from "@/lib/formatDate";

type Purchase = {
  id: string;
  buyer_name: string | null;
  buyer_email: string;
  quantity: number;
  total_cents: number;
  payment_status: string;
  created_at: string;
  tier_id: string;
  buyer_answers: Record<string, string> | null;
};

type Tier = { id: string; tier_name: string; price_cents: number; max_quantity: number | null; sold_quantity: number };

interface Props {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

const EventSalesDialog = ({ eventId, eventTitle, onClose }: Props) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [pRes, tRes] = await Promise.all([
        (supabase as any)
          .from("event_ticket_purchases")
          .select("id, buyer_name, buyer_email, quantity, total_cents, payment_status, created_at, tier_id, buyer_answers")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false }),
        supabase
          .from("event_ticket_tiers")
          .select("id, tier_name, price_cents, max_quantity, sold_quantity")
          .eq("event_id", eventId),
      ]);
      setPurchases((pRes.data as Purchase[]) || []);
      setTiers((tRes.data as Tier[]) || []);
      setLoading(false);
    })();
  }, [eventId]);

  const paid = purchases.filter((p) => p.payment_status === "paid");
  const pending = purchases.filter((p) => p.payment_status === "pending");
  const totalRevenue = paid.reduce((a, p) => a + p.total_cents, 0);
  const totalTicketsSold = paid.reduce((a, p) => a + p.quantity, 0);
  const totalReserved = pending.reduce((a, p) => a + p.quantity, 0);
  const tierMap = new Map(tiers.map((t) => [t.id, t]));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sales — {eventTitle}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card className="p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Revenue (paid)</div>
                <div className="text-xl font-bold">${(totalRevenue / 100).toFixed(2)}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Ticket className="h-3 w-3" /> Tickets sold</div>
                <div className="text-xl font-bold">{totalTicketsSold}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Reserved (pending)</div>
                <div className="text-xl font-bold">{totalReserved}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Buyers</div>
                <div className="text-xl font-bold">{new Set(paid.map((p) => p.buyer_email)).size}</div>
              </Card>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">By tier</h3>
              <div className="space-y-1">
                {tiers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm bg-muted/30 rounded px-3 py-2">
                    <span className="font-medium">{t.tier_name}</span>
                    <span className="text-muted-foreground">
                      {t.sold_quantity} sold{t.max_quantity != null ? ` / ${t.max_quantity}` : ""} · ${(t.price_cents / 100).toFixed(2)} each
                    </span>
                  </div>
                ))}
                {tiers.length === 0 && <p className="text-sm text-muted-foreground">No tiers.</p>}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">All purchases ({purchases.length})</h3>
              {purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No purchases yet.</p>
              ) : (
                <div className="space-y-2">
                  {purchases.map((p) => {
                    const tier = tierMap.get(p.tier_id);
                    const answers = p.buyer_answers && Object.keys(p.buyer_answers).length > 0 ? p.buyer_answers : null;
                    return (
                      <div key={p.id} className="border border-border rounded p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">{p.buyer_name || "—"} <span className="text-muted-foreground font-normal">· {p.buyer_email}</span></div>
                            <div className="text-xs text-muted-foreground">
                              {formatTournamentDate(p.created_at)} · {tier?.tier_name || "Tier"} · Qty {p.quantity} · ${(p.total_cents / 100).toFixed(2)}
                            </div>
                          </div>
                          <Badge variant={p.payment_status === "paid" ? "default" : p.payment_status === "pending" ? "secondary" : "destructive"}>
                            {p.payment_status}
                          </Badge>
                        </div>
                        {answers && (
                          <div className="mt-2 pt-2 border-t border-border/50 text-xs space-y-0.5">
                            {Object.entries(answers).map(([k, v]) => (
                              <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EventSalesDialog;
