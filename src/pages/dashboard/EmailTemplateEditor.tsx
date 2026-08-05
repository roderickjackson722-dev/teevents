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
  RotateCcw, Copy, CheckCircle, Users, RefreshCw, Pencil, CalendarClock, ShoppingBag,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { formatTournamentDate } from "@/lib/formatDate";
import { autoFormatAgenda } from "@/lib/formatAgenda";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import SponsorDayOfSender from "@/components/dashboard/SponsorDayOfSender";

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
  /** Day-before reminder: include the add-ons ("Don't Forget Your Mulligans!") section. */
  show_addons?: boolean;
  addons_heading?: string;
  addons_intro?: string;
  /** Day-before reminder: big action buttons for live scoring / leaderboard. */
  show_scoring_button?: boolean;
  scoring_button_text?: string;
  show_leaderboard_button?: boolean;
  leaderboard_button_text?: string;
  /** Editable headline shown in the colored email header band. */
  header_title?: string;
  /** Text color of the headline inside the colored header band. */
  header_text_color?: string;
  /** Organizer-edited schedule text used for {{event_schedule}} in this email. */
  schedule_override?: string;
  /** Day-before reminder: show the schedule block. */
  show_schedule?: boolean;
  schedule_heading?: string;
  /** Day-before reminder: show the plain "Event Homepage: <url>" text line. */
  show_homepage_link?: boolean;
  homepage_link_label?: string;
  /** Day-before reminder: order of the body sections, top to bottom. */
  section_order?: string[];
}

/** Every movable block in the Day Before reminder, in default order. */
const DAY_BEFORE_SECTIONS: { id: string; label: string; hint: string }[] = [
  { id: "body", label: "Body text", hint: "Your main details paragraph (tee time, scoring code, etc.)" },
  { id: "schedule", label: "Event schedule", hint: "The schedule block from the Content tab / your event page" },
  { id: "closing", label: "Closing text", hint: "Your closing message" },
  { id: "action_buttons", label: "Scoring & Leaderboard buttons", hint: "“Enter My Scores” + “View Live Leaderboard”" },
  { id: "homepage_button", label: "“View Event Homepage” button", hint: "The gold call-to-action button" },
  { id: "homepage_link", label: "Event homepage link (text URL)", hint: "The plain “🔗 Event Homepage: https://…” line" },
  { id: "addons", label: "Add-ons / “Don’t Forget Your Mulligans!”", hint: "Purchasable add-on list with buy buttons" },
  { id: "footer", label: "Footer sign-off", hint: "Your closing sign-off line (e.g. “See you on the course!”)" },
];
const DEFAULT_SECTION_ORDER = DAY_BEFORE_SECTIONS.map((s) => s.id);

type TemplateKind = "confirmation" | "sponsor" | "vendor" | "post_event" | "day_before" | "sponsor_day_of";


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
  subject: "{{event_name}} – Your tournament is almost here!",

  greeting: "Hello {{first_name}},",
  header_title: "Your Tournament Is Almost Here!",
  body_text:
    "Here are your final details for {{event_name}} at {{course_name}}.\n\n📅 Date: {{event_date}}\n📍 Location: {{event_location}}\n🏠 Address: {{course_address}}\n⏰ Tee Time: {{tee_time}}\n🏌️ Starting Hole: {{hole_number}}\n🔑 Your Scoring Code: {{scoring_code}}",
  closing_text:
    "Please arrive 30 minutes before your tee time.\n\nEnter your scores with your scoring code at:\n👉 {{scoring_link}}",
  footer_text: "See you on the course! ⛳",
  button_text: "View Event Homepage",
  show_event_details: false,
  show_scoring_button: true,
  scoring_button_text: "Enter My Scores",
  show_leaderboard_button: true,
  leaderboard_button_text: "View Live Leaderboard",
  show_schedule: true,
  schedule_heading: "🗓 Event Schedule",
  show_homepage_link: true,
  homepage_link_label: "🔗 Event Homepage",
  section_order: DEFAULT_SECTION_ORDER,
};


const DEFAULT_SPONSOR_DAY_OF_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "{{event_name}} – Sponsor Event Day Details",
  header_title: "Sponsor Event Day Details",
  greeting: "Hello {{sponsor_name}},",
  body_text:
    "Thank you for sponsoring {{event_name}}! We are excited to have you on board.\n\nHere are the details for event day:\n\n📅 Date: {{event_date}}\n📍 Course: {{course_name}}\n🕒 Check-in Time: {{checkin_time}}\n🏌️ Hole Assignment: Hole {{hole_number}}\n🅿️ Parking: {{parking_info}}\n📞 Event Contact: {{contact_name}} – {{contact_phone}}\n\nSpecial Notes:\n{{custom_notes}}",
  closing_text:
    "Important:\n• Please arrive at least 30 minutes before your assigned time to set up.\n• A table and two chairs will be provided at your hole.\n• If you need additional space or have special requests, please let us know in advance.\n\nIf you have any questions, contact us at info@teevents.golf.",
  footer_text: "We look forward to seeing you there!",
  show_event_details: false,
  show_button: false,
};

const TEMPLATE_LABELS: Record<TemplateKind, string> = {
  confirmation: "Player / Registrant Confirmation",
  sponsor: "Sponsor Confirmation",
  vendor: "Vendor Confirmation",
  post_event: "Post-Event Thank You",
  day_before: "Day Before Event Reminder",
  sponsor_day_of: "Sponsor Event Day Details",
};

const TEMPLATE_HEADERS: Record<TemplateKind, string> = {
  confirmation: "Registration Confirmed!",
  sponsor: "Thank You for Sponsoring!",
  vendor: "Vendor Registration Confirmed!",
  post_event: "Thanks for Playing!",
  day_before: "Your Tournament Is Almost Here!",
  sponsor_day_of: "Sponsor Event Day Details",
};

