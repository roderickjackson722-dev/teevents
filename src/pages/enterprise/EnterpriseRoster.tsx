import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import SpreadsheetImportPanel, { type ImportedPlayer } from "@/components/enterprise/SpreadsheetImportPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import RosterHandicapCell from "@/components/handicap/RosterHandicapCell";
import { HandicapLabel } from "@/components/handicap/HandicapBadges";

const SAMPLE_PLAYERS = [
  { first_name: "Sample", last_name: "Player One", ghin_number: "1234567", handicap_index: 12.4, handicap_source: "ghin" },
  { first_name: "Sample", last_name: "Player Two", ghin_number: "2345678", handicap_index: 8.2, handicap_source: "ghin" },
  { first_name: "Sample", last_name: "Player Three", ghin_number: "3456789", handicap_index: 18.7, handicap_source: "ghin" },
  { first_name: "Sample", last_name: "Player Four", ghin_number: null, handicap_index: 15.0, handicap_source: "manual" },
  { first_name: "Sample", last_name: "Player Five", ghin_number: "4567890", handicap_index: 5.3, handicap_source: "ghin" },
];

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  handicap_index: number | null;
  ghin_number: string | null;
  handicap_source: "ghin" | "manual" | "none" | null;
  handicap_last_updated: string | null;
}

const EMPTY = { first_name: "", last_name: "", email: "", phone: "", handicap_index: "", ghin_number: "" };

export default function EnterpriseRoster() {
  const { org } = useOrgContext();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!org) return;
    setLoading(true);
    const { data } = await (supabase.from("enterprise_roster") as any)
      .select("id, first_name, last_name, email, phone, handicap_index, ghin_number, handicap_source, handicap_last_updated")
      .eq("organization_id", org.orgId)
      .eq("is_active", true)
      .order("last_name");
    setMembers((data || []) as Member[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [org]);

  const addMembers = async (rows: Partial<Member>[]) => {
    if (!org) return;
    const payload = rows.map((r) => ({
      organization_id: org.orgId,
      first_name: r.first_name || "TBD",
      last_name: r.last_name || "",
      email: r.email || null,
      phone: r.phone || null,
      handicap_index: r.handicap_index ?? null,
      ghin_number: r.ghin_number || null,
      handicap_source: (r as any).handicap_source || (r.handicap_index != null ? "manual" : "none"),
      handicap_last_updated: r.handicap_index != null ? new Date().toISOString() : null,
    }));
    const { error } = await (supabase.from("enterprise_roster") as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(`${payload.length} added to your roster.`);
    load();
  };

  const importRows = (rows: ImportedPlayer[]) =>
    addMembers(rows.map((r) => ({
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email || null,
      handicap_index: r.handicap_index ?? null,
      ghin_number: r.ghin_number || null,
    })));

  const remove = async (id: string) => {
    await (supabase.from("enterprise_roster") as any).update({ is_active: false }).eq("id", id);
    setMembers((m) => m.filter((x) => x.id !== id));
  };

  const saveHandicap = async (m: Member, patch: { ghin?: string | null; index?: number | null; source?: "ghin" | "manual" | "none"; lastUpdated?: string | null; lowIndex?: number | null }) => {
    const row: Record<string, unknown> = {};
    if (patch.ghin !== undefined) row.ghin_number = patch.ghin;
    if (patch.index !== undefined) row.handicap_index = patch.index;
    if (patch.source) row.handicap_source = patch.source;
    if (patch.lastUpdated !== undefined) row.handicap_last_updated = patch.lastUpdated;
    if (patch.lowIndex !== undefined) row.low_handicap_index = patch.lowIndex;
    const { error } = await (supabase.from("enterprise_roster") as any).update(row).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    if (patch.index != null && org) {
      await (supabase.from("handicap_index_history") as any).insert({ organization_id: org.orgId, roster_id: m.id, handicap_index: patch.index, source: patch.source || "manual" });
    }
    setMembers((list) => list.map((x) => (x.id === m.id ? {
      ...x,
      ghin_number: patch.ghin !== undefined ? patch.ghin : x.ghin_number,
      handicap_index: patch.index !== undefined ? patch.index : x.handicap_index,
      handicap_source: patch.source || x.handicap_source,
      handicap_last_updated: patch.lastUpdated !== undefined ? patch.lastUpdated : x.handicap_last_updated,
    } : x)));
    toast.success("Saved.");
  };

  const filtered = members.filter((m) =>
    `${m.first_name} ${m.last_name} ${m.email || ""}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <EnterpriseLayout
      title="My Roster"
      description="Your club members, ready to drop into any event without retyping names."
      crumbs={[{ label: "My Roster" }]}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Add a member</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Handicap index" value={form.handicap_index} onChange={(e) => setForm({ ...form, handicap_index: e.target.value })} />
            <Input placeholder="GHIN number" value={form.ghin_number} onChange={(e) => setForm({ ...form, ghin_number: e.target.value })} />
            <Button
              className="bg-secondary text-primary hover:bg-secondary/90 sm:col-span-2"
              onClick={async () => {
                if (!form.first_name && !form.last_name) { toast.error("Enter a name first."); return; }
                await addMembers([{
                  ...form,
                  handicap_index: form.handicap_index ? Number(form.handicap_index) : null,
                }]);
                setForm(EMPTY);
              }}
            >
              <UserPlus className="mr-1.5 h-4 w-4" /> Add to roster
            </Button>
          </CardContent>
        </Card>

        <SpreadsheetImportPanel onImport={importRows} />
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Members ({members.length})</CardTitle>
            {members.length === 0 && !loading && (
              <Button variant="outline" size="sm" onClick={() => addMembers(SAMPLE_PLAYERS as any)}>Load sample players</Button>
            )}
          </div>
          <div className="relative w-48">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="h-9 pl-8" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="divide-y divide-border">
              <div className="hidden grid-cols-[1.2fr_1fr_2fr_auto] gap-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                <span>Player</span><span>Email</span><span><HandicapLabel kind="index">Handicap Index</HandicapLabel></span><span />
              </div>
              {filtered.map((m) => (
                <div key={m.id} className="grid items-center gap-2 py-2 text-sm md:grid-cols-[1.2fr_1fr_2fr_auto] md:gap-3">
                  <span className="font-medium">{m.first_name} {m.last_name}</span>
                  <span className="truncate text-muted-foreground">{m.email || "—"}</span>
                  <RosterHandicapCell
                    value={{ ghin: m.ghin_number, lastName: m.last_name, index: m.handicap_index, source: m.handicap_source, lastUpdated: m.handicap_last_updated }}
                    onSave={(patch) => saveHandicap(m, patch)}
                  />
                  <Button variant="ghost" size="icon" className="justify-self-end text-destructive" onClick={() => remove(m.id)} aria-label="Remove member">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </EnterpriseLayout>
  );
}
