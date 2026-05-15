import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const REASONS = [
  "Still evaluating",
  "Need a feature",
  "Too expensive",
  "Confusing",
  "Other",
];

interface Props {
  open: boolean;
  leadId: string;
  onClose: () => void;
}

export default function DemoFeedbackModal({ open, leadId, onClose }: Props) {
  const [reasons, setReasons] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleReason = (r: string) =>
    setReasons((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  const submit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("demo_leads")
        .update({
          feedback_reasons: reasons,
          feedback_score: score,
          feedback_text: text.trim().slice(0, 2000) || null,
          feedback_submitted_at: new Date().toISOString(),
        })
        .eq("id", leadId);
      if (error) throw error;
      toast({ title: "Thanks for the feedback!" });
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: "Could not save", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick feedback?</DialogTitle>
          <DialogDescription>
            Help us make TeeVents better — takes 30 seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>What's holding you back?</Label>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <Label key={r} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={reasons.includes(r)}
                    onCheckedChange={() => toggleReason(r)}
                  />
                  <span>{r}</span>
                </Label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>How likely are you to use TeeVents? (1–5)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(n)}
                  className={`h-10 w-10 rounded-md border font-semibold ${
                    score === n
                      ? "bg-[#F5A623] text-[#1a5c38] border-[#F5A623]"
                      : "bg-background hover:bg-accent"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-text">Any questions or comments?</Label>
            <Textarea
              id="feedback-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Optional"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Skip
            </Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-bold"
            >
              Send feedback
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
