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

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  handicap_index: number | null;
  ghin_number: string | null;
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
      .select("id, first_name, last_name, email, phone, handicap_index, ghin_number")
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
          <CardTitle className="text-base">Members ({members.length})</CardTitle>
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
              {filtered.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="font-medium">{m.first_name} {m.last_name}</span>
                  <span className="text-muted-foreground">{m.email || "—"}</span>
                  <span className="text-muted-foreground">HCP {m.handicap_index ?? "—"}</span>
                  {m.ghin_number && <span className="text-muted-foreground">GHIN {m.ghin_number}</span>}
                  <Button variant="ghost" size="icon" className="ml-auto text-destructive" onClick={() => remove(m.id)} aria-label="Remove member">
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
