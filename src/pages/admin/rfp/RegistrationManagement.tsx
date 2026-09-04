import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import RfpAdminGate from "@/components/admin/RfpAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCents } from "@/lib/formatCurrency";
import { downloadCsvStream } from "@/lib/streamCsv";
import {
  deleteRfpForm,
  deleteRfpRegistration,
  listRfpRegistrations,
  saveRfpSeasonProgram,
  upsertRfpForm,
  upsertRfpRegistration,
} from "@/lib/rfpPrograms.functions";

const emptyReg = {
  id: undefined as string | undefined,
  season_id: "",
  sport_id: "",
  team_id: "",
  participant_name: "",
  participant_email: "",
  participant_phone: "",
  date_of_birth: "",
  waiver_signed: false,
  payment_status: "pending",
  payment_amount_cents: 0,
  notes: "",
};

export default function RfpRegistrationManagement() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ registrations: [], seasons: [], sports: [], teams: [], forms: [] });
  const [reg, setReg] = useState({ ...emptyReg });
  const [saving, setSaving] = useState(false);
  const [filterSeason, setFilterSeason] = useState("");
  const [filterTeam, setFilterTeam] = useState("");

  const [form, setForm] = useState({ id: undefined as string | undefined, name: "", season_id: "", sport_id: "", fields: "", waivers: "", documents: "" });
  const [program, setProgram] = useState({ id: "", public_slug: "", description: "", registration_open: false, fee: "0" });

  const load = async () => {
    setLoading(true);
    try {
      const result: any = await listRfpRegistrations({ data: {} } as any);
      setData(result);
    } catch (error: any) {
      toast.error(error?.message || "Could not load registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const registrations = useMemo(
    () =>
      (data.registrations as any[]).filter(
        (r) => (!filterSeason || r.season_id === filterSeason) && (!filterTeam || r.team_id === filterTeam),
      ),
    [data.registrations, filterSeason, filterTeam],
  );

  const seasonName = (id: string | null) => (data.seasons as any[]).find((s) => s.id === id)?.name || "—";
  const teamName = (id: string | null) => (data.teams as any[]).find((t) => t.id === id)?.team_name || "—";

  const saveRegistration = async () => {
    setSaving(true);
    try {
      await upsertRfpRegistration({
        data: {
          id: reg.id,
          season_id: reg.season_id || null,
          sport_id: reg.sport_id || null,
          team_id: reg.team_id || null,
          participant_name: reg.participant_name.trim(),
          participant_email: reg.participant_email.trim(),
          participant_phone: reg.participant_phone || null,
          date_of_birth: reg.date_of_birth || null,
          waiver_signed: reg.waiver_signed,
          payment_status: reg.payment_status,
          payment_amount_cents: Number(reg.payment_amount_cents) || 0,
          notes: reg.notes || null,
        },
      } as any);
      toast.success("Registration saved");
      setReg({ ...emptyReg });
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not save registration");
    } finally {
      setSaving(false);
    }
  };

  const removeRegistration = async (id: string) => {
    if (!window.confirm("Delete this registration?")) return;
    try {
      await deleteRfpRegistration({ data: { id } } as any);
      toast.success("Registration deleted");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not delete registration");
    }
  };

  const exportCsv = async () => {
    await downloadCsvStream(
      `rfp-registrations-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Phone", "Date of birth", "Season", "Team", "Waiver", "Payment status", "Amount", "Registered"],
      registrations.map((r) => [
        r.participant_name,
        r.participant_email,
        r.participant_phone || "",
        r.date_of_birth || "",
        seasonName(r.season_id),
        teamName(r.team_id),
        r.waiver_signed ? "Signed" : "Not signed",
        r.payment_status,
        formatCents(r.payment_amount_cents),
        new Date(r.registration_date).toLocaleString(),
      ]),
    );
    toast.success("Registrations exported");
  };

  const saveForm = async () => {
    try {
      await upsertRfpForm({
        data: {
          id: form.id,
          name: form.name || "Registration Form",
          season_id: form.season_id || null,
          sport_id: form.sport_id || null,
          form_config: {
            fields: form.fields.split("\n").map((s) => s.trim()).filter(Boolean),
            waivers: form.waivers.split("\n").map((s) => s.trim()).filter(Boolean),
            documents: form.documents.split("\n").map((s) => s.trim()).filter(Boolean),
          },
        },
      } as any);
      toast.success("Form saved");
      setForm({ id: undefined, name: "", season_id: "", sport_id: "", fields: "", waivers: "", documents: "" });
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not save form");
    }
  };

  const saveProgram = async () => {
    if (!program.id) return toast.error("Select a season first");
    try {
      const result: any = await saveRfpSeasonProgram({
        data: {
          id: program.id,
          public_slug: program.public_slug,
          description: program.description,
          registration_open: program.registration_open,
          registration_fee_cents: Number(program.fee) || 0,
        },
      } as any);
      toast.success(result.slug ? `Sign-up link ready: /rfp/register/${result.slug}` : "Program settings saved");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not save program settings");
    }
  };

  const selectSeasonProgram = (id: string) => {
    const season = (data.seasons as any[]).find((s) => s.id === id);
    setProgram({
      id,
      public_slug: season?.public_slug || "",
      description: season?.description || "",
      registration_open: !!season?.registration_open,
      fee: String(season?.registration_fee_cents ?? 0),
    });
  };

  return (
    <RfpAdminGate
      title="Participant Registration"
      subtitle="Private registration management for county programs — forms, participant records, and the public sign-up link."
    >
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="registrations">
          <TabsList>
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            <TabsTrigger value="forms">Registration forms</TabsTrigger>
            <TabsTrigger value="program">Public sign-up page</TabsTrigger>
          </TabsList>

          <TabsContent value="registrations" className="space-y-4 pt-4">
            <Card className="p-4 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>Season</Label>
                  <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
                    <option value="">All seasons</option>
                    {(data.seasons as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Team</Label>
                  <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
                    <option value="">All teams</option>
                    {(data.teams as any[]).filter((t) => !filterSeason || t.season_id === filterSeason).map((t) => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                  </select>
                </div>
                <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Refresh</Button>
                <Button variant="outline" size="sm" onClick={() => void exportCsv()}><Download className="h-4 w-4" />Export CSV</Button>
                <span className="text-sm text-muted-foreground ml-auto">{registrations.length} registrations</span>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h2 className="font-semibold text-foreground">{reg.id ? "Edit registration" : "Add registration"}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1"><Label>Name</Label><Input value={reg.participant_name} onChange={(e) => setReg({ ...reg, participant_name: e.target.value })} maxLength={120} /></div>
                <div className="space-y-1"><Label>Email</Label><Input type="email" value={reg.participant_email} onChange={(e) => setReg({ ...reg, participant_email: e.target.value })} maxLength={255} /></div>
                <div className="space-y-1"><Label>Phone</Label><Input value={reg.participant_phone} onChange={(e) => setReg({ ...reg, participant_phone: e.target.value })} maxLength={40} /></div>
                <div className="space-y-1"><Label>Date of birth</Label><Input type="date" value={reg.date_of_birth} onChange={(e) => setReg({ ...reg, date_of_birth: e.target.value })} /></div>
                <div className="space-y-1"><Label>Season</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={reg.season_id} onChange={(e) => setReg({ ...reg, season_id: e.target.value })}>
                    <option value="">None</option>
                    {(data.seasons as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Team</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={reg.team_id} onChange={(e) => setReg({ ...reg, team_id: e.target.value })}>
                    <option value="">None</option>
                    {(data.teams as any[]).filter((t) => !reg.season_id || t.season_id === reg.season_id).map((t) => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Sport</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={reg.sport_id} onChange={(e) => setReg({ ...reg, sport_id: e.target.value })}>
                    <option value="">None</option>
                    {(data.sports as any[]).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Amount (cents)</Label><Input type="number" min={0} value={reg.payment_amount_cents} onChange={(e) => setReg({ ...reg, payment_amount_cents: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Payment status</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={reg.payment_status} onChange={(e) => setReg({ ...reg, payment_status: e.target.value })}>
                    <option value="pending">pending</option><option value="paid">paid</option><option value="refunded">refunded</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={reg.waiver_signed} onCheckedChange={(v) => setReg({ ...reg, waiver_signed: v })} /><Label>Waiver signed</Label></div>
                <div className="space-y-1 sm:col-span-2"><Label>Notes</Label><Input value={reg.notes} onChange={(e) => setReg({ ...reg, notes: e.target.value })} maxLength={2000} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void saveRegistration()} disabled={saving || !reg.participant_name || !reg.participant_email}><Save className="h-4 w-4" />{saving ? "Saving" : reg.id ? "Save changes" : "Add registration"}</Button>
                {reg.id && <Button variant="outline" onClick={() => setReg({ ...emptyReg })}>Cancel</Button>}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow><TableHead>Participant</TableHead><TableHead>Season / Team</TableHead><TableHead>Waiver</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {registrations.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><div className="font-medium">{r.participant_name}</div><div className="text-xs text-muted-foreground">{r.participant_email}{r.participant_phone ? ` · ${r.participant_phone}` : ""}</div></TableCell>
                      <TableCell className="text-sm">{seasonName(r.season_id)}<div className="text-xs text-muted-foreground">{teamName(r.team_id)}</div></TableCell>
                      <TableCell className="text-sm">{r.waiver_signed ? "Signed" : "Not signed"}</TableCell>
                      <TableCell className="text-sm">{formatCents(r.payment_amount_cents)}<div className="text-xs text-muted-foreground">{r.payment_status}</div></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setReg({
                          id: r.id, season_id: r.season_id || "", sport_id: r.sport_id || "", team_id: r.team_id || "",
                          participant_name: r.participant_name, participant_email: r.participant_email,
                          participant_phone: r.participant_phone || "", date_of_birth: r.date_of_birth || "",
                          waiver_signed: !!r.waiver_signed, payment_status: r.payment_status,
                          payment_amount_cents: r.payment_amount_cents || 0, notes: r.notes || "",
                        })}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => void removeRegistration(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {registrations.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No registrations yet.</TableCell></TableRow>}
                </TableBody>
              </Table></div>
            </Card>
          </TabsContent>

          <TabsContent value="forms" className="space-y-4 pt-4">
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold text-foreground">{form.id ? "Edit form" : "New registration form"}</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1"><Label>Form name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Youth Baseball Spring" /></div>
                <div className="space-y-1"><Label>Sport</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.sport_id} onChange={(e) => setForm({ ...form, sport_id: e.target.value })}>
                    <option value="">None</option>{(data.sports as any[]).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Season</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.season_id} onChange={(e) => setForm({ ...form, season_id: e.target.value })}>
                    <option value="">None</option>{(data.seasons as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1"><Label>Extra questions (one per line)</Label><Textarea rows={4} value={form.fields} onChange={(e) => setForm({ ...form, fields: e.target.value })} /></div>
                <div className="space-y-1"><Label>Waivers (one per line)</Label><Textarea rows={4} value={form.waivers} onChange={(e) => setForm({ ...form, waivers: e.target.value })} /></div>
                <div className="space-y-1"><Label>Required documents (one per line)</Label><Textarea rows={4} value={form.documents} onChange={(e) => setForm({ ...form, documents: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void saveForm()}><Plus className="h-4 w-4" />{form.id ? "Save form" : "Create form"}</Button>
                {form.id && <Button variant="outline" onClick={() => setForm({ id: undefined, name: "", season_id: "", sport_id: "", fields: "", waivers: "", documents: "" })}>Cancel</Button>}
              </div>
            </Card>

            <Card className="overflow-hidden"><Table>
              <TableHeader><TableRow><TableHead>Form</TableHead><TableHead>Season</TableHead><TableHead>Questions</TableHead><TableHead>Waivers</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data.forms as any[]).map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-sm">{seasonName(f.season_id)}</TableCell>
                    <TableCell className="text-sm">{(f.form_config?.fields || []).length}</TableCell>
                    <TableCell className="text-sm">{(f.form_config?.waivers || []).length}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setForm({
                        id: f.id, name: f.name, season_id: f.season_id || "", sport_id: f.sport_id || "",
                        fields: (f.form_config?.fields || []).join("\n"),
                        waivers: (f.form_config?.waivers || []).join("\n"),
                        documents: (f.form_config?.documents || []).join("\n"),
                      })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={async () => { await deleteRfpForm({ data: { id: f.id } } as any); toast.success("Form deleted"); await load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(data.forms as any[]).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No forms yet.</TableCell></TableRow>}
              </TableBody>
            </Table></Card>
          </TabsContent>

          <TabsContent value="program" className="space-y-4 pt-4">
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold text-foreground">Public sign-up page</h2>
              <p className="text-sm text-muted-foreground">Give a season a web address name to turn on its private sign-up page. The page is unlisted — it is reachable only by the exact link and is never added to menus or search listings.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1"><Label>Season</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={program.id} onChange={(e) => selectSeasonProgram(e.target.value)}>
                    <option value="">Select season</option>{(data.seasons as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Web address name</Label><Input value={program.public_slug} onChange={(e) => setProgram({ ...program, public_slug: e.target.value })} placeholder="spring-youth-baseball" /></div>
                <div className="space-y-1"><Label>Fee (cents)</Label><Input type="number" min={0} value={program.fee} onChange={(e) => setProgram({ ...program, fee: e.target.value })} /></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={program.registration_open} onCheckedChange={(v) => setProgram({ ...program, registration_open: v })} /><Label>Sign-ups open</Label></div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-4"><Label>Program description</Label><Textarea rows={3} value={program.description} onChange={(e) => setProgram({ ...program, description: e.target.value })} /></div>
              </div>
              {program.public_slug && <p className="text-xs text-muted-foreground">Link: /rfp/register/{program.public_slug}</p>}
              <Button onClick={() => void saveProgram()} disabled={!program.id}><Save className="h-4 w-4" />Save settings</Button>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </RfpAdminGate>
  );
}
