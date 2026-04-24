import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Globe, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Trip {
  id: string;
  title: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  status: string;
  description?: string | null;
  is_published?: boolean;
}

export default function AdminTripEditDrawer({
  trip,
  open,
  onOpenChange,
  onSaved,
}: {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Trip | null>(null);

  useEffect(() => {
    if (trip && open) {
      (async () => {
        const { data } = await supabase
          .from("golf_trips")
          .select("id, title, destination, start_date, end_date, status, description, is_published")
          .eq("id", trip.id)
          .maybeSingle();
        setForm(data || trip);
      })();
    }
  }, [trip, open]);

  if (!form) return null;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("golf_trips")
      .update({
        title: form.title,
        destination: form.destination,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
        description: form.description,
        is_published: form.is_published ?? true,
      })
      .eq("id", form.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Trip updated");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Trip</SheetTitle>
          <SheetDescription>Update title, destination, dates, and status.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 mt-4">
          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Destination</Label>
            <Input
              value={form.destination || ""}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.start_date?.slice(0, 10)}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.end_date?.slice(0, 10)}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
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
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-muted/30">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {form.is_published === false ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Globe className="h-4 w-4 text-primary" />
                )}
                <Label className="text-sm font-medium cursor-pointer">
                  {form.is_published === false ? "Trip pages unpublished" : "Trip pages published"}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                When off, <code className="text-[10px]">/trips/:id</code> and the public share view show a "Trip Unavailable" message to everyone except the organizer and admins.
              </p>
            </div>
            <Switch
              checked={form.is_published !== false}
              onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
            />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
