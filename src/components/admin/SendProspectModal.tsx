import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  tournamentName: string;
  sampleLink: string;
}

function buildBody(name: string, tournamentName: string, link: string) {
  return `Hey ${name || "[Name]"},

I hope you're doing well and that your planning for ${tournamentName} is on track.

I wanted to share something that could save you time and help your tournament look more professional – a custom tournament website and management platform built specifically for golf events.

We built TeeVents to handle everything: registration, payments, live leaderboards, hole sponsors, volunteer check-in, and automatic payouts.

Here's a custom mockup of what your event would look like on TeeVents:
👉 ${link}

No pressure at all. Just wanted to share.

Best,
Rod`;
}

export function SendProspectModal({ open, onClose, tournamentName, sampleLink }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(`Your ${tournamentName} – custom mockup`);
  const [body, setBody] = useState(buildBody("", tournamentName, sampleLink));
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!email.trim()) { toast.error("Recipient email is required"); return; }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "mockup-outreach",
          recipientEmail: email,
          idempotencyKey: `mockup-outreach-${sampleLink}-${Date.now()}`,
          templateData: { name, tournamentName, sampleLink, subject, body },
        },
      });
      if (error) throw error;
      toast.success("Email sent");
      onClose();
    } catch (e: any) {
      // Fallback to mailto
      const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, "_blank");
      toast.message("Opened in your email client", { description: e.message });
    } finally {
      setSending(false);
    }
  }

  function updateName(v: string) {
    setName(v);
    setBody(buildBody(v, tournamentName, sampleLink));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Mockup to Prospect</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Recipient Name</Label>
              <Input value={name} onChange={e => updateName(e.target.value)} placeholder="Jane" />
            </div>
            <div>
              <Label>Recipient Email *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea rows={14} value={body} onChange={e => setBody(e.target.value)} className="font-mono text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
            {sending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
