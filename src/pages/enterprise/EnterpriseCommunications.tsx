import { Link } from "react-router-dom";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import EnterpriseEventPicker from "@/components/enterprise/EnterpriseEventPicker";
import { useEnterpriseEvent } from "@/components/enterprise/useEnterpriseEvent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, FileText, Receipt, ArrowRight } from "lucide-react";

const TOOLS = [
  { icon: Mail, title: "Email your players", body: "Write and send an email to everyone signed up, or just one group.", to: "/dashboard/messages" },
  { icon: MessageSquare, title: "Text messages", body: "Send a text now or schedule it for the morning of the event.", to: "/dashboard/messages" },
  { icon: FileText, title: "Email templates", body: "Edit the wording of confirmations, reminders and results emails.", to: "/dashboard/email-templates" },
  { icon: Receipt, title: "Receipts", body: "Send a payment or donation receipt to any player or sponsor.", to: "/dashboard/email-templates?template=receipt" },
];

export default function EnterpriseCommunications() {
  const { events, event, selectEvent } = useEnterpriseEvent();
  const suffix = event ? `${event.id}` : "";

  return (
    <EnterpriseLayout
      title="Communications"
      description="Everything you send to players, sponsors and staff."
      crumbs={[{ label: "Communications" }]}
      actions={<EnterpriseEventPicker events={events} eventId={event?.id} onChange={selectEvent} />}
    >
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
