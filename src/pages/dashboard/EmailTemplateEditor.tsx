import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Mail, Save, Eye, Send, Loader2, Palette, Type, Image, Layout,
  RotateCcw, Copy, CheckCircle, Users, RefreshCw, Pencil,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { formatTournamentDate } from "@/lib/formatDate";

interface EmailConfig {
  subject: string;
  greeting: string;
  body_text: string;
  closing_text: string;
  footer_text: string;
  primary_color: string;
  secondary_color: string;
  header_bg_color: string;
  text_color: string;
  show_event_details: boolean;
  show_logo: boolean;
  logo_url: string;
  logo_alignment: "left" | "center" | "right";
  button_text: string;
  button_url: string;
  show_button: boolean;
  font_family: string;
}

type TemplateKind = "confirmation" | "sponsor" | "vendor" | "post_event" | "day_before";

const DEFAULT_CONFIG: EmailConfig = {
  subject: "You're Registered — {{event_name}}",
  greeting: "Hi {{first_name}},",
  body_text: "We've received your registration for {{event_name}}. Thank you for signing up!",
  closing_text: "We look forward to seeing you there! Keep an eye on your inbox for any updates leading up to the event.",
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

const DEFAULT_SPONSOR_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "Thank you for sponsoring {{event_name}}!",
  greeting: "Hi {{first_name}},",
  body_text: "Thank you for your generous sponsorship of {{event_name}}. Your support makes this event possible and helps us deliver a memorable experience for every participant.",
  closing_text: "Our team will be in touch shortly with next steps, including logo submission and on-site benefits. In the meantime, please don't hesitate to reach out with any questions.",
  footer_text: "Thank you for partnering with us! ⛳",
  button_text: "View Sponsorship Details",
  show_event_details: true,
};

const DEFAULT_VENDOR_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "Vendor Registration Confirmed — {{event_name}}",
  greeting: "Hi {{first_name}},",
  body_text: "Your vendor booth is confirmed for {{event_name}}. Thank you for being part of the event.",
  closing_text: "Details on setup times, booth location, and load-in instructions will follow closer to the event date. Please reach out with any questions.",
  footer_text: "See you at the event! ⛳",
  button_text: "View Event Details",
  show_event_details: true,
};

const DEFAULT_POST_EVENT_CONFIG: EmailConfig = {
  subject: "Thanks for playing in {{event_name}}!",
  greeting: "Hi {{first_name}},",
  body_text:
    "Thank you for joining us at {{event_name}}! It was a fantastic day on the course and we couldn't have done it without you. Keep an eye out for final results, photos, and a recap coming soon.",
  closing_text:
    "Want to be the first to know about our next tournament? Click below to stay in the loop or sign up for the next event.",
  footer_text: "We hope to see you again soon! ⛳",
  primary_color: "#1a5c38",
  secondary_color: "#ffffff",
  header_bg_color: "#1a5c38",
  text_color: "#374151",
  show_event_details: false,
  show_logo: false,
  logo_url: "",
  logo_alignment: "center",
  button_text: "Sign Up for the Next Event",
  button_url: "",
  show_button: true,
  font_family: "Arial, sans-serif",
};

const DEFAULT_DAY_BEFORE_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "{{event_name}} – Tomorrow is the big day!",

  greeting: "Hello {{first_name}},",
  body_text:
    "This is a reminder that your tournament is tomorrow at {{course_name}}.\n\n📅 Date: {{event_date}}\n📍 Location: {{event_location}}\n🏠 Address: {{course_address}}\n⏰ Tee Time: {{tee_time}}\n🏌️ Starting Hole: {{hole_number}}\n🔑 Your Scoring Code: {{scoring_code}}\n\n🗓 Event Schedule:\n{{event_schedule}}\n\n🔗 Event Homepage: {{event_homepage}}",
  closing_text:
    "Please arrive 30 minutes before your tee time. Enter your scores with your scoring code at {{scoring_link}}.",
  footer_text: "See you on the course! ⛳",
  button_text: "View Event Homepage",
  show_event_details: false,
};

const TEMPLATE_LABELS: Record<TemplateKind, string> = {
  confirmation: "Player / Registrant Confirmation",
  sponsor: "Sponsor Confirmation",
  vendor: "Vendor Confirmation",
  post_event: "Post-Event Thank You",
  day_before: "Day Before Event Reminder",
};

