import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BedDouble, Loader2, Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";

interface RoomType {
  id: string;
  room_type: string;
  rate_cents: number | null;
  rate_note: string | null;
  max_occupancy: number | null;
  display_order: number;
  _new?: boolean;
}
interface CustomField {
  id: string;
  field_name: string;
  field_value: string;
  display_order: number;
  _new?: boolean;
}
interface Accommodation {
  id: string;
  tournament_id: string;
  hotel_name: string;
  address: string | null;
  phone: string | null;
  website_url: string | null;
  group_code: string | null;
  booking_deadline: string | null;
  notes: string | null;
  display_order: number;
  is_active: boolean;
  accommodation_room_types: RoomType[];
  accommodation_custom_fields: CustomField[];
}

interface Tournament { id: string; title: string; }

const sb = supabase as any;

const Lodging = () => {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTid, setSelectedTid] = useState<string>("");
  const [items, setItems] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Accommodation | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const t = (data as Tournament[]) || [];
        setTournaments(t);
        if (t.length > 0) setSelectedTid(pickTournamentId(t));
        if (t.length === 0) setLoading(false);
      });
  }, [org]);

  const refresh = async (tid: string) => {
    setLoading(true);
    const { data } = await sb
      .from("tournament_accommodations")
      .select("*, accommodation_room_types(*), accommodation_custom_fields(*)")
      .eq("tournament_id", tid)
      .order("display_order");
    setItems((data as Accommodation[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTid) refresh(selectedTid);
  }, [selectedTid]);

  const blankAccommodation = (): Accommodation => ({
    id: "",
    tournament_id: selectedTid,
    hotel_name: "",
    address: "",
    phone: "",
    website_url: "",
    group_code: "",
    booking_deadline: "",
    notes: "",
    display_order: items.length,
    is_active: true,
    accommodation_room_types: [],
    accommodation_custom_fields: [],
  });

  const startNew = () => setEditing(blankAccommodation());
  const startEdit = (a: Accommodation) => setEditing(JSON.parse(JSON.stringify(a)));

  const remove = async (id: string) => {
    if (demoGuard()) return;
    if (!confirm("Delete this hotel and all its rooms/fields?")) return;
    const { error } = await sb.from("tournament_accommodations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh(selectedTid);
  };

  const save = async () => {
    if (!editing) return;
    if (demoGuard()) return;
    if (!editing.hotel_name.trim()) return toast.error("Hotel name is required");
    setSaving(true);
    try {
      let accommodationId = editing.id;
      const payload = {
        tournament_id: selectedTid,
        hotel_name: editing.hotel_name.trim(),
        address: editing.address?.trim() || null,
        phone: editing.phone?.trim() || null,
        website_url: editing.website_url?.trim() || null,
        group_code: editing.group_code?.trim() || null,
        booking_deadline: editing.booking_deadline || null,
        notes: editing.notes?.trim() || null,
        display_order: editing.display_order,
        is_active: editing.is_active,
      };

      if (!accommodationId) {
        const { data, error } = await sb.from("tournament_accommodations").insert(payload).select("id").single();
        if (error) throw error;
        accommodationId = data.id;
      } else {
        const { error } = await sb.from("tournament_accommodations").update(payload).eq("id", accommodationId);
        if (error) throw error;
      }

      // Replace rooms & custom fields (simple approach: delete-and-insert)
      await sb.from("accommodation_room_types").delete().eq("accommodation_id", accommodationId);
      await sb.from("accommodation_custom_fields").delete().eq("accommodation_id", accommodationId);

      const rooms = editing.accommodation_room_types
        .filter((r) => r.room_type.trim())
        .map((r, i) => ({
          accommodation_id: accommodationId,
          room_type: r.room_type.trim(),
          rate_cents: r.rate_cents,
          rate_note: r.rate_note?.trim() || null,
          max_occupancy: r.max_occupancy,
          display_order: i,
          is_active: true,
        }));
      if (rooms.length) {
        const { error } = await sb.from("accommodation_room_types").insert(rooms);
        if (error) throw error;
      }
      const fields = editing.accommodation_custom_fields
        .filter((f) => f.field_name.trim())
        .map((f, i) => ({
          accommodation_id: accommodationId,
          field_name: f.field_name.trim(),
          field_value: f.field_value?.trim() || null,
          display_order: i,
        }));
      if (fields.length) {
        const { error } = await sb.from("accommodation_custom_fields").insert(fields);
        if (error) throw error;
      }

      toast.success("Saved");
      setEditing(null);
      refresh(selectedTid);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateRoom = (idx: number, patch: Partial<RoomType>) => {
    if (!editing) return;
    const rooms = [...editing.accommodation_room_types];
    rooms[idx] = { ...rooms[idx], ...patch };
    setEditing({ ...editing, accommodation_room_types: rooms });
  };
  const addRoom = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      accommodation_room_types: [
        ...editing.accommodation_room_types,
        { id: crypto.randomUUID(), room_type: "", rate_cents: null, rate_note: "/night", max_occupancy: null, display_order: editing.accommodation_room_types.length, _new: true },
      ],
    });
  };
  const removeRoom = (idx: number) => {
    if (!editing) return;
    const rooms = editing.accommodation_room_types.filter((_, i) => i !== idx);
    setEditing({ ...editing, accommodation_room_types: rooms });
  };

  const updateField = (idx: number, patch: Partial<CustomField>) => {
    if (!editing) return;
    const fields = [...editing.accommodation_custom_fields];
    fields[idx] = { ...fields[idx], ...patch };
    setEditing({ ...editing, accommodation_custom_fields: fields });
  };
  const addField = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      accommodation_custom_fields: [
        ...editing.accommodation_custom_fields,
        { id: crypto.randomUUID(), field_name: "", field_value: "", display_order: editing.accommodation_custom_fields.length, _new: true },
      ],
    });
  };
  const removeField = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, accommodation_custom_fields: editing.accommodation_custom_fields.filter((_, i) => i !== idx) });
  };

  if (tournaments.length === 0 && !loading) {
    return (
      <div className="text-center py-20">
        <BedDouble className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-display font-bold mb-2">No Tournaments Yet</h2>
        <p className="text-muted-foreground">Create a tournament first to add lodging.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2"><BedDouble className="h-6 w-6" /> Lodging Accommodations</h1>
          <p className="text-sm text-muted-foreground mt-1">Add hotels, room blocks, rates, and codes for traveling players.</p>
        </div>
        <Button onClick={startNew} disabled={!selectedTid}><Plus className="h-4 w-4 mr-2" /> Add Hotel</Button>
      </div>

      {tournaments.length > 1 && (
        <div className="max-w-md">
          <Label>Tournament</Label>
          <Select value={selectedTid} onValueChange={setSelectedTid}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <BedDouble className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No lodging added yet.</p>
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-2" /> Add your first hotel</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="border rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{a.hotel_name}</h3>
                  {a.address && <div className="text-sm text-muted-foreground">{a.address}</div>}
                  <div className="mt-2 text-sm space-y-0.5">
                    {a.accommodation_room_types?.map((r) => (
                      <div key={r.id}>• {r.room_type}{r.rate_cents != null && ` – $${(r.rate_cents/100).toFixed(2)}`}{r.rate_note ? ` ${r.rate_note}` : ""}</div>
                    ))}
                    {a.group_code && <div>• Code: <span className="font-mono">{a.group_code}</span></div>}
                    {a.booking_deadline && <div>• Deadline: {new Date(a.booking_deadline).toLocaleDateString()}</div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Hotel" : "Add Lodging Option"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Hotel Name *</Label>
                <Input value={editing.hotel_name} onChange={(e) => setEditing({ ...editing, hotel_name: e.target.value })} />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={editing.address || ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Website URL</Label>
                  <Input value={editing.website_url || ""} onChange={(e) => setEditing({ ...editing, website_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Booking Code</Label>
                  <Input value={editing.group_code || ""} onChange={(e) => setEditing({ ...editing, group_code: e.target.value })} />
                </div>
                <div>
                  <Label>Booking Deadline</Label>
                  <Input type="date" value={editing.booking_deadline || ""} onChange={(e) => setEditing({ ...editing, booking_deadline: e.target.value })} />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base">Room Types</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addRoom}><Plus className="h-3.5 w-3.5 mr-1" /> Add Room Type</Button>
                </div>
                <div className="space-y-2">
                  {editing.accommodation_room_types.map((r, idx) => (
                    <div key={r.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded">
                      <div className="col-span-4">
                        <Label className="text-xs">Room Type</Label>
                        <Input value={r.room_type} onChange={(e) => updateRoom(idx, { room_type: e.target.value })} placeholder="King" />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Rate (USD)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={r.rate_cents != null ? (r.rate_cents / 100).toString() : ""}
                          onChange={(e) => updateRoom(idx, { rate_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })}
                        />
                      </div>
                      <div className="col-span-4">
                        <Label className="text-xs">Note</Label>
                        <Input value={r.rate_note || ""} onChange={(e) => updateRoom(idx, { rate_note: e.target.value })} placeholder="+ tax / night" />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeRoom(idx)}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                  {editing.accommodation_room_types.length === 0 && (
                    <p className="text-xs text-muted-foreground">No room types added yet.</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  rows={3}
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="Free shuttle from airport. Parking $10/day."
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base">Custom Fields</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addField}><Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Field</Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Add any extra info (Shuttle, Parking, Breakfast, etc).</p>
                <div className="space-y-2">
                  {editing.accommodation_custom_fields.map((f, idx) => (
                    <div key={f.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded">
                      <div className="col-span-4">
                        <Label className="text-xs">Label</Label>
                        <Input value={f.field_name} onChange={(e) => updateField(idx, { field_name: e.target.value })} placeholder="Shuttle Info" />
                      </div>
                      <div className="col-span-7">
                        <Label className="text-xs">Value</Label>
                        <Input value={f.field_value} onChange={(e) => updateField(idx, { field_value: e.target.value })} placeholder="Free airport shuttle" />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeField(idx)}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving</> : "Save Hotel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lodging;
