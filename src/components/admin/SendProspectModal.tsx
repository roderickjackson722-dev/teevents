import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Used to fill the {tournamentName} merge token in the default body. */
  tournamentName?: string;
  /** Sample link inserted into the followup template (or the default initial body). */
  sampleLink?: string;
  /** Sample row id — logged in outreach_logs when present. */
  sampleId?: string;
  /** initial = first outreach email, followup = after they reply yes, custom = template-driven. */
  emailType?: "initial" | "followup" | "custom";
  /** Pre-fill subject (for "custom" mode coming from email script templates). */
  presetSubject?: string;
  /** Pre-fill body (for "custom" mode coming from email script templates). */
  presetBody?: string;
  /** Used in outreach_logs for analytics. */
  templateKey?: string;
}

function buildInitialBody(name: string, tournamentName: string) {
  const tn = tournamentName || "[Tournament Name]";
  return `Hi ${name || "there"},

I noticed you're using Eventbrite for the ${tn} golf tournament.

With over a decade as tournament directors, we built TeeVents to save you hours of work.

You get:
• A custom tournament website
• Funds deposited directly when players register
• Live leaderboard, sponsor tools, and more

All at no cost to you.

Want to see a free example of what ${tn} could look like on TeeVents?

Just say "yes" and I'll send it over.

Best,
Rod`;
}

function buildFollowupBody(tournamentName: string, link: string) {
  const tn = tournamentName || "[Tournament Name]";
  return `Great – here's your free example:

👉 ${link}

This is a working preview of what ${tn} could look like on TeeVents.

You'll see:
• Your custom tournament website
• A live leaderboard with sample scores
• Sponsor showcase
• And the organizer dashboard behind it all

No pressure at all. Just wanted to show you what's possible.

If you have any questions or want to spin up a real version, just let me know.

Best,
Rod`;
}

function mergeTokens(text: string, name: string, tournamentName: string) {
  return text
    .replace(/\{\{contact_name\}\}/g, name || "there")
    .replace(/\{\{tournament_name\}\}/g, tournamentName || "[Tournament Name]")
    .replace(/\{\{sender_name\}\}/g, "Rod")
    .replace(/\[Tournament Name\]/g, tournamentName || "[Tournament Name]")
    .replace(/\{name\}/g, name || "there");
}

export function SendProspectModal({
  open,
  onClose,
  tournamentName = "",
  sampleLink = "",
  sampleId,
  emailType = "initial",
  presetSubject,
  presetBody,
  templateKey,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // Reset / hydrate when modal opens or mode changes
  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    if (presetSubject !== undefined || presetBody !== undefined) {
      setSubject(presetSubject || "");
      setBody(presetBody || "");
    } else if (emailType === "followup") {
      setSubject(`Your ${tournamentName || "tournament"} mockup`);
      setBody(buildFollowupBody(tournamentName, sampleLink));
    } else {
      setSubject(`A custom tournament website for ${tournamentName || "your tournament"}`);
      setBody(buildInitialBody("", tournamentName));
    }
  }, [open, emailType, presetSubject, presetBody, tournamentName, sampleLink]);

  function updateName(v: string) {
    setName(v);
    // Re-merge tokens for the initial/followup auto-bodies; leave custom presets untouched
    if (presetBody === undefined) {
      if (emailType === "followup") {
        setBody(buildFollowupBody(tournamentName, sampleLink));
      } else {
        setBody(buildInitialBody(v, tournamentName));
      }
    } else {
      setBody(mergeTokens(presetBody, v, tournamentName));
      if (presetSubject !== undefined) setSubject(mergeTokens(presetSubject, v, tournamentName));
    }
  }

  async function logSend(status: "sent" | "mailto") {
    try {
      await supabase.from("outreach_logs").insert({
        sample_id: sampleId || null,
        prospect_email: email.trim(),
        prospect_name: name.trim() || null,
        email_type: emailType,
        subject,
        template_key: templateKey || (status === "mailto" ? "mailto_fallback" : null),
      });
    } catch {
      // best-effort logging
    }
  }

  async function handleSend() {
    if (!email.trim()) { toast.error("Recipient email is required"); return; }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-mockup-outreach", {
        body: { recipientEmail: email, subject, body },
      });
      if (error) throw error;
      await logSend("sent");
      toast.success("Email sent");
      onClose();
    } catch (e: any) {
      const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, "_blank");
      await logSend("mailto");
      toast.message("Opened in your email client", { description: e.message });
    } finally {
      setSending(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send to Prospect</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prospect Name</Label>
              <Input value={name} onChange={e => updateName(e.target.value)} placeholder="Jane" />
            </div>
            <div>
              <Label>Prospect Email *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Message Preview (editable)</Label>
            <Textarea rows={16} value={body} onChange={e => setBody(e.target.value)} className="font-mono text-xs" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" /> Copy to Clipboard
          </Button>
          <Button onClick={handleSend} disabled={sending} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
            {sending ? "Sending..." : "Send via Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
