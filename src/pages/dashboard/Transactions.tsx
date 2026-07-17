import { useEffect, useState, useMemo, Fragment, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Download, RefreshCw, ChevronDown, ChevronRight, Receipt, Search } from "lucide-react";
import { toast } from "sonner";

interface Tx {
  id: string;
  created_at: string;
  amount_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  net_amount_cents: number;
  type: string;
  status: string;
  description: string | null;
  tournament_id: string | null;
  metadata: any;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  golfer_name: string | null;
  golfer_email: string | null;
  payout_method: string | null;
}

interface CustomField {
  id: string;
  label: string;
  field_type: string;
  tournament_id: string;
}

interface Registration {
  id: string;
  tournament_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  handicap: number | null;
  shirt_size: string | null;
  dietary_restrictions: string | null;
  notes: string | null;
  group_label: string | null;
  custom_answers: any;
  created_at: string;
  payment_status: string;
}

interface Sponsor {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  description: string | null;
  amount_cents: number;
  additional_notes: string | null;
  address: string | null;
  payment_status: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_type: string | null;
  answers: any;
  booth_location: string | null;
  amount_cents: number | null;
  notes: string | null;
  payment_status: string;
}

interface SideTicket {
  id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  attendee_phone: string | null;
  quantity: number;
  amount_cents: number;
  side_event_id: string;
  custom_answers: any;
  payment_status: string;
}

interface Donation {
  id: string;
  donor_email: string | null;
  amount_cents: number;
  status: string;
}

interface Addon {
  id: string;
  registration_id: string;
  addon_name: string;
  quantity: number;
  unit_price_cents: number;
}

