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
import { Plus, Pencil, Trash2, Loader2, Users, Upload, Download } from "lucide-react";
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

  useEffect(() => {
    load();
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
          <div className="flex gap-2">
            <input ref={fileInput} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvImport(f); e.target.value = ""; }} />
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4 mr-2" /> Import CSV</Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={members.length === 0}><Download className="h-4 w-4 mr-2" /> Export</Button>
            <Button onClick={() => setEditing({ ...emptyMember })}>
              <Plus className="h-4 w-4 mr-2" /> Add Member
            </Button>
          </div>
        </div>


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
                  <TableHead>Scoring Code</TableHead>
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
                    <TableCell className="font-mono text-xs">{m.scoring_code}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({
                        ...m,
                        handicap_index: m.handicap_index ?? "",
                        membership_fee_cents: m.membership_fee_cents ? m.membership_fee_cents / 100 : "",
                        notes: m.notes ?? "",
                        phone: m.phone ?? "",
                      })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
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
