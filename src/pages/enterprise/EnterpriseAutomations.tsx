import { useEffect, useState } from "react";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import EnterpriseEventPicker from "@/components/enterprise/EnterpriseEventPicker";
import { useEnterpriseEvent } from "@/components/enterprise/useEnterpriseEvent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Zap } from "lucide-react";
import { toast } from "sonner";

const AUTOMATIONS = [
  { key: "confirmation", label: "Send a confirmation the moment someone registers" },
  { key: "reminder", label: "Send a reminder the day before the event" },
  { key: "teeTimes", label: "Email tee times and pairings once pairings are confirmed" },
  { key: "results", label: "Email results and payouts when the event is finished" },
  { key: "waitlist", label: "Tell the next person on the waitlist when a spot opens" },
  { key: "receipts", label: "Email a receipt for every payment" },
];

export default function EnterpriseAutomations() {
  const { events, event, settings, loading, selectEvent, saveSettings } = useEnterpriseEvent();
  const [state, setState] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = (settings as any)?.automations as Record<string, boolean> | undefined;
    setState(saved || { confirmation: true, reminder: true, teeTimes: true, results: true, waitlist: true, receipts: true });
  }, [settings]);

  const save = async () => {
    setSaving(true);
    await saveSettings({ automations: state } as never);
    setSaving(false);
    toast.success("Automations saved.");
  };

  return (
    <EnterpriseLayout
      title="Automations"
      description="Messages that go out on their own so you don't have to remember them."
      crumbs={[{ label: "Automations" }]}
      actions={<EnterpriseEventPicker events={events} eventId={event?.id} onChange={selectEvent} />}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : !event ? (
        <p className="text-sm text-muted-foreground">Create an event first.</p>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-secondary" /> Automatic messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {AUTOMATIONS.map((a) => (
              <label key={a.key} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                {a.label}
                <Switch checked={Boolean(state[a.key])} onCheckedChange={(v) => setState((s) => ({ ...s, [a.key]: v }))} />
              </label>
            ))}
            <Button onClick={save} disabled={saving} className="bg-secondary text-primary hover:bg-secondary/90">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save automations
            </Button>
          </CardContent>
        </Card>
      )}
    </EnterpriseLayout>
  );
}