const TEMPLATE_HEADERS: Record<TemplateKind, string> = {
  confirmation: "Registration Confirmed!",
  sponsor: "Thank You for Sponsoring!",
  vendor: "Vendor Registration Confirmed!",
  post_event: "Thanks for Playing!",
  day_before: "Tomorrow Is the Big Day!",
};

const CONFIG_KEY: Record<TemplateKind, string> = {
  confirmation: "confirmation_email_config",
  sponsor: "sponsor_email_config",
  vendor: "vendor_email_config",
  post_event: "post_event_email_config",
  day_before: "day_before_email_config",
};

const FONT_OPTIONS = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

const VARIABLE_TAGS = [
  { label: "First Name", value: "{{first_name}}" },
  { label: "Last Name", value: "{{last_name}}" },
  { label: "Event Name", value: "{{event_name}}" },
  { label: "Event Date", value: "{{event_date}}" },
  { label: "Event Location", value: "{{event_location}}" },
  { label: "Course Name", value: "{{course_name}}" },
  { label: "Course Address", value: "{{course_address}}" },
  { label: "Event Schedule", value: "{{event_schedule}}" },
  { label: "Tee Time", value: "{{tee_time}}" },
  { label: "Starting Hole", value: "{{hole_number}}" },
  { label: "Scoring Code", value: "{{scoring_code}}" },
  { label: "Group Number", value: "{{group_number}}" },
  { label: "Scoring Link", value: "{{scoring_link}}" },
  { label: "Event Homepage", value: "{{event_homepage}}" },
];

