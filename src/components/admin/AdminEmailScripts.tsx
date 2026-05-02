import { useState } from "react";
import { Copy, Check, Mail, Pencil, Save, X, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  templates: any[];
  callAdminApi: (action?: string, body?: Record<string, unknown>) => Promise<any>;
  onRefresh: () => Promise<void>;
}

const PLACEHOLDER_HINTS: Record<string, string> = {
  "{{contact_name}}": "Prospect's name",
  "{{tournament_name}}": "Their tournament name",
  "{{sender_name}}": "Your name",
};

export default function AdminEmailScripts({ templates, callAdminApi, onRefresh }: Props) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [tournamentName, setTournamentName] = useState("");

  const coldTemplates = templates.filter(t => t.category === "cold_outreach");
  const otherTemplates = templates.filter(t => t.category !== "cold_outreach");

  const copyToClipboard = (template: any) => {
    const text = `Subject: ${template.subject}\n\n${template.body}`;
    navigator.clipboard.writeText(text);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  const startEditing = (template: any) => {
    setEditingId(template.id);
    setEditSubject(template.subject);
    setEditBody(template.body);
  };

  const saveEdit = async (id: string) => {
    try {
      await callAdminApi("save-outreach-template", {
        id,
        subject: editSubject,
        body: editBody,
      });
      setEditingId(null);
      await onRefresh();
      toast({ title: "Template updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openSendForm = (template: any) => {
    setSendingId(template.id);
    setRecipientEmail("");
    setContactName("");
    setTournamentName("");
  };

  const sendViaGmail = (template: any) => {
    if (!recipientEmail) {
      toast({ title: "Enter a recipient email", variant: "destructive" });
      return;
    }

    // Replace placeholders with filled values
    let subject = template.subject;
    let body = template.body;

    if (contactName) {
      subject = subject.replace(/\{\{contact_name\}\}/g, contactName);
      body = body.replace(/\{\{contact_name\}\}/g, contactName);
    }
    if (tournamentName) {
      subject = subject.replace(/\{\{tournament_name\}\}/g, tournamentName);
      body = body.replace(/\{\{tournament_name\}\}/g, tournamentName);
    }
    subject = subject.replace(/\{\{sender_name\}\}/g, "Rod Jackson");
    body = body.replace(/\{\{sender_name\}\}/g, "Rod Jackson");

    const mailtoUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
    setSendingId(null);
    toast({ title: "Opened in Gmail!" });
  };

  const renderTemplate = (template: any) => {
    const isEditing = editingId === template.id;
    const isCopied = copiedId === template.id;
    const isSending = sendingId === template.id;

    return (
      <div key={template.id} className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div>
            <h3 className="font-semibold text-foreground">{template.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Category: {template.category.replace(/_/g, " ")}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && !isSending && (
              <>
                <Button size="sm" variant="default" onClick={() => openSendForm(template)}>
                  <Send className="h-3.5 w-3.5 mr-1" /> Send
                </Button>
                <Button size="sm" variant="outline" onClick={() => startEditing(template)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant={isCopied ? "default" : "secondary"} onClick={() => copyToClipboard(template)}>
                  {isCopied ? <><Check className="h-3.5 w-3.5 mr-1" /> Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy</>}
                </Button>
              </>
            )}
          </div>
        </div>

        {isSending ? (
          <div className="p-4 space-y-3 bg-primary/5 border-b border-primary/20">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Send via Gmail
            </h4>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Recipient Email *</label>
                <Input
                  type="email"
                  placeholder="prospect@example.com"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Contact Name</label>
                <Input
                  placeholder="John Smith"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tournament Name</label>
                <Input
                  placeholder="Annual Charity Classic"
                  value={tournamentName}
                  onChange={e => setTournamentName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => sendViaGmail(template)}>
                <Send className="h-3.5 w-3.5 mr-1" /> Open in Gmail
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSendingId(null)}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
            </div>

            {/* Per-user rendered preview */}
            {(contactName || tournamentName || recipientEmail) && (() => {
              let prevSubject = template.subject;
              let prevBody = template.body;
              if (contactName) {
                prevSubject = prevSubject.replace(/\{\{contact_name\}\}/g, contactName);
                prevBody = prevBody.replace(/\{\{contact_name\}\}/g, contactName);
              }
              if (tournamentName) {
                prevSubject = prevSubject.replace(/\{\{tournament_name\}\}/g, tournamentName);
                prevBody = prevBody.replace(/\{\{tournament_name\}\}/g, tournamentName);
              }
              prevSubject = prevSubject.replace(/\{\{sender_name\}\}/g, "Rod Jackson");
              prevBody = prevBody.replace(/\{\{sender_name\}\}/g, "Rod Jackson");
              return (
                <div className="border border-primary/30 rounded-lg overflow-hidden bg-background">
                  <div className="bg-primary/10 px-3 py-2 text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Final preview (what {recipientEmail || "the recipient"} will see)
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="text-xs"><span className="text-muted-foreground">To: </span><span className="font-medium">{recipientEmail || "—"}</span></div>
                    <div className="text-xs"><span className="text-muted-foreground">Subject: </span><span className="font-semibold">{prevSubject}</span></div>
                    <div className="bg-muted/30 rounded p-3 text-sm whitespace-pre-wrap leading-relaxed border-t border-border mt-2">{prevBody}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null}

        {isEditing ? (
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject Line</label>
              <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Body</label>
              <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} className="min-h-[400px] font-mono text-sm" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveEdit(template.id)}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Subject:</span>
              <p className="text-sm font-medium text-foreground mt-0.5">{template.subject}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed font-mono">
              {template.body}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Email Scripts</h2>
        <p className="text-muted-foreground mt-1">
          Cold outreach templates for prospects. Copy, personalize, and send.
        </p>
      </div>

      {/* Placeholder legend */}
      <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Mail className="h-4 w-4 text-secondary" /> Template Placeholders
        </h4>
        <div className="flex flex-wrap gap-3">
          {Object.entries(PLACEHOLDER_HINTS).map(([key, desc]) => (
            <span key={key} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded font-mono">
              {key} → <span className="text-foreground font-sans">{desc}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Cold outreach templates */}
      {coldTemplates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Cold Outreach</h3>
          {coldTemplates.map(renderTemplate)}
        </div>
      )}

      {/* Other templates */}
      {otherTemplates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Other Templates</h3>
          {otherTemplates.map(renderTemplate)}
        </div>
      )}

      {templates.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No email templates yet.</p>
      )}
    </div>
  );
}
