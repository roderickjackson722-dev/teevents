import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import EnterpriseEventPicker from "@/components/enterprise/EnterpriseEventPicker";
import { useEnterpriseEvent } from "@/components/enterprise/useEnterpriseEvent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, CreditCard, ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { EnterpriseRegistrationSettings } from "@/lib/enterprise";

type QuestionType = "text" | "choice" | "tee_time";
interface CustomQuestion { id: string; label: string; kind: QuestionType; options: string[] }

export default function EnterpriseRegistration() {
  const { events, event, settings, loading, selectEvent, saveSettings } = useEnterpriseEvent();
  const [reg, setReg] = useState<EnterpriseRegistrationSettings | null>(null);
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [fee, setFee] = useState("0");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings || !event) return;
    setReg(settings.registration);
    setQuestions((settings.registration.questions || []) as CustomQuestion[]);
    setFee(((event.registration_fee_cents || 0) / 100).toString());
    setMaxPlayers(event.max_players ? String(event.max_players) : "");
    setCloseAt(event.registration_close_at ? event.registration_close_at.slice(0, 16) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, settings]);

  const shareUrl = event ? `${window.location.origin}/t/${event.slug || event.id}/register` : "";

  const save = async () => {
    if (!reg) return;
    setSaving(true);
    await saveSettings(
      { registration: { ...reg, questions, maxPlayers: maxPlayers ? Number(maxPlayers) : null, closeAt, paid: Number(fee) > 0, feeCents: Math.round((Number(fee) || 0) * 100) } },
      {
        registration_fee_cents: Math.round((Number(fee) || 0) * 100),
        max_players: maxPlayers ? Number(maxPlayers) : null,
        registration_close_at: closeAt ? new Date(closeAt).toISOString() : null,
        registration_open: true,
      },
    );
    setSaving(false);
    toast.success("Registration settings saved.");
  };

  const set = (patch: Partial<EnterpriseRegistrationSettings>) => setReg((r) => (r ? { ...r, ...patch } as EnterpriseRegistrationSettings : r));
  const flag = (key: string, label: string, hint?: string) => (
    <label key={key} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={Boolean((reg as any)?.[key])} onCheckedChange={(v) => set({ [key]: v } as never)} />
    </label>
  );

  return (
    <EnterpriseLayout
      title="Registration Page"
      description="Set up the public sign-up page and share the link or QR code with your players."
      crumbs={[{ label: "Registration" }]}
      actions={<EnterpriseEventPicker events={events} eventId={event?.id} onChange={selectEvent} />}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : !event || !reg ? (
        <p className="text-sm text-muted-foreground">Create an event first.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Sign-up window</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Registration closes</Label>
                  <Input type="datetime-local" value={closeAt} onChange={(e) => setCloseAt(e.target.value)} />
                </div>
                <div>
                  <Label>Maximum players</Label>
                  <Input type="number" min={0} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} placeholder="No limit" />
                </div>
                <div>
                  <Label>Entry fee ($)</Label>
                  <Input type="number" min={0} step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
                  <p className="mt-1 text-xs text-muted-foreground">Leave at 0 for open registration.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Options</CardTitle></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {flag("requireFullTeam", "Require full team", "Players must fill every spot on a team.")}
                {flag("requireGhin", "Require GHIN", "Handicap must come from a GHIN lookup.")}
                {flag("allowWaitlist", "Allow waitlist", "Keep taking sign-ups once the field is full.")}
                {flag("hideRegisteredPlayers", "Hide players registered", "Don't show the field publicly.")}
                {flag("enabled", "Registration open", "Turn sign-ups on or off.")}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-base">Custom questions</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setQuestions((q) => [...q, { id: crypto.randomUUID(), label: "", kind: "text", options: [] }])
                  }
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add question
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {questions.length === 0 && <p className="text-sm text-muted-foreground">No extra questions yet.</p>}
                {questions.map((q, i) => (
                  <div key={q.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_150px_auto]">
                    <Input
                      placeholder="Question players will see"
                      value={q.label}
                      onChange={(e) => setQuestions((list) => list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    />
                    <Select
                      value={q.kind}
                      onValueChange={(v) => setQuestions((list) => list.map((x, j) => (j === i ? { ...x, kind: v as QuestionType } : x)))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Short answer</SelectItem>
                        <SelectItem value="choice">Multiple choice</SelectItem>
                        <SelectItem value="tee_time">Tee time preference</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setQuestions((list) => list.filter((_, j) => j !== i))}
                      aria-label="Remove question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {q.kind === "choice" && (
                      <Textarea
                        className="sm:col-span-3"
                        placeholder="One choice per line"
                        value={(q.options || []).join("\n")}
                        onChange={(e) => setQuestions((list) => list.map((x, j) => (j === i ? { ...x, options: e.target.value.split("\n") } : x)))}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button onClick={save} disabled={saving} className="bg-secondary text-primary hover:bg-secondary/90">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save registration
            </Button>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Share the link</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input readOnly value={shareUrl} className="text-xs" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copied."); }}
                    aria-label="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-center rounded-lg bg-white p-3">
                  <QRCodeSVG value={shareUrl} size={148} />
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to={shareUrl} target="_blank">Open registration page <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Taking payments</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Paid registration needs your payout account connected. Money goes straight to your account.
                </p>
                <Button asChild className="w-full bg-secondary text-primary hover:bg-secondary/90">
                  <Link to="/dashboard/payout-settings"><CreditCard className="mr-1.5 h-4 w-4" /> Connect payout account</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </EnterpriseLayout>
  );
}
