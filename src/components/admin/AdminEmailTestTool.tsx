import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, FlaskConical } from "lucide-react";
import { toast } from "sonner";

type TemplateKind = "confirmation" | "sponsor" | "vendor" | "post_event" | "day_before";

const TEMPLATE_OPTIONS: { value: TemplateKind; label: string }[] = [
  { value: "confirmation", label: "Registration Confirmation" },
  { value: "sponsor", label: "Sponsor Confirmation" },
  { value: "vendor", label: "Vendor Confirmation" },
  { value: "post_event", label: "Post-Event Thank You" },
  { value: "day_before", label: "Day Before Event Reminder" },
];

const CONFIG_KEY: Record<TemplateKind, string> = {
  confirmation: "confirmation_email_config",
  sponsor: "sponsor_email_config",
  vendor: "vendor_email_config",
  post_event: "post_event_email_config",
  day_before: "day_before_email_config",
};

const DEFAULT_CONFIG = {
  subject: "You're Registered — {{event_name}}",
  greeting: "Hi {{first_name}},",
  body_text: "We've received your registration for {{event_name}}. Thank you for signing up!",
  closing_text: "We look forward to seeing you there!",
  footer_text: "See you on the course! ⛳",
  primary_color: "#1a5c38",
  secondary_color: "#ffffff",
  header_bg_color: "#1a5c38",
  text_color: "#374151",
  show_event_details: true,
  show_logo: false,
  logo_url: "",
  logo_alignment: "center",
  button_text: "View Event Details",
  button_url: "",
  show_button: false,
  font_family: "Arial, sans-serif",
};

export default function AdminEmailTestTool() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tournamentId, setTournamentId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [templateKind, setTemplateKind] = useState<TemplateKind>("confirmation");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title, date")
        .order("created_at", { ascending: false })
        .limit(500);
      const list = (data as any[]) || [];
      setTournaments(list);
      const hbcu = list.find(t => (t.title || "").toLowerCase().includes("hbcu test"));
      setTournamentId(hbcu?.id || list[0]?.id || "");
    })();
  }, []);

  const send = async () => {
    if (!recipient.trim()) {
      toast.error("Enter a recipient email address");
      return;
    }
    if (!tournamentId) {
      toast.error("Select a tournament");
      return;
    }
    setSending(true);
    try {
      if (templateKind === "day_before") {
        const { error } = await supabase.functions.invoke("send-day-before-reminder", {
          body: { tournament_id: tournamentId, test_email: recipient.trim() },
        });
        if (error) throw error;
      } else {
        const { data: t } = await (supabase.from("tournaments") as any)
          .select(CONFIG_KEY[templateKind])
          .eq("id", tournamentId)
          .maybeSingle();
        const stored = t?.[CONFIG_KEY[templateKind]];
        const config = stored && typeof stored === "object" ? { ...DEFAULT_CONFIG, ...stored } : DEFAULT_CONFIG;

        const { error } = await supabase.functions.invoke("send-confirmation-test", {
          body: {
            recipient_email: recipient.trim(),
            config,
            tournament_id: tournamentId,
            template_kind: templateKind,
          },
        });
        if (error) throw error;
      }
      toast.success(`Test email sent to ${recipient.trim()}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send test email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <FlaskConical className="h-4 w-4" /> Email Test Tool
        </h3>
        <p className="text-sm text-muted-foreground">
          Send any live organizer email template to a real inbox using a tournament's saved template
          settings — useful for verifying deliverability end to end.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="et-tournament">Tournament</Label>
          <select
            id="et-tournament"
            className="w-full border rounded-md px-2 py-2 text-sm bg-background"
            value={tournamentId}
            onChange={e => setTournamentId(e.target.value)}
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="et-recipient">Recipient</Label>
          <Input
            id="et-recipient"
            type="email"
            placeholder="organizer@example.com"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="et-template">Template</Label>
          <select
            id="et-template"
            className="w-full border rounded-md px-2 py-2 text-sm bg-background"
            value={templateKind}
            onChange={e => setTemplateKind(e.target.value as TemplateKind)}
          >
            {TEMPLATE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <Button onClick={send} disabled={sending} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
        {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
        Send Test Email
      </Button>
    </Card>
  );
}
