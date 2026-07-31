import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Users, Upload, Download, Copy, KeyRound, RefreshCw, Mail, Send } from "lucide-react";
import { useRef } from "react";

interface Member {
  id: string;
  member_name: string;
  email: string;
  phone: string | null;
  handicap_index: number | null;
  membership_status: string;
  membership_fee_paid: boolean;
  membership_fee_cents: number | null;
  scoring_code: string | null;
  notes: string | null;
}

const emptyMember = {
  member_name: "",
  email: "",
  phone: "",
  handicap_index: "" as any,
  membership_status: "active",
  membership_fee_paid: false,
  membership_fee_cents: "" as any,
  notes: "",
};

export default function LeagueMembersTab({ leagueId }: { leagueId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("league_members")
      .select("*")
      .eq("league_id", leagueId)
      .order("member_name");
    if (error) toast({ title: "Failed to load members", description: error.message, variant: "destructive" });
    setMembers((data as Member[]) || []);
    setLoading(false);
  };

  const [leagueSlug, setLeagueSlug] = useState<string | null>(null);

  useEffect(() => {
    load();
    (async () => {
      const { data } = await (supabase as any)
        .from("golf_leagues")
        .select("league_slug")
        .eq("id", leagueId)
        .maybeSingle();
      setLeagueSlug(data?.league_slug ?? null);
    })();
  }, [leagueId]);

  const save = async () => {
    if (!editing.member_name.trim() || !editing.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    const payload: any = {
      league_id: leagueId,
      member_name: editing.member_name.trim(),
      email: editing.email.trim(),
      phone: editing.phone || null,
      handicap_index: editing.handicap_index !== "" ? Number(editing.handicap_index) : null,
      membership_status: editing.membership_status,
      membership_fee_paid: editing.membership_fee_paid,
      membership_fee_cents: editing.membership_fee_cents !== "" ? Math.round(Number(editing.membership_fee_cents) * 100) : null,
      notes: editing.notes || null,
    };
    if (editing.id && typeof editing.scoring_code === "string") {
      const cleanCode = editing.scoring_code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (cleanCode && cleanCode.length !== 6) {
        toast({ title: "Scoring code must be 6 characters (A-Z, 0-9)", variant: "destructive" });
        return;
      }
      if (cleanCode) {
        // Per-league uniqueness check
        const { data: clash } = await (supabase as any)
          .from("league_members")
          .select("id")
          .eq("league_id", leagueId)
          .eq("scoring_code", cleanCode)
          .neq("id", editing.id)
          .maybeSingle();
        if (clash) {
          toast({ title: "That code is already in use by another member in this league", variant: "destructive" });
          return;
        }
        payload.scoring_code = cleanCode;
      }
    }
    const q = editing.id
      ? (supabase as any).from("league_members").update(payload).eq("id", editing.id)
      : (supabase as any).from("league_members").insert(payload);
    const { error } = await q;
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Member updated" : "Member added" });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    const { error } = await (supabase as any).from("league_members").delete().eq("id", id);
    if (error) toast({ title: "Remove failed", description: error.message, variant: "destructive" });
    else load();
  };

  const [busyId, setBusyId] = useState<string | null>(null);

  const randomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const uniqueCode = (taken: Set<string>) => {
    let c = randomCode();
    while (taken.has(c)) c = randomCode();
    taken.add(c);
    return c;
  };

  const assignCode = async (m: Member, regenerate = false) => {
    if (regenerate && !confirm(`Generate a new login code for ${m.member_name}? Their old code will stop working.`)) return;
    setBusyId(m.id);
    const taken = new Set(members.map((x) => x.scoring_code).filter(Boolean) as string[]);
    const code = uniqueCode(taken);
    const { error } = await (supabase as any).from("league_members").update({ scoring_code: code }).eq("id", m.id);
    setBusyId(null);
    if (error) return toast({ title: "Could not assign code", description: error.message, variant: "destructive" });
    toast({ title: `Login code for ${m.member_name}: ${code}` });
    load();
  };

  const assignAllMissing = async () => {
    const missing = members.filter((m) => !m.scoring_code);
    if (missing.length === 0) return toast({ title: "Every member already has a login code" });
    const taken = new Set(members.map((x) => x.scoring_code).filter(Boolean) as string[]);
    for (const m of missing) {
      await (supabase as any).from("league_members").update({ scoring_code: uniqueCode(taken) }).eq("id", m.id);
    }
    toast({ title: `Assigned codes to ${missing.length} member${missing.length === 1 ? "" : "s"}` });
    load();
  };

  const copyCode = (m: Member) => {
    if (!m.scoring_code) return;
    navigator.clipboard.writeText(m.scoring_code);
    toast({ title: `Copied ${m.member_name}'s code` });
  };

  // Emails members how to log in: their email address or their 6-character code.
  const sendLoginInstructions = async (memberIds?: string[]) => {
    const targets = memberIds?.length ? memberIds : members.filter((m) => m.email).map((m) => m.id);
    if (targets.length === 0) return toast({ title: "No members with an email on file", variant: "destructive" });
    if (!memberIds && !confirm(`Email login instructions to ${targets.length} member(s)?`)) return;
    setBusyId(memberIds?.[0] ?? "bulk");
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch("/api/public/league-login-instructions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ league_id: leagueId, member_ids: targets }),
    });
    setBusyId(null);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return toast({ title: "Could not send", description: payload?.error || `HTTP ${res.status}`, variant: "destructive" });
    toast({ title: `Login instructions sent to ${payload.sent} member(s)` });
  };

  const sendPasswordReset = async (m: Member) => {
    if (!m.email) return toast({ title: "This member has no email on file", variant: "destructive" });
    if (!confirm(`Send a password reset email to ${m.email}?`)) return;
    setBusyId(m.id);
    const { error } = await supabase.auth.resetPasswordForEmail(m.email, {
      redirectTo: `${window.location.origin}/reset-password${leagueSlug ? `?league=${encodeURIComponent(leagueSlug)}` : ""}`,
    });
    setBusyId(null);
    if (error) toast({ title: "Reset email failed", description: error.message, variant: "destructive" });
    else toast({ title: `Password reset sent to ${m.email}` });
  };


  const fileInput = useRef<HTMLInputElement>(null);

  const handleCsvImport = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return toast({ title: "CSV appears empty", variant: "destructive" });
    const header = lines[0].split(",").map(h => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const nameIdx = idx("name") >= 0 ? idx("name") : idx("member_name");
    const emailIdx = idx("email");
    if (nameIdx < 0 || emailIdx < 0) return toast({ title: "CSV must have 'name' and 'email' columns", variant: "destructive" });
    const phoneIdx = idx("phone");
    const hcpIdx = idx("handicap") >= 0 ? idx("handicap") : idx("handicap_index");
    const rows = lines.slice(1).map(l => {
      const cells = l.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      return {
        league_id: leagueId,
        member_name: cells[nameIdx],
        email: cells[emailIdx],
        phone: phoneIdx >= 0 ? (cells[phoneIdx] || null) : null,
        handicap_index: hcpIdx >= 0 && cells[hcpIdx] ? Number(cells[hcpIdx]) : null,
        membership_status: "active",
      };
    }).filter(r => r.member_name && r.email);
    if (rows.length === 0) return toast({ title: "No valid rows found", variant: "destructive" });
    const { error } = await (supabase as any).from("league_members").insert(rows);
    if (error) toast({ title: "Import failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Imported ${rows.length} members` }); load(); }
  };

  const exportCsv = () => {
    const rows = [["Name", "Email", "Phone", "Handicap", "Status", "Fee Paid", "Scoring Code"]];
    members.forEach(m => rows.push([
      m.member_name, m.email, m.phone || "", String(m.handicap_index ?? ""),
      m.membership_status, m.membership_fee_paid ? "Yes" : "No", m.scoring_code || "",
    ]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `league-members-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" /> Members ({members.length})
          </h2>
          <div className="flex gap-2 flex-wrap">
            <input ref={fileInput} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvImport(f); e.target.value = ""; }} />
            <Button variant="outline" size="sm" onClick={assignAllMissing} disabled={members.length === 0}><KeyRound className="h-4 w-4 mr-2" /> Assign Missing Codes</Button>
            <Button variant="outline" size="sm" onClick={() => sendLoginInstructions()} disabled={members.length === 0 || busyId === "bulk"}>
              {busyId === "bulk" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} Email Login Info
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4 mr-2" /> Import CSV</Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={members.length === 0}><Download className="h-4 w-4 mr-2" /> Export</Button>
            <Button onClick={() => setEditing({ ...emptyMember })}>
              <Plus className="h-4 w-4 mr-2" /> Add Member
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Login codes are visible below. Use the key icon to assign or regenerate a member's 6-character code, and the mail icon to send a password reset if they sign in with email &amp; password.
        </p>



        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : members.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No members yet. Add your first member above.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Handicap</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fee Paid</TableHead>
                  <TableHead>Login Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.member_name}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>{m.handicap_index ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={m.membership_status === "active" ? "default" : "secondary"}>
                        {m.membership_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.membership_fee_paid ? "✅" : "❌"}</TableCell>
                    <TableCell>
                      {m.scoring_code ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs tracking-widest">{m.scoring_code}</span>
                          <Button size="sm" variant="ghost" title="Copy code" onClick={() => copyCode(m)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Generate a new code" disabled={busyId === m.id} onClick={() => assignCode(m, true)}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busyId === m.id} onClick={() => assignCode(m)}>
                          <KeyRound className="h-3.5 w-3.5 mr-1" /> Assign Code
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" title="Email login instructions (email or 6-digit code)" disabled={busyId === m.id} onClick={() => sendLoginInstructions([m.id])}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Send password reset email" disabled={busyId === m.id} onClick={() => sendPasswordReset(m)}>
                        <Mail className="h-3.5 w-3.5" />
                      </Button>

                      <Button size="sm" variant="ghost" title="Edit member" onClick={() => setEditing({
                        ...m,
                        handicap_index: m.handicap_index ?? "",
                        membership_fee_cents: m.membership_fee_cents ? m.membership_fee_cents / 100 : "",
                        notes: m.notes ?? "",
                        phone: m.phone ?? "",
                        scoring_code: m.scoring_code ?? "",
                      })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Remove member" onClick={() => remove(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {editing && (
          <Dialog open onOpenChange={() => setEditing(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing.id ? "Edit Member" : "Add Member"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={editing.member_name} onChange={(e) => setEditing({ ...editing, member_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Handicap Index</Label>
                    <Input type="number" step="0.1" value={editing.handicap_index} onChange={(e) => setEditing({ ...editing, handicap_index: e.target.value })} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={editing.membership_status} onValueChange={(v) => setEditing({ ...editing, membership_status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Membership Fee ($)</Label>
                  <Input type="number" step="0.01" value={editing.membership_fee_cents} onChange={(e) => setEditing({ ...editing, membership_fee_cents: e.target.value })} />
                </div>
                <div className="flex items-center justify-between border rounded-md p-3">
                  <Label>Membership Fee Paid</Label>
                  <Switch checked={editing.membership_fee_paid} onCheckedChange={(v) => setEditing({ ...editing, membership_fee_paid: v })} />
                </div>
                {editing.id && (
                  <div>
                    <Label>Scoring / Login Code (6 chars)</Label>
                    <Input
                      value={editing.scoring_code ?? ""}
                      maxLength={6}
                      onChange={(e) => setEditing({ ...editing, scoring_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) })}
                      className="font-mono tracking-widest uppercase"
                      placeholder="ABC123"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Members use this code to log in and register for events.</p>
                  </div>
                )}
                <div>
                  <Label>Notes</Label>
                  <Textarea rows={2} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save}>{editing.id ? "Save" : "Add Member"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
