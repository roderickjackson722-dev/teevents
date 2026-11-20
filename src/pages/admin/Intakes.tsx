import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INTAKE_STATUSES, STATUS_LABELS, TOURNAMENT_LABELS, LEAGUE_LABELS, CONTACT_LABELS, intakeValue } from "@/lib/intake.schema";

type Row = { id: string; interest_area: "tournament" | "league"; status: string; details: Record<string, any>; contact: Record<string, any>; submitted_at: string | null; created_at: string };

export default function AdminIntakes() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const load = async () => {
    const { data } = await (supabase as any).from("organizer_intakes").select("*").neq("status", "not_submitted").order("submitted_at", { ascending: false }).limit(500);
    setRows((data || []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const open = async (r: Row) => {
    setOpenId(r.id); setDraft(JSON.parse(JSON.stringify(r))); setLogoUrl(null);
    if (r.details["logoPath"]) {
      const { data } = await supabase.storage.from("organizer-toolbox").createSignedUrl(r.details["logoPath"], 600);
      setLogoUrl(data?.signedUrl || null);
    }
  };
  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await (supabase as any).from("organizer_intakes").update({ status: draft.status, details: draft.details, contact: draft.contact, updated_at: new Date().toISOString() }).eq("id", draft.id);
    setSaving(false);
    if (error) { toast.error("Could not save changes."); return; }
    toast.success("Intake saved."); setOpenId(null); load();
  };

  const editable = (group: "details" | "contact", key: string, label: string) => {
    if (!draft) return null;
    const v = draft[group][key];
    if (group === "details" && key === "logoPath") return <div key={key}><Label>{label}</Label><p className="text-sm mt-1">{logoUrl ? <a className="text-primary underline" href={logoUrl} target="_blank" rel="noreferrer">Open logo</a> : "Will send later"}</p></div>;
    if (typeof v === "boolean") return null;
    const shown = Array.isArray(v) ? v.join(", ") : v ?? "";
    return <div key={key}><Label htmlFor={`${group}-${key}`}>{label}</Label><Input id={`${group}-${key}`} value={shown} onChange={e => setDraft({ ...draft, [group]: { ...draft[group], [key]: Array.isArray(v) ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : e.target.value } })} /></div>;
  };

  return <div className="min-h-screen bg-background p-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" onClick={() => navigate("/admin")}><ArrowLeft className="h-4 w-4 mr-2" />Back to admin</Button>
      <h1 className="text-2xl font-bold">New intakes</h1>
      {!rows ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? <p className="text-muted-foreground">No submitted intakes yet.</p> :
        <div className="divide-y divide-border rounded-md border border-border">
          {rows.map(r => <div key={r.id} className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">{r.interest_area === "league" ? "League" : "Tournament"}</Badge>
              <Badge>{STATUS_LABELS[r.status as keyof typeof STATUS_LABELS] || r.status}</Badge>
              <span className="font-semibold">{r.details["eventName"] || r.details["leagueName"]}</span>
              <span className="text-sm text-muted-foreground">{r.contact["organization_name"]} · {r.contact["full_legal_name"]}</span>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => openId === r.id ? setOpenId(null) : open(r)}>{openId === r.id ? "Close" : "View and edit"}</Button>
            </div>
            {openId === r.id && draft && <div className="space-y-5">
              <div className="max-w-xs"><Label>Status</Label><Select value={draft.status} onValueChange={v => setDraft({ ...draft, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INTAKE_STATUSES.filter(s => s !== "not_submitted").map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent></Select></div>
              {(r.interest_area === "tournament" ? draft.details["dateNotSet"] : draft.details["datesNotSet"]) && <p className="text-sm text-muted-foreground">{intakeValue(r.interest_area, draft.details, r.interest_area === "tournament" ? "eventDate" : "seasonStart")}</p>}
              <div className="grid gap-3 sm:grid-cols-2">{(r.interest_area === "tournament" ? TOURNAMENT_LABELS : LEAGUE_LABELS).map(([k, l]) => editable("details", k as string, l))}</div>
              <h2 className="font-semibold">Contact and organization</h2>
              <div className="grid gap-3 sm:grid-cols-2">{CONTACT_LABELS.map(([k, l]) => editable("contact", k, l))}{editable("contact", "organization_website", "Organization Website URL")}</div>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
            </div>}
          </div>)}
        </div>}
    </div>
  </div>;
}
