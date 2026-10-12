import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ToolboxFileThumb from "@/components/toolbox/ToolboxFileThumb";
import { itemCount, signedUrl, type Toolbox, type ToolboxFile } from "@/lib/organizerToolbox";

type Row = Toolbox & { id: string; user_id: string | null; orgName: string; eventName: string | null; email: string | null; contactName: string | null };

export default function OrganizerToolboxes() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedOrg = params.get("org");
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = async () => {
    const { data: tbs } = await (supabase as any).from("organizer_toolboxes").select("*").order("updated_at", { ascending: false }).limit(1000);
    const list = (tbs || []) as (Toolbox & { id: string; user_id: string | null })[];
    const orgIds = list.map(t => t.organization_id);
    const userIds = list.map(t => t.user_id).filter(Boolean) as string[];
    const [orgs, events, vet] = await Promise.all([
      orgIds.length ? supabase.from("organizations").select("id, name").in("id", orgIds) : Promise.resolve({ data: [] as any[] }),
      orgIds.length ? supabase.from("tournaments").select("organization_id, title, created_at").in("organization_id", orgIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabase.from("signup_vetting").select("user_id, email, full_name").in("user_id", userIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const orgName = new Map((orgs.data || []).map((o: any) => [o.id, o.name]));
    const evName = new Map<string, string>();
    for (const e of (events.data || []) as any[]) if (!evName.has(e.organization_id)) evName.set(e.organization_id, e.title);
    const v = new Map((vet.data || []).map((r: any) => [r.user_id, r]));
    setRows(list.map(t => ({ ...t, orgName: orgName.get(t.organization_id) || "Unknown organization", eventName: evName.get(t.organization_id) || null,
      email: (v.get(t.user_id || "") as any)?.email || null, contactName: (v.get(t.user_id || "") as any)?.full_name || null })));
  };
  useEffect(() => { load(); }, []);

  const current = rows?.find(r => r.organization_id === selectedOrg) || null;

  const markReviewed = async (r: Row) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("organizer_toolboxes").update({ reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq("id", r.id);
    if (error) return toast.error("Could not mark as reviewed.");
    toast.success("Marked as reviewed. The organizer will see this in their toolbox.");
    load();
  };

  const allFiles = (r: Row): ToolboxFile[] => [r.logo, r.hero_image, ...r.sponsor_logos, ...r.documents, ...r.gallery].filter(Boolean) as ToolboxFile[];

  const downloadAll = async (r: Row) => {
    const files = allFiles(r);
    if (!files.length) return toast.info("No files uploaded yet.");
    for (const f of files) {
      const url = await signedUrl(f.path);
      if (!url) continue;
      const blob = await (await fetch(url)).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = f.name; a.click();
      URL.revokeObjectURL(a.href);
      await new Promise(res => setTimeout(res, 300));
    }
  };

  if (!rows) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (current) {
    const c = current.brand_colors || {};
    const Group = ({ title, files }: { title: string; files: ToolboxFile[] }) => <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-3 font-display text-lg font-bold text-primary">{title}</h2>
      {files.length ? <div className="flex flex-wrap gap-4">{files.map(f => <div key={f.path} className="flex flex-col items-center gap-1"><ToolboxFileThumb file={f} size="h-28 w-28" />{f.label && <span className="text-xs text-muted-foreground">{f.label}</span>}</div>)}</div> : <p className="text-sm text-muted-foreground">Nothing uploaded.</p>}
    </section>;
    return <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
      <Button variant="ghost" onClick={() => setParams({})}><ArrowLeft className="h-4 w-4" /> All Toolboxes</Button>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{current.orgName}</h1>
          <p className="text-muted-foreground">{current.eventName || "No event yet"}{current.contactName ? ` · ${current.contactName}` : ""}{current.email ? ` · ${current.email}` : ""}</p>
          <p className="mt-1 text-sm text-muted-foreground">{itemCount(current)} items · Last updated {new Date(current.updated_at!).toLocaleString("en-US")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {current.reviewed_at ? <Badge className="h-9 px-3"><CheckCircle2 className="mr-1 h-4 w-4" />Reviewed</Badge> : <Button variant="secondary" onClick={() => markReviewed(current)}><CheckCircle2 className="h-4 w-4" /> Mark as Reviewed</Button>}
          <Button variant="outline" disabled={!current.email} onClick={() => { window.location.href = `mailto:${current.email}?subject=${encodeURIComponent("Your TeeVents Organizer Toolbox")}`; }}><Mail className="h-4 w-4" /> Send Message to Organizer</Button>
          <Button variant="outline" onClick={() => downloadAll(current)}><Download className="h-4 w-4" /> Download All Assets</Button>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Group title="Event Logo" files={current.logo ? [current.logo] : []} />
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-primary">Brand Colors</h2>
          <div className="flex flex-wrap gap-4">{(["primary", "secondary", "accent"] as const).map(k => <div key={k} className="flex items-center gap-2 text-sm capitalize"><span className="h-8 w-8 rounded border border-border" style={{ background: c[k] || "transparent" }} />{k}: {c[k] || "Not set"}</div>)}</div>
        </section>
      </div>
      <Group title="Hero Image" files={current.hero_image ? [current.hero_image] : []} />
      <Group title={`Sponsor Logos (${current.sponsor_logos.length})`} files={current.sponsor_logos} />
      <Group title={`Event Documents (${current.documents.length})`} files={current.documents} />
      <Group title={`Photo Gallery (${current.gallery.length})`} files={current.gallery} />
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-2 font-display text-lg font-bold text-primary">Additional Notes</h2>
        <p className="whitespace-pre-wrap text-sm">{current.additional_notes || "None provided."}</p>
        <h2 className="mb-2 mt-5 font-display text-lg font-bold text-primary">Anything else you want us to know?</h2>
        <p className="whitespace-pre-wrap text-sm">{current.anything_else || "None provided."}</p>
      </section>
    </div>;
  }

  return <div className="mx-auto max-w-6xl p-4 md:p-8">
    <Button variant="ghost" onClick={() => navigate("/admin")}><ArrowLeft className="h-4 w-4" /> Back to Admin</Button>
    <h1 className="mt-3 font-display text-2xl font-bold text-foreground md:text-3xl">Organizer Toolboxes</h1>
    <p className="mb-6 text-muted-foreground">Everything organizers want on their event sites, ready for rep review.</p>
    {rows.length === 0 ? <p className="text-muted-foreground">No toolboxes yet.</p> : <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left"><tr><th className="p-3">Organizer</th><th className="p-3">Event</th><th className="p-3">Date Submitted</th><th className="p-3">Items</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id} className="border-t border-border">
          <td className="p-3"><div className="font-medium">{r.contactName || r.orgName}</div><div className="text-xs text-muted-foreground">{r.orgName}</div></td>
          <td className="p-3">{r.eventName || "No event yet"}</td>
          <td className="p-3">{new Date(r.updated_at || r.created_at!).toLocaleDateString("en-US")}</td>
          <td className="p-3">{itemCount(r)}</td>
          <td className="p-3">{r.reviewed_at ? <Badge>Reviewed</Badge> : <Badge variant="outline">Not reviewed</Badge>}</td>
          <td className="p-3 text-right"><Button size="sm" variant="secondary" onClick={() => setParams({ org: r.organization_id })}>View Toolbox</Button></td>
        </tr>)}</tbody>
      </table>
    </div>}
  </div>;
}
