import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import StickySaveBar from "@/components/dashboard/StickySaveBar";
import { toast } from "sonner";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";

interface CustomSection {
  id: string;
  title: string;
  content: string;
}

interface Tournament {
  id: string;
  title: string;
  about_us: string | null;
  mission_statement: string | null;
  vision_statement: string | null;
  history: string | null;
  org_contact_email: string | null;
  org_contact_phone: string | null;
  org_address: string | null;
  show_org_tab: boolean | null;
  custom_org_sections: CustomSection[] | null;
}

const MAX_LONG = 5000;
const MAX_SHORT = 2000;

const PLACEHOLDERS = {
  about_us: "Tell golfers about your organization. What do you do? Why do you run this tournament?",
  mission_statement: "Describe your organization's purpose and goals.",
  vision_statement: "Share your long-term aspirations.",
  history: "Share your tournament's story — when did it start? How has it grown?",
};

const OrganizationInfo = () => {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showTab, setShowTab] = useState(true);
  const [aboutUs, setAboutUs] = useState("");
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [history, setHistory] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, about_us, mission_statement, vision_statement, history, org_contact_email, org_contact_phone, org_address, show_org_tab, custom_org_sections")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const t = ((data as unknown) as Tournament[]) || [];
        setTournaments(t);
        if (t.length > 0) setSelected(pickTournamentId(t));
        setLoading(false);
      });
  }, [org]);

  useEffect(() => {
    const t = tournaments.find((x) => x.id === selected);
    if (!t) return;
    setShowTab(t.show_org_tab ?? true);
    setAboutUs(t.about_us || "");
    setMission(t.mission_statement || "");
    setVision(t.vision_statement || "");
    setHistory(t.history || "");
    setEmail(t.org_contact_email || "");
    setPhone(t.org_contact_phone || "");
    setAddress(t.org_address || "");
    setCustomSections(Array.isArray(t.custom_org_sections) ? t.custom_org_sections : []);
  }, [selected, tournaments]);

  const addCustomSection = () => {
    setCustomSections((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", content: "" },
    ]);
  };

  const updateCustomSection = (id: string, patch: Partial<CustomSection>) => {
    setCustomSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeCustomSection = (id: string) => {
    setCustomSections((prev) => prev.filter((s) => s.id !== id));
  };

  const save = async () => {
    if (demoGuard()) return;
    setSaving(true);
    const cleanedCustom = customSections
      .map((s) => ({ id: s.id, title: s.title.trim(), content: s.content.trim() }))
      .filter((s) => s.title || s.content);
    const { error } = await supabase
      .from("tournaments")
      .update({
        show_org_tab: showTab,
        about_us: aboutUs.trim() || null,
        mission_statement: mission.trim() || null,
        vision_statement: vision.trim() || null,
        history: history.trim() || null,
        org_contact_email: email.trim() || null,
        org_contact_phone: phone.trim() || null,
        org_address: address.trim() || null,
        custom_org_sections: cleanedCustom,
      } as any)
      .eq("id", selected);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Organization info saved!");
      setCustomSections(cleanedCustom);
      setTournaments((prev) =>
        prev.map((t) =>
          t.id === selected
            ? { ...t, show_org_tab: showTab, about_us: aboutUs, mission_statement: mission, vision_statement: vision, history, org_contact_email: email, org_contact_phone: phone, org_address: address, custom_org_sections: cleanedCustom }
            : t,
        ),
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-20">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-display font-bold text-foreground mb-2">No Tournaments Yet</h2>
        <p className="text-muted-foreground">Create a tournament first to add organization info.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Organization Info</h1>
          <p className="text-muted-foreground mt-1">
            Tell golfers and sponsors about the organization behind your tournament.
          </p>
        </div>
        {tournaments.length > 1 && (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
          <div>
            <Label className="text-sm font-semibold">Show "About the Organizer" tab on public page</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              The tab appears only when at least one section below has content.
            </p>
          </div>
          <Switch checked={showTab} onCheckedChange={setShowTab} />
        </div>

        <Field label="About Us" value={aboutUs} setValue={setAboutUs} max={MAX_LONG} placeholder={PLACEHOLDERS.about_us} rows={5} />
        <Field label="Mission Statement" value={mission} setValue={setMission} max={MAX_SHORT} placeholder={PLACEHOLDERS.mission_statement} rows={3} />
        <Field label="Vision Statement" value={vision} setValue={setVision} max={MAX_SHORT} placeholder={PLACEHOLDERS.vision_statement} rows={3} />
        <Field label="History" value={history} setValue={setHistory} max={MAX_LONG} placeholder={PLACEHOLDERS.history} rows={5} />

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Additional Contact Info (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Shown alongside your tournament-level contact info. Leave blank to use only the tournament contact.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            <Input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={50} />
          </div>
          <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={500} />
        </div>

        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Custom Sections</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add your own titled sections (e.g. "Beneficiary", "Our Team", "Sponsors Spotlight").
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCustomSection}>
              <Plus className="h-4 w-4 mr-1" /> Add Section
            </Button>
          </div>

          {customSections.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No custom sections yet.</p>
          )}

          {customSections.map((s) => (
            <div key={s.id} className="rounded-lg border border-border p-4 space-y-3 bg-muted/10">
              <div className="flex items-start gap-2">
                <Input
                  placeholder="Section title (e.g. Beneficiary)"
                  value={s.title}
                  maxLength={100}
                  onChange={(e) => updateCustomSection(s.id, { title: e.target.value })}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomSection(s.id)} aria-label="Remove section">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Description</span>
                  <span className="text-xs text-muted-foreground">{s.content.length}/{MAX_LONG}</span>
                </div>
                <Textarea
                  rows={4}
                  placeholder="Tell golfers more about this..."
                  value={s.content}
                  onChange={(e) => e.target.value.length <= MAX_LONG && updateCustomSection(s.id, { content: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: Press Enter twice for a paragraph break. Plain text only — formatting is rendered cleanly on your public site.
        </p>

        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Organization Info
        </Button>
      </motion.div>
      <StickySaveBar onSave={save} disabled={saving} />
    </div>
  );
};

interface FieldProps {
  label: string;
  value: string;
  setValue: (v: string) => void;
  max: number;
  placeholder: string;
  rows: number;
}

const Field = ({ label, value, setValue, max, placeholder, rows }: FieldProps) => (
  <div>
    <div className="flex items-baseline justify-between mb-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      <span className="text-xs text-muted-foreground">{value.length}/{max}</span>
    </div>
    <Textarea
      value={value}
      onChange={(e) => e.target.value.length <= max && setValue(e.target.value)}
      rows={rows}
      placeholder={placeholder}
    />
  </div>
);

export default OrganizationInfo;
