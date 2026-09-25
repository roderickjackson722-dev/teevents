import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Check, X, Eye, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { listVettingSignups, vettingAction } from "@/lib/vetting.functions";

type Row = any;
const TABS = [
  { key: "pending", label: "Pending Review" },
  { key: "flagged", label: "Flagged" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
] as const;

export function vettingName(r: Row) { return r.full_legal_name || r.full_name || "—"; }

export default function AdminVetting() {
  const list = useServerFn(listVettingSignups);
  const act = useServerFn(vettingAction);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("pending");
  const [detail, setDetail] = useState<Row | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await list()); } catch (e: any) { toast.error(e?.message || "Could not load signups"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => r.vetting_status === tab);
  const count = (k: string) => rows.filter((r) => r.vetting_status === k).length;

  const run = async (r: Row, action: "approve" | "reject") => {
    if (action === "reject" && !note.trim() && !confirm("Reject without a reason? The user will see a generic message.")) return;
    setBusy(true);
    try {
      await act({ data: { id: r.id, action, note: note.trim() || undefined, origin: window.location.origin } });
      toast.success(action === "approve" ? "Approved — email sent" : "Rejected — email sent");
      setDetail(null); setNote("");
      await load();
    } catch (e: any) { toast.error(e?.message || "Action failed"); }
    setBusy(false);
  };

  const openDoc = async (r: Row) => {
    try {
      const { url } = (await act({ data: { id: r.id, action: "doc_url" } })) as any;
      window.open(url, "_blank", "noopener");
    } catch (e: any) { toast.error(e?.message || "Could not open document"); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Vetting</h2>
        <p className="text-sm text-muted-foreground">Review flagged signups. Clean signups are approved automatically.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label} ({count(t.key)})</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        : filtered.length === 0 ? <p className="text-center text-muted-foreground py-10">Nothing here.</p>
        : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div className="space-y-1 text-sm min-w-0">
                    <div className="font-semibold text-base">{vettingName(r)} <span className="text-muted-foreground font-normal">· {r.email} · {r.phone_number || r.phone || "—"}</span></div>
                    <div>{r.organization_name || "—"}{r.organization_website && <> · <a href={r.organization_website} target="_blank" rel="noopener noreferrer" className="text-primary underline">{r.organization_website}</a></>}</div>
                    <div className="text-muted-foreground">{r.role || "—"} · {r.events_per_year || "—"} events · Paid regs: {r.paid_registrations == null ? "—" : r.paid_registrations ? "Yes" : "No"} · Submitted {new Date(r.signup_date || r.created_at).toLocaleDateString()}</div>
                    {r.flag_reasons?.length > 0 && <div className="flex flex-wrap gap-1">{r.flag_reasons.map((f: string) => <Badge key={f} variant="outline">{f}</Badge>)}</div>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => { setDetail(r); setNote(r.vetting_notes || ""); }}><Eye className="h-4 w-4 mr-1" />View Details</Button>
                    {r.vetting_status !== "approved" && <Button size="sm" onClick={() => { setDetail(r); setNote(""); }}><Check className="h-4 w-4 mr-1" />Approve</Button>}
                    {r.vetting_status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => { setDetail(r); setNote(""); }}><X className="h-4 w-4 mr-1" />Reject</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader><DialogTitle>{vettingName(detail)}</DialogTitle></DialogHeader>
              <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                {[
                  ["Status", detail.vetting_status],
                  ["Email", `${detail.email}${detail.email_verified ? " (verified)" : " (not verified)"}`],
                  ["Phone", detail.phone_number || detail.phone],
                  ["Organization", detail.organization_name],
                  ["Website", detail.organization_website],
                  ["Role", detail.role],
                  ["Events / 12 mo", detail.events_per_year],
                  ["Paid registrations", detail.paid_registrations == null ? "—" : detail.paid_registrations ? "Yes" : "No"],
                  ["Heard via", detail.referral_source || detail.heard_from],
                  ["Interest", detail.interest_area],
                  ["IP address", detail.ip_address],
                  ["Submitted", new Date(detail.signup_date || detail.created_at).toLocaleString()],
                  ["Flag reasons", (detail.flag_reasons || []).join("; ") || "—"],
                  ["Social profile", detail.doc_social_url],
                  ["Tax / Reg. ID", detail.doc_tax_id],
                ].map(([k, v]) => (
                  <div key={k as string} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="col-span-2 break-words">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
              <div className="text-sm">
                <div className="text-muted-foreground mb-1">Event description</div>
                <p className="whitespace-pre-wrap border rounded p-2">{detail.event_description || "—"}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {detail.doc_social_url && <Button size="sm" variant="outline" asChild><a href={detail.doc_social_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Open profile</a></Button>}
                {detail.doc_file_path && <Button size="sm" variant="outline" onClick={() => openDoc(detail)}><FileText className="h-4 w-4 mr-1" />View uploaded document</Button>}
                {!detail.docs_submitted_at && <span className="text-xs text-muted-foreground self-center">No documentation submitted yet.</span>}
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Note (optional — included in the email; used as the rejection reason)</div>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} />
              </div>
              <DialogFooter className="gap-2">
                {detail.vetting_status !== "rejected" && <Button variant="destructive" disabled={busy} onClick={() => run(detail, "reject")}><X className="h-4 w-4 mr-1" />Reject</Button>}
                {detail.vetting_status !== "approved" && <Button disabled={busy} onClick={() => run(detail, "approve")}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}Approve</Button>}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
