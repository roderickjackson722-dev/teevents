import { normalizePaymentStatus, paymentStatusBadgeVariant, paymentStatusIcon, paymentStatusLabel } from "@/lib/transactionStatus";
import { useEffect, useState, useMemo, Fragment, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AlertTriangle, Download, Eye, RefreshCw, ChevronDown, ChevronRight, Receipt, Search, Trash2 } from "lucide-react";
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
  registration_id: string | null;
}

interface CustomField {
  id: string;
  label: string;
  field_type: string;
  tournament_id: string;
  is_default?: boolean;
  is_required?: boolean;
  is_enabled?: boolean;
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
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

  // filters
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [missingFilter, setMissingFilter] = useState("all");

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
        if (t.registration_id) regIds.add(t.registration_id);
      const registrationIds = Array.isArray(m.registration_ids)
        ? m.registration_ids
        : typeof m.registration_ids === "string"
          ? m.registration_ids.split(",").map((id: string) => id.trim()).filter(Boolean)
          : [];
      registrationIds.forEach((id: string) => regIds.add(id));
      if (m.manual_registration_id) regIds.add(m.manual_registration_id);
      if (m.sponsor_registration_id) sponsorIds.add(m.sponsor_registration_id);
      if (m.vendor_registration_id) vendorIds.add(m.vendor_registration_id);
      if (m.side_event_ticket_id) sideTicketIds.add(m.side_event_ticket_id);
    }

    const [fieldsRes, regRes, sponsorRes, vendorRes, sideRes, donationRes, addonRes] = await Promise.all([
      supabase.from("tournament_registration_fields")
        .select("id, label, field_type, tournament_id, is_default, is_required, is_enabled")
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

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const handleDeleteTransaction = async (tx: Tx) => {
    setDeletingId(tx.id);
    try {
      const { data, error } = await supabase.functions.invoke("delete-organizer-transaction", {
        body: { transaction_id: tx.id },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Failed to delete transaction");
        return;
      }
      toast.success("Transaction deleted");
      await fetchAll();
    } finally {
      setDeletingId(null);
    }
  };

  const fieldsForTournament = (tournId: string) =>
    customFields.filter(f => f.tournament_id === tournId);

  const isBlank = (value: unknown) => {
    if (value === undefined || value === null) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    return false;
  };

  const answerFor = (reg: Registration | undefined, field: CustomField): string => {
    if (!reg) return "";
    const directByLabel: Record<string, string> = {
      "phone": reg.phone || "",
      "handicap": reg.handicap != null ? String(reg.handicap) : "",
      "shirt size": reg.shirt_size || "",
      "dietary restrictions": reg.dietary_restrictions || "",
    };
    const direct = directByLabel[field.label.trim().toLowerCase()];
    if (direct) return direct;

    const arr = Array.isArray(reg.custom_answers) ? reg.custom_answers : [];
    const found = arr.find((a: any) => {
      const sameId = a?.field_id === field.id || a?.id === field.id;
      const sameLabel = String(a?.label || "").trim().toLowerCase() === field.label.trim().toLowerCase();
      return sameId || sameLabel;
    });
    return found ? String(found.value ?? found.answer ?? "") : "";
  };

  const missingRequiredForReg = (reg: Registration | undefined): CustomField[] => {
    if (!reg) return [];
    return fieldsForTournament(reg.tournament_id)
      .filter(f => f.is_enabled !== false && f.is_required)
      .filter(f => isBlank(answerFor(reg, f)));
  };

  const registrationsForTx = (t: Tx): Registration[] => {
    const ids = new Set<string>();
    if (t.registration_id) ids.add(t.registration_id);
    const m = t.metadata || {};
    const registrationIds = Array.isArray(m.registration_ids)
      ? m.registration_ids
      : typeof m.registration_ids === "string"
        ? m.registration_ids.split(",").map((id: string) => id.trim()).filter(Boolean)
        : [];
    registrationIds.forEach((id: string) => ids.add(id));
    if (m.manual_registration_id) ids.add(m.manual_registration_id);
    return Array.from(ids).map(id => regs.get(id)).filter(Boolean) as Registration[];
  };

  const missingRequiredForTx = (t: Tx): CustomField[] => {
    const byId = new Map<string, CustomField>();
    registrationsForTx(t).forEach(reg => missingRequiredForReg(reg).forEach(field => byId.set(field.id, field)));
    return Array.from(byId.values());
  };

  const registrationSearchText = (t: Tx) => {
    const regText = registrationsForTx(t)
      .map(r => [r.first_name, r.last_name, r.email, r.phone, r.custom_answers ? JSON.stringify(r.custom_answers) : ""].filter(Boolean).join(" "))
      .join(" ");
    return [t.golfer_name, t.golfer_email, t.description, t.type, t.stripe_payment_intent_id, t.stripe_session_id, regText]
      .filter(Boolean).join(" ").toLowerCase();
  };

  const missingRegistrationRows = useMemo(() => {
    return Array.from(regs.values())
      .map(reg => ({ reg, missing: missingRequiredForReg(reg) }))
      .filter(row => row.missing.length > 0)
      .sort((a, b) => new Date(b.reg.created_at).getTime() - new Date(a.reg.created_at).getTime());
  }, [regs, customFields]);

  const hasAtlMissingRows = missingRegistrationRows.some(row => tournamentTitle(row.reg.tournament_id).toLowerCase().includes("atl"));

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = dateFilter === "all" ? 0 : now - parseInt(dateFilter) * 86400000;
    const q = search.toLowerCase().trim();
    return txs.filter(t => {
      if (tournamentFilter !== "all" && t.tournament_id !== tournamentFilter) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (statusFilter !== "all" && normalizePaymentStatus(t.status) !== statusFilter) return false;
      if (cutoff && new Date(t.created_at).getTime() < cutoff) return false;
      if (missingFilter === "missing" && missingRequiredForTx(t).length === 0) return false;
      if (missingFilter === "complete" && missingRequiredForTx(t).length > 0) return false;
      if (q) {
        const hay = registrationSearchText(t);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [txs, tournamentFilter, typeFilter, statusFilter, dateFilter, search, missingFilter, regs, customFields]);

  const totalGross = filtered.reduce((s, t) => s + t.amount_cents, 0);
  const totalFees = filtered.reduce((s, t) => s + t.platform_fee_cents + (t.stripe_fee_cents || 0), 0);
  const totalNet = filtered.reduce((s, t) => s + t.net_amount_cents, 0);

  const typeLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const getEntityRows = (t: Tx): { entityType: string; entityId: string }[] => {
    const m = t.metadata || {};
    const rows: { entityType: string; entityId: string }[] = [];
    const seen = new Set<string>();
    const addRow = (entityType: string, entityId: string | null | undefined) => {
      if (!entityId) return;
      const key = `${entityType}:${entityId}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ entityType, entityId });
    };
    addRow("registration", t.registration_id);
    const registrationIds = Array.isArray(m.registration_ids)
      ? m.registration_ids
      : typeof m.registration_ids === "string"
        ? m.registration_ids.split(",").map((id: string) => id.trim()).filter(Boolean)
        : [];
    registrationIds.forEach((id: string) => addRow("registration", id));
    addRow("registration", m.manual_registration_id);
    addRow("sponsor", m.sponsor_registration_id);
    addRow("vendor", m.vendor_registration_id);
    addRow("side_ticket", m.side_event_ticket_id);
    return rows;
  };

  const exportCSV = () => {
    // Collect superset of registration field definitions across filtered tournaments.
    const activeTournIds = new Set(filtered.map(t => t.tournament_id).filter(Boolean) as string[]);
    const relevantFields = customFields.filter(f => activeTournIds.has(f.tournament_id));
    const fieldColumns = relevantFields.map(f => ({
      ...f,
      header: `Q: ${tournamentTitle(f.tournament_id)} — ${f.label}`,
      missingHeader: `Missing Required: ${tournamentTitle(f.tournament_id)} — ${f.label}`,
    }));
    const requiredFieldColumns = fieldColumns.filter(f => f.is_required && f.is_enabled !== false);

    const baseHeaders = [
      "Date", "Tournament", "Transaction Type", "Status",
      "Golfer/Contact Name", "Email", "Phone",
      "Missing Required Fields",
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
    const headers = [
      ...baseHeaders,
      ...fieldColumns.map(f => f.header),
      ...requiredFieldColumns.map(f => f.missingHeader),
    ];

    const rows: string[][] = [];
    for (const t of filtered) {
      const entities = getEntityRows(t);
      const commonHead = [
        new Date(t.created_at).toLocaleString(),
        tournamentTitle(t.tournament_id),
        typeLabel(t.type),
        paymentStatusLabel(t.status),
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
          t.golfer_name || "", t.golfer_email || "", "", "",
          ...commonMoney,
          "", "", "", "", "", "",
          "", "", "", "",
          "", "", "",
          "", "",
          t.type === "donation" ? (donations.get(t.stripe_session_id || "")?.donor_email || "") : "",
          "",
          ...stripeIds,
          ...fieldColumns.map(() => ""),
          ...requiredFieldColumns.map(() => ""),
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
        let missingRequired = "";
        const answersMap: Record<string, string> = {};
        const missingMap: Record<string, string> = {};

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
              answersMap[f.id] = answerFor(r, f);
            }
            const missing = missingRequiredForReg(r);
            missingRequired = missing.map(f => f.label).join("; ");
            missing.forEach(f => { missingMap[f.id] = "Yes"; });
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
          name, email, phone, missingRequired,
          ...commonMoney,
          first, last, handicap, shirt, diet, groupL,
          company, website, address, sponsorNotes,
          vendorBooth, vendorType, vendorNotes,
          sideAtt, sideQty,
          "",
          addonStr,
          ...stripeIds,
          ...fieldColumns.map(f => answersMap[f.id] || ""),
          ...requiredFieldColumns.map(f => missingMap[f.id] || "No"),
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
            const missing = missingRequiredForReg(r);
            const ax = addons.get(r.id) || [];
            return (
              <div key={i} className="border rounded-md p-3 bg-background">
                <div className="font-semibold mb-2 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">Player Registration</Badge>
                    {r.first_name} {r.last_name}
                    {missing.length > 0 && <Badge variant="destructive">Missing {missing.length} required</Badge>}
                  </div>
                  <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setSelectedRegistration(r); }}>
                    <Eye className="h-4 w-4 mr-1" /> Details
                  </Button>
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
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Registration Form Answers</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {fields.map(f => (
                        <div key={f.id}>
                          <span className="text-muted-foreground">{f.label}:</span> {answerFor(r, f) || <span className="text-muted-foreground italic">Not captured</span>}
                          {f.is_required && isBlank(answerFor(r, f)) && <Badge variant="destructive" className="ml-2 text-[10px]">Required missing</Badge>}
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

  const selectedFields = selectedRegistration ? fieldsForTournament(selectedRegistration.tournament_id) : [];
  const selectedMissing = selectedRegistration ? missingRequiredForReg(selectedRegistration) : [];
  const selectedAnswers = selectedRegistration ? selectedFields.map(field => ({
    field_id: field.id,
    label: field.label,
    field_type: field.field_type,
    required: !!field.is_required,
    enabled: field.is_enabled !== false,
    answer: answerFor(selectedRegistration, field),
    missing_required: !!field.is_required && isBlank(answerFor(selectedRegistration, field)),
  })) : [];
  const selectedRawPayload = selectedRegistration ? {
    registration: selectedRegistration,
    tournament: tournamentTitle(selectedRegistration.tournament_id),
    formatted_answers: selectedAnswers,
    missing_required_fields: selectedMissing.map(field => field.label),
    add_ons: addons.get(selectedRegistration.id) || [],
    related_transactions: txs
      .filter(t => registrationsForTx(t).some(reg => reg.id === selectedRegistration.id))
      .map(t => ({ id: t.id, created_at: t.created_at, type: t.type, status: t.status, amount_cents: t.amount_cents, metadata: t.metadata })),
  } : null;

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

      {missingRegistrationRows.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="font-semibold text-destructive">{missingRegistrationRows.length} registration{missingRegistrationRows.length !== 1 ? "s" : ""} missing required fields</div>
                <p className="text-sm text-muted-foreground">
                  Required answers like Age and City & State Traveling From are blank on these stored registrations. {hasAtlMissingRows ? "The older ATL submissions were not stored with those custom question answers, so the dashboard can flag them but cannot reconstruct the missing values from the current records." : "Older submissions may show as not captured if those answers were not stored when the transaction was created."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingRegistrationRows.slice(0, 8).map(({ reg, missing }) => (
                    <Button key={reg.id} type="button" size="sm" variant="outline" onClick={() => setSelectedRegistration(reg)}>
                      {reg.first_name} {reg.last_name} · {missing.map(f => f.label).join(", ")}
                    </Button>
                  ))}
                  {missingRegistrationRows.length > 8 && <Badge variant="secondary">+{missingRegistrationRows.length - 8} more</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-muted-foreground mb-1 block">Registrant Name or Email</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone, payment ID…" className="pl-8" />
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
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
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
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Required Fields</label>
              <Select value={missingFilter} onValueChange={setMissingFilter}>
                <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All submissions</SelectItem>
                  <SelectItem value="missing">Missing required</SelectItem>
                  <SelectItem value="complete">No required missing</SelectItem>
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
                  <TableHead>Required Fields</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => {
                  const open = expanded.has(t.id);
                  const missing = missingRequiredForTx(t);
                  return (
                    <Fragment key={t.id}>
                      <TableRow className="cursor-pointer" onClick={() => toggleRow(t.id)}>
                        <TableCell>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{tournamentTitle(t.tournament_id)}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{typeLabel(t.type)}</Badge></TableCell>
                        <TableCell className="text-sm">{t.golfer_name || "—"}</TableCell>
                        <TableCell className="text-sm">{t.golfer_email || "—"}</TableCell>
                        <TableCell>
                          {missing.length > 0 ? (
                            <Badge variant="destructive" className="whitespace-nowrap">Missing {missing.length}</Badge>
                          ) : (
                            <Badge variant="secondary" className="whitespace-nowrap">Complete</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">${(t.amount_cents / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">${(t.net_amount_cents / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={paymentStatusBadgeVariant(t.status)} className="text-xs">
                            {paymentStatusIcon(t.status)} {paymentStatusLabel(t.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                disabled={deletingId === t.id}
                                title="Delete this transaction"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This removes the <strong>${(t.amount_cents / 100).toFixed(2)}</strong> {typeLabel(t.type).toLowerCase()} record{t.golfer_name ? ` for ${t.golfer_name}` : ""} from your revenue totals and Finances dashboard.
                                  {t.type === "sponsorship" && t.metadata?.sponsor_registration_id ? " The linked sponsor registration will also be removed." : ""}
                                  {" "}This does not automatically issue a refund in Stripe — if money was already collected, process the refund separately.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTransaction(t)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={11} className="p-4">{renderDetails(t)}</TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">No transactions match the current filters.</TableCell>
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

      <Dialog open={!!selectedRegistration} onOpenChange={(open) => !open && setSelectedRegistration(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Registration Details{selectedRegistration ? ` — ${selectedRegistration.first_name} ${selectedRegistration.last_name}` : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedRegistration && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Tournament:</span> {tournamentTitle(selectedRegistration.tournament_id)}</div>
                <div><span className="text-muted-foreground">Email:</span> {selectedRegistration.email || "—"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedRegistration.phone || "—"}</div>
                <div><span className="text-muted-foreground">Submitted:</span> {new Date(selectedRegistration.created_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Payment:</span> <Badge variant="outline">{paymentStatusIcon(selectedRegistration.payment_status)} {paymentStatusLabel(selectedRegistration.payment_status)}</Badge></div>
                <div><span className="text-muted-foreground">Registration ID:</span> <code className="text-xs">{selectedRegistration.id}</code></div>
              </div>

              {selectedMissing.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <div className="font-medium text-destructive mb-1">Missing required fields</div>
                  <div className="text-muted-foreground">{selectedMissing.map(field => field.label).join(", ")}</div>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold mb-2">Formatted Answers</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {selectedAnswers.map(answer => (
                    <div key={answer.field_id} className="rounded-md border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{answer.label}</span>
                        {answer.missing_required && <Badge variant="destructive" className="text-[10px]">Required missing</Badge>}
                      </div>
                      <div className="text-muted-foreground break-words">{answer.answer || <span className="italic">Not captured</span>}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Raw Submission Payload</div>
                <pre className="max-h-[360px] overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words">
                  {JSON.stringify(selectedRawPayload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;
