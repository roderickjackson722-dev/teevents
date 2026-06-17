import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function BookingNotificationSettings({ context }: { context: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ admin_email: "info@teevents.golf", additional_email: "", send_on_booking: true, send_on_cancellation: true });
  const [id, setId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("booking_notification_settings").select("*").eq("context", context).maybeSingle();
      if (data) {
        setId(data.id);
        setForm({
          admin_email: data.admin_email || "info@teevents.golf",
          additional_email: data.additional_email || "",
          send_on_booking: data.send_on_booking ?? true,
          send_on_cancellation: data.send_on_cancellation ?? true,
        });
      }
    })();
  }, [context]);

  const save = async () => {
    setSaving(true);
    const payload = { ...form, additional_email: form.additional_email || null, context };
    const op = id
      ? (supabase as any).from("booking_notification_settings").update(payload).eq("id", id)
      : (supabase as any).from("booking_notification_settings").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Settings saved" });
  };

  return (
    <Card className="p-5 space-y-4 max-w-xl">
      <div><Label>Admin Email</Label><Input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} /></div>
      <div><Label>Additional Email (optional)</Label><Input type="email" value={form.additional_email} onChange={(e) => setForm({ ...form, additional_email: e.target.value })} placeholder="coach@college.edu" /></div>
      <div className="flex items-center justify-between"><Label>Send email when a booking is made</Label><Switch checked={form.send_on_booking} onCheckedChange={(v) => setForm({ ...form, send_on_booking: v })} /></div>
      <div className="flex items-center justify-between"><Label>Send email when a booking is cancelled</Label><Switch checked={form.send_on_cancellation} onCheckedChange={(v) => setForm({ ...form, send_on_cancellation: v })} /></div>
      <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
    </Card>
  );
}
