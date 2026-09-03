import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import RfpAdminGate from "@/components/admin/RfpAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listFacilities, upsertFacility, deleteFacility, upsertBooking, deleteBooking } from "@/lib/rfp.functions";

const blankFacility = { name: "", address: "", facility_type: "field", capacity: "", notes: "", is_active: true };
const blankBooking = { facility_id: "", season_id: "", title: "", start_time: "", end_time: "", booking_type: "game", status: "confirmed" };

export default function FacilityManagement() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fForm, setFForm] = useState<any>(blankFacility);
  const [bForm, setBForm] = useState<any>(blankBooking);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await listFacilities({ data: {} } as any);
      setFacilities(res.facilities || []);
      setBookings(res.bookings || []);
      setSeasons(res.seasons || []);
    } catch (e: any) {
      toast.error(e?.message || "Could not load facilities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const facilityName = useMemo(() => {
    const m = new Map<string, string>();
    facilities.forEach((f) => m.set(f.id, f.name));
    return m;
  }, [facilities]);

  const saveFacility = async () => {
    if (!fForm.name) return toast.error("Facility name is required");
    try {
      await upsertFacility({ data: fForm } as any);
      toast.success("Facility saved");
      setFForm(blankFacility);
      await load();
    } catch (e: any) { toast.error(e?.message || "Could not save facility"); }
  };

  const saveBooking = async () => {
    if (!bForm.facility_id || !bForm.start_time || !bForm.end_time) {
      return toast.error("Facility, start and end time are required");
    }
    try {
      await upsertBooking({
        data: {
          ...bForm,
          season_id: bForm.season_id || null,
          start_time: new Date(bForm.start_time).toISOString(),
          end_time: new Date(bForm.end_time).toISOString(),
        },
      } as any);
      toast.success("Booking saved");
      setBForm(blankBooking);
      await load();
    } catch (e: any) { toast.error(e?.message || "Could not save booking"); }
  };

  return (
    <RfpAdminGate title="Facility Management" subtitle="Add fields, courts and rooms, then schedule games, practices and meetings.">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">{fForm.id ? "Edit facility" : "Add facility"}</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <div><Label>Name</Label><Input value={fForm.name} onChange={(e) => setFForm({ ...fForm, name: e.target.value })} placeholder="Barcroft Field 3" /></div>
              <div><Label>Address</Label><Input value={fForm.address || ""} onChange={(e) => setFForm({ ...fForm, address: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={fForm.facility_type} onValueChange={(v) => setFForm({ ...fForm, facility_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="field">Field</SelectItem><SelectItem value="court">Court</SelectItem><SelectItem value="room">Room</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Capacity</Label><Input type="number" value={fForm.capacity || ""} onChange={(e) => setFForm({ ...fForm, capacity: e.target.value })} /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveFacility}>{fForm.id ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}{fForm.id ? "Save facility" : "Add facility"}</Button>
              {fForm.id && <Button variant="ghost" onClick={() => setFForm(blankFacility)}>Cancel</Button>}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border"><h2 className="font-semibold text-foreground">Facilities</h2></div>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Address</TableHead><TableHead>Capacity</TableHead><TableHead>Bookings</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {facilities.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No facilities yet.</TableCell></TableRow>}
                {facilities.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="capitalize">{f.facility_type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.address || "—"}</TableCell>
                    <TableCell>{f.capacity ?? "—"}</TableCell>
                    <TableCell>{bookings.filter((b) => b.facility_id === f.id).length}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setFForm({ ...f, capacity: f.capacity ?? "" })}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={async () => { if (!confirm("Delete facility and its bookings?")) return; await deleteFacility({ data: { id: f.id } } as any); await load(); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">Schedule a booking</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Facility</Label>
                <Select value={bForm.facility_id} onValueChange={(v) => setBForm({ ...bForm, facility_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                  <SelectContent>{facilities.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={bForm.title} onChange={(e) => setBForm({ ...bForm, title: e.target.value })} placeholder="Team A vs Team B" /></div>
              <div>
                <Label>Season (optional)</Label>
                <Select value={bForm.season_id || "none"} onValueChange={(v) => setBForm({ ...bForm, season_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{seasons.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Start</Label><Input type="datetime-local" value={bForm.start_time} onChange={(e) => setBForm({ ...bForm, start_time: e.target.value })} /></div>
              <div><Label>End</Label><Input type="datetime-local" value={bForm.end_time} onChange={(e) => setBForm({ ...bForm, end_time: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={bForm.booking_type} onValueChange={(v) => setBForm({ ...bForm, booking_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="game">Game</SelectItem><SelectItem value="practice">Practice</SelectItem><SelectItem value="meeting">Meeting</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={saveBooking}><Plus className="h-4 w-4 mr-2" />Add booking</Button>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border"><h2 className="font-semibold text-foreground">Facility calendar</h2></div>
            <Table>
              <TableHeader><TableRow><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Facility</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {bookings.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No bookings scheduled.</TableCell></TableRow>}
                {bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(b.start_time).toLocaleString()}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(b.end_time).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{facilityName.get(b.facility_id) || "—"}</TableCell>
                    <TableCell className="text-sm">{b.title || "—"}</TableCell>
                    <TableCell className="text-sm capitalize">{b.booking_type}</TableCell>
                    <TableCell className="text-sm capitalize">{b.status}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={async () => { if (!confirm("Delete booking?")) return; await deleteBooking({ data: { id: b.id } } as any); await load(); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </RfpAdminGate>
  );
}