export default function EmailTemplateEditor() {
  const { org } = useOrgContext();
  const { isDemoMode } = useDemoMode();
  // ?template=post_event deep link from the Setup Checklist opens the post-event editor.
  const initialTemplate: TemplateKind = (() => {
    if (typeof window === "undefined") return "confirmation";
    const q = new URLSearchParams(window.location.search).get("template");
    return q === "post_event" || q === "day_before" || q === "sponsor" || q === "vendor"
      ? (q as TemplateKind)
      : "confirmation";
  })();
  const [templateKind, setTemplateKind] = useState<TemplateKind>(initialTemplate);
  const [config, setConfig] = useState<EmailConfig>(
    initialTemplate === "post_event"
      ? DEFAULT_POST_EVENT_CONFIG
      : initialTemplate === "day_before"
        ? DEFAULT_DAY_BEFORE_CONFIG
        : initialTemplate === "sponsor"
          ? DEFAULT_SPONSOR_CONFIG
          : initialTemplate === "vendor"
            ? DEFAULT_VENDOR_CONFIG
            : DEFAULT_CONFIG,
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<any>(null);
  const [editEmail, setEditEmail] = useState("");
  const [resendingSingle, setResendingSingle] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");

  // Prefill test email with the current user's email
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setTestEmail(data.user.email);
    });
  }, []);

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast.error("Enter an email address");
      return;
    }
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke("send-confirmation-test", {
        body: {
          recipient_email: testEmail.trim(),
          config,
          tournament_id: selectedTournament || null,
          template_kind: templateKind,
        },
      });
      if (error) throw error;
      toast.success(`Test email sent to ${testEmail.trim()}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send test email");
    }
    setSendingTest(false);
  };

  const configKey = CONFIG_KEY[templateKind];
  const defaultsForKind = (k: TemplateKind): EmailConfig => {
    if (k === "post_event") return DEFAULT_POST_EVENT_CONFIG;
    if (k === "day_before") return DEFAULT_DAY_BEFORE_CONFIG;
    if (k === "sponsor") return DEFAULT_SPONSOR_CONFIG;
    if (k === "vendor") return DEFAULT_VENDOR_CONFIG;
    return DEFAULT_CONFIG;
  };

  const loadConfigFor = (t: any, kind: TemplateKind) => {
    const stored = t?.[CONFIG_KEY[kind]];
    if (stored) setConfig({ ...defaultsForKind(kind), ...(stored as any) });
    else setConfig(defaultsForKind(kind));
  };


  // Load tournaments
  useEffect(() => {
    if (!org) return;
    const load = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title, date, location, state, course_name, slug, schedule_info, schedule_info_html, confirmation_email_config, post_event_email_config, sponsor_email_config, vendor_email_config, day_before_email_config, site_logo_url")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false });
      setTournaments(data || []);
      const tid = data?.[0]?.id;
      if (tid) {
        setSelectedTournament(tid);
        const t = (data || []).find((x: any) => x.id === tid);
        loadConfigFor(t, templateKind);
      }
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  // Load registrations when tournament changes
  useEffect(() => {
    if (!selectedTournament) return;
    const load = async () => {
      const { data } = await supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, email, payment_status, scoring_code, group_scoring_code, group_number")
        .eq("tournament_id", selectedTournament)
        .order("created_at", { ascending: false });
      setRegistrations(data || []);
    };
    load();
  }, [selectedTournament]);

  const handleTournamentChange = (id: string) => {
    setSelectedTournament(id);
    const t = tournaments.find((x: any) => x.id === id);
    loadConfigFor(t, templateKind);
    setSelectedRecipients([]);
  };

  const handleTemplateKindChange = (kind: TemplateKind) => {
    setTemplateKind(kind);
    const t = tournaments.find((x: any) => x.id === selectedTournament);
    loadConfigFor(t, kind);
  };

  const saveTemplate = async () => {
    if (!selectedTournament) return;
    setSaving(true);
    const update: Record<string, any> = { [configKey]: config as any };
    const { error } = await supabase
      .from("tournaments")
      .update(update as any)
      .eq("id", selectedTournament);
    setSaving(false);
    if (error) {
      toast.error("Failed to save template");
    } else {
      toast.success(`${TEMPLATE_LABELS[templateKind]} saved`);
      setTournaments(prev => prev.map(t =>
        t.id === selectedTournament ? { ...t, [configKey]: config } : t
      ));
    }
  };

  const resetTemplate = () => {
    setConfig(defaultsForKind(templateKind));
    toast.info("Template reset to default");
  };


  const copyHtml = () => {
    const html = renderEmailHtml(config, {
      first_name: "John",
      last_name: "Doe",
      event_name: "Sample Tournament",
      event_date: "Saturday, June 15, 2026",
      event_location: "Pine Valley Golf Club",
    }, TEMPLATE_HEADERS[templateKind]);
    navigator.clipboard.writeText(html);
    toast.success("HTML copied to clipboard");
  };

  const sendEmails = async (ids?: string[]) => {
    const targets = ids && ids.length > 0 ? ids : selectedRecipients;
    if (targets.length === 0) {
      toast.error("Select at least one recipient");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-confirmation", {
        body: { registration_ids: targets, use_custom_template: true, template_kind: templateKind },
      });
      if (error) throw error;
      toast.success(`Sent ${data.sent} email(s)${data.failed ? `, ${data.failed} failed` : ""}`);
      if (!ids) setSelectedRecipients([]);
    } catch (e: any) {
      toast.error(e.message || "Failed to send emails");
    }
    setSending(false);
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedRecipients.length === registrations.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(registrations.map(r => r.id));
    }
  };

  const insertVariable = (field: "greeting" | "body_text" | "closing_text" | "footer_text" | "subject", variable: string) => {
    setConfig(prev => ({ ...prev, [field]: prev[field] + " " + variable }));
  };

  const openEditModal = (reg: any) => {
    setEditingReg(reg);
    setEditEmail(reg.email);
    setEditModalOpen(true);
  };

  const handleEditAndResend = async () => {
    if (!editingReg || !editEmail.trim()) return;
    setResendingSingle(true);
    try {
      const needsUpdate = editEmail.trim().toLowerCase() !== editingReg.email.toLowerCase();
      const { data, error } = await supabase.functions.invoke("resend-confirmation", {
        body: {
          registration_ids: [editingReg.id],
          use_custom_template: true,
          template_kind: templateKind,
          ...(needsUpdate ? { update_email: { registration_id: editingReg.id, new_email: editEmail.trim() } } : {}),
        },
      });
      if (error) throw error;
      // Update local state
      if (needsUpdate) {
        setRegistrations(prev => prev.map(r =>
          r.id === editingReg.id ? { ...r, email: editEmail.trim() } : r
        ));
      }
      toast.success(`Confirmation email resent to ${editEmail.trim()}`);
      setEditModalOpen(false);
      setEditingReg(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to resend email");
    }
    setResendingSingle(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" /> Email Templates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Design and send custom emails to your participants — pick which template to edit below.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={templateKind} onValueChange={(v) => handleTemplateKindChange(v as TemplateKind)}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Choose template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmation">{TEMPLATE_LABELS.confirmation}</SelectItem>
              <SelectItem value="sponsor">{TEMPLATE_LABELS.sponsor}</SelectItem>
              <SelectItem value="vendor">{TEMPLATE_LABELS.vendor}</SelectItem>
              <SelectItem value="post_event">{TEMPLATE_LABELS.post_event}</SelectItem>
              <SelectItem value="day_before">{TEMPLATE_LABELS.day_before}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!selectedTournament) return;
              if (!confirm(`Apply this ${TEMPLATE_LABELS[templateKind]} design (colors, fonts, logo) to all confirmation emails for this tournament?`)) return;
              const shared = {
                primary_color: config.primary_color,
                secondary_color: config.secondary_color,
                header_bg_color: config.header_bg_color,
                text_color: config.text_color,
                font_family: config.font_family,
                show_logo: config.show_logo,
                logo_url: config.logo_url,
              };
              const t: any = tournaments.find(x => x.id === selectedTournament) || {};
              const merge = (existing: any, fallback: EmailConfig) => ({ ...fallback, ...(existing || {}), ...shared });
              const update: any = {
                confirmation_email_config: merge(t.confirmation_email_config, DEFAULT_CONFIG),
                sponsor_email_config: merge(t.sponsor_email_config, DEFAULT_SPONSOR_CONFIG),
                vendor_email_config: merge(t.vendor_email_config, DEFAULT_VENDOR_CONFIG),
              };
              const { error } = await supabase.from("tournaments").update(update).eq("id", selectedTournament);
              if (error) toast.error("Failed to apply to all");
              else {
                toast.success("Design applied to all confirmation emails");
                setTournaments(prev => prev.map(x => x.id === selectedTournament ? { ...x, ...update } : x));
              }
            }}
          >
            <Copy className="h-4 w-4 mr-1" /> Apply design to all
          </Button>
          <Select value={selectedTournament} onValueChange={handleTournamentChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select tournament" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Banner explaining current template */}
      <div className={`rounded-lg border-l-4 p-3 text-sm ${
        templateKind === "post_event"
          ? "bg-secondary/10 border-l-secondary text-foreground"
          : "bg-primary/5 border-l-primary text-foreground"
      }`}>
        <strong>{TEMPLATE_LABELS[templateKind]}:</strong>{" "}
        {templateKind === "post_event"
          ? "Sent after the tournament to thank players and invite them to your next event. Use the call-to-action button to link a sign-up form, mailing list, or your next event's registration page."
          : "Sent automatically when a player registers for this tournament."}
      </div>

      <Tabs defaultValue="design" className="space-y-4">
        <TabsList>
          <TabsTrigger value="design" className="gap-1"><Palette className="h-4 w-4" /> Design</TabsTrigger>
          <TabsTrigger value="content" className="gap-1"><Type className="h-4 w-4" /> Content</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1"><Eye className="h-4 w-4" /> Preview</TabsTrigger>
          <TabsTrigger value="send" className="gap-1"><Send className="h-4 w-4" /> Send</TabsTrigger>
        </TabsList>

        {/* Design Tab */}
        <TabsContent value="design" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 bg-card rounded-lg border p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" /> Colors
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Header Background</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={config.header_bg_color} onChange={e => setConfig(p => ({ ...p, header_bg_color: e.target.value }))} className="w-10 h-8 rounded cursor-pointer border-0" />
                    <Input value={config.header_bg_color} onChange={e => setConfig(p => ({ ...p, header_bg_color: e.target.value }))} className="text-xs h-8" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={config.primary_color} onChange={e => setConfig(p => ({ ...p, primary_color: e.target.value }))} className="w-10 h-8 rounded cursor-pointer border-0" />
                    <Input value={config.primary_color} onChange={e => setConfig(p => ({ ...p, primary_color: e.target.value }))} className="text-xs h-8" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Text Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={config.text_color} onChange={e => setConfig(p => ({ ...p, text_color: e.target.value }))} className="w-10 h-8 rounded cursor-pointer border-0" />
                    <Input value={config.text_color} onChange={e => setConfig(p => ({ ...p, text_color: e.target.value }))} className="text-xs h-8" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Background Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={config.secondary_color} onChange={e => setConfig(p => ({ ...p, secondary_color: e.target.value }))} className="w-10 h-8 rounded cursor-pointer border-0" />
                    <Input value={config.secondary_color} onChange={e => setConfig(p => ({ ...p, secondary_color: e.target.value }))} className="text-xs h-8" />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Font Family</Label>
                <Select value={config.font_family} onValueChange={v => setConfig(p => ({ ...p, font_family: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 bg-card rounded-lg border p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Layout className="h-4 w-4 text-primary" /> Layout Options
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Event Details (Date & Location)</Label>
                  <Switch checked={config.show_event_details} onCheckedChange={v => setConfig(p => ({ ...p, show_event_details: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Logo</Label>
                  <Switch checked={config.show_logo} onCheckedChange={v => setConfig(p => ({ ...p, show_logo: v }))} />
                </div>
                {config.show_logo && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Logo</Label>
                    <div className="flex items-center gap-3">
                      {config.logo_url && (
                        <img src={config.logo_url} alt="Logo preview" className="h-12 w-12 object-contain border rounded bg-white" />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !selectedTournament) return;
                          const ext = file.name.split(".").pop();
                          const path = `${selectedTournament}/email-logo-${Date.now()}.${ext}`;
                          const { error: upErr } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
                          if (upErr) { toast.error(upErr.message); return; }
                          const { data } = supabase.storage.from("tournament-assets").getPublicUrl(path);
                          setConfig((p) => ({ ...p, logo_url: data.publicUrl }));
                          toast.success("Logo uploaded");
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Logo Alignment</Label>
                      <Select value={config.logo_alignment || "center"} onValueChange={(v) => setConfig(p => ({ ...p, logo_alignment: v as "left" | "center" | "right" }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Call-to-Action Button</Label>
                  <Switch checked={config.show_button} onCheckedChange={v => setConfig(p => ({ ...p, show_button: v }))} />
                </div>
                {config.show_button && (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Button Text</Label>
                      <Input value={config.button_text} onChange={e => setConfig(p => ({ ...p, button_text: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Button URL</Label>
                      <Input value={config.button_url} onChange={e => setConfig(p => ({ ...p, button_url: e.target.value }))} placeholder="https://..." className="mt-1" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="bg-card rounded-lg border p-5 space-y-5">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-xs text-muted-foreground mr-1 self-center">Insert variable:</span>
              {VARIABLE_TAGS.map(v => (
                <Badge key={v.value} variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs" onClick={() => {
                  const active = document.activeElement as HTMLElement;
                  const field = active?.dataset?.field as any;
                  if (field) insertVariable(field, v.value);
                  else insertVariable("body_text", v.value);
                }}>
                  {v.label}
                </Badge>
              ))}
            </div>

            <div>
              <Label>Email Subject</Label>
              <Input data-field="subject" value={config.subject} onChange={e => setConfig(p => ({ ...p, subject: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Greeting</Label>
              <Input data-field="greeting" value={config.greeting} onChange={e => setConfig(p => ({ ...p, greeting: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Body Text</Label>
              <Textarea data-field="body_text" value={config.body_text} onChange={e => setConfig(p => ({ ...p, body_text: e.target.value }))} rows={4} className="mt-1" />
            </div>
            <div>
              <Label>Closing Text</Label>
              <Textarea data-field="closing_text" value={config.closing_text} onChange={e => setConfig(p => ({ ...p, closing_text: e.target.value }))} rows={3} className="mt-1" />
            </div>
            <div>
              <Label>Footer / Sign-off</Label>
              <Input data-field="footer_text" value={config.footer_text} onChange={e => setConfig(p => ({ ...p, footer_text: e.target.value }))} className="mt-1" />
            </div>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <div className="bg-card rounded-lg border p-4 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Send a test email to yourself
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                See exactly how this confirmation email will look in your inbox — no participants are contacted.
              </p>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2"
              />
            </div>
            <Button onClick={sendTestEmail} disabled={sendingTest || !testEmail.trim()} className="gap-2">
              {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Test Email
            </Button>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="text-xs text-muted-foreground text-center mb-3">
              Live preview — updates as you edit design and content
            </div>
            <div className="max-w-[600px] mx-auto shadow-lg rounded-lg overflow-hidden border" dangerouslySetInnerHTML={{
              __html: renderEmailHtml(config, {
                first_name: "John",
                last_name: "Doe",
                event_name: tournaments.find(t => t.id === selectedTournament)?.title || "Sample Tournament",
                event_date: tournaments.find(t => t.id === selectedTournament)?.date
                  ? formatTournamentDate(tournaments.find(t => t.id === selectedTournament).date, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                  : "Saturday, June 15, 2026",
                event_location: tournaments.find(t => t.id === selectedTournament)?.location || "Pine Valley Golf Club",
                scoring_code: "ABC123",
              }, TEMPLATE_HEADERS[templateKind], { includePlayerHub: templateKind === "confirmation" })
            }} />
          </div>
        </TabsContent>


        {/* Send Tab */}
        <TabsContent value="send" className="space-y-4">
          {(templateKind === "sponsor" || templateKind === "vendor") && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-sm">
              <strong>Heads up:</strong> The {TEMPLATE_LABELS[templateKind]} template is saved and will apply automatically to future {templateKind} confirmations. Bulk resend from this screen currently supports registrants only — use the {templateKind === "sponsor" ? "Sponsors" : "Vendors"} page to manage individual {templateKind} records.
            </div>
          )}
          {templateKind !== "sponsor" && templateKind !== "vendor" && (
          <>
          <div className="bg-card rounded-lg border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Players ({registrations.length})
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedRecipients.length === registrations.length && registrations.length > 0 ? "Deselect All" : "Select All"}
                </Button>
                <Badge variant="secondary">{selectedRecipients.length} selected</Badge>
              </div>
            </div>
            <Input
              placeholder="Search by name or email…"
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              className="mb-3"
            />
            {registrations.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No registrations found for this tournament.</p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto divide-y">
                {registrations
                  .filter((r) => {
                    const q = recipientSearch.trim().toLowerCase();
                    if (!q) return true;
                    return `${r.first_name || ""} ${r.last_name || ""} ${r.email || ""}`.toLowerCase().includes(q);
                  })
                  .map(r => (
                  <div key={r.id} className="flex items-center gap-3 py-2.5 px-2 hover:bg-muted/50 rounded">
                    <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                      <input type="checkbox" checked={selectedRecipients.includes(r.id)} onChange={() => toggleRecipient(r.id)} className="rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.first_name} {r.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.email || "No email on file"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Scoring Code:{" "}
                          <span className="font-mono font-semibold text-foreground">
                            {r.group_scoring_code || r.scoring_code || "Not assigned yet"}
                          </span>
                          {r.group_number ? <span className="ml-1">(Group {r.group_number})</span> : null}
                        </p>
                      </div>
                    </label>
                    <Badge variant={r.payment_status === "paid" ? "default" : "secondary"} className="text-xs">
                      {r.payment_status}
                    </Badge>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-8"
                      disabled={sending || !r.email}
                      title={`Send ${TEMPLATE_LABELS[templateKind]} to ${r.email || "this player"}`}
                      onClick={() => sendEmails([r.id])}
                    >
                      <Send className="h-3.5 w-3.5" /> Send
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit email & resend" onClick={() => openEditModal(r)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => sendEmails()} disabled={sending || selectedRecipients.length === 0} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send {TEMPLATE_LABELS[templateKind]} to {selectedRecipients.length} player{selectedRecipients.length === 1 ? "" : "s"}
            </Button>
          </div>
          </>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-card rounded-lg border p-4">
        <Button onClick={saveTemplate} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Template
        </Button>
        <Button variant="outline" onClick={resetTemplate} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset to Default
        </Button>
        <Button variant="outline" onClick={copyHtml} className="gap-2">
          <Copy className="h-4 w-4" /> Copy HTML
        </Button>
      </div>

      {/* Edit Email & Resend Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit Email & Resend
            </DialogTitle>
          </DialogHeader>
          {editingReg && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Editing email for <strong>{editingReg.first_name} {editingReg.last_name}</strong>
              </p>
              <div>
                <Label>Email Address</Label>
                <Input
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="Enter corrected email"
                  className="mt-1"
                  type="email"
                />
              </div>
              {editEmail.trim().toLowerCase() !== editingReg.email.toLowerCase() && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  ⚠️ This will update the registrant's email from <strong>{editingReg.email}</strong> to <strong>{editEmail.trim()}</strong>
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                <Button onClick={handleEditAndResend} disabled={resendingSingle || !editEmail.trim()} className="gap-2">
                  {resendingSingle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {editEmail.trim().toLowerCase() !== editingReg.email.toLowerCase() ? "Update & Send" : "Resend"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

const SAMPLE_VARS: Record<string, string> = {
  course_name: "Pine Valley Golf Club",
  course_address: "1 Clubhouse Dr, Pine Valley, NJ 08021",
  event_schedule: "7:30 AM — Check-in & breakfast\n9:00 AM — Shotgun start\n2:00 PM — Lunch & awards",
  tee_time: "8:30 AM",
  hole_number: "5",
  scoring_code: "ABC123",
  scoring_link: "https://www.teevents.golf/t/sample/scoring",
  event_homepage: "https://www.teevents.golf/t/sample",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function replaceVariables(text: string, vars: Record<string, string>): string {
  const merged = { ...SAMPLE_VARS, ...vars };
  return escapeHtml(text || "")
    .replace(/\{\{(\w+)\}\}/g, (_m, k: string) => merged[k] ?? "")
    .replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:#1a5c38;font-weight:600;">${u}</a>`)
    .replace(/\n/g, "<br/>");
}

