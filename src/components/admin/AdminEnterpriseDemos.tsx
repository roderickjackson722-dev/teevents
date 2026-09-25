import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Copy, ExternalLink, Trash2 } from "lucide-react";

type Demo = { id: string; slug: string; club_name: string; event_name: string; recipient_name: string | null; recipient_email: string | null; view_count: number; created_at: string };

const blank = { club_name: "", event_name: "Member-Guest Classic", location: "", logo_url: "", primary_color: "#1a5c38", accent_color: "#F5A623", events: "", players: "", recipient_name: "", recipient_email: "" };

const AdminEnterpriseDemos = () => {
  const [list, setList] = useState<Demo[]>([]);
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);
  const db = supabase as any;

  const load = async () => {
    const { data } = await db.from("enterprise_demos").select("id,slug,club_name,event_name,recipient_name,recipient_email,view_count,created_at").order("created_at", { ascending: false });
    setList(data || []);
  };
  useEffect(() => { load(); }, []);

  const link = (slug: string) => `https://www.teevents.golf/enterprise-demo/${slug}`;
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.club_name.trim()) return toast.error("Club name is required");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const row: any = {
      club_name: f.club_name.trim(), event_name: f.event_name.trim() || "Member-Guest Classic",
      location: f.location || null, logo_url: f.logo_url || null,
      primary_color: f.primary_color, accent_color: f.accent_color,
      recipient_name: f.recipient_name || null, recipient_email: f.recipient_email || null, created_by: u.user?.id,
    };
    if (lines(f.events).length) row.events = lines(f.events);
    if (lines(f.players).length) row.players = lines(f.players);
    const { data, error } = await db.from("enterprise_demos").insert(row).select("slug").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    navigator.clipboard?.writeText(link(data.slug));
    toast.success("Demo created — link copied");
    setF(blank);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this demo?")) return;
    await db.from("enterprise_demos").delete().eq("id", id);
    load();
  };

  const input = "w-full rounded-md border border-border bg-background p-2 text-sm";
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Enterprise Demos</h2>
        <p className="text-sm text-muted-foreground">Build a custom Enterprise demo for a golf course and send them the link.</p>
      </div>
      <form onSubmit={create} className="grid md:grid-cols-2 gap-3 rounded-xl border border-border bg-card p-5">
        <input className={input} placeholder="Club name *" value={f.club_name} onChange={set("club_name")} />
        <input className={input} placeholder="Featured event name" value={f.event_name} onChange={set("event_name")} />
        <input className={input} placeholder="Location (city, state)" value={f.location} onChange={set("location")} />
        <input className={input} placeholder="Logo image URL" value={f.logo_url} onChange={set("logo_url")} />
        <label className="text-sm flex items-center gap-2">Main color <input type="color" value={f.primary_color} onChange={set("primary_color")} /></label>
        <label className="text-sm flex items-center gap-2">Accent color <input type="color" value={f.accent_color} onChange={set("accent_color")} /></label>
        <textarea className={input} rows={4} placeholder="Club events, one per line (optional)" value={f.events} onChange={set("events")} />
        <textarea className={input} rows={4} placeholder="Player names, one per line (optional)" value={f.players} onChange={set("players")} />
        <input className={input} placeholder="Sent to — name" value={f.recipient_name} onChange={set("recipient_name")} />
        <input className={input} type="email" placeholder="Sent to — email" value={f.recipient_email} onChange={set("recipient_email")} />
        <button disabled={saving} className="md:col-span-2 rounded-md bg-secondary py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60">
          {saving ? "Creating…" : "Create Enterprise Demo"}
        </button>
      </form>
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="p-3">Club</th><th className="p-3">Sent to</th><th className="p-3">Views</th><th className="p-3">Created</th><th className="p-3"></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No Enterprise demos yet.</td></tr>}
            {list.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0">
                <td className="p-3 font-semibold text-foreground">{d.club_name}<div className="text-xs text-muted-foreground font-normal">{d.event_name}</div></td>
                <td className="p-3">{d.recipient_name || "—"}<div className="text-xs text-muted-foreground">{d.recipient_email}</div></td>
                <td className="p-3">{d.view_count}</td>
                <td className="p-3">{new Date(d.created_at).toLocaleDateString()}</td>
                <td className="p-3 flex gap-2 justify-end">
                  <button title="Copy link" onClick={() => { navigator.clipboard?.writeText(link(d.slug)); toast.success("Link copied"); }}><Copy className="h-4 w-4" /></button>
                  <a title="Open" href={`/enterprise-demo/${d.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  <button title="Delete" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminEnterpriseDemos;
