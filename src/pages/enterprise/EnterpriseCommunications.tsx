import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import EnterpriseEventPicker from "@/components/enterprise/EnterpriseEventPicker";
import { useEnterpriseEvent } from "@/components/enterprise/useEnterpriseEvent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, FileText, Receipt, ArrowRight, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { sendEnterpriseRosterEmail } from "@/lib/enterpriseOperations.functions";

const TOOLS = [
  { icon: Mail, title: "Email your players", body: "Write and send an email to everyone signed up, or just one group.", to: "/dashboard/messages" },
  { icon: MessageSquare, title: "Text messages", body: "Send a text now or schedule it for the morning of the event.", to: "/dashboard/messages" },
  { icon: FileText, title: "Email templates", body: "Edit the wording of confirmations, reminders and results emails.", to: "/dashboard/email-templates" },
  { icon: Receipt, title: "Receipts", body: "Send a payment or donation receipt to any player or sponsor.", to: "/dashboard/email-templates?template=receipt" },
];

export default function EnterpriseCommunications() {
  const { org } = useOrgContext();
  const { events, event, selectEvent } = useEnterpriseEvent();
  const suffix = event ? `${event.id}` : "";
  const sendRosterEmail = useServerFn(sendEnterpriseRosterEmail);
  const [recipientCount, setRecipientCount] = useState(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!org) return;
    (supabase.from("enterprise_roster") as any).select("email").eq("organization_id", org.orgId).eq("is_active", true)
      .then(({ data }: any) => setRecipientCount(new Set((data || []).map((row: any) => String(row.email || "").trim().toLowerCase()).filter(Boolean)).size));
  }, [org]);

  const send = async () => {
    if (!org || !subject.trim() || !message.trim()) { toast.error("Add a subject and message first."); return; }
    setSending(true);
    try {
      const result = await sendRosterEmail({ data: { organizationId: org.orgId, subject, message } });
      toast.success(`Sent ${result.sent} of ${result.recipients} emails${result.failed ? ` · ${result.failed} failed` : ""}.`);
      if (!result.failed) { setSubject(""); setMessage(""); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Message could not be sent."); }
    setSending(false);
  };

  return (
    <EnterpriseLayout
      title="Communications"
      description="Everything you send to players, sponsors and staff."
      crumbs={[{ label: "Communications" }]}
      actions={<EnterpriseEventPicker events={events} eventId={event?.id} onChange={selectEvent} />}
    >
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4 text-secondary" /> Email the club roster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">One copy will be sent to each unique valid address in My Roster. {recipientCount} recipient{recipientCount === 1 ? "" : "s"} ready.</p>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" maxLength={160} />
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message" rows={7} maxLength={10000} />
          <Button onClick={send} disabled={sending || recipientCount === 0} className="bg-secondary text-primary hover:bg-secondary/90">
            {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />} Send to roster
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <Card key={t.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><t.icon className="h-4 w-4 text-secondary" /> {t.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t.body}</p>
              <Button asChild variant="outline" size="sm">
                <Link to={suffix ? `${t.to}${t.to.includes("?") ? "&" : "?"}tournament_id=${suffix}` : t.to}>
                  Open <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </EnterpriseLayout>
  );
}
