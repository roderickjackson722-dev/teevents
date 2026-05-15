import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  role: z.enum(["organizer", "sponsor", "looking"]).optional(),
});

interface Props {
  open: boolean;
  onComplete: (leadId: string) => void;
}

export default function DemoLeadCaptureModal({ open, onComplete }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"organizer" | "sponsor" | "looking" | "">("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, role: role || undefined });
    if (!parsed.success) {
      toast({
        title: "Invalid info",
        description: parsed.error.issues[0]?.message ?? "Check your inputs",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const lower = parsed.data.email.toLowerCase();
      // Try to find existing lead by email (admins-only RLS on select, so this may fail silently for anon)
      const { data: existing } = await supabase
        .from("demo_leads")
        .select("id")
        .ilike("email", lower)
        .maybeSingle();

      let leadId = existing?.id as string | undefined;

      if (leadId) {
        await supabase
          .from("demo_leads")
          .update({
            role: parsed.data.role ?? null,
            demo_started_at: new Date().toISOString(),
            user_agent: navigator.userAgent,
          })
          .eq("id", leadId);
      } else {
        const { data: inserted, error } = await supabase
          .from("demo_leads")
          .insert({
            email: lower,
            role: parsed.data.role ?? null,
            user_agent: navigator.userAgent,
          })
          .select("id")
          .single();
        if (error) throw error;
        leadId = inserted.id;
      }

      try { localStorage.setItem("teevents_demo_lead_id", leadId!); } catch { /* noop */ }

      // Fire welcome email (non-blocking)
      supabase.functions
        .invoke("send-demo-welcome", { body: { lead_id: leadId, email: lower } })
        .catch(() => { /* noop */ });

      onComplete(leadId!);
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not start",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Take a quick tour of TeeVents</DialogTitle>
          <DialogDescription>
            7 short steps. No credit card. We'll send a recap so you can come back anytime.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-email">Email</Label>
            <Input
              id="demo-email"
              type="email"
              required
              autoFocus
              placeholder="you@yourorg.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label>I'm exploring as a... <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as typeof role)}
              className="grid grid-cols-1 gap-2"
            >
              {[
                { v: "organizer", l: "Tournament organizer" },
                { v: "sponsor", l: "Potential sponsor" },
                { v: "looking", l: "Just looking" },
              ].map((o) => (
                <Label
                  key={o.v}
                  htmlFor={`role-${o.v}`}
                  className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent"
                >
                  <RadioGroupItem id={`role-${o.v}`} value={o.v} />
                  <span>{o.l}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-bold"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start the tour →"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            No spam. Unsubscribe anytime.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
