import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { generatePasscode } from "@/lib/collegeScoring";
import type { ScoringEvent } from "@/lib/collegeScoringAdapter";

interface AdminRow {
  id: string;
  name: string;
  email: string;
  passcode: string;
  tournament_id: string | null;
  all_events: boolean;
  scoring_only: boolean;
  is_active: boolean;
}

interface Props {
  organizationId: string;
  events: ScoringEvent[];
  currentEventId: string;
}

/**
 * Organizer tool to add scoring admins: staff who sign in at /score-admin with
 * an email plus a 6-digit passcode and can only enter and validate scores.
 */
export function ScoringAdminsCard({ organizationId, events, currentEventId }: Props) {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState(generatePasscode());
  const [assignment, setAssignment] = useState<string>(currentEventId || "all");
  const [scoringOnly, setScoringOnly] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("tournament_scoring_admins")
      .select("id, name, email, passcode, tournament_id, all_events, scoring_only, is_active")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data || []) as AdminRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  useEffect(() => {
    if (currentEventId) setAssignment(currentEventId);
  }, [currentEventId]);

  const add = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("tournament_scoring_admins").insert({
      organization_id: organizationId,
      tournament_id: assignment === "all" ? null : assignment,
      all_events: assignment === "all",
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passcode,
      scoring_only: scoringOnly,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Scoring admin added. Passcode: ${passcode}`);
    setName("");
    setEmail("");
    setPasscode(generatePasscode());
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("tournament_scoring_admins").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add Scoring Admin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>6-Digit Passcode</Label>
            <div className="flex gap-2">
              <Input value={passcode} readOnly className="font-mono tracking-widest" />
              <Button type="button" variant="outline" onClick={() => setPasscode(generatePasscode())}>
                New
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Assign to Event</Label>
          <RadioGroup value={assignment} onValueChange={setAssignment} className="space-y-1">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2">
                <RadioGroupItem value={e.id} id={`sa-${e.id}`} />
                <Label htmlFor={`sa-${e.id}`} className="font-normal">
                  {e.eventTitle || e.title}
                </Label>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="sa-all" />
              <Label htmlFor="sa-all" className="font-normal">
                All events in this organization
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="scoring-only"
            checked={scoringOnly}
            onCheckedChange={(v) => setScoringOnly(!!v)}
          />
          <Label htmlFor="scoring-only" className="font-normal">
            Scoring only (cannot edit tournament settings)
          </Label>
        </div>

        <Button onClick={add} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
          Add Scoring Admin
        </Button>

        <div className="border-t pt-4 space-y-2">
          <Label>Current Scoring Admins</Label>
          <p className="text-xs text-muted-foreground">
            They sign in at <span className="font-mono">/score-admin</span> with their email and passcode.
          </p>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="rounded-md border divide-y">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 p-2 text-sm">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground">{r.email}</span>
                  <span className="font-mono tracking-widest">{r.passcode}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.all_events
                      ? "All events"
                      : events.find((e) => e.id === r.tournament_id)?.eventTitle ||
                        events.find((e) => e.id === r.tournament_id)?.title ||
                        "Assigned event"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive"
                    onClick={() => remove(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!rows.length && (
                <div className="p-3 text-sm text-muted-foreground">No scoring admins yet.</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
