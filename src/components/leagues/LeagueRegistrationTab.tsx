import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save, Copy, Tag, ClipboardList, ExternalLink, Download, Pencil,
} from "lucide-react";

export interface RegField {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "select" | "textarea" | "image";
  required: boolean;
  enabled: boolean;
  locked?: boolean; // name/email cannot be removed
  options?: string[];
}

export const DEFAULT_REG_FIELDS: RegField[] = [
  { key: "full_name", label: "Full Name", type: "text", required: true, enabled: true, locked: true },
  { key: "email", label: "Email", type: "email", required: true, enabled: true, locked: true },
  { key: "phone", label: "Phone", type: "tel", required: true, enabled: true },
  { key: "shirt_size", label: "Shirt Size", type: "select", required: false, enabled: true, options: ["S", "M", "L", "XL", "2XL", "3XL"] },
  { key: "avg_18_score", label: "Average 18-Hole Score", type: "number", required: false, enabled: true },
  { key: "avg_9_score", label: "Average 9-Hole Score", type: "number", required: false, enabled: true },
  { key: "handicap_index", label: "Handicap Index", type: "number", required: false, enabled: true },
  { key: "profile_image_url", label: "Profile Photo (Headshot)", type: "image", required: false, enabled: true },
];

export function normalizeFields(raw: any): RegField[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_REG_FIELDS.map(f => ({ ...f }));
  return raw.map((f: any) => ({
    key: String(f.key),
    label: String(f.label || f.key),
    type: (f.type || "text") as RegField["type"],
    required: !!f.required,
    enabled: f.enabled !== false,
    locked: !!f.locked,
    options: Array.isArray(f.options) ? f.options : undefined,
  }));
}

