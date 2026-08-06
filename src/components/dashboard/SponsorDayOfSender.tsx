import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Handshake, Loader2, Save, Send } from "lucide-react";

interface Sponsor {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  hole_number: string | null;
  checkin_time: string | null;
  address?: string | null;
  amount_cents?: number | null;
  receipt_number?: string | null;
  receipt_sent?: boolean | null;
  sponsorship_tiers?: { name: string | null } | null;
}

interface Props {
  tournamentId: string;
  organizationId: string;
  /** Renders the full branded email HTML for one sponsor's merge variables. */
  renderHtml: (vars: Record<string, string>) => string;
  /** Subject line template (may contain {{...}} variables). */
  subjectTemplate: string;
  /** Base variables (event name, date, course, contact, etc.). */
  baseVars: Record<string, string>;
  /** Show the optional "Attach tax donation receipt" control. */
  allowTaxReceipt?: boolean;
}


const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? "");

export default function SponsorDayOfSender({
  tournamentId,
  organizationId,
  renderHtml,
  subjectTemplate,
  baseVars,
  allowTaxReceipt = false,
}: Props) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [parking, setParking] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachReceipt, setAttachReceipt] = useState(false);
  const [orgInfo, setOrgInfo] = useState<{
    name: string;
    mailing_address: string | null;
    ein: string | null;
    nonprofit_name: string | null;
  } | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: sps }, { data: t }] = await Promise.all([
        supabase
          .from("sponsor_registrations")
          .select(
            "id, company_name, contact_name, contact_email, hole_number, checkin_time, address, amount_cents, receipt_number, receipt_sent, sponsorship_tiers(name)",
          )
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: true }),
        supabase
          .from("tournaments")
          .select("sponsor_parking_info, sponsor_custom_notes")
          .eq("id", tournamentId)
          .maybeSingle(),
      ]);
      if (!active) return;
      setSponsors((sps || []) as unknown as Sponsor[]);
      setSelected([]);
      setParking((t as any)?.sponsor_parking_info || "");
      setNotes((t as any)?.sponsor_custom_notes || "");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [tournamentId]);

  useEffect(() => {
    if (!allowTaxReceipt || !organizationId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("name, mailing_address, ein, nonprofit_name")
        .eq("id", organizationId)
        .maybeSingle();
      if (active) setOrgInfo((data as any) || null);
    })();
    return () => {
      active = false;
    };
  }, [allowTaxReceipt, organizationId]);


  const withEmail = sponsors.filter((s) => s.contact_email);
  const allSelected = withEmail.length > 0 && selected.length === withEmail.length;

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => setSelected(allSelected ? [] : withEmail.map((s) => s.id));

  const updateSponsorField = async (id: string, field: "hole_number" | "checkin_time", value: string) => {
    setSponsors((p) => p.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    const { error } = await supabase
      .from("sponsor_registrations")
      .update({ [field]: value } as any)
      .eq("id", id);
    if (error) toast.error("Could not save sponsor detail");
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase
      .from("tournaments")
      .update({ sponsor_parking_info: parking, sponsor_custom_notes: notes } as any)
      .eq("id", tournamentId);
    setSavingNotes(false);
    if (error) toast.error("Failed to save notes");
    else toast.success("Sponsor notes saved");
  };

  const varsFor = (s: Sponsor): Record<string, string> => ({
    ...baseVars,
    sponsor_name: s.company_name || s.contact_name || "Sponsor",
    contact_name_sponsor: s.contact_name || "",
    sponsor_tier: s.sponsorship_tiers?.name || "Sponsor",
    hole_number: s.hole_number || "TBD",
    checkin_time: s.checkin_time || baseVars.checkin_time || "TBD",
    parking_info: parking || "See the registration tent for parking details.",
    custom_notes: notes || "",
  });

  const previewSponsor = useMemo(
    () => withEmail.find((s) => s.id === selected[0]) || withEmail[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, sponsors],
  );

  const previewHtml = previewSponsor
    ? renderHtml(varsFor(previewSponsor))
    : "<p style='padding:16px;font-family:sans-serif;color:#6b7280;'>Add a sponsor to see the preview.</p>";

  const recipients = withEmail.filter((s) => selected.includes(s.id));

  const doSend = async () => {
    setSending(true);
    try {
      const emails = recipients.map((s) => {
        const vars = varsFor(s);
        const item: Record<string, unknown> = {
          sponsor_id: s.id,
          subject: fill(subjectTemplate, vars),
          html: renderHtml(vars),
        };
        if (allowTaxReceipt && attachReceipt) {
          const receiptNumber = s.receipt_number || buildReceiptNumber(s.id);
          const sponsorName = s.company_name || s.contact_name || "Sponsor";
          item.receipt_number = receiptNumber;
          item.attachment = {
            filename: `tax-receipt-${receiptNumber}.pdf`,
            content: renderTaxReceiptBase64({
              orgName: orgInfo?.nonprofit_name || orgInfo?.name || baseVars.organization_name || "Organization",
              orgAddress: orgInfo?.mailing_address || "",
              orgEin: orgInfo?.ein || "",
              receiptDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
              receiptNumber,
              sponsorName,
              sponsorAddress: s.address || "",
              amount: `$${((s.amount_cents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              tournamentName: baseVars.event_name || "",
              signatureName: baseVars.contact_name || "",
              signatureTitle: "Tournament Organizer",
            }),
          };
        }
        return item;
      });
      const { data, error } = await supabase.functions.invoke("send-sponsor-day-of-email", {
        body: { tournament_id: tournamentId, organization_id: organizationId, emails },
      });
      if (error) throw error;

      const sent = (data as any)?.sent ?? 0;
      toast.success(`Sponsor email sent to ${sent} sponsor${sent === 1 ? "" : "s"}`);
      setConfirmOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send sponsor emails");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Handshake className="h-4 w-4 text-primary" /> Select Sponsors ({withEmail.length})
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleAll} disabled={withEmail.length === 0}>
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
            <Badge variant="secondary">{selected.length} selected</Badge>
          </div>
        </div>

        {sponsors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No sponsors registered for this tournament yet.
          </p>
        ) : (
          <div className="divide-y border rounded max-h-[420px] overflow-y-auto">
            {sponsors.map((s) => (
              <div key={s.id} className="p-3 space-y-2 hover:bg-muted/40">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded mt-1"
                    checked={selected.includes(s.id)}
                    disabled={!s.contact_email}
                    onChange={() => toggle(s.id)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {s.company_name || s.contact_name || "Sponsor"}
                      {s.sponsorship_tiers?.name ? (
                        <span className="text-muted-foreground font-normal"> – {s.sponsorship_tiers.name}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.contact_email || "No email on file"}
                    </p>
                  </div>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                  <div>
                    <Label className="text-xs text-muted-foreground">Hole Assignment</Label>
                    <Input
                      className="mt-1 h-8"
                      placeholder="e.g. 5"
                      defaultValue={s.hole_number || ""}
                      onBlur={(e) => updateSponsorField(s.id, "hole_number", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Check-in Time</Label>
                    <Input
                      className="mt-1 h-8"
                      placeholder="e.g. 7:00 AM"
                      defaultValue={s.checkin_time || ""}
                      onBlur={(e) => updateSponsorField(s.id, "checkin_time", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border p-5 space-y-3">
        <div>
          <Label className="text-sm">Parking Information</Label>
          <Input
            className="mt-1"
            placeholder="Parking available behind the clubhouse."
            value={parking}
            onChange={(e) => setParking(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-sm">Custom Notes for Sponsors</Label>
          <Textarea
            className="mt-1"
            rows={4}
            placeholder="Please check in at the registration tent to receive your hole assignment and welcome packet."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            These fill the <span className="font-mono">{"{{parking_info}}"}</span> and{" "}
            <span className="font-mono">{"{{custom_notes}}"}</span> variables and are saved for future sends.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={saveNotes} disabled={savingNotes}>
          {savingNotes ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save Notes
        </Button>
      </div>

      <div className="bg-muted rounded-lg p-4">
        <p className="text-xs text-muted-foreground text-center mb-3">
          Preview — shown with {previewSponsor?.company_name || previewSponsor?.contact_name || "the first sponsor"}
          &rsquo;s details
        </p>
        <div
          className="max-w-[600px] mx-auto shadow-lg rounded-lg overflow-hidden border bg-white"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (recipients.length === 0) {
              toast.error("Select at least one sponsor");
              return;
            }
            setConfirmOpen(true);
          }}
          className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 gap-2"
        >
          <Send className="h-4 w-4" /> Send Email
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You are about to send the &ldquo;Sponsor Event Day Details&rdquo; email to {recipients.length} sponsor
            {recipients.length === 1 ? "" : "s"}.
          </p>
          <div className="max-h-48 overflow-y-auto text-sm space-y-1">
            {recipients.map((s) => (
              <p key={s.id}>
                • {s.company_name || s.contact_name}{" "}
                <span className="text-muted-foreground">({s.contact_email})</span>
              </p>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={doSend} disabled={sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirm Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