const CONFIG_KEY: Record<TemplateKind, string> = {
  confirmation: "confirmation_email_config",
  sponsor: "sponsor_email_config",
  vendor: "vendor_email_config",
  post_event: "post_event_email_config",
  day_before: "day_before_email_config",
  sponsor_day_of: "sponsor_day_of_email_config",
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
  { label: "Leaderboard Link", value: "{{leaderboard_link}}" },
  { label: "Event Homepage", value: "{{event_homepage}}" },
  { label: "Sponsor Name", value: "{{sponsor_name}}" },
  { label: "Sponsor Tier", value: "{{sponsor_tier}}" },
  { label: "Check-in Time", value: "{{checkin_time}}" },
  { label: "Parking Info", value: "{{parking_info}}" },
  { label: "Custom Notes", value: "{{custom_notes}}" },
  { label: "Contact Name", value: "{{contact_name}}" },
  { label: "Contact Phone", value: "{{contact_phone}}" },
];

export default function EmailTemplateEditor() {
  const { org } = useOrgContext();
  const { isDemoMode } = useDemoMode();
  // ?template=post_event deep link from the Setup Checklist opens the post-event editor.
  const initialTemplate: TemplateKind = (() => {
    if (typeof window === "undefined") return "confirmation";
    const q = new URLSearchParams(window.location.search).get("template");
    return q === "post_event" || q === "day_before" || q === "sponsor" || q === "vendor" || q === "sponsor_day_of"
      ? (q as TemplateKind)
      : "confirmation";
  })();
  const [templateKind, setTemplateKind] = useState<TemplateKind>(initialTemplate);
  // Last rich-text field the organizer touched — variable chips insert there.
  const [lastRichField, setLastRichField] = useState<"body_text" | "closing_text" | "schedule_override">("body_text");
  const [config, setConfig] = useState<EmailConfig>(
    initialTemplate === "post_event"
      ? DEFAULT_POST_EVENT_CONFIG
      : initialTemplate === "day_before"
        ? DEFAULT_DAY_BEFORE_CONFIG
        : initialTemplate === "sponsor"
          ? DEFAULT_SPONSOR_CONFIG
          : initialTemplate === "vendor"
            ? DEFAULT_VENDOR_CONFIG
            : initialTemplate === "sponsor_day_of"
              ? DEFAULT_SPONSOR_DAY_OF_CONFIG
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
  // Day-before reminder scheduling + add-ons
  const [addons, setAddons] = useState<any[]>([]);
  const [sendAt, setSendAt] = useState<string>("");
  const [autoSend, setAutoSend] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

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
      if (templateKind === "day_before" && selectedTournament) {
        const { error: dbErr } = await supabase.functions.invoke("send-day-before-reminder", {
          body: { tournament_id: selectedTournament, test_email: testEmail.trim() },
        });
        if (dbErr) throw dbErr;
        toast.success(`Test reminder sent to ${testEmail.trim()}`);
        setSendingTest(false);
        return;
      }
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
    if (k === "sponsor_day_of") return DEFAULT_SPONSOR_DAY_OF_CONFIG;
    return DEFAULT_CONFIG;
  };

  const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const loadScheduleFor = (t: any) => {
    setSendAt(toLocalInput(t?.day_before_send_at));
    setAutoSend(!!t?.day_before_approved);
    setSentAt(t?.day_before_sent_at || null);
  };

  const loadConfigFor = (t: any, kind: TemplateKind) => {
    const stored = t?.[CONFIG_KEY[kind]];
    if (stored) {
      const loaded = { ...defaultsForKind(kind), ...(stored as any) };
      setConfig(kind === "day_before" ? normalizeDayBefore(loaded) : loaded);
    }
    else setConfig(defaultsForKind(kind));
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    setConfig((p) => {
      const order = (p.section_order?.length ? [...p.section_order] : [...DEFAULT_SECTION_ORDER]);
      const i = order.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return p;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...p, section_order: order };
    });
  };



  // Load tournaments
  useEffect(() => {
    if (!org) return;
    const load = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title, date, location, state, course_name, slug, schedule_info, schedule_info_html, confirmation_email_config, post_event_email_config, sponsor_email_config, vendor_email_config, day_before_email_config, sponsor_day_of_email_config, day_before_send_at, day_before_approved, day_before_sent_at, site_logo_url")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false });
      setTournaments(data || []);
      const tid = data?.[0]?.id;
      if (tid) {
        setSelectedTournament(tid);
        const t = (data || []).find((x: any) => x.id === tid);
        loadConfigFor(t, templateKind);
        loadScheduleFor(t);
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

  // Course address for the selected tournament (used by the live preview)
  const [courseAddress, setCourseAddress] = useState<string>("");
  useEffect(() => {
    if (!selectedTournament) { setCourseAddress(""); return; }
    supabase
      .from("golf_courses")
      .select("course_address")
      .eq("tournament_id", selectedTournament)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setCourseAddress((data as any)?.course_address || ""));
  }, [selectedTournament]);

  // Active add-ons for the day-before reminder "Mulligans" section
  useEffect(() => {
    if (!selectedTournament) { setAddons([]); return; }
    supabase
      .from("tournament_registration_addons")
      .select("id, name, description, price_cents, is_active")
      .eq("tournament_id", selectedTournament)
      .eq("is_active", true)
      .then(({ data }) => setAddons(data || []));
  }, [selectedTournament]);

  const saveSchedule = async () => {
    if (!selectedTournament) return;
    setSavingSchedule(true);
    const { error } = await (supabase.from("tournaments") as any)
      .update({
        day_before_send_at: sendAt ? new Date(sendAt).toISOString() : null,
        day_before_approved: autoSend,
      })
      .eq("id", selectedTournament);
    setSavingSchedule(false);
    if (error) toast.error("Could not save the schedule");
    else {
      toast.success(autoSend && sendAt ? "Reminder scheduled" : "Schedule saved");
      setTournaments(prev => prev.map(t => t.id === selectedTournament
        ? { ...t, day_before_send_at: sendAt ? new Date(sendAt).toISOString() : null, day_before_approved: autoSend }
        : t));
    }
  };

  const sendNow = async () => {
    if (!selectedTournament) return;
    const withEmail = registrations.filter(r => r.email);
    if (withEmail.length === 0) { toast.error("No registrants with an email address"); return; }
    if (!confirm(`Send the Day Before Event Reminder to all ${withEmail.length} registrant(s) now?`)) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-day-before-reminder", {
        body: { tournament_id: selectedTournament },
      });
      if (error) throw error;
      toast.success(`Sent ${data?.sent ?? 0} reminder(s)${data?.failed ? `, ${data.failed} failed` : ""}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send reminders");
      setSending(false);
      return;
    }
    setSending(false);
    const now = new Date().toISOString();
    await (supabase.from("tournaments") as any).update({ day_before_sent_at: now }).eq("id", selectedTournament);
    setSentAt(now);
  };

  const [activeTab, setActiveTab] = useState("design");

  // Pull the latest event content (schedule/timeline, logo, etc.) so the live
  // preview always matches the most recent edits made in the Site Builder.
  const refreshSelectedTournament = async () => {
    if (!selectedTournament) return;
    const { data } = await (supabase.from("tournaments") as any)
      .select("id, title, date, location, state, course_name, slug, schedule_info, schedule_info_html, site_logo_url")
      .eq("id", selectedTournament)
      .maybeSingle();
    if (!data) return;
    setTournaments((prev: any[]) => prev.map((t) => (t.id === data.id ? { ...t, ...data } : t)));
  };

  useEffect(() => {
    if (!selectedTournament) return;
    refreshSelectedTournament();
    const onFocus = () => refreshSelectedTournament();
    if (typeof window !== "undefined") window.addEventListener("focus", onFocus);
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournament]);

  // Preview variables built from the ACTUAL selected tournament.
  const previewVars = (() => {
    const t = tournaments.find((x: any) => x.id === selectedTournament);
    const scheduleHtml = String(t?.schedule_info_html || "").trim();
    const schedulePlain = String(t?.schedule_info || "").trim();
    const homepage = t?.slug ? `https://www.teevents.golf/t/${t.slug}` : "https://www.teevents.golf";
    const location = [t?.location, t?.state].filter(Boolean).join(", ");
    const sampleReg = registrations[0];
    const vars: Record<string, string> = {
      first_name: sampleReg?.first_name || "John",
      last_name: sampleReg?.last_name || "Doe",
      event_name: t?.title || "Sample Tournament",
      event_date: t?.date
        ? formatTournamentDate(t.date, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : "Saturday, June 15, 2026",
      event_location: location || t?.location || "Your golf course",
      course_name: t?.course_name || t?.location || "Your golf course",
      scoring_code: sampleReg?.group_scoring_code || sampleReg?.scoring_code || "Assigned when pairings are finalized",
      group_number: sampleReg?.group_number != null ? String(sampleReg.group_number) : "TBD",
      scoring_link: t?.slug ? `${homepage}/scoring` : "https://www.teevents.golf/score",
      leaderboard_link: t?.slug ? `https://www.teevents.golf/live/${t.slug}` : "https://www.teevents.golf",
      event_homepage: homepage,
      tee_time: "TBD",
      hole_number: sampleReg?.group_number != null ? String(sampleReg.group_number) : "TBD",
    };
    if (courseAddress) vars.course_address = courseAddress;
    else if (location) vars.course_address = location;
    const scheduleSource = (config.schedule_override || "").trim() || scheduleHtml;
    // Match the public event page: preserve the organizer's rich text exactly,
    // falling back to the same agenda formatter only for legacy plain text.
    vars.event_schedule = scheduleSource || autoFormatAgenda(schedulePlain) || "See the event homepage for the full schedule.";
    return vars;
  })();

  // Day-before templates render each block independently and in the organizer's
  // chosen order, so the schedule / homepage link are no longer baked into the body.
  const previewConfig = templateKind === "day_before" ? normalizeDayBefore(config) : config;




  const handleTournamentChange = (id: string) => {
    setSelectedTournament(id);
    const t = tournaments.find((x: any) => x.id === id);
    loadConfigFor(t, templateKind);
    loadScheduleFor(t);
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
    const html = renderEmailHtml(previewConfig, previewVars, config.header_title || TEMPLATE_HEADERS[templateKind]);
    navigator.clipboard.writeText(html);
    toast.success("HTML copied to clipboard");
  };


  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  /** Per-recipient delivery status from the last send, keyed by registration id. */
  const [sendResults, setSendResults] = useState<Record<string, { status: string; error?: string }>>({});

  /** Records queued/sent/failed status per recipient so organizers see exactly who got the email. */
  const recordResults = (targets: string[], results?: any[]) => {
    setSendResults(prev => {
      const next = { ...prev };
      if (Array.isArray(results) && results.length > 0) {
        for (const r of results) {
          if (r?.registration_id) next[r.registration_id] = { status: r.status, error: r.error };
        }
      } else {
        for (const id of targets) next[id] = { status: "sent" };
      }
      return next;
    });
  };

  const sendEmails = async (ids?: string[]) => {
    const targets = ids && ids.length > 0 ? ids : selectedRecipients;
    if (targets.length === 0) {
      toast.error("Select at least one recipient");
      return;
    }
    setSending(true);
    setSendResults(prev => {
      const next = { ...prev };
      for (const id of targets) next[id] = { status: "pending" };
      return next;
    });
    try {
      console.log("[Email Templates] Sending template:", templateKind, "subject:", config.subject, "recipients:", targets.length);
      if (templateKind === "day_before") {
        const { data, error } = await supabase.functions.invoke("send-day-before-reminder", {
          body: { tournament_id: selectedTournament, registration_ids: targets },
        });
        if (error) throw error;
        recordResults(targets, data?.results);
        toast.success(`Sent ${data?.sent ?? 0} reminder(s)${data?.failed ? `, ${data.failed} failed` : ""}`);
        if (!ids) setSelectedRecipients([]);
        setSending(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("resend-confirmation", {
        body: { registration_ids: targets, use_custom_template: true, template_kind: templateKind },
      });
      if (error) throw error;
      recordResults(targets, data?.results);
      toast.success(`Sent ${data.sent} email(s)${data.failed ? `, ${data.failed} failed` : ""}`);
      if (!ids) setSelectedRecipients([]);
    } catch (e: any) {
      setSendResults(prev => {
        const next = { ...prev };
        for (const id of targets) next[id] = { status: "failed", error: e.message };
        return next;
      });
      toast.error(e.message || "Failed to send emails");
    }
    setSending(false);
  };

  /** Small inline badge showing this recipient's delivery result from the last send. */
  const DeliveryStatus = ({ id }: { id: string }) => {
    const r = sendResults[id];
    if (!r) return null;
    if (r.status === "pending") return <Badge variant="outline" className="text-xs">Queued…</Badge>;
    if (r.status === "sent") return <Badge className="text-xs bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Sent</Badge>;
    return (
      <Badge variant="destructive" className="text-xs" title={r.error || "Send failed"}>Failed</Badge>
    );
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

  const insertVariable = (field: "greeting" | "body_text" | "closing_text" | "footer_text" | "subject" | "header_title" | "schedule_override", variable: string) => {
    setConfig(prev => ({ ...prev, [field]: ((prev as any)[field] || "") + " " + variable }));
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
              <SelectItem value="sponsor_day_of">{TEMPLATE_LABELS.sponsor_day_of}</SelectItem>
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
                header_text_color: config.header_text_color,
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
          : templateKind === "sponsor_day_of"
            ? "Send event-day details to your sponsors — pick sponsors, add parking info and custom notes, preview, then send from the Send tab."
            : templateKind === "day_before"
            ? "This reminder is NOT sent on registration. Choose a send date and time below, or send it now — nothing goes out until you schedule or send it."
            : "Sent automatically when a player registers for this tournament."}
      </div>

      {templateKind === "day_before" && (
        <div className="bg-card rounded-lg border p-5 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" /> Reminder Scheduling
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Send Date &amp; Time</Label>
              <Input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className="mt-1" />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="auto-send" checked={autoSend} onCheckedChange={setAutoSend} />
              <Label htmlFor="auto-send" className="text-sm cursor-pointer">Send automatically at that time</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={saveSchedule} disabled={savingSchedule}>
                {savingSchedule ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Schedule
              </Button>
              <Button size="sm" variant="outline" onClick={sendNow} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Send Now
              </Button>
              <Button size="sm" variant="outline" onClick={sendTestEmail} disabled={sendingTest || !testEmail.trim()}>
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
                Test Email
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {sentAt
              ? `Last sent ${new Date(sentAt).toLocaleString()}.`
              : autoSend && sendAt
                ? `Scheduled to send ${new Date(sendAt).toLocaleString()}.`
                : "Not scheduled yet — turn on automatic sending or use Send Now."}
            {" "}Test emails go to <span className="font-medium text-foreground">{testEmail || "your account email"}</span>.
          </p>

          <div className="border-t pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Send this reminder to specific players
              </Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedRecipients.length === registrations.length && registrations.length > 0 ? "Deselect All" : "Select All"}
                </Button>
                <Badge variant="secondary">{selectedRecipients.length} selected</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Pick one player or a hand-picked group from your registration list — only the people you check receive this reminder.
            </p>
            <Input
              placeholder="Search by name or email…"
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
            />
            {registrations.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No registrations found for this tournament.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y border rounded">
                {registrations
                  .filter((r) => {
                    const q = recipientSearch.trim().toLowerCase();
                    if (!q) return true;
                    return `${r.first_name || ""} ${r.last_name || ""} ${r.email || ""}`.toLowerCase().includes(q);
                  })
                  .map((r) => (
                    <div key={r.id} className="flex items-center gap-3 py-2 px-2 hover:bg-muted/50">
                      <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(r.id)}
                          onChange={() => toggleRecipient(r.id)}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.first_name} {r.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.email || "No email on file"}</p>
                        </div>
                      </label>
                      <DeliveryStatus id={r.id} />
                      <Badge variant={r.payment_status === "paid" ? "default" : "secondary"} className="text-xs">
                        {r.payment_status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-8"
                        disabled={sending || !r.email}
                        onClick={() => sendEmails([r.id])}
                      >
                        <Send className="h-3.5 w-3.5" /> Send
                      </Button>
                    </div>
                  ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                onClick={() => sendEmails()}
                disabled={sending || selectedRecipients.length === 0}
                className="gap-2"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Reminder to {selectedRecipients.length} player{selectedRecipients.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm flex items-center gap-2 cursor-pointer" htmlFor="show-addons">
                <ShoppingBag className="h-4 w-4 text-secondary" /> Include the &ldquo;Don&rsquo;t Forget Your Mulligans!&rdquo; add-on section
              </Label>
              <Switch id="show-addons" checked={config.show_addons !== false} onCheckedChange={(v) => setConfig(p => ({ ...p, show_addons: v }))} />
            </div>
            {config.show_addons !== false && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Section Heading</Label>
                  <Input
                    value={config.addons_heading ?? "⛳ Don't Forget Your Mulligans!"}
                    onChange={(e) => setConfig(p => ({ ...p, addons_heading: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Intro Text</Label>
                  <Input
                    value={config.addons_intro ?? ""}
                    onChange={(e) => setConfig(p => ({ ...p, addons_intro: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground md:col-span-2">
                  {addons.length === 0
                    ? "No active add-ons yet — create them in Registration Management → Add-Ons and they will appear here automatically."
                    : `${addons.length} active add-on(s) will be listed with a “Purchase Now” link: ${addons.map(a => a.name).join(", ")}.`}
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Layout className="h-4 w-4 text-primary" /> Email Layout &amp; Section Order
            </p>
            <p className="text-xs text-muted-foreground">
              This is everything that appears in the reminder, top to bottom. Use the arrows to move a section, and the
              switch to remove it entirely. The colored header band, greeting, and the &ldquo;Sent by TeeVents&rdquo; footer stay fixed.
            </p>
            <div className="rounded-md border divide-y">
              {(config.section_order?.length ? config.section_order : DEFAULT_SECTION_ORDER).map((id, idx, arr) => {
                const meta = DAY_BEFORE_SECTIONS.find((s) => s.id === id);
                if (!meta) return null;
                const toggles: Record<string, { on: boolean; set: (v: boolean) => void } | null> = {
                  body: null,
                  closing: null,
                  footer: null,
                  schedule: { on: config.show_schedule !== false, set: (v) => setConfig(p => ({ ...p, show_schedule: v })) },
                  action_buttons: {
                    on: config.show_scoring_button !== false || config.show_leaderboard_button !== false,
                    set: (v) => setConfig(p => ({ ...p, show_scoring_button: v, show_leaderboard_button: v })),
                  },
                  homepage_button: { on: config.show_button !== false, set: (v) => setConfig(p => ({ ...p, show_button: v })) },
                  homepage_link: { on: !!config.show_homepage_link, set: (v) => setConfig(p => ({ ...p, show_homepage_link: v })) },
                  addons: { on: config.show_addons !== false, set: (v) => setConfig(p => ({ ...p, show_addons: v })) },
                };
                const t = toggles[id];
                return (
                  <div key={id} className="flex items-center gap-3 p-2.5">
                    <span className="text-xs text-muted-foreground w-5 text-center">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{meta.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{meta.hint}</p>
                    </div>
                    {t ? (
                      <Switch checked={t.on} onCheckedChange={t.set} aria-label={`Show ${meta.label}`} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Always</span>
                    )}
                    <div className="flex flex-col">
                      <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === 0} onClick={() => moveSection(id, -1)}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === arr.length - 1} onClick={() => moveSection(id, 1)}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Schedule Heading (blank to hide)</Label>
                <Input
                  value={config.schedule_heading ?? "🗓 Event Schedule"}
                  onChange={(e) => setConfig(p => ({ ...p, schedule_heading: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Homepage Link Label</Label>
                <Input
                  value={config.homepage_link_label ?? "🔗 Event Homepage"}
                  onChange={(e) => setConfig(p => ({ ...p, homepage_link_label: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>


          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Scoring &amp; Leaderboard Buttons</p>
            <p className="text-xs text-muted-foreground">
              Adds tap-friendly buttons to the reminder so players can jump straight into live scoring or the leaderboard.
              Links are generated automatically for this tournament.
            </p>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm cursor-pointer" htmlFor="show-scoring-btn">Include &ldquo;Enter My Scores&rdquo; button</Label>
              <Switch id="show-scoring-btn" checked={config.show_scoring_button !== false} onCheckedChange={(v) => setConfig(p => ({ ...p, show_scoring_button: v }))} />
            </div>
            {config.show_scoring_button !== false && (
              <Input
                value={config.scoring_button_text ?? "Enter My Scores"}
                onChange={(e) => setConfig(p => ({ ...p, scoring_button_text: e.target.value }))}
                placeholder="Enter My Scores"
              />
            )}
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm cursor-pointer" htmlFor="show-lb-btn">Include &ldquo;View Live Leaderboard&rdquo; button</Label>
              <Switch id="show-lb-btn" checked={config.show_leaderboard_button !== false} onCheckedChange={(v) => setConfig(p => ({ ...p, show_leaderboard_button: v }))} />
            </div>
            {config.show_leaderboard_button !== false && (
              <Input
                value={config.leaderboard_button_text ?? "View Live Leaderboard"}
                onChange={(e) => setConfig(p => ({ ...p, leaderboard_button_text: e.target.value }))}
                placeholder="View Live Leaderboard"
              />
            )}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "preview") refreshSelectedTournament(); }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="design" className="gap-1"><Palette className="h-4 w-4" /> Design</TabsTrigger>
          <TabsTrigger value="content" className="gap-1"><Type className="h-4 w-4" /> Content</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1"><Eye className="h-4 w-4" /> Preview</TabsTrigger>
          <TabsTrigger value="send" className="gap-1"><Send className="h-4 w-4" /> Send</TabsTrigger>
        </TabsList>

        {/* Design Tab */}
        <TabsContent value="design" className="space-y-6">
          <div className="space-y-4 bg-card rounded-lg border p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Layout className="h-4 w-4 text-primary" /> Header Band
            </h3>
            <p className="text-xs text-muted-foreground -mt-2">
              The colored bar at the top of the email that holds your logo and headline.
            </p>
            <div>
              <Label className="text-xs text-muted-foreground">Header Headline</Label>
              <Input
                data-field="header_title"
                value={config.header_title ?? TEMPLATE_HEADERS[templateKind]}
                onChange={e => setConfig(p => ({ ...p, header_title: e.target.value }))}
                placeholder={TEMPLATE_HEADERS[templateKind]}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Header Band Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={config.header_bg_color} onChange={e => setConfig(p => ({ ...p, header_bg_color: e.target.value }))} className="w-10 h-8 rounded cursor-pointer border-0" />
                  <Input value={config.header_bg_color} onChange={e => setConfig(p => ({ ...p, header_bg_color: e.target.value }))} className="text-xs h-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Headline Text Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={config.header_text_color || "#ffffff"} onChange={e => setConfig(p => ({ ...p, header_text_color: e.target.value }))} className="w-10 h-8 rounded cursor-pointer border-0" />
                  <Input value={config.header_text_color || "#ffffff"} onChange={e => setConfig(p => ({ ...p, header_text_color: e.target.value }))} className="text-xs h-8" />
                </div>
              </div>
            </div>
          </div>
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
                  const field = (active?.dataset?.field || active?.closest?.("[data-field]")?.getAttribute("data-field")) as any;
                  if (field) insertVariable(field, v.value);
                  else insertVariable(lastRichField, v.value);
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
              <Label>Header Headline</Label>
              <Input
                data-field="header_title"
                value={config.header_title ?? TEMPLATE_HEADERS[templateKind]}
                onChange={e => setConfig(p => ({ ...p, header_title: e.target.value }))}
                placeholder={TEMPLATE_HEADERS[templateKind]}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The large text inside the colored header band next to your logo. Reminders often go out several days
                early, so avoid wording like &ldquo;tomorrow&rdquo; unless that&rsquo;s exactly when you send.
              </p>
            </div>
            <div>
              <Label>Greeting</Label>
              <Input data-field="greeting" value={config.greeting} onChange={e => setConfig(p => ({ ...p, greeting: e.target.value }))} className="mt-1" />
            </div>
            <div data-field="body_text" onFocusCapture={() => setLastRichField("body_text")}>
              <Label>Body Text</Label>
              <RichTextEditor
                value={config.body_text}
                onChange={(html) => setConfig(p => ({ ...p, body_text: html }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use the toolbar to bold, add lists, links, colors and sizes. Variables above insert at the end of the
                focused field.
              </p>
            </div>
            {templateKind === "day_before" && (
              <div data-field="schedule_override" onFocusCapture={() => setLastRichField("schedule_override")}>
                <Label>Event Schedule (used for {"{{event_schedule}}"})</Label>
                <RichTextEditor
                  value={config.schedule_override ?? ""}
                  onChange={(html) => setConfig(p => ({ ...p, schedule_override: html }))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  One item per line — each line stays short and readable on phones. Leave blank to use the schedule
                  from your event page.
                </p>
              </div>
            )}
            <div data-field="closing_text" onFocusCapture={() => setLastRichField("closing_text")}>
              <Label>Closing Text</Label>
              <RichTextEditor
                value={config.closing_text}
                onChange={(html) => setConfig(p => ({ ...p, closing_text: html }))}
                className="mt-1"
              />
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
              __html: renderEmailHtml(previewConfig, previewVars, config.header_title || TEMPLATE_HEADERS[templateKind], {
                includePlayerHub: templateKind === "confirmation",
                addons: templateKind === "day_before" ? addons : [],
                addonBaseUrl: previewVars.event_homepage,
                showActionButtons: templateKind === "day_before",
                sectionOrder: templateKind === "day_before" ? (previewConfig.section_order || DEFAULT_SECTION_ORDER) : undefined,

              })
            }} />

          </div>
        </TabsContent>


        {/* Send Tab */}
        <TabsContent value="send" className="space-y-4">
          {templateKind === "sponsor_day_of" && selectedTournament && org && (
            <SponsorDayOfSender
              tournamentId={selectedTournament}
              organizationId={org.orgId}
              subjectTemplate={config.subject}
              baseVars={previewVars}
              renderHtml={(vars) =>
                renderEmailHtml(
                  config,
                  { ...previewVars, ...vars },
                  config.header_title || TEMPLATE_HEADERS.sponsor_day_of,
                )
              }
            />
          )}
          {(templateKind === "sponsor" || templateKind === "vendor") && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-sm">
              <strong>Heads up:</strong> The {TEMPLATE_LABELS[templateKind]} template is saved and will apply automatically to future {templateKind} confirmations. Bulk resend from this screen currently supports registrants only — use the {templateKind === "sponsor" ? "Sponsors" : "Vendors"} page to manage individual {templateKind} records.
            </div>
          )}
          {templateKind !== "sponsor" && templateKind !== "vendor" && templateKind !== "sponsor_day_of" && (
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
                    <DeliveryStatus id={r.id} />
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
            <Button onClick={() => setConfirmSendOpen(true)} disabled={sending || selectedRecipients.length === 0} className="gap-2">
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

      {/* Send Confirmation Modal */}
      <Dialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Send Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm">
            <p className="text-muted-foreground">You are about to send the following email:</p>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
              <p><strong>Template:</strong> {TEMPLATE_LABELS[templateKind]}</p>
              <p><strong>Subject:</strong> {replaceVariablesPlain(config.subject, previewVars)}</p>
              <p><strong>Recipients:</strong> {selectedRecipients.length} player{selectedRecipients.length === 1 ? "" : "s"}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmSendOpen(false)}>Cancel</Button>
              <Button
                className="gap-2"
                disabled={sending}
                onClick={async () => { setConfirmSendOpen(false); await sendEmails(); }}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Confirm Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
  leaderboard_link: "https://www.teevents.golf/live/sample",
  event_homepage: "https://www.teevents.golf/t/sample",
};

function replaceVariablesPlain(text: string, vars: Record<string, string>): string {
  const merged = { ...SAMPLE_VARS, ...vars };
  return (text || "").replace(/\{\{(\w+)\}\}/g, (_m, k: string) => merged[k] ?? "");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** True when organizer content was authored with the rich-text toolbar. */
function isHtmlContent(s?: string): boolean {
  return /<(p|br|div|ul|ol|li|strong|em|u|s|h[1-3]|a|span|img|blockquote)\b/i.test(s || "");
}

function replaceVariables(text: string, vars: Record<string, string>): string {
  const merged = { ...SAMPLE_VARS, ...vars };
  if (isHtmlContent(text)) {
    // A block schedule cannot legally sit inside a paragraph. Rich-text editors
    // commonly wrap the variable in <p>, so unwrap it before inserting headings/lists.
    return (text || "")
      .replace(/<p(?:\s[^>]*)?>\s*\{\{event_schedule\}\}\s*<\/p>/gi, merged.event_schedule || "")
      .replace(/\{\{(\w+)\}\}/g, (_m, k: string) => merged[k] ?? "");
  }
  return escapeHtml(text || "")
    .replace(/\{\{(\w+)\}\}/g, (_m, k: string) => merged[k] ?? "")
    .replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:#1a5c38;font-weight:600;">${u}</a>`)
    .replace(/\n/g, "<br/>");
}

function removeDuplicateLeaderboardText(text: string): string {
  return (text || "")
    .replace(/<p[^>]*>\s*View the live leaderboard:\s*<\/p>\s*<p[^>]*>\s*👉\s*\{\{leaderboard_link\}\}\s*<\/p>/gi, "")
    .replace(/(?:<p[^>]*>)?\s*View the live leaderboard:\s*(?:<br\s*\/?>(?:\s|&nbsp;)*)?👉\s*\{\{leaderboard_link\}\}\s*(?:<\/p>)?/gi, "")
    .replace(/\n*View the live leaderboard:\s*\n\s*👉\s*\{\{leaderboard_link\}\}/gi, "")
    .trim();
}

/** Pull the legacy schedule / homepage lines out of the body so they become their own movable blocks. */
function stripLegacyDayBeforeBlocks(bt: string): string {
  return (bt || "")
    .replace(/<p[^>]*>\s*(?:🗓\s*)?Event Schedule:?\s*<\/p>/gi, "")
    .replace(/<p[^>]*>\s*\{\{event_schedule\}\}\s*<\/p>/gi, "")
    .replace(/<p[^>]*>\s*🔗?\s*Event Homepage:?\s*\{\{event_homepage\}\}\s*<\/p>/gi, "")
    .replace(/(?:🗓\s*)?Event Schedule:?\s*\n?/gi, "")
    .replace(/🔗?\s*Event Homepage:?\s*\{\{event_homepage\}\}/gi, "")
    .replace(/\{\{event_schedule\}\}/g, "")
    .replace(/\{\{event_homepage\}\}/g, "")
    .replace(/(?:<p[^>]*>\s*(?:<br\s*\/?>)?\s*<\/p>\s*)+$/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Normalizes a Day Before reminder config: every block (body, schedule, closing,
 * buttons, homepage link, add-ons, footer) is independent and ordered by
 * `section_order`, so organizers can move or remove any of them.
 */
function normalizeDayBefore(cfg: EmailConfig): EmailConfig {
  const hadHomepage = /\{\{event_homepage\}\}/i.test(String(cfg.body_text || ""));
  const stored = Array.isArray(cfg.section_order) ? cfg.section_order.filter((s) => DEFAULT_SECTION_ORDER.includes(s)) : [];
  const order = stored.length
    ? [...stored, ...DEFAULT_SECTION_ORDER.filter((s) => !stored.includes(s))]
    : [...DEFAULT_SECTION_ORDER];
  return {
    ...cfg,
    body_text: stripLegacyDayBeforeBlocks(String(cfg.body_text || "")),
    closing_text: removeDuplicateLeaderboardText(
      String(cfg.closing_text ?? "").replace(/\{\{scoring_link\}\}\./g, "{{scoring_link}}"),
    ),
    show_schedule: cfg.show_schedule ?? true,
    schedule_heading: cfg.schedule_heading ?? "🗓 Event Schedule",
    show_homepage_link: cfg.show_homepage_link ?? (cfg.section_order ? false : hadHomepage),
    homepage_link_label: cfg.homepage_link_label ?? "🔗 Event Homepage",
    section_order: order,
  };
}



function renderActionButtons(opts: {
  primary: string;
  scoring: { url: string; text: string } | null;
  leaderboard: { url: string; text: string } | null;
}): string {
  const cells: string[] = [];
  if (opts.scoring) {
    cells.push(`<a href="${opts.scoring.url}" style="display:inline-block;margin:6px;padding:13px 26px;background-color:#F5A623;color:#1a5c38;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;">⛳ ${escapeHtml(opts.scoring.text)}</a>`);
  }
  if (opts.leaderboard) {
    cells.push(`<a href="${opts.leaderboard.url}" style="display:inline-block;margin:6px;padding:13px 26px;background-color:${opts.primary};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;">📊 ${escapeHtml(opts.leaderboard.text)}</a>`);
  }
  if (!cells.length) return "";
  return `<div style="text-align:center;margin:22px 0;padding:18px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">${cells.join("")}</div>`;
}

function renderEmailHtml(
  config: EmailConfig,
  vars: Record<string, string>,
  headerText: string = "Registration Confirmed!",
  opts?: { includePlayerHub?: boolean; hubUrl?: string; qrImg?: string; addons?: any[]; addonBaseUrl?: string; showActionButtons?: boolean; sectionOrder?: string[] },
): string {
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

  const scoringUrl = vars.scoring_link || SAMPLE_VARS.scoring_link;
  const leaderboardUrl = vars.leaderboard_link || SAMPLE_VARS.leaderboard_link;
  const actionButtonsHtml = opts?.showActionButtons
    ? renderActionButtons({
        primary: config.primary_color,
        scoring: config.show_scoring_button !== false ? { url: scoringUrl, text: config.scoring_button_text || "Enter My Scores" } : null,
        leaderboard: config.show_leaderboard_button !== false ? { url: leaderboardUrl, text: config.leaderboard_button_text || "View Live Leaderboard" } : null,
      })
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

  const addonList = opts?.addons || [];
  const addonBase = opts?.addonBaseUrl || vars.event_homepage || "https://www.teevents.golf";
  const money = (c: number) => `$${((c || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const addonsInner = `
        <p style="margin:0 0 6px;color:${config.primary_color};font-size:17px;font-weight:700;">${escapeHtml(config.addons_heading || "⛳ Don't Forget Your Mulligans!")}</p>
        ${config.addons_intro ? `<p style="margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.5;">${escapeHtml(config.addons_intro)}</p>` : ""}
        ${addonList.map((a: any) => `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;">
            <tr>
              <td style="padding:12px 14px;font-size:14px;color:${config.text_color};">
                <strong>${escapeHtml(a.name || "")}</strong> — ${money(a.price_cents)}
                ${a.description ? `<br/><span style="color:#6b7280;font-size:12px;">${escapeHtml(a.description)}</span>` : ""}
              </td>
              <td align="right" style="padding:12px 14px;">
                <a href="${addonBase}/add-ons?addon=${a.id}" style="display:inline-block;padding:9px 16px;background-color:#F5A623;color:#1a5c38;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700;white-space:nowrap;">Purchase Now</a>
              </td>
            </tr>
          </table>`).join("")}`;
  const showAddons = config.show_addons !== false && addonList.length > 0;
  const addonsHtml = showAddons && !opts?.sectionOrder
    ? `<tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;background:#fffdf5;">${addonsInner}</td></tr>`
    : "";

  const richBlock = (html: string) =>
    `<div class="tv-rich" style="margin:0 0 14px;color:${config.text_color};font-size:15px;line-height:1.7;overflow-wrap:anywhere;word-break:normal;">${html}</div>`;
  const footerBlock = `<p style="margin:0 0 14px;color:${config.text_color};font-size:15px;line-height:1.7;">${footer}</p>`;

  // Day-before reminders render every block independently, in the organizer's order.
  const homepageUrl = config.button_url || vars.event_homepage || "https://www.teevents.golf";
  const orderedBlocks = (opts?.sectionOrder || [])
    .map((id) => {
      switch (id) {
        case "body":
          return body?.trim() ? richBlock(body) : "";
        case "schedule":
          return config.show_schedule !== false && vars.event_schedule
            ? `${config.schedule_heading ? `<p style="margin:18px 0 8px;color:${config.text_color};font-size:15px;font-weight:700;">${escapeHtml(config.schedule_heading)}</p>` : ""}${richBlock(vars.event_schedule)}`
            : "";
        case "closing":
          return closing?.trim() ? richBlock(closing) : "";
        case "action_buttons":
          return actionButtonsHtml;
        case "homepage_button":
          return config.show_button !== false && config.button_text
            ? `<div style="text-align:center;margin:24px 0;"><a href="${homepageUrl}" style="display:inline-block;padding:12px 28px;background:#F5A623;color:#1a5c38;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;">${escapeHtml(config.button_text)}</a></div>`
            : "";
        case "homepage_link":
          return config.show_homepage_link
            ? `<p style="margin:0 0 14px;color:${config.text_color};font-size:15px;line-height:1.7;">${escapeHtml(config.homepage_link_label || "🔗 Event Homepage")}: <a href="${homepageUrl}" style="color:${config.primary_color};font-weight:600;">${homepageUrl}</a></p>`
            : "";
        case "addons":
          return showAddons
            ? `<div style="margin:22px 0;padding:20px;border:1px solid #e5e7eb;border-radius:8px;background:#fffdf5;">${addonsInner}</div>`
            : "";
        case "footer":
          return footerBlock;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("");

  const contentHtml = opts?.sectionOrder
    ? orderedBlocks
    : `${richBlock(body)}${eventDetailsHtml}${richBlock(closing)}${actionButtonsHtml}${buttonHtml}<p style="margin:0;color:${config.text_color};font-size:15px;line-height:1.7;">${footer}</p>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  .tv-rich h1, .tv-rich h2 { margin:0 0 10px;font-size:17px;line-height:1.35;font-weight:700; }
  .tv-rich h3 { margin:20px 0 8px;font-size:15px;line-height:1.4;font-weight:700; }
  .tv-rich h3:first-child { margin-top:0; }
  .tv-rich p { margin:0;line-height:1.55; }
  .tv-rich p + p { margin-top:14px; }
  .tv-rich ul, .tv-rich ol { margin:6px 0 16px;padding-left:22px; }
  .tv-rich li { margin:0 0 6px;line-height:1.5; }
  .tv-rich section { margin:0 0 18px;padding:0 0 18px;border-bottom:1px solid #e5e7eb; }
  .tv-rich section:last-child { margin-bottom:0;padding-bottom:0;border-bottom:0; }
  @media only screen and (max-width:600px) {
    .tv-wrap { padding:16px 10px !important; }
    .tv-card { width:100% !important; }
    .tv-pad { padding:20px 18px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${config.font_family};">
  <table width="100%" cellpadding="0" cellspacing="0" class="tv-wrap" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" class="tv-card" style="max-width:100%;background:${config.secondary_color};border-radius:8px;overflow:hidden;">
        <tr><td class="tv-pad" style="background:${config.header_bg_color};padding:28px 32px;text-align:center;">
          ${logoHtml}
          <h1 style="margin:0;color:${config.header_text_color || "#ffffff"};font-size:22px;font-weight:700;">${headerText}</h1>
        </td></tr>
        <tr><td class="tv-pad" style="padding:32px;">
          <p style="margin:0 0 14px;color:${config.text_color};font-size:15px;line-height:1.7;"><strong>${greeting}</strong></p>
          ${contentHtml}
        </td></tr>${addonsHtml}${hubBlock}

        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:${config.primary_color};">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
