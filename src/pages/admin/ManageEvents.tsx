import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Trash2, Calendar, MapPin, Ticket, ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatTournamentDate } from "@/lib/formatDate";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import EventEditorModal from "@/components/admin/EventEditorModal";

type Tier = { id: string; price_cents: number; max_quantity: number | null; sold_quantity: number };
type EventRow = {
  id: string;
  event_title: string;
  event_slug: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  status: string;
  hero_image_url: string | null;
  event_ticket_tiers: Tier[];
};

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "published") return "default";
  if (s === "sold_out") return "destructive";
  if (s === "archived") return "outline";
  return "secondary";
};

const priceRange = (tiers: Tier[]) => {
  if (!tiers.length) return "No tickets";
  const prices = tiers.map((t) => t.price_cents);
  const min = Math.min(...prices) / 100;
  const max = Math.max(...prices) / 100;
  return min === max ? `$${min.toFixed(0)}` : `$${min.toFixed(0)} – $${max.toFixed(0)}`;
};

const soldSummary = (tiers: Tier[]) => {
  const sold = tiers.reduce((a, t) => a + (t.sold_quantity || 0), 0);
  const cap = tiers.reduce((a, t) => a + (t.max_quantity ?? 0), 0);
  const anyUnlimited = tiers.some((t) => t.max_quantity == null);
  if (anyUnlimited || cap === 0) return `${sold} sold`;
  return `${sold} sold / ${cap} available`;
};

const ManageEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("public_events")
      .select("id, event_title, event_slug, event_date, event_time, location, status, hero_image_url, event_ticket_tiers(id, price_cents, max_quantity, sold_quantity)")
      .order("event_date", { ascending: false });
    setEvents((data as EventRow[]) || []);
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

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("public_events").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Event deleted");
    load();
  };

  if (isAdmin === null) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate("/admin")} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Admin Dashboard
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Manage Events</h1>
            <p className="text-sm text-muted-foreground">TeeVents Managed Events — public ticketed events</p>
          </div>
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> Add Event</Button>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-16">Loading events...</p>
        ) : events.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No events yet. Click "Add Event" to create your first one.</Card>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-lg">{e.event_title}</h3>
                      <Badge variant={statusVariant(e.status)}>{e.status.replace("_", " ")}</Badge>
                      {e.status === "published" && (
                        <a href={`/events/${e.event_slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary hover:underline inline-flex items-center gap-0.5">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatTournamentDate(e.event_date)}{e.event_time && ` · ${e.event_time.slice(0, 5)}`}</span>
                      {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</span>}
                      <span className="inline-flex items-center gap-1"><Ticket className="h-3.5 w-3.5" /> {priceRange(e.event_ticket_tiers)} · {soldSummary(e.event_ticket_tiers)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(e)}><Edit className="h-4 w-4 mr-1" /> Edit</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{e.event_title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes the event and all ticket tiers. Purchase records are preserved for accounting.
                            <br /><br />
                            Type <strong>DELETE</strong> to confirm:
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input value={deleteConfirm[e.id] || ""} onChange={(ev) => setDeleteConfirm((p) => ({ ...p, [e.id]: ev.target.value }))} placeholder="DELETE" />
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction disabled={deleteConfirm[e.id] !== "DELETE"} onClick={() => handleDelete(e.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <EventEditorModal
          event={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

export default ManageEvents;