export default function LeagueRegistrationTab({ league }: { league: any }) {
  const leagueId = league.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<RegField[]>(DEFAULT_REG_FIELDS);
  const [promos, setPromos] = useState<any[]>([]);
  const [newPromo, setNewPromo] = useState({ code: "", discount_percent: "", discount_cents: "", max_uses: "" });
  const [responses, setResponses] = useState<any[]>([]);

  const publicUrl = `${window.location.origin}/league/${league.league_slug}/register`;

  const load = async () => {
    setLoading(true);
    const [{ data: f }, { data: p }, { data: r }] = await Promise.all([
      (supabase as any).from("league_registration_forms").select("*").eq("league_id", leagueId).maybeSingle(),
      (supabase as any).from("league_registration_promo_codes").select("*").eq("league_id", leagueId).order("created_at", { ascending: false }),
      (supabase as any).from("league_registration_responses").select("*, member:league_members(member_name, email, scoring_code)").eq("league_id", leagueId).order("created_at", { ascending: false }),
    ]);
    const base = f || {
      league_id: leagueId, is_open: true, league_fee_cents: 0, is_free: false,
      promo_code_enabled: false, pass_platform_fee_to_player: false, terms_text: "", intro_text: "", custom_fields: [],
    };
    setForm(base);
    setFields(normalizeFields(base.custom_fields));
    setPromos(p || []);
    setResponses(r || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [leagueId]);

  const patch = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const setField = (i: number, patchObj: Partial<RegField>) =>
    setFields(fs => fs.map((f, idx) => (idx === i ? { ...f, ...patchObj } : f)));

  const moveField = (i: number, dir: -1 | 1) =>
    setFields(fs => {
      const next = [...fs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return fs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const removeField = (i: number) =>
    setFields(fs => fs.filter((_, idx) => idx !== i));

  const addField = () =>
    setFields(fs => [...fs, {
      key: `custom_${Math.random().toString(36).slice(2, 9)}`,
      label: "New Question",
      type: "text",
      required: false,
      enabled: true,
    }]);

  const save = async () => {
    if (fields.some(f => !f.label.trim())) {
      return toast({ title: "Every question needs a label", variant: "destructive" });
    }
    setSaving(true);
    const payload = {
      league_id: leagueId,
      is_open: !!form.is_open,
      is_free: !!form.is_free,
      league_fee_cents: form.is_free ? 0 : Math.round(Number(form.league_fee_cents || 0)),
      promo_code_enabled: !!form.promo_code_enabled,
      pass_platform_fee_to_player: !!form.pass_platform_fee_to_player,
      terms_text: form.terms_text || null,
      intro_text: form.intro_text || null,
      custom_fields: fields,
    };
    const { error } = await (supabase as any)
      .from("league_registration_forms")
      .upsert(payload, { onConflict: "league_id" });
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Registration settings saved" });
    load();
  };

  const addPromo = async () => {
    const code = newPromo.code.trim().toUpperCase();
    if (!code) return toast({ title: "Enter a promo code", variant: "destructive" });
    const pct = newPromo.discount_percent ? Number(newPromo.discount_percent) : null;
    const amt = newPromo.discount_cents ? Math.round(Number(newPromo.discount_cents) * 100) : null;
    if (!pct && !amt) return toast({ title: "Enter a percent or dollar discount", variant: "destructive" });
    const { error } = await (supabase as any).from("league_registration_promo_codes").insert({
      league_id: leagueId,
      code,
      discount_percent: pct,
      discount_cents: amt,
      max_uses: newPromo.max_uses ? Number(newPromo.max_uses) : null,
    });
    if (error) return toast({ title: "Could not add code", description: error.message, variant: "destructive" });
    setNewPromo({ code: "", discount_percent: "", discount_cents: "", max_uses: "" });
    load();
  };

  const togglePromo = async (id: string, active: boolean) => {
    await (supabase as any).from("league_registration_promo_codes").update({ is_active: active }).eq("id", id);
    load();
  };

  const deletePromo = async (id: string) => {
    if (!confirm("Delete this promo code?")) return;
    await (supabase as any).from("league_registration_promo_codes").delete().eq("id", id);
    load();
  };

  // --- Submission editing / removal -------------------------------------
  const [editingResponse, setEditingResponse] = useState<any>(null);
  const [deletingResponse, setDeletingResponse] = useState<any>(null);
  const [rowBusy, setRowBusy] = useState(false);

  const saveResponse = async () => {
    if (!editingResponse) return;
    setRowBusy(true);
    const name = String(editingResponse.name || "").trim();
    const email = String(editingResponse.email || "").trim();
    const amountCents = Math.round(Number(editingResponse.amount || 0) * 100);

    const { error: rErr } = await (supabase as any)
      .from("league_registration_responses")
      .update({
        payment_status: editingResponse.payment_status,
        amount_cents: amountCents,
        response_data: { ...(editingResponse.response_data || {}), full_name: name, email },
      })
      .eq("id", editingResponse.id);

    let mErr: any = null;
    if (!rErr && editingResponse.member_id) {
      const res = await (supabase as any)
        .from("league_members")
        .update({ member_name: name, email })
        .eq("id", editingResponse.member_id);
      mErr = res.error;
    }
    setRowBusy(false);
    const error = rErr || mErr;
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Registration updated" });
    setEditingResponse(null);
    load();
  };

  const confirmDeleteResponse = async () => {
    if (!deletingResponse) return;
    setRowBusy(true);
    const { error } = await (supabase as any)
      .from("league_registration_responses")
      .delete()
      .eq("id", deletingResponse.id);

    if (!error && deletingResponse.alsoRemoveMember && deletingResponse.member_id) {
      await (supabase as any).from("league_members").delete().eq("id", deletingResponse.member_id);
    }
    // Keep promo usage counts accurate after a removal.
    if (!error && deletingResponse.promo_code) {
      const { data: remaining } = await (supabase as any)
        .from("league_registration_responses")
        .select("id")
        .eq("league_id", leagueId)
        .eq("promo_code", deletingResponse.promo_code);
      await (supabase as any)
        .from("league_registration_promo_codes")
        .update({ times_used: (remaining || []).length })
        .eq("league_id", leagueId)
        .eq("code", deletingResponse.promo_code);
    }
    setRowBusy(false);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Registration removed" });
    setDeletingResponse(null);
    load();
  };

  const exportResponses = () => {
    const keys = fields.map(f => f.key);
    const header = ["Submitted", "Name", "Email", "Login Code", "Amount", "Status", ...fields.map(f => f.label)];
    const rows = [header];
    responses.forEach(r => {
      const d = r.response_data || {};
      rows.push([
        new Date(r.created_at).toLocaleString(),
        r.member?.member_name || d.full_name || "",
        r.member?.email || d.email || "",
        r.member?.scoring_code || "",
        `$${(r.amount_cents / 100).toFixed(2)}`,
        r.payment_status,
        ...keys.map(k => String(d[k] ?? "")),
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `league-registrations-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const collected = useMemo(
    () => responses.filter(r => r.payment_status === "paid").reduce((s, r) => s + Number(r.amount_cents || 0), 0),
    [responses],
  );

  if (loading || !form) {
    return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Share link */}
      <Card>
        <CardContent className="pt-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-semibold">Public Registration Page</p>
            <p className="text-sm text-muted-foreground break-all">{publicUrl}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Link copied" }); }}>
              <Copy className="h-4 w-4 mr-2" /> Copy Link
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" /> Preview</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fee settings */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">League Fee</h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="is_open" className="text-sm">Registration open</Label>
              <Switch id="is_open" checked={!!form.is_open} onCheckedChange={(v) => patch("is_open", v)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="is_free" checked={!!form.is_free} onCheckedChange={(v) => patch("is_free", v)} />
            <Label htmlFor="is_free">League is free (no registration fee)</Label>
          </div>

          {!form.is_free && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>League Fee (USD)</Label>
                <Input
                  type="number" min={0} step="0.01"
                  value={form.league_fee_cents ? (Number(form.league_fee_cents) / 100).toFixed(2) : ""}
                  onChange={(e) => patch("league_fee_cents", Math.round(Number(e.target.value || 0) * 100))}
                  placeholder="75.00"
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch
                  id="passfee"
                  checked={!!form.pass_platform_fee_to_player}
                  onCheckedChange={(v) => patch("pass_platform_fee_to_player", v)}
                />
                <Label htmlFor="passfee" className="text-sm">Add the 5% platform fee to the member's total</Label>
              </div>
            </div>
          )}

          {!form.is_free && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Switch id="promoen" checked={!!form.promo_code_enabled} onCheckedChange={(v) => patch("promo_code_enabled", v)} />
                <Label htmlFor="promoen">Enable promo codes</Label>
              </div>
              {form.promo_code_enabled && (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5">
                    <Input placeholder="EARLYBIRD" value={newPromo.code} onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })} />
                    <Input type="number" placeholder="% off" value={newPromo.discount_percent} onChange={(e) => setNewPromo({ ...newPromo, discount_percent: e.target.value, discount_cents: "" })} />
                    <Input type="number" placeholder="$ off" value={newPromo.discount_cents} onChange={(e) => setNewPromo({ ...newPromo, discount_cents: e.target.value, discount_percent: "" })} />
                    <Input type="number" placeholder="Max uses" value={newPromo.max_uses} onChange={(e) => setNewPromo({ ...newPromo, max_uses: e.target.value })} />
                    <Button onClick={addPromo}><Plus className="h-4 w-4 mr-2" /> Add</Button>
                  </div>
                  {promos.length > 0 && (
                    <div className="space-y-2">
                      {promos.map(p => (
                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono font-semibold">{p.code}</span>
                            <Badge variant="secondary">
                              {p.discount_percent ? `${p.discount_percent}% off` : `$${((p.discount_cents || 0) / 100).toFixed(2)} off`}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              used {p.times_used}{p.max_uses ? ` / ${p.max_uses}` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={p.is_active} onCheckedChange={(v) => togglePromo(p.id, v)} />
                            <Button variant="ghost" size="icon" onClick={() => deletePromo(p.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form builder */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="font-semibold">Registration Form</h3>
            <p className="text-sm text-muted-foreground">Reorder, toggle required, hide, or add your own questions at any time.</p>
          </div>

          <div>
            <Label>Intro message (optional)</Label>
            <Textarea value={form.intro_text || ""} onChange={(e) => patch("intro_text", e.target.value)} placeholder="Welcome! Fill out the form below to join the league." />
          </div>

          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={f.key} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
                  </div>
                  <Input
                    className="flex-1 min-w-[180px]"
                    value={f.label}
                    onChange={(e) => setField(i, { label: e.target.value })}
                    disabled={f.locked}
                  />
                  <Select value={f.type} onValueChange={(v) => setField(i, { type: v as RegField["type"] })} disabled={f.locked || !f.key.startsWith("custom_")}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="tel">Phone</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="select">Dropdown</SelectItem>
                      <SelectItem value="textarea">Long text</SelectItem>
                      <SelectItem value="image">Photo upload</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Switch checked={f.required} onCheckedChange={(v) => setField(i, { required: v })} disabled={f.locked} />
                    <span className="text-xs text-muted-foreground">{f.required ? "Required" : "Optional"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={f.enabled} onCheckedChange={(v) => setField(i, { enabled: v })} disabled={f.locked} />
                    <span className="text-xs text-muted-foreground">{f.enabled ? "Shown" : "Hidden"}</span>
                  </div>
                  {!f.locked && (
                    <Button variant="ghost" size="icon" onClick={() => removeField(i)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
                {f.type === "select" && (
                  <Input
                    value={(f.options || []).join(", ")}
                    onChange={(e) => setField(i, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    placeholder="Comma-separated options (S, M, L, XL)"
                  />
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addField}><Plus className="h-4 w-4 mr-2" /> Add Custom Question</Button>

          <div>
            <Label>Terms &amp; conditions text (optional)</Label>
            <Textarea value={form.terms_text || ""} onChange={(e) => patch("terms_text", e.target.value)} placeholder="I agree to the league rules and code of conduct." />
          </div>

          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Registration Settings
          </Button>
        </CardContent>
      </Card>

      {/* Submissions */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Submissions ({responses.length})
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Collected: <strong>${(collected / 100).toFixed(2)}</strong></span>
              <Button variant="outline" size="sm" onClick={exportResponses} disabled={responses.length === 0}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
          </div>
          {responses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No registrations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Login Code</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{r.member?.member_name || r.response_data?.full_name}</TableCell>
                      <TableCell className="text-xs">{r.member?.email || r.response_data?.email}</TableCell>
                      <TableCell className="font-mono">{r.member?.scoring_code || "—"}</TableCell>
                      <TableCell>${(Number(r.amount_cents || 0) / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={r.payment_status === "pending" ? "secondary" : "default"}>{r.payment_status}</Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" title="Edit registration" onClick={() => setEditingResponse({
                          id: r.id,
                          member_id: r.member_id,
                          response_data: r.response_data || {},
                          promo_code: r.promo_code || null,
                          name: r.member?.member_name || r.response_data?.full_name || "",
                          email: r.member?.email || r.response_data?.email || "",
                          amount: (Number(r.amount_cents || 0) / 100).toFixed(2),
                          payment_status: r.payment_status || "pending",
                        })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Remove registration" onClick={() => setDeletingResponse({
                          id: r.id,
                          member_id: r.member_id,
                          promo_code: r.promo_code || null,
                          name: r.member?.member_name || r.response_data?.full_name || "this registration",
                          alsoRemoveMember: false,
                        })}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit a registration / member */}
      {editingResponse && (
        <Dialog open onOpenChange={() => setEditingResponse(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit Registration</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Full Name</Label>
                <Input value={editingResponse.name} onChange={(e) => setEditingResponse({ ...editingResponse, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={editingResponse.email} onChange={(e) => setEditingResponse({ ...editingResponse, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount ($)</Label>
                  <Input type="number" step="0.01" value={editingResponse.amount} onChange={(e) => setEditingResponse({ ...editingResponse, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select value={editingResponse.payment_status} onValueChange={(v) => setEditingResponse({ ...editingResponse, payment_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="free">Free / Comped</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editingResponse.member_id && (
                <p className="text-xs text-muted-foreground">Name and email changes also update this member's league profile.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingResponse(null)}>Cancel</Button>
              <Button onClick={saveResponse} disabled={rowBusy}>
                {rowBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingResponse} onOpenChange={(o) => !o && setDeletingResponse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deletingResponse?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the registration submission. Any promo code usage is credited back automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingResponse?.member_id && (
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!deletingResponse.alsoRemoveMember}
                onCheckedChange={(v) => setDeletingResponse({ ...deletingResponse, alsoRemoveMember: v })}
              />
              Also remove this person from the league roster
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteResponse} disabled={rowBusy}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
