import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface OrgOption {
  user_id: string;
  email: string;
  name: string | null;
}

export default function AdminTripCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [organizers, setOrganizers] = useState<OrgOption[]>([]);
  const [form, setForm] = useState({
    title: "",
    destination: "",
    start_date: "",
    end_date: "",
    description: "",
    status: "planning",
    organizer_id: "",
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      // Use current admin as default organizer; also load org members for selection
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("org_members")
        .select("user_id, name")
        .order("created_at", { ascending: false })
        .limit(200);
      const unique = new Map<string, OrgOption>();
      (data || []).forEach((m: any) => {
        if (!unique.has(m.user_id)) {
          unique.set(m.user_id, { user_id: m.user_id, email: m.user_id, name: m.name });
        }
      });
      if (user) unique.set(user.id, { user_id: user.id, email: "Me (admin)", name: null });
      setOrganizers(Array.from(unique.values()));
      setForm((f) => ({ ...f, organizer_id: user?.id || "" }));
    })();
  }, [open]);

  const submit = async () => {
    if (!form.title || !form.start_date || !form.end_date || !form.organizer_id) {
      toast.error("Title, dates, and organizer are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("golf_trips").insert({
      title: form.title,
      destination: form.destination || null,
      start_date: form.start_date,
      end_date: form.end_date,
      description: form.description || null,
      status: form.status,
      organizer_id: form.organizer_id,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Trip created");
    setForm({
      title: "",
      destination: "",
      start_date: "",
      end_date: "",
      description: "",
      status: "planning",
      organizer_id: form.organizer_id,
    });
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Group Trip</DialogTitle>
          <DialogDescription>
            Create a trip on behalf of any organizer. You'll be able to manage participants right after.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Trip Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Pebble Beach Buddies Trip"
            />
          </div>
          <div>
            <Label>Destination</Label>
            <Input
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="Pebble Beach, CA"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date *</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Organizer *</Label>
              <Select
                value={form.organizer_id}
                onValueChange={(v) => setForm({ ...form, organizer_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose organizer" />
                </SelectTrigger>
                <SelectContent>
                  {organizers.map((o) => (
                    <SelectItem key={o.user_id} value={o.user_id}>
                      {o.name || o.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
