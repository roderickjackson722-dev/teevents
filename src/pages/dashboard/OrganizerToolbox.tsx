import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X, CheckCircle2, Clock, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import ToolboxFileThumb from "@/components/toolbox/ToolboxFileThumb";
import { TOOLBOX_BUCKET, emptyToolbox, itemCount, loadToolbox, sectionsComplete, type Toolbox, type ToolboxFile } from "@/lib/organizerToolbox";

const IMG = "image/png,image/jpeg";
const IMG_SVG = "image/png,image/jpeg,image/svg+xml";
const DOCS = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function Section({ title, hint, done, children }: { title: string; hint: string; done: boolean; children: React.ReactNode }) {
  return <section className="rounded-lg border border-border bg-card p-5">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div><h2 className="font-display text-lg font-bold text-primary">{title}</h2><p className="text-sm text-muted-foreground">{hint}</p></div>
      {done && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-label="Complete" />}
    </div>
    {children}
  </section>;
}

function UploadButton({ accept, multiple, onFiles, busy }: { accept: string; multiple?: boolean; onFiles: (f: File[]) => void; busy: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return <>
    <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden" onChange={e => { const f = Array.from(e.target.files || []); e.target.value = ""; if (f.length) onFiles(f); }} />
    <Button type="button" variant="outline" onClick={() => ref.current?.click()} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {multiple ? "Upload Files" : "Upload File"}
    </Button>
  </>;
}

export default function OrganizerToolbox({ embedded, onSaved }: { embedded?: boolean; onSaved?: (t: Toolbox) => void } = {}) {
  const { org, loading: orgLoading } = useOrgContext();
  const [tb, setTb] = useState<Toolbox | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!org) return;
    loadToolbox(org.orgId).then(t => setTb(t ?? emptyToolbox(org.orgId)));
  }, [org]);

  if (orgLoading || !tb || !org) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const upload = async (section: string, files: File[]): Promise<ToolboxFile[]> => {
    setBusy(section);
    const out: ToolboxFile[] = [];
    try {
      for (const f of files) {
        if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} is larger than 20MB.`); continue; }
        const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${org.orgId}/${section}/${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from(TOOLBOX_BUCKET).upload(path, f, { contentType: f.type || undefined });
        if (error) { toast.error(`Could not upload ${f.name}.`); continue; }
        out.push({ path, name: f.name, type: f.type });
      }
    } finally { setBusy(null); }
    setSaved(false);
    return out;
  };

  const update = (patch: Partial<Toolbox>) => { setTb(t => t ? { ...t, ...patch } : t); setSaved(false); };

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const row = {
      organization_id: org.orgId, user_id: user?.id ?? null, logo: tb.logo, brand_colors: tb.brand_colors,
      hero_image: tb.hero_image, sponsor_logos: tb.sponsor_logos, documents: tb.documents, gallery: tb.gallery,
      additional_notes: tb.additional_notes, anything_else: tb.anything_else, updated_at: new Date().toISOString(),
    };
    const { data, error } = await (supabase as any).from("organizer_toolboxes").upsert(row, { onConflict: "organization_id" }).select("*").single();
    setSaving(false);
    if (error) { toast.error("Could not save your toolbox. Please try again."); return; }
    setTb(data as Toolbox);
    setSaved(true);
    toast.success("Saved to your Organizer Toolbox.");
    onSaved?.(data as Toolbox);
  };

  const done = sectionsComplete(tb);
  const colors = tb.brand_colors || {};
  const removeFrom = (key: "sponsor_logos" | "documents" | "gallery", i: number) => update({ [key]: tb[key].filter((_, j) => j !== i) } as Partial<Toolbox>);

  const FileList = ({ k }: { k: "sponsor_logos" | "documents" | "gallery" }) => tb[k].length ? <ul className="mt-4 flex flex-wrap gap-3">
    {tb[k].map((f, i) => <li key={f.path} className="relative flex flex-col items-center gap-1">
      <ToolboxFileThumb file={f} />
      {k === "sponsor_logos" && <Input value={f.label || ""} placeholder="Sponsor name" className="h-8 w-28 text-xs" onChange={e => update({ sponsor_logos: tb.sponsor_logos.map((s, j) => j === i ? { ...s, label: e.target.value } : s) })} />}
      <button type="button" onClick={() => removeFrom(k, i)} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground" aria-label={`Remove ${f.name}`}><X className="h-3 w-3" /></button>
    </li>)}
  </ul> : null;

  return <div className="mx-auto max-w-4xl space-y-5 pb-12">
    {!embedded && <div>
      <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Organizer Toolbox</h1>
      <p className="mt-1 text-muted-foreground">Upload everything you want on your event page. Your TeeVents rep will review these items and add them to your site.</p>
    </div>}

    <div className="grid gap-4 rounded-lg border-2 border-secondary bg-primary p-5 text-primary-foreground sm:grid-cols-3">
      <div><p className="text-xs uppercase text-primary-foreground/70">Items uploaded</p><p className="font-display text-2xl font-bold">{itemCount(tb)}</p></div>
      <div><p className="text-xs uppercase text-primary-foreground/70">Last updated</p><p className="font-semibold">{tb.updated_at && tb.id ? new Date(tb.updated_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Not saved yet"}</p></div>
      <div><p className="text-xs uppercase text-primary-foreground/70">Rep status</p><p className="flex items-center gap-2 font-semibold">{tb.reviewed_at ? <><CheckCircle2 className="h-4 w-4 text-secondary" />Your rep has reviewed your toolbox</> : <><Clock className="h-4 w-4 text-secondary" />Your rep has not yet reviewed your toolbox</>}</p></div>
      <div className="sm:col-span-3"><div className="mb-1 flex justify-between text-sm"><span>{done} of 7 sections complete</span></div><Progress value={(done / 7) * 100} className="h-2 bg-primary-foreground/20" /></div>
    </div>

    <Section title="Event Logo" hint="Primary logo for the event. PNG, JPG, or SVG." done={!!tb.logo}>
      {tb.logo && <div className="mb-3 flex items-center gap-3"><ToolboxFileThumb file={tb.logo} size="h-24 w-24" /><Button variant="ghost" size="sm" onClick={() => update({ logo: null })}>Remove</Button></div>}
      <UploadButton accept={IMG_SVG} busy={busy === "logo"} onFiles={async f => { const [u] = await upload("logo", f); if (u) update({ logo: u }); }} />
    </Section>

    <Section title="Brand Colors" hint="Pick your primary, secondary, and accent colors." done={!!(colors.primary || colors.secondary || colors.accent)}>
      <div className="grid gap-4 sm:grid-cols-3">
        {(["primary", "secondary", "accent"] as const).map(key => <label key={key} className="flex items-center gap-3 text-sm font-medium capitalize">
          <input type="color" value={colors[key] || "#ffffff"} onChange={e => update({ brand_colors: { ...colors, [key]: e.target.value } })} className="h-10 w-12 cursor-pointer rounded border border-border" aria-label={`${key} color`} />
          <span>{key}<span className="block text-xs font-normal text-muted-foreground">{colors[key] || "Not set"}</span></span>
        </label>)}
      </div>
    </Section>

    <Section title="Hero Image" hint="Banner image for the top of your event page. PNG or JPG." done={!!tb.hero_image}>
      {tb.hero_image && <div className="mb-3 flex items-center gap-3"><ToolboxFileThumb file={tb.hero_image} size="h-24 w-40" /><Button variant="ghost" size="sm" onClick={() => update({ hero_image: null })}>Remove</Button></div>}
      <UploadButton accept={IMG} busy={busy === "hero"} onFiles={async f => { const [u] = await upload("hero", f); if (u) update({ hero_image: u }); }} />
    </Section>

    <Section title="Sponsor Logos" hint="Add as many sponsor logos as you like, with optional sponsor names. PNG, JPG, or SVG." done={tb.sponsor_logos.length > 0}>
      <UploadButton accept={IMG_SVG} multiple busy={busy === "sponsors"} onFiles={async f => { const u = await upload("sponsors", f); setTb(t => t ? { ...t, sponsor_logos: [...t.sponsor_logos, ...u] } : t); }} />
      <FileList k="sponsor_logos" />
    </Section>

    <Section title="Event Documents" hint="Waivers, rules sheets, course info, and schedules. PDF, DOC, or DOCX." done={tb.documents.length > 0}>
      <UploadButton accept={DOCS} multiple busy={busy === "documents"} onFiles={async f => { const u = await upload("documents", f); setTb(t => t ? { ...t, documents: [...t.documents, ...u] } : t); }} />
      <FileList k="documents" />
    </Section>

    <Section title="Photo Gallery" hint="Photos from past events or promotional shots. PNG or JPG." done={tb.gallery.length > 0}>
      <UploadButton accept={IMG} multiple busy={busy === "gallery"} onFiles={async f => { const u = await upload("gallery", f); setTb(t => t ? { ...t, gallery: [...t.gallery, ...u] } : t); }} />
      <FileList k="gallery" />
    </Section>

    <Section title="Additional Notes" hint="Anything else your rep should know about your event." done={!!(tb.additional_notes?.trim() || tb.anything_else?.trim())}>
      <Textarea rows={3} value={tb.additional_notes || ""} onChange={e => update({ additional_notes: e.target.value })} placeholder="Event details, schedule notes, special requests" />
    </Section>

    <div className="rounded-lg border border-border bg-card p-5">
      <label htmlFor="anything-else" className="font-display text-lg font-bold text-primary">Anything else you want us to know?</label>
      <Textarea id="anything-else" rows={5} className="mt-3" value={tb.anything_else || ""} onChange={e => update({ anything_else: e.target.value })}
        placeholder="Example: Please use our school's navy and gold colors, add our athletic director's name to the sponsors section, and include a shot of the 18th green as the hero image." />
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button variant="secondary" size="lg" onClick={save} disabled={saving || !!busy} className="font-semibold">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />} {embedded ? "SAVE AND CONTINUE" : "Save to Toolbox"}
      </Button>
      {saved && <p className="rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" role="status">Saved. Your TeeVents rep will see everything in this toolbox when they contact you within 1 business day.</p>}
    </div>
  </div>;
}