const Transactions = () => {
  const { org } = useOrgContext();
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [tournaments, setTournaments] = useState<{ id: string; title: string }[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [regs, setRegs] = useState<Map<string, Registration>>(new Map());
  const [sponsors, setSponsors] = useState<Map<string, Sponsor>>(new Map());
  const [vendors, setVendors] = useState<Map<string, Vendor>>(new Map());
  const [sideTickets, setSideTickets] = useState<Map<string, SideTicket>>(new Map());
  const [donations, setDonations] = useState<Map<string, Donation>>(new Map());
  const [addons, setAddons] = useState<Map<string, Addon[]>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // filters
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    if (!org) return;
    setLoading(true);

    const { data: txData } = await supabase
      .from("platform_transactions")
      .select("*")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false });

    const allTx = (txData || []) as Tx[];
    setTxs(allTx);

    const { data: tournData } = await supabase
      .from("tournaments")
      .select("id, title")
      .eq("organization_id", org.orgId);
    setTournaments((tournData as any) || []);

    const tournIds = ((tournData as any) || []).map((t: any) => t.id);
    if (tournIds.length === 0) { setLoading(false); return; }

    // Gather referenced entity IDs from metadata
    const regIds = new Set<string>();
    const sponsorIds = new Set<string>();
    const vendorIds = new Set<string>();
    const sideTicketIds = new Set<string>();
    for (const t of allTx) {
      const m = t.metadata || {};
      (m.registration_ids || []).forEach((id: string) => regIds.add(id));
      if (m.sponsor_registration_id) sponsorIds.add(m.sponsor_registration_id);
      if (m.vendor_registration_id) vendorIds.add(m.vendor_registration_id);
      if (m.side_event_ticket_id) sideTicketIds.add(m.side_event_ticket_id);
    }

    const [fieldsRes, regRes, sponsorRes, vendorRes, sideRes, donationRes, addonRes] = await Promise.all([
      supabase.from("tournament_registration_fields")
        .select("id, label, field_type, tournament_id")
        .in("tournament_id", tournIds),
      regIds.size > 0
        ? supabase.from("tournament_registrations")
            .select("id, tournament_id, first_name, last_name, email, phone, handicap, shirt_size, dietary_restrictions, notes, group_label, custom_answers, created_at, payment_status")
            .in("id", Array.from(regIds))
        : Promise.resolve({ data: [] } as any),
      sponsorIds.size > 0
        ? supabase.from("sponsor_registrations")
            .select("id, company_name, contact_name, contact_email, contact_phone, website_url, description, amount_cents, additional_notes, address, payment_status")
            .in("id", Array.from(sponsorIds))
        : Promise.resolve({ data: [] } as any),
      vendorIds.size > 0
        ? supabase.from("vendor_registrations")
            .select("id, vendor_name, company_name, contact_name, contact_email, contact_phone, business_type, answers, booth_location, amount_cents, notes, payment_status")
            .in("id", Array.from(vendorIds))
        : Promise.resolve({ data: [] } as any),
      sideTicketIds.size > 0
        ? supabase.from("side_event_tickets")
            .select("id, attendee_name, attendee_email, attendee_phone, quantity, amount_cents, side_event_id, custom_answers, payment_status")
            .in("id", Array.from(sideTicketIds))
        : Promise.resolve({ data: [] } as any),
      supabase.from("tournament_donations")
        .select("id, donor_email, amount_cents, status, stripe_session_id, tournament_id")
        .in("tournament_id", tournIds),
      regIds.size > 0
        ? supabase.from("tournament_registration_addon_purchases")
            .select("id, registration_id, addon_name, quantity, unit_price_cents")
            .in("registration_id", Array.from(regIds))
        : Promise.resolve({ data: [] } as any),
    ]);

    setCustomFields((fieldsRes.data as any) || []);
    setRegs(new Map(((regRes.data as any) || []).map((r: any) => [r.id, r])));
    setSponsors(new Map(((sponsorRes.data as any) || []).map((r: any) => [r.id, r])));
    setVendors(new Map(((vendorRes.data as any) || []).map((r: any) => [r.id, r])));
    setSideTickets(new Map(((sideRes.data as any) || []).map((r: any) => [r.id, r])));

    const donationMap = new Map<string, Donation>();
    ((donationRes.data as any) || []).forEach((d: any) => {
      if (d.stripe_session_id) donationMap.set(d.stripe_session_id, d);
      donationMap.set(d.id, d);
    });
    setDonations(donationMap);

    const addonMap = new Map<string, Addon[]>();
    ((addonRes.data as any) || []).forEach((a: any) => {
      const arr = addonMap.get(a.registration_id) || [];
      arr.push(a);
      addonMap.set(a.registration_id, arr);
    });
    setAddons(addonMap);

    setLoading(false);
  }, [org]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleRow = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const tournamentTitle = (id: string | null) => tournaments.find(t => t.id === id)?.title || "—";

  const fieldsForTournament = (tournId: string) =>
    customFields.filter(f => f.tournament_id === tournId);

  const answerFor = (reg: Registration | undefined, fieldId: string): string => {
    if (!reg?.custom_answers) return "";
    const arr = Array.isArray(reg.custom_answers) ? reg.custom_answers : [];
    const found = arr.find((a: any) => a?.field_id === fieldId || a?.id === fieldId);
    return found ? String(found.value ?? found.answer ?? "") : "";
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = dateFilter === "all" ? 0 : now - parseInt(dateFilter) * 86400000;
    const q = search.toLowerCase().trim();
    return txs.filter(t => {
      if (tournamentFilter !== "all" && t.tournament_id !== tournamentFilter) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (cutoff && new Date(t.created_at).getTime() < cutoff) return false;
      if (q) {
        const hay = [t.golfer_name, t.golfer_email, t.description, t.type, t.stripe_payment_intent_id]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [txs, tournamentFilter, typeFilter, statusFilter, dateFilter, search]);

  const totalGross = filtered.reduce((s, t) => s + t.amount_cents, 0);
  const totalFees = filtered.reduce((s, t) => s + t.platform_fee_cents + (t.stripe_fee_cents || 0), 0);
  const totalNet = filtered.reduce((s, t) => s + t.net_amount_cents, 0);

  const typeLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const getEntityRows = (t: Tx): { entityType: string; entityId: string }[] => {
    const m = t.metadata || {};
    const rows: { entityType: string; entityId: string }[] = [];
    (m.registration_ids || []).forEach((id: string) => rows.push({ entityType: "registration", entityId: id }));
    if (m.sponsor_registration_id) rows.push({ entityType: "sponsor", entityId: m.sponsor_registration_id });
    if (m.vendor_registration_id) rows.push({ entityType: "vendor", entityId: m.vendor_registration_id });
    if (m.side_event_ticket_id) rows.push({ entityType: "side_ticket", entityId: m.side_event_ticket_id });
    return rows;
  };

  const exportCSV = () => {
    // Collect superset of custom field labels across filtered tournaments
    const activeTournIds = new Set(filtered.map(t => t.tournament_id).filter(Boolean) as string[]);
    const relevantFields = customFields.filter(f => activeTournIds.has(f.tournament_id));
    const fieldLabels = Array.from(new Set(relevantFields.map(f => f.label)));

    const baseHeaders = [
      "Date", "Tournament", "Transaction Type", "Status",
      "Golfer/Contact Name", "Email", "Phone",
      "Gross ($)", "Platform Fee ($)", "Stripe Fee ($)", "Net ($)",
      "Description",
      "First Name", "Last Name", "Handicap", "Shirt Size", "Dietary", "Group",
      "Company", "Website", "Address", "Sponsor Notes",
      "Vendor Booth", "Vendor Business Type", "Vendor Notes",
      "Side Event Attendee", "Side Event Qty",
      "Donation Donor",
      "Add-Ons",
      "Stripe Payment Intent", "Stripe Session",
    ];
    const headers = [...baseHeaders, ...fieldLabels.map(l => `Q: ${l}`)];

    const rows: string[][] = [];
    for (const t of filtered) {
      const entities = getEntityRows(t);
      const commonHead = [
        new Date(t.created_at).toLocaleString(),
        tournamentTitle(t.tournament_id),
        typeLabel(t.type),
        t.status,
      ];
      const commonMoney = [
        (t.amount_cents / 100).toFixed(2),
        (t.platform_fee_cents / 100).toFixed(2),
        ((t.stripe_fee_cents || 0) / 100).toFixed(2),
        (t.net_amount_cents / 100).toFixed(2),
        t.description || "",
      ];
      const stripeIds = [t.stripe_payment_intent_id || "", t.stripe_session_id || ""];

      if (entities.length === 0) {
        rows.push([
          ...commonHead,
          t.golfer_name || "", t.golfer_email || "", "",
          ...commonMoney,
          "", "", "", "", "", "",
          "", "", "", "",
          "", "", "",
          "", "",
          t.type === "donation" ? (donations.get(t.stripe_session_id || "")?.donor_email || "") : "",
          "",
          ...stripeIds,
          ...fieldLabels.map(() => ""),
        ]);
        continue;
      }

      for (const ent of entities) {
        let name = t.golfer_name || "", email = t.golfer_email || "", phone = "";
        let first = "", last = "", handicap = "", shirt = "", diet = "", groupL = "";
        let company = "", website = "", address = "", sponsorNotes = "";
        let vendorBooth = "", vendorType = "", vendorNotes = "";
        let sideAtt = "", sideQty = "";
        let addonStr = "";
        const answersMap: Record<string, string> = {};

        if (ent.entityType === "registration") {
          const r = regs.get(ent.entityId);
          if (r) {
            first = r.first_name; last = r.last_name;
            name = `${r.first_name} ${r.last_name}`.trim();
            email = r.email || "";
            phone = r.phone || "";
            handicap = r.handicap != null ? String(r.handicap) : "";
            shirt = r.shirt_size || "";
            diet = r.dietary_restrictions || "";
            groupL = r.group_label || "";
            for (const f of fieldsForTournament(r.tournament_id)) {
              answersMap[f.label] = answerFor(r, f.id);
            }
            const ax = addons.get(r.id) || [];
            addonStr = ax.map(a => `${a.addon_name} x${a.quantity} ($${(a.unit_price_cents / 100).toFixed(2)})`).join("; ");
          }
        } else if (ent.entityType === "sponsor") {
          const s = sponsors.get(ent.entityId);
          if (s) {
            name = s.contact_name || s.company_name;
            email = s.contact_email || "";
            phone = s.contact_phone || "";
            company = s.company_name;
            website = s.website_url || "";
            address = s.address || "";
            sponsorNotes = s.additional_notes || s.description || "";
          }
        } else if (ent.entityType === "vendor") {
          const v = vendors.get(ent.entityId);
          if (v) {
            name = v.contact_name || v.vendor_name;
            email = v.contact_email || "";
            phone = v.contact_phone || "";
            company = v.company_name || v.vendor_name;
            vendorBooth = v.booth_location || "";
            vendorType = v.business_type || "";
            vendorNotes = v.notes || "";
            if (v.answers && typeof v.answers === "object") {
              for (const [k, val] of Object.entries(v.answers as any)) {
                answersMap[k] = String(val ?? "");
              }
            }
          }
        } else if (ent.entityType === "side_ticket") {
          const st = sideTickets.get(ent.entityId);
          if (st) {
            name = st.attendee_name || "";
            email = st.attendee_email || "";
            phone = st.attendee_phone || "";
            sideAtt = st.attendee_name || "";
            sideQty = String(st.quantity);
          }
        }

        rows.push([
          ...commonHead,
          name, email, phone,
          ...commonMoney,
          first, last, handicap, shirt, diet, groupL,
          company, website, address, sponsorNotes,
          vendorBooth, vendorType, vendorNotes,
          sideAtt, sideQty,
          "",
          addonStr,
          ...stripeIds,
          ...fieldLabels.map(l => answersMap[l] || ""),
        ]);
      }
    }

    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-full-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} rows`);
  };

  const renderDetails = (t: Tx) => {
    const entities = getEntityRows(t);
    if (entities.length === 0) {
      const isDonation = t.type === "donation";
      const d = isDonation ? donations.get(t.stripe_session_id || "") : null;
      return (
        <div className="text-sm space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><span className="text-muted-foreground">Type:</span> {typeLabel(t.type)}</div>
            <div><span className="text-muted-foreground">Payment Intent:</span> <code className="text-xs">{t.stripe_payment_intent_id || "—"}</code></div>
            <div><span className="text-muted-foreground">Session:</span> <code className="text-xs">{t.stripe_session_id || "—"}</code></div>
            {d && <div><span className="text-muted-foreground">Donor:</span> {d.donor_email || "Anonymous"}</div>}
          </div>
          {t.description && <div><span className="text-muted-foreground">Description:</span> {t.description}</div>}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {entities.map((ent, i) => {
          if (ent.entityType === "registration") {
            const r = regs.get(ent.entityId);
            if (!r) return <div key={i} className="text-xs text-muted-foreground">Registration {ent.entityId} not found.</div>;
            const fields = fieldsForTournament(r.tournament_id);
            const ax = addons.get(r.id) || [];
            return (
              <div key={i} className="border rounded-md p-3 bg-background">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Badge variant="outline">Player Registration</Badge>
                  {r.first_name} {r.last_name}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Email:</span> {r.email || "—"}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {r.phone || "—"}</div>
                  <div><span className="text-muted-foreground">Handicap:</span> {r.handicap ?? "—"}</div>
                  <div><span className="text-muted-foreground">Shirt Size:</span> {r.shirt_size || "—"}</div>
                  <div><span className="text-muted-foreground">Dietary:</span> {r.dietary_restrictions || "—"}</div>
                  <div><span className="text-muted-foreground">Group:</span> {r.group_label || "—"}</div>
                </div>
                {fields.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Custom Questions</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {fields.map(f => (
                        <div key={f.id}>
                          <span className="text-muted-foreground">{f.label}:</span> {answerFor(r, f.id) || <span className="text-muted-foreground italic">—</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {ax.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Add-Ons</div>
                    <ul className="text-sm list-disc list-inside">
                      {ax.map(a => (
                        <li key={a.id}>{a.addon_name} × {a.quantity} — ${((a.unit_price_cents * a.quantity) / 100).toFixed(2)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          }
          if (ent.entityType === "sponsor") {
            const s = sponsors.get(ent.entityId);
            if (!s) return <div key={i} className="text-xs text-muted-foreground">Sponsor {ent.entityId} not found.</div>;
            return (
              <div key={i} className="border rounded-md p-3 bg-background">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Badge variant="outline">Sponsor</Badge>{s.company_name}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Contact:</span> {s.contact_name || "—"}</div>
                  <div><span className="text-muted-foreground">Email:</span> {s.contact_email || "—"}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {s.contact_phone || "—"}</div>
                  <div><span className="text-muted-foreground">Website:</span> {s.website_url || "—"}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Address:</span> {s.address || "—"}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Description:</span> {s.description || "—"}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Additional Notes:</span> {s.additional_notes || "—"}</div>
                </div>
              </div>
            );
          }
          if (ent.entityType === "vendor") {
            const v = vendors.get(ent.entityId);
            if (!v) return <div key={i} className="text-xs text-muted-foreground">Vendor {ent.entityId} not found.</div>;
            return (
              <div key={i} className="border rounded-md p-3 bg-background">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Badge variant="outline">Vendor</Badge>{v.vendor_name}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Contact:</span> {v.contact_name || "—"}</div>
                  <div><span className="text-muted-foreground">Email:</span> {v.contact_email || "—"}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {v.contact_phone || "—"}</div>
                  <div><span className="text-muted-foreground">Business Type:</span> {v.business_type || "—"}</div>
                  <div><span className="text-muted-foreground">Booth:</span> {v.booth_location || "—"}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {v.notes || "—"}</div>
                </div>
                {v.answers && typeof v.answers === "object" && Object.keys(v.answers).length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Vendor Form Answers</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {Object.entries(v.answers).map(([k, val]) => (
                        <div key={k}><span className="text-muted-foreground">{k}:</span> {String(val ?? "—")}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }
          if (ent.entityType === "side_ticket") {
            const st = sideTickets.get(ent.entityId);
            if (!st) return <div key={i} className="text-xs text-muted-foreground">Side event ticket {ent.entityId} not found.</div>;
            return (
              <div key={i} className="border rounded-md p-3 bg-background">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Badge variant="outline">Side Event Ticket</Badge>{st.attendee_name || "—"}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Email:</span> {st.attendee_email || "—"}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {st.attendee_phone || "—"}</div>
                  <div><span className="text-muted-foreground">Quantity:</span> {st.quantity}</div>
                  <div><span className="text-muted-foreground">Amount:</span> ${(st.amount_cents / 100).toFixed(2)}</div>
                </div>
                {st.custom_answers && Array.isArray(st.custom_answers) && st.custom_answers.length > 0 && (
                  <div className="mt-3 text-sm">
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Answers</div>
                    <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(st.custom_answers, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}

        <div className="text-xs text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-1 pt-2 border-t">
          <div>Stripe Payment Intent: <code>{t.stripe_payment_intent_id || "—"}</code></div>
          <div>Stripe Session: <code>{t.stripe_session_id || "—"}</code></div>
        </div>
      </div>
    );
  };

  const uniqueTypes = Array.from(new Set(txs.map(t => t.type)));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" /> Transactions</h1>
          <p className="text-sm text-muted-foreground">Every transaction on your account — registrations, sponsors, vendors, side events, donations, and add-ons — with full submission details.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Transactions</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{filtered.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Gross</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${(totalGross / 100).toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Fees</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">${(totalFees / 100).toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Net to You</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">${(totalNet / 100).toFixed(2)}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-muted-foreground mb-1 block">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email, description, payment intent…" className="pl-8" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tournament</label>
              <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tournaments</SelectItem>
                  {tournaments.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {uniqueTypes.map(t => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading transactions…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => {
                  const open = expanded.has(t.id);
                  return (
                    <Fragment key={t.id}>
                      <TableRow className="cursor-pointer" onClick={() => toggleRow(t.id)}>
                        <TableCell>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{tournamentTitle(t.tournament_id)}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{typeLabel(t.type)}</Badge></TableCell>
                        <TableCell className="text-sm">{t.golfer_name || "—"}</TableCell>
                        <TableCell className="text-sm">{t.golfer_email || "—"}</TableCell>
                        <TableCell className="text-right text-sm">${(t.amount_cents / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">${(t.net_amount_cents / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === "failed" ? "destructive" : (t.status === "succeeded" || t.status === "paid") ? "default" : "secondary"} className="capitalize text-xs">
                            {t.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9} className="p-4">{renderDetails(t)}</TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No transactions match the current filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Note: any older registrations that show blank custom question answers were submitted before those answers were being stored. New submissions now capture and display every question response here and in the CSV export.
      </p>
    </div>
  );
};

export default Transactions;
