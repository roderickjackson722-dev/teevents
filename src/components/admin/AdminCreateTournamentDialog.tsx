import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (result: { tournament_id: string; organization_id: string }) => void;
}

const SCORING_FORMATS = [
  "Scramble", "Best Ball", "Stroke Play", "Stableford", "Modified Stableford",
  "Match Play", "Skins", "Shamble",
];

export default function AdminCreateTournamentDialog({ open, onOpenChange, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [courseName, setCourseName] = useState("");
  const [feeDollars, setFeeDollars] = useState("");
  const [scoringFormat, setScoringFormat] = useState("Scramble");
  const [mode, setMode] = useState<"existing" | "invite">("invite");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setTitle(""); setDate(""); setLocation(""); setCourseName("");
    setFeeDollars(""); setScoringFormat("Scramble"); setMode("invite");
    setEmail(""); setOrgName(""); setNotes("");
  }

  async function submit() {
    if (!title.trim()) return toast.error("Tournament name is required");
    if (!email.trim()) return toast.error("Organizer email is required");
    setSaving(true);
    try {
      const feeCents = feeDollars.trim() ? Math.round(parseFloat(feeDollars) * 100) : null;
      const { data, error } = await supabase.functions.invoke("admin-create-tournament-for-client", {
        body: {
          title: title.trim(),
          date: date || null,
          location: location.trim() || null,
          course_name: courseName.trim() || null,
          registration_fee_cents: feeCents,
          scoring_format: scoringFormat,
          admin_notes: notes.trim() || null,
          mode,
          email: email.trim(),
          organization_name: orgName.trim() || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(
        (data as any).created_user
          ? "Tournament created and invitation sent"
          : "Tournament created and assigned"
      );
      onCreated?.({
        tournament_id: (data as any).tournament_id,
        organization_id: (data as any).organization_id,
      });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create tournament");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Create Tournament for Client
          </DialogTitle>
          <DialogDescription>
            Create the event and assign a client as the organizer with full admin rights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="title">Tournament Name *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Spring Charity Classic" />
            </div>
            <div>
              <Label htmlFor="date">Event Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fee">Registration Fee (USD)</Label>
              <Input id="fee" type="number" min="0" step="1" value={feeDollars} onChange={(e) => setFeeDollars(e.target.value)} placeholder="150" />
            </div>
            <div>
              <Label htmlFor="course">Course</Label>
              <Input id="course" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Pebble Beach" />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Pebble Beach, CA" />
            </div>
            <div className="md:col-span-2">
              <Label>Scoring Format</Label>
              <Select value={scoringFormat} onValueChange={setScoringFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCORING_FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-base font-semibold">Assign Organizer</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "existing" | "invite")} className="mt-2 space-y-2">
              <div className="flex items-start gap-2">
                <RadioGroupItem value="existing" id="mode-existing" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="mode-existing" className="font-normal">Assign to existing user</Label>
                  <p className="text-xs text-muted-foreground">The tournament will be added to their existing organization.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="invite" id="mode-invite" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="mode-invite" className="font-normal">Invite new organizer</Label>
                  <p className="text-xs text-muted-foreground">Creates an account, a new organization, and emails a temporary password.</p>
                </div>
              </div>
            </RadioGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className={mode === "invite" ? "" : "md:col-span-2"}>
                <Label htmlFor="email">Organizer Email *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
              </div>
              {mode === "invite" && (
                <div>
                  <Label htmlFor="orgName">Organization Name (optional)</Label>
                  <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Auto-generated if blank" />
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Admin Notes (internal)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Internal note visible only to platform admins" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Tournament & Assign Organizer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