function renderEmailHtml(config: EmailConfig, vars: Record<string, string>, headerText: string = "Registration Confirmed!", opts?: { includePlayerHub?: boolean; hubUrl?: string; qrImg?: string }): string {
  const greeting = replaceVariables(config.greeting, vars);
  const body = replaceVariables(config.body_text, vars);
  const closing = replaceVariables(config.closing_text, vars);
  const footer = replaceVariables(config.footer_text, vars);


  const eventDetailsHtml = config.show_event_details && (vars.event_date || vars.event_location)
    ? `<div style="margin:16px 0;">
        ${vars.event_date ? `<p style="margin:0 0 6px;color:${config.text_color};font-size:15px;">📅 <strong>Date:</strong> ${vars.event_date}</p>` : ""}
        ${vars.event_location ? `<p style="margin:0;color:${config.text_color};font-size:15px;">📍 <strong>Location:</strong> ${vars.event_location}</p>` : ""}
       </div>`
    : "";

  const align = config.logo_alignment || "center";
  const logoHtml = config.show_logo && config.logo_url
    ? `<div style="text-align:${align};margin-bottom:12px;"><img src="${config.logo_url}" alt="Logo" style="max-height:60px;display:inline-block;" /></div>`
    : "";

  const buttonHtml = config.show_button && config.button_text
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${config.button_url || '#'}" style="display:inline-block;padding:12px 28px;background:${config.primary_color};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">${config.button_text}</a>
       </div>`
    : "";

  const hubUrl = opts?.hubUrl || "https://www.teevents.golf/player/sample/preview";
  const qrImg = opts?.qrImg || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(hubUrl)}`;
  const hubBlock = opts?.includePlayerHub
    ? `<tr><td style="padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;background:#f9fafb;">
        <p style="margin:0 0 6px;color:${config.primary_color};font-size:16px;font-weight:700;">📱 Your Personal Player Hub</p>
        <p style="margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.5;">Scan or tap on event day for live scoring, leaderboard, schedule &amp; more — no login needed.</p>
        <a href="${hubUrl}" style="text-decoration:none;"><img src="${qrImg}" width="180" height="180" alt="Player Hub QR Code" style="display:block;margin:0 auto 12px;border:6px solid #ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);"/></a>
        <a href="${hubUrl}" style="display:inline-block;padding:10px 22px;background-color:#F5A623;color:#1a5c38;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700;">Open My Player Hub</a>
        <p style="margin:12px 0 0;color:#9ca3af;font-size:11px;">Bookmark this link on your phone — it's your personal pass for the entire tournament.</p>
       </td></tr>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${config.font_family};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${config.secondary_color};border-radius:8px;overflow:hidden;">
        <tr><td style="background:${config.header_bg_color};padding:28px 32px;text-align:center;">
          ${logoHtml}
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${headerText}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 14px;color:${config.text_color};font-size:15px;line-height:1.7;"><strong>${greeting}</strong></p>
          <p style="margin:0 0 14px;color:${config.text_color};font-size:15px;line-height:1.7;">${body}</p>
          ${eventDetailsHtml}
          <p style="margin:0 0 14px;color:${config.text_color};font-size:15px;line-height:1.7;">${closing}</p>
          ${buttonHtml}
          <p style="margin:0;color:${config.text_color};font-size:15px;line-height:1.7;">${footer}</p>
        </td></tr>${hubBlock}
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:${config.primary_color};">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
