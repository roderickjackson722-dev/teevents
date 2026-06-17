import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { BookingCategory, BookingSlot } from "@/hooks/useBookings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BookingCategory[];
  slot?: BookingSlot | null;
  context: string;
  onSaved: () => void;
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingSlotEditor({ open, onOpenChange, categories, slot, context, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "", description: "", category_id: "", location: "",
    start_time: "", end_time: "", max_bookings: 1, is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        title: slot?.title || "",
        description: slot?.description || "",
        category_id: slot?.category_id || "",
        location: slot?.location || "",
        start_time: toLocalInput(slot?.start_time),
        end_time: toLocalInput(slot?.end_time),
        max_bookings: slot?.max_bookings || 1,
        is_active: slot?.is_active ?? true,
      });
    }
  }, [open, slot]);

  const save = async () => {
    if (!form.title || !form.start_time || !form.end_time) {
      toast({ title: "Missing required fields", variant: "destructive" }); return;
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      toast({ title: "End time must be after start time", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      category_id: form.category_id || null,
      location: form.location || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      max_bookings: Number(form.max_bookings) || 1,
      is_active: form.is_active,
      context,
    };
    const op = slot
      ? (supabase as any).from("booking_slots").update(payload).eq("id", slot.id)
      : (supabase as any).from("booking_slots").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: slot ? "Slot updated" : "Slot created" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{slot ? "Edit" : "Add"} Booking Slot</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select value={form.category_id || "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start *</Label><Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>End *</Label><Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div><Label>Max bookings</Label><Input type="number" min={1} value={form.max_bookings} onChange={(e) => setForm({ ...form, max_bookings: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Slot"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
