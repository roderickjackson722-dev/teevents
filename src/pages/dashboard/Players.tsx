import { useEffect, useMemo, useRef, useState } from "react";
import StickySaveBar from "@/components/dashboard/StickySaveBar";
import PairingsTemplateBuilder, { type TemplateSlot } from "@/components/dashboard/PairingsTemplateBuilder";

import { useDemoMode } from "@/hooks/useDemoMode";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useTournamentIdParam } from "@/hooks/useTournamentIdParam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { markChecklistTaskComplete } from "@/hooks/useSetupChecklist";
import {
  isPaidStatus,
  countPayments,
  buildRegistrationGroups,
  buildAutoAssignUnits,
  teammatesAwayFromHole,
} from "@/lib/rosterUtils";
import {
  AGE_GROUPS,
  parseAge,
  ageGroupKeyOf,
  ageMatchesFilter,
  allAgeGroupsOn,
  allAgeGroupsOff,
  isImplausibleAge,

} from "@/lib/ageGroups";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2, Lock, LockOpen, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  Users,
  Trophy,
  Loader2,
  Search,
  GripVertical,
  UserPlus,
  Download,
  Trash2,
  Plus,
  QrCode,
  Pencil,
  Check,
  X,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  MapPin,
  StickyNote,
} from "lucide-react";
import PlayerImport from "@/components/PlayerImport";
import ManualEntryLimitModal from "@/components/ManualEntryLimitModal";
import { useManualEntryEnforcement } from "@/hooks/useManualEntryEnforcement";
import { SCORING_FORMATS } from "@/lib/scoringFormats";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  handicap: number | null;
  shirt_size: string | null;
  dietary_restrictions: string | null;
  notes: string | null;
  payment_status: string;
  payment_method?: string | null;
  cash_payment_received?: boolean | null;
  group_number: number | null;
  group_label: string | null;
  group_position: number | null;
  group_id?: string | null;
  group_leader?: boolean | null;

  created_at: string;
  scoring_code: string | null;
  group_scoring_code?: string | null;
  tier_id: string | null;
  custom_answers?: Array<{ field_id: string; label: string; field_type: string; answer: unknown }> | null;
}

interface Tournament {
  id: string;
  title: string;
  max_players: number | null;
  allow_cash_registration?: boolean | null;
}

interface RegFieldDef {
  id: string;
  label: string;
  field_type: string;
  is_default: boolean;
  is_enabled: boolean;
  sort_order: number;
}

// Base column keys shown in the roster
type RosterColKey = "name" | "email" | "phone" | "hcp" | "age" | "shirt" | "hole" | "teetime" | "code" | "payment" | "tier" | "group";
const BASE_ROSTER_COLS: { key: RosterColKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "hcp", label: "Handicap" },
  { key: "age", label: "Age" },
  { key: "group", label: "Group / Team" },
  { key: "tier", label: "Division / Tier" },
  { key: "shirt", label: "Shirt" },
  { key: "hole", label: "Hole" },
  { key: "teetime", label: "Tee Time" },
  { key: "code", label: "Scoring Code" },
  { key: "payment", label: "Payment" },
];


// Reserved custom_answers ids for organizer-entered demographic fields
const RESERVED_AGE = "_age";
const RESERVED_CITY = "_city";
const RESERVED_STATE = "_state";
const readReserved = (
  p: { custom_answers?: Array<{ field_id: string; label: string; field_type: string; answer: unknown }> | null },
  id: string,
) => {
  const m = (p.custom_answers || []).find((a) => a.field_id === id);
  const v = m?.answer;
  if (v === null || v === undefined) return "";
  return String(v);
};

type AnyReg = { custom_answers?: Array<{ field_id: string; label: string; field_type: string; answer: unknown }> | null };

/**
 * Age can live in two places: the reserved `_age` answer written by the
 * organizer dashboard, or a custom "Age" question on the public registration
 * form (which uses a generated field_id). Read both so registrant ages show up.
 */
const rawAgeAnswer = (p: AnyReg): string => {
  const reserved = readReserved(p, RESERVED_AGE);
  if (reserved) return reserved;
  const labeled = (p.custom_answers || []).find(
    (a) => a && /(^|\s)age(\s|$)/i.test(String(a.label || "")) && !/range|group|birth/i.test(String(a.label || "")),
  );
  const v = labeled?.answer;
  return v === null || v === undefined ? "" : String(v);
};

/** field_id that holds the age answer for this registration (for updates). */
const ageFieldIdOf = (p: AnyReg): string | null => {
  const match = (p.custom_answers || []).find(
    (a) => a && (a.field_id === RESERVED_AGE || (/(^|\s)age(\s|$)/i.test(String(a.label || "")) && !/range|group|birth/i.test(String(a.label || "")))),
  );
  return match?.field_id ?? null;
};


const Players = () => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useTournamentIdParam();
  const [allPlayers, setAllPlayers] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // Roster payment view: paid players only (default), pending-only, or everyone.
  const [paymentView, setPaymentView] = useState<"paid" | "pending" | "all">("all");
  const [view, setView] = useState<"roster" | "pairings">("roster");
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    handicap: "",
    shirt_size: "",
    payment_status: "paid",
    payment_method: "online",
    age: "",
    city: "",
    state: "",
    tier_id: "",
  });
  const [emptyGroups, setEmptyGroups] = useState<number[]>([]);
  const FIELD_DEFS = [
    { key: "phone", label: "Phone" },
    { key: "handicap", label: "Handicap" },
    { key: "shirt_size", label: "Shirt Size" },
    { key: "payment_status", label: "Payment Status" },
    { key: "age", label: "Age" },
    { key: "city_state", label: "City / State" },
    { key: "division", label: "Division / Tier" },
  ] as const;
  type FieldKey = typeof FIELD_DEFS[number]["key"];
  const fieldsStorageKey = selectedTournament ? `teevents_add_player_fields_${selectedTournament}` : "";
  const [visibleFields, setVisibleFields] = useState<Record<FieldKey, boolean>>({
    phone: true, handicap: true, shirt_size: true, payment_status: true,
    age: false, city_state: false, division: false,
  });
  useEffect(() => {
    if (!fieldsStorageKey) return;
    try {
      const raw = localStorage.getItem(fieldsStorageKey);
      if (raw) setVisibleFields((prev) => ({ ...prev, ...JSON.parse(raw) }));
      else setVisibleFields({ phone: true, handicap: true, shirt_size: true, payment_status: true, age: false, city_state: false, division: false });
    } catch { /* noop */ }
  }, [fieldsStorageKey]);
  const toggleField = (k: FieldKey) => {
    setVisibleFields((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      try { if (fieldsStorageKey) localStorage.setItem(fieldsStorageKey, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };
  const [editingScoringCode, setEditingScoringCode] = useState<string | null>(null);
  const [scoringCodeInput, setScoringCodeInput] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState<Registration | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    handicap: "", shirt_size: "", dietary_restrictions: "", group_number: "", group_label: "",
    age: "", city: "", state: "", tier_id: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [regFeeCents, setRegFeeCents] = useState(0);
  const manualEntry = useManualEntryEnforcement(selectedTournament || null);

  // Registration field definitions for this tournament (used to expose custom answers as roster columns)
  const [regFieldDefs, setRegFieldDefs] = useState<RegFieldDef[]>([]);

  // Roster column visibility (base + custom_<fieldId>) + sort state — persisted per tournament
  const rosterColsKey = selectedTournament ? `teevents_roster_cols_${selectedTournament}` : "";
  const rosterSortKey = selectedTournament ? `teevents_roster_sort_${selectedTournament}` : "";
  const [rosterCols, setRosterCols] = useState<Record<string, boolean>>({
    name: true, email: true, phone: true, hcp: true, age: true, group: true, tier: true, shirt: true, hole: true, code: true, payment: true,
  });
  // ---- Age filter (Roster + Pairings) ----
  const [showAllAges, setShowAllAges] = useState(true);
  const [ageGroupFilters, setAgeGroupFilters] = useState<Record<string, boolean>>(allAgeGroupsOn());
  const [pairMethod, setPairMethod] = useState<"handicap" | "age" | "random" | "custom">("custom");
  const [ageBalance, setAgeBalance] = useState(false);

  const [tiers, setTiers] = useState<Array<{ id: string; name: string }>>([]);
  const tierName = (id: string | null) => (id ? (tiers.find((t) => t.id === id)?.name || "—") : "—");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameInput, setGroupNameInput] = useState("");
  // Team names attached to a pairing group (Hole / Group number) — these drive the live leaderboard.
  const [teamNamesByHole, setTeamNamesByHole] = useState<Record<number, string>>({});
  const [teamGroups, setTeamGroups] = useState<Array<{ id: string; name: string; group_number: number | null }>>([]);
  const [editingTeamNum, setEditingTeamNum] = useState<number | null>(null);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [newTeamForPlayer, setNewTeamForPlayer] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");


  useEffect(() => {
    if (!rosterColsKey) return;
    try {
      const raw = localStorage.getItem(rosterColsKey);
      if (raw) setRosterCols((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch { /* noop */ }
    try {
      const raw = localStorage.getItem(rosterSortKey);
      if (raw) { const p = JSON.parse(raw); if (p?.key) { setSortKey(p.key); setSortDir(p.dir === "desc" ? "desc" : "asc"); } }
    } catch { /* noop */ }
  }, [rosterColsKey, rosterSortKey]);
  const toggleRosterCol = (key: string) => {
    setRosterCols((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { if (rosterColsKey) localStorage.setItem(rosterColsKey, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };
  const changeSort = (key: string) => {
    setSortKey((prevKey) => {
      const nextKey = key;
      setSortDir((prevDir) => {
        const nextDir: "asc" | "desc" = prevKey === key ? (prevDir === "asc" ? "desc" : "asc") : "asc";
        try { if (rosterSortKey) localStorage.setItem(rosterSortKey, JSON.stringify({ key: nextKey, dir: nextDir })); } catch { /* noop */ }
        return nextDir;
      });
      return nextKey;
    });
  };

  useEffect(() => {
    if (!org) return;
    (supabase as any)
      .from("tournaments")
      .select("id, title, max_players, allow_cash_registration, registration_fee_cents, pairings_locked, pairings_locked_at")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        const list = data || [];
        setTournaments(list);
        if (list.length > 0 && !selectedTournament) setSelectedTournament(list[0].id);
        setLoading(false);
      });
  }, [org]);

  useEffect(() => {
    if (!selectedTournament) return;
    setLoading(true);
    Promise.all([
      supabase.from("tournament_registrations").select("*").eq("tournament_id", selectedTournament).order("created_at", { ascending: true }),
      supabase.from("tournament_registration_fields").select("id, label, field_type, is_default, is_enabled, sort_order").eq("tournament_id", selectedTournament).order("sort_order"),
      (supabase as any).from("tournament_registration_tiers").select("id, name").eq("tournament_id", selectedTournament).order("sort_order"),
      (supabase as any).from("registration_groups").select("id, group_name, team_name, group_number").eq("tournament_id", selectedTournament).order("created_at"),
    ]).then(([regsRes, fieldsRes, tiersRes, groupsRes]: any) => {
      setAllPlayers((regsRes.data as unknown as Registration[]) || []);
      setRegFieldDefs((fieldsRes.data as RegFieldDef[]) || []);
      setTiers((tiersRes?.data as Array<{ id: string; name: string }>) || []);
      const rows: any[] = groupsRes?.data || [];
      const gm: Record<string, string> = {};
      const tn: Record<number, string> = {};
      rows.forEach((g: any, i: number) => {
        const nm = String(g.team_name || g.group_name || "").trim();
        gm[g.id] = nm || `Team ${i + 1}`;
        if (g.group_number != null && nm) tn[g.group_number] = nm;
      });
      setGroupNames(gm);
      setTeamNamesByHole(tn);
      setTeamGroups(rows.map((g: any) => ({
        id: g.id,
        name: String(g.team_name || g.group_name || "").trim() || "Unnamed team",
        group_number: g.group_number ?? null,
      })));

      setLoading(false);
    });
  }, [selectedTournament]);

  useEffect(() => {
    const t: any = tournaments.find((x: any) => x.id === selectedTournament);

    setRegFeeCents(Number(t?.registration_fee_cents || 0));
  }, [selectedTournament, tournaments]);

  // Custom field columns exposed in the roster (organizer-added registration questions)
  const customFieldCols = regFieldDefs
    .filter((f) => !f.is_default && f.is_enabled)
    .sort((a, b) => a.sort_order - b.sort_order);

  const getCustomAnswer = (p: Registration, fieldId: string): string => {
    const match = (p.custom_answers || []).find((a) => a.field_id === fieldId);
    const v = match?.answer;
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  };

  // Scoring codes live at the GROUP level and are only created once pairings are assigned.
  const codeOf = (p: Registration): string => (p.group_scoring_code || p.scoring_code || "");
  const newScoringCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  // Player age — either the organizer-entered reserved field or an "Age"
  // question answered on the public registration form.
  const rawAgeOf = (p: Registration): string => rawAgeAnswer(p as any);
  const ageOf = (p: Registration): number | null => parseAge(rawAgeOf(p));
  const ageVisible = (p: Registration) => ageMatchesFilter(ageOf(p), ageGroupFilters, showAllAges);


  const getSortValue = (p: Registration, key: string): string | number => {
    switch (key) {
      case "name": return `${p.first_name} ${p.last_name}`.toLowerCase();
      case "email": return (p.email || "").toLowerCase();
      case "phone": return (p.phone || "").toLowerCase();
      case "hcp": return p.handicap ?? Number.POSITIVE_INFINITY;
      case "age": return ageOf(p) ?? Number.POSITIVE_INFINITY;
      case "tier": return tierName(p.tier_id).toLowerCase();
      case "group": return (p.group_id ? (groupNames[p.group_id] || "team") : "\uFFFF").toLowerCase();
      case "shirt": return (p.shirt_size || "").toLowerCase();
      case "hole": return p.group_number ?? Number.POSITIVE_INFINITY;
      case "teetime": {
        const t = p.group_number != null ? holeTeeTimes[p.group_number] : "";
        return t || "\uFFFF"; // empty sorts last
      }
      case "code": return codeOf(p).toLowerCase();
      case "payment": return (p.payment_status || "").toLowerCase();
      default:
        if (key.startsWith("custom_")) return getCustomAnswer(p, key.slice("custom_".length)).toLowerCase();
        return "";
    }
  };

  const isPaid = (p: Registration) => isPaidStatus(p as any);
  const { paid: paidCount } = countPayments(allPlayers as any);

  // Only paid players count toward the roster, pairings, scoring and totals.
  const players = useMemo(() => allPlayers.filter(isPaid), [allPlayers]);

  // How many players fall into each age group (drives the filter counts)
  const ageGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    players.forEach((p) => {
      const key = ageGroupKeyOf(parseAge(rawAgeAnswer(p as any)));
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [players]);

  const pendingPlayers = useMemo(() => allPlayers.filter((p) => !isPaid(p)), [allPlayers]);

  // The roster list itself respects the payment view so manually added / unpaid
  // registrations are visible (pairings, scoring and totals still use paid only).
  const rosterBase = paymentView === "paid" ? players : paymentView === "pending" ? pendingPlayers : allPlayers;

  const filteredPlayers = rosterBase

    .filter(ageVisible)
    .filter((p) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      );
    })

    .sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      const dir = sortDir === "asc" ? 1 : -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });

  // Human-readable label for how many players registered together
  const groupSizeLabel = (n: number) => {
    if (n <= 1) return "Individual Registration";
    if (n === 2) return "Twosome – 2 players";
    if (n === 3) return "Threesome – 3 players";
    if (n === 4) return "Foursome – 4 players";
    return `${n} players`;
  };

  // Registration groups (foursomes / twosomes that signed up together)
  const registrationGroups = useMemo(
    () => buildRegistrationGroups(players as any, groupNames) as unknown as Array<{ id: string; name: string; players: Registration[] }>,
    [players, groupNames]
  );





  // registration_group_id -> { name, size } for roster group indicators
  const groupInfoById = useMemo(() => {
    const m: Record<string, { name: string; size: number }> = {};
    registrationGroups.forEach((g) => { m[g.id] = { name: g.name, size: g.players.length }; });
    return m;
  }, [registrationGroups]);

  const groupCellFor = (p: Registration) => {
    const info = p.group_id ? groupInfoById[p.group_id] : undefined;
    if (!info) return { name: "", label: "Individual Registration" };
    return { name: info.name, label: `(${groupSizeLabel(info.size)})` };
  };

  const handleDeletePlayer = async (id: string) => {
    if (demoGuard()) return;
    const { error } = await supabase.from("tournament_registrations").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setAllPlayers((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Player removed" });
    }
  };

  const openEditPlayer = (p: Registration) => {
    setEditingPlayer(p);
    const label = p.group_label || (p.group_number != null ? String(p.group_number) : "");
    setEditForm({
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      email: p.email || "",
      phone: p.phone || "",
      handicap: p.handicap !== null && p.handicap !== undefined ? String(p.handicap) : "",
      shirt_size: p.shirt_size || "",
      dietary_restrictions: p.dietary_restrictions || "",
      group_number: p.group_number !== null && p.group_number !== undefined ? String(p.group_number) : "",
      group_label: label,
      age: rawAgeAnswer(p as any),
      city: readReserved(p, RESERVED_CITY),
      state: readReserved(p, RESERVED_STATE),
      tier_id: p.tier_id || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPlayer || demoGuard()) return;
    if (!editForm.first_name.trim() || !editForm.last_name.trim() || !editForm.email.trim()) {
      toast({ title: "Missing fields", description: "First name, last name, and email are required.", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    // Parse leading integer from group_label (e.g. "1A" → 1) to keep numeric group_number in sync
    const labelRaw = editForm.group_label.trim();
    const leadingNum = labelRaw.match(/^(\d+)/);
    const parsedGroupNumber = leadingNum ? parseInt(leadingNum[1]) : null;
    const updates: any = {
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
      email: editForm.email.trim().toLowerCase(),
      phone: editForm.phone.trim() || null,
      handicap: editForm.handicap ? parseFloat(editForm.handicap) : null,
      shirt_size: editForm.shirt_size || null,
      dietary_restrictions: editForm.dietary_restrictions.trim() || null,
      group_number: parsedGroupNumber,
      group_label: labelRaw || null,
      tier_id: editForm.tier_id || null,
    };
    // Merge reserved demographic answers into custom_answers, preserving other
    // entries. A registration-form "Age" answer is updated in place so the
    // organizer's correction replaces the bad value instead of duplicating it.
    const formAgeFieldId = ageFieldIdOf(editingPlayer as any);
    const existing = (editingPlayer.custom_answers || []).filter(
      (a: any) => a && a.field_id !== RESERVED_AGE && a.field_id !== RESERVED_CITY && a.field_id !== RESERVED_STATE
        && a.field_id !== formAgeFieldId,
    );
    const merged = [...existing];
    if (editForm.age.trim()) {
      const ageFieldId = formAgeFieldId && formAgeFieldId !== RESERVED_AGE ? formAgeFieldId : RESERVED_AGE;
      const label = (editingPlayer.custom_answers || []).find((a: any) => a?.field_id === ageFieldId)?.label || "Age";
      merged.push({ field_id: ageFieldId, label, field_type: "number", answer: editForm.age.trim() });
    }

    if (editForm.city.trim()) merged.push({ field_id: RESERVED_CITY, label: "City", field_type: "text", answer: editForm.city.trim() });
    if (editForm.state.trim()) merged.push({ field_id: RESERVED_STATE, label: "State", field_type: "text", answer: editForm.state.trim() });
    updates.custom_answers = merged;

    const { error } = await supabase
      .from("tournament_registrations")
      .update(updates)
      .eq("id", editingPlayer.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setAllPlayers((prev) => prev.map((p) => p.id === editingPlayer.id ? { ...p, ...updates } : p));
    toast({ title: "Player updated", description: `${updates.first_name} ${updates.last_name} saved.` });
    setEditingPlayer(null);
  };

  // ---- Bulk age clean-up -------------------------------------------------
  const [ageEditOpen, setAgeEditOpen] = useState(false);
  const [ageDrafts, setAgeDrafts] = useState<Record<string, string>>({});
  const [savingAges, setSavingAges] = useState(false);

  const openAgeEditor = () => {
    const drafts: Record<string, string> = {};
    allPlayers.forEach((p) => { drafts[p.id] = rawAgeAnswer(p as any); });
    setAgeDrafts(drafts);
    setAgeEditOpen(true);
  };

  const withAgeAnswer = (p: Registration, value: string) => {
    const fieldId = ageFieldIdOf(p as any);
    const targetId = fieldId && fieldId !== RESERVED_AGE ? fieldId : RESERVED_AGE;
    const label = (p.custom_answers || []).find((a: any) => a?.field_id === targetId)?.label || "Age";
    const rest = (p.custom_answers || []).filter(
      (a: any) => a && a.field_id !== RESERVED_AGE && a.field_id !== targetId,
    );
    return value.trim()
      ? [...rest, { field_id: targetId, label, field_type: "number", answer: value.trim() }]
      : rest;
  };

  const handleSaveAges = async () => {
    if (demoGuard()) return;
    const changed = allPlayers.filter((p) => (ageDrafts[p.id] ?? "") !== rawAgeAnswer(p as any));
    if (changed.length === 0) { setAgeEditOpen(false); return; }
    setSavingAges(true);
    for (const p of changed) {
      const custom_answers = withAgeAnswer(p, ageDrafts[p.id] ?? "");
      const { error } = await supabase
        .from("tournament_registrations")
        .update({ custom_answers: custom_answers as any })
        .eq("id", p.id);
      if (error) {
        setSavingAges(false);
        toast({ title: "Error saving ages", description: error.message, variant: "destructive" });
        return;
      }
    }
    setAllPlayers((prev) => prev.map((p) => {
      if (!changed.some((c) => c.id === p.id)) return p;
      return { ...p, custom_answers: withAgeAnswer(p, ageDrafts[p.id] ?? "") as any };
    }));
    setSavingAges(false);
    setAgeEditOpen(false);
    toast({ title: "Ages updated", description: `${changed.length} player${changed.length === 1 ? "" : "s"} saved.` });
  };


  const handleSaveScoringCode = async (playerId: string) => {
    if (demoGuard()) return;
    const code = scoringCodeInput.trim().toUpperCase();
    if (!code) {
      toast({ title: "Code cannot be empty", variant: "destructive" });
      return;
    }
    const player = allPlayers.find((p) => p.id === playerId);
    if (!player || player.group_number === null || player.group_number === undefined) {
      toast({ title: "Assign pairings first", description: "Scoring codes are generated once this player is placed in a group.", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ group_scoring_code: code, scoring_code: code })
      .eq("tournament_id", selectedTournament)
      .eq("group_number", player.group_number);
    if (error) {
      toast({ title: "Error", description: error.message.includes("unique") ? "This code is already in use" : error.message, variant: "destructive" });
    } else {
      setAllPlayers((prev) => prev.map((p) => p.group_number === player.group_number ? { ...p, group_scoring_code: code, scoring_code: code } : p));
      setEditingScoringCode(null);
      toast({ title: "Group scoring code updated" });
    }
  };

  const handleExportCSV = () => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Handicap", "Division / Tier", "Shirt Size", "Hole", "Payment", "Scoring Code"];
    const rowFor = (p: any) => [
      p.first_name,
      p.last_name,
      p.email,
      p.phone || "",
      p.handicap?.toString() || "",
      tierName(p.tier_id),
      p.shirt_size || "",
      p.group_number?.toString() || "Unassigned",
      p.payment_status,
      codeOf(p),
    ];

    // Mirror the dashboard layout: one block per pairing group, separated by a blank
    // line, with a group header showing hole, tee time, team name and scoring code.
    const nums = [...new Set(players.filter((p) => p.group_number !== null).map((p) => p.group_number!))].sort((a, b) => a - b);
    const rows: string[][] = [];
    nums.forEach((num) => {
      const members = players.filter((p) => p.group_number === num);
      const code = members.map((p) => codeOf(p)).find(Boolean) || "Not assigned";
      const tee = holeTeeTimes[num] ? fmtTee12(holeTeeTimes[num]) : "";
      const team = teamNamesByHole[num] || "";
      const label = [
        `Hole ${num}`,
        team ? `Team: ${team}` : "",
        tee ? `Tee Time: ${tee}` : "",
        `Scoring Code: ${code}`,
        `${members.length} player${members.length === 1 ? "" : "s"}`,
      ].filter(Boolean).join(" | ");
      rows.push([label]);
      rows.push(headers);
      members.forEach((p) => rows.push(rowFor(p)));
      rows.push([]);
    });
    const solo = players.filter((p) => p.group_number === null);
    if (solo.length > 0) {
      rows.push([`Unassigned | ${solo.length} player${solo.length === 1 ? "" : "s"}`]);
      rows.push(headers);
      solo.forEach((p) => rows.push(rowFor(p)));
    }
    if (rows.length === 0) {
      rows.push(headers);
      players.forEach((p) => rows.push(rowFor(p)));
    }

    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pairings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };


  const handleAddPlayer = async () => {
    if (demoGuard()) return;
    if (!selectedTournament || !newPlayer.first_name.trim() || !newPlayer.last_name.trim() || !newPlayer.email.trim()) {
      toast({ title: "Missing fields", description: "First name, last name, and email are required.", variant: "destructive" });
      return;
    }
    const proceed = await manualEntry.guard("player", regFeeCents);
    if (!proceed) return;
    setAddingPlayer(true);
    const isCash = newPlayer.payment_method === "cash" || newPlayer.payment_method === "check";
    const extraAnswers: Array<{ field_id: string; label: string; field_type: string; answer: unknown }> = [];
    if (newPlayer.age.trim()) extraAnswers.push({ field_id: RESERVED_AGE, label: "Age", field_type: "number", answer: newPlayer.age.trim() });
    if (newPlayer.city.trim()) extraAnswers.push({ field_id: RESERVED_CITY, label: "City", field_type: "text", answer: newPlayer.city.trim() });
    if (newPlayer.state.trim()) extraAnswers.push({ field_id: RESERVED_STATE, label: "State", field_type: "text", answer: newPlayer.state.trim() });
    const insertPayload: any = {
      tournament_id: selectedTournament,
      first_name: newPlayer.first_name.trim(),
      last_name: newPlayer.last_name.trim(),
      email: newPlayer.email.trim().toLowerCase(),
      phone: newPlayer.phone.trim() || null,
      handicap: newPlayer.handicap ? parseInt(newPlayer.handicap) : null,
      shirt_size: newPlayer.shirt_size || null,
      tier_id: newPlayer.tier_id || null,
      payment_method: newPlayer.payment_method || "online",
      payment_status: isCash
        ? (newPlayer.payment_status === "paid" ? "paid" : "pending")
        : newPlayer.payment_status,
      cash_payment_received: isCash && newPlayer.payment_status === "paid",
      ...(extraAnswers.length ? { custom_answers: extraAnswers } : {}),
    };
    const { data, error } = await supabase.from("tournament_registrations").insert(insertPayload).select("*").single();
    setAddingPlayer(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setAllPlayers((prev) => [...prev, data as unknown as Registration]);
      setNewPlayer({ first_name: "", last_name: "", email: "", phone: "", handicap: "", shirt_size: "", payment_status: "paid", payment_method: "online", age: "", city: "", state: "", tier_id: "" });
      setAddPlayerOpen(false);
      toast({ title: "Player added", description: `${data.first_name} ${data.last_name} has been added.` });
      markChecklistTaskComplete(selectedTournament, "add_first_player");
      // Fire organizer + platform-admin notification emails (manual add-on / offline payment).
      supabase.functions.invoke("notify-manual-registration", {
        body: { registration_id: (data as any).id },
      }).catch((e) => console.error("notify-manual-registration failed:", e));
    }
  };

  const markCashReceived = async (id: string) => {
    if (demoGuard()) return;
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ payment_status: "paid", cash_payment_received: true } as any)
      .eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setAllPlayers((prev) => prev.map((p) => p.id === id ? { ...p, payment_status: "paid", cash_payment_received: true } : p));
      toast({ title: "Payment marked received" });
      supabase.functions.invoke("notify-manual-registration", {
        body: { registration_id: id },
      }).catch((e) => console.error("notify-manual-registration failed:", e));
    }
  };

  /** Organizer override: flip a pending registration to paid (counts update instantly). */
  const markAsPaid = async (id: string) => {
    if (demoGuard()) return;
    setAllPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, payment_status: "paid" } : p)));
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ payment_status: "paid" } as any)
      .eq("id", id);
    if (error) {
      setAllPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, payment_status: "pending" } : p)));
      toast({ title: "Couldn't mark as paid", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Marked as paid" });
    }
  };

  const markAsPending = async (id: string) => {
    if (demoGuard()) return;
    setAllPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, payment_status: "pending" } : p)));
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ payment_status: "pending" } as any)
      .eq("id", id);
    if (error) {
      setAllPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, payment_status: "paid" } : p)));
      toast({ title: "Couldn't update payment", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Moved back to pending" });
    }
  };

  /** Rename a registration group (foursome / team name shown in Players & Pairings). */
  const renameGroup = async (groupId: string, name: string) => {
    if (demoGuard()) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const prevName = groupNames[groupId];
    setGroupNames((prev) => ({ ...prev, [groupId]: trimmed }));
    setEditingGroupId(null);
    const { error } = await (supabase as any)
      .from("registration_groups")
      .update({ group_name: trimmed })
      .eq("id", groupId);
    if (error) {
      setGroupNames((prev) => ({ ...prev, [groupId]: prevName }));
      toast({ title: "Rename failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team name updated" });
    }
  };

  /**
   * Save the team name for a pairing group (Hole / Group number). This is the name
   * shown on the live leaderboard instead of "Team 1", "Team 2", ...
   */
  const saveHoleTeamName = async (groupNumber: number, name: string) => {
    if (demoGuard()) return;
    const trimmed = name.trim();
    const prev = teamNamesByHole[groupNumber];
    setEditingTeamNum(null);
    setTeamNamesByHole((p) => {
      const next = { ...p };
      if (trimmed) next[groupNumber] = trimmed;
      else delete next[groupNumber];
      return next;
    });
    const existing = teamGroups.find((g) => g.group_number === groupNumber);
    let error: any = null;
    if (existing) {
      ({ error } = await (supabase as any)
        .from("registration_groups")
        .update({ team_name: trimmed || null, group_name: trimmed || null })
        .eq("id", existing.id));
      if (!error) {
        setTeamGroups((p) => p.map((g) => (g.id === existing.id ? { ...g, name: trimmed || "Unnamed team" } : g)));
      }
    } else {
      const res = await (supabase as any)
        .from("registration_groups")
        .insert({ tournament_id: selectedTournament, group_number: groupNumber, team_name: trimmed || null, group_name: trimmed || null })
        .select("id")
        .maybeSingle();
      error = res.error;
      if (res.data?.id) {
        setTeamGroups((p) => [...p, { id: res.data.id, name: trimmed || "Unnamed team", group_number: groupNumber }]);
      }
    }
    if (error) {
      setTeamNamesByHole((p) => ({ ...p, [groupNumber]: prev }));
      toast({ title: "Couldn't save team name", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team name saved", description: "It now shows on the live leaderboard." });
    }
  };

  /** Attach a roster player to a team (registration group), or clear the assignment. */
  const assignPlayerTeam = async (playerId: string, groupId: string | null) => {
    if (demoGuard()) return;
    const prev = allPlayers.find((p) => p.id === playerId)?.group_id ?? null;
    setAllPlayers((list) => list.map((p) => (p.id === playerId ? { ...p, group_id: groupId } : p)));
    const { error } = await (supabase as any)
      .from("tournament_registrations")
      .update({ group_id: groupId })
      .eq("id", playerId);
    if (error) {
      setAllPlayers((list) => list.map((p) => (p.id === playerId ? { ...p, group_id: prev } : p)));
      toast({ title: "Couldn't update team", description: error.message, variant: "destructive" });
    } else {
      toast({ title: groupId ? "Team updated" : "Removed from team" });
    }
  };

  /** Create a brand new team from the roster and attach the player to it. */
  const createTeamForPlayer = async () => {
    if (demoGuard()) return;
    const trimmed = newTeamName.trim();
    const playerId = newTeamForPlayer;
    if (!trimmed || !playerId || !selectedTournament) return;
    const res = await (supabase as any)
      .from("registration_groups")
      .insert({ tournament_id: selectedTournament, team_name: trimmed, group_name: trimmed })
      .select("id")
      .maybeSingle();
    if (res.error || !res.data?.id) {
      toast({ title: "Couldn't create team", description: res.error?.message, variant: "destructive" });
      return;
    }
    setTeamGroups((p) => [...p, { id: res.data.id, name: trimmed, group_number: null }]);
    setGroupNames((p) => ({ ...p, [res.data.id]: trimmed }));
    setNewTeamForPlayer(null);
    setNewTeamName("");
    await assignPlayerTeam(playerId, res.data.id);
  };




  // Assign / regenerate the shared scoring code for one pairing group.
  // Works for partial groups (1, 2 or 3 players) — the only requirement is that
  // the players sit on a hole. We match on tournament + hole so every teammate
  // ends up with the exact same code, even rows hidden by the current filters.
  const setGroupCode = async (groupNumber: number, code: string | null) => {
    if (!selectedTournament) return { error: { message: "Select a tournament first." } as any };
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ group_scoring_code: code, scoring_code: code })
      .eq("tournament_id", selectedTournament)
      .eq("group_number", groupNumber);
    if (!error) {
      setAllPlayers((prev) => prev.map((p) => p.group_number === groupNumber ? { ...p, group_scoring_code: code, scoring_code: code } : p));
    }
    return { error };
  };


  const handleAssignGroupCode = async (groupNumber: number) => {
    if (lockGuard()) return;
    if (demoGuard()) return;
    const used = new Set(allPlayers.map((p) => codeOf(p)).filter(Boolean));
    let code = newScoringCode();
    while (used.has(code)) code = newScoringCode();
    const { error } = await setGroupCode(groupNumber, code);
    if (error) toast({ title: "Could not assign code", description: error.message, variant: "destructive" });
    else toast({ title: `Scoring code ${code} assigned`, description: `Shared by everyone on Hole ${groupNumber}.` });
  };

  const handleRegenerateAllCodes = async () => {
    if (lockGuard()) return;
    if (demoGuard()) return;
    const nums = [...new Set(players.filter((p) => p.group_number !== null).map((p) => p.group_number!))];
    if (nums.length === 0) {
      toast({ title: "Assign pairings first", description: "Scoring codes are generated once players are placed in groups.", variant: "destructive" });
      return;
    }
    setRegenerating(true);
    const used = new Set<string>();
    let success = 0;
    for (const num of nums) {
      let code = newScoringCode();
      while (used.has(code)) code = newScoringCode();
      used.add(code);
      const { error } = await setGroupCode(num, code);
      if (!error) success++;
    }
    setRegenerating(false);
    toast({ title: "Codes regenerated", description: `${success} group scoring code(s) updated.` });
  };



  const maxGroupSize = 4;
  const unassigned = players.filter((p) => p.group_number === null && ageVisible(p));
  const groupNumbers = [...new Set(players.filter((p) => p.group_number !== null).map((p) => p.group_number!))].sort((a, b) => a - b);
  const groupsFromPlayers = groupNumbers.map((num) => ({
    number: num,
    players: players
      .filter((p) => p.group_number === num)
      .sort((a, b) => (a.group_position || 0) - (b.group_position || 0)),
  }));

  // Merge empty groups that have no players yet
  const allGroupNumbers = [...new Set([...groupNumbers, ...emptyGroups])].sort((a, b) => a - b);
  const groupsBase = allGroupNumbers.map((num) => {
    const existing = groupsFromPlayers.find((g) => g.number === num);
    return existing || { number: num, players: [] as Registration[] };
  });

  // Division shown on each pairing card (derived from the player's Division / Tier)
  const divisionOfGroup = (list: Registration[]): string => {
    const names = [...new Set(list.map((p) => (p.tier_id ? tierName(p.tier_id) : "")).filter((n) => n && n !== "—"))];
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    return "Mixed";
  };
  const [pairSort, setPairSort] = useState<"group" | "division" | "teetime">("group");


  const nextGroupNumber = allGroupNumbers.length > 0 ? Math.max(...allGroupNumbers) + 1 : 1;

  const [editingGroupNum, setEditingGroupNum] = useState<number | null>(null);
  const [editGroupValue, setEditGroupValue] = useState<string>("");
  const [editingLocationNum, setEditingLocationNum] = useState<number | null>(null);
  const [editLocationValue, setEditLocationValue] = useState<string>("");
  const [editingNotesNum, setEditingNotesNum] = useState<number | null>(null);
  const [editNotesValue, setEditNotesValue] = useState<string>("");
  const [editingTeeTimeNum, setEditingTeeTimeNum] = useState<number | null>(null);
  const [editTeeTimeValue, setEditTeeTimeValue] = useState<string>("");
  const locStorageKey = selectedTournament ? `teevents_hole_locations_${selectedTournament}` : "";
  const labelsStorageKey = selectedTournament ? `teevents_hole_labels_${selectedTournament}` : "";
  const notesStorageKey = selectedTournament ? `teevents_hole_notes_${selectedTournament}` : "";
  const teeTimesStorageKey = selectedTournament ? `teevents_hole_teetimes_${selectedTournament}` : "";
  const startFormatStorageKey = selectedTournament ? `teevents_pairings_startformat_${selectedTournament}` : "";
  const [holeLocations, setHoleLocations] = useState<Record<number, string>>({});
  const [holeLabels, setHoleLabels] = useState<Record<number, string>>({});
  const [holeNotes, setHoleNotes] = useState<Record<number, string>>({});

  // ---- Multi-day tournament awareness ----
  const currentTournamentObj: any = tournaments.find((t: any) => t.id === selectedTournament);
  const tournamentDays: string[] = useMemo(() => {
    const t: any = currentTournamentObj;
    if (!t?.date) return [];
    const start = new Date(String(t.date) + "T00:00:00");
    const end = t.end_date ? new Date(String(t.end_date) + "T00:00:00") : start;
    const days: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d).toISOString().slice(0, 10));
    }
    return days.length ? days : [];
  }, [currentTournamentObj?.date, currentTournamentObj?.end_date]);
  const numDays = Math.max(1, tournamentDays.length);
  const [activeDay, setActiveDay] = useState<number>(0);
  useEffect(() => { if (activeDay >= numDays) setActiveDay(0); }, [numDays, activeDay]);

  type DayCfg = {
    startFormat: "tee_times" | "shotgun";
    firstTeeHole: number;
    firstTeeTime: string;
    teeInterval: number;
    shotgunTime: string;
    roundFormat?: string;
    roundHoles?: number;
    sameStartHole?: boolean;
  };
  const defaultDayCfg = (): DayCfg => ({ startFormat: "tee_times", firstTeeHole: 1, firstTeeTime: "08:00", teeInterval: 10, shotgunTime: "09:00", roundFormat: "", roundHoles: 18, sameStartHole: true });

  const [holeTeeTimesByDay, setHoleTeeTimesByDay] = useState<Record<number, Record<number, string>>>({});
  const [startFormatByDay, setStartFormatByDay] = useState<Record<number, DayCfg>>({ 0: defaultDayCfg() });

  const holeTeeTimes: Record<number, string> = holeTeeTimesByDay[activeDay] || {};
  const dayCfg: DayCfg = { ...defaultDayCfg(), ...(startFormatByDay[activeDay] || {}) };
  const startFormat = dayCfg.startFormat;
  const firstTeeHole = dayCfg.firstTeeHole;
  const firstTeeTime = dayCfg.firstTeeTime;
  const teeInterval = dayCfg.teeInterval;
  const shotgunTime = dayCfg.shotgunTime;

  // Pairing card ordering (Group / Division / Tee Time)
  const groups = [...groupsBase].sort((a, b) => {
    if (pairSort === "division") {
      const da = divisionOfGroup(a.players);
      const db = divisionOfGroup(b.players);
      if (da !== db) {
        if (!da) return 1;
        if (!db) return -1;
        return da.localeCompare(db);
      }
      return a.number - b.number;
    }
    if (pairSort === "teetime") {
      const ta = holeTeeTimes[a.number] || "";
      const tb = holeTeeTimes[b.number] || "";
      if (ta !== tb) {
        if (!ta) return 1;
        if (!tb) return -1;
        return ta.localeCompare(tb);
      }
      return a.number - b.number;
    }
    return a.number - b.number;
  });

  // ---- Division filter (Pro / Senior / Amateur / …) ----
  const [divFilter, setDivFilter] = useState<string>("all");
  const divisionOptions = [...new Set(
    players.map((p) => (p.tier_id ? tierName(p.tier_id) : "")).filter((n) => n && n !== "—")
  )].sort((a, b) => a.localeCompare(b));
  useEffect(() => {
    if (divFilter !== "all" && !divisionOptions.includes(divFilter)) setDivFilter("all");
  }, [divisionOptions.join("|"), divFilter]);
  const groupMatchesDivision = (list: Registration[]) =>
    divFilter === "all" || list.some((p) => p.tier_id && tierName(p.tier_id) === divFilter);
  // A hole stays visible when at least one of its players passes the age filter
  // (empty holes always stay visible so organizers can still drop players in).
  const groupMatchesAge = (list: Registration[]) =>
    showAllAges || list.length === 0 || list.some(ageVisible);
  const visibleGroups = groups.filter((g) => groupMatchesDivision(g.players) && groupMatchesAge(g.players));
  const hiddenGroupCount = groups.length - visibleGroups.length;


  // ---- Pairing conflict validation (tee times / starting holes) ----
  const startHoleOf = (num: number) => String(holeLabels[num] ?? num).trim();
  const pairingConflicts: string[] = useMemo(() => {
    const issues: string[] = [];
    const filled = groupsBase.filter((g) => g.players.length > 0);
    if (!filled.length) return issues;

    if (dayCfg.startFormat === "tee_times") {
      // Same tee time is fine on DIFFERENT starting holes (e.g. 8:00 off #1 and
      // 8:00 off #10). Only flag groups sharing the same hole AND the same time.
      const byHoleTime = new Map<string, number[]>();
      filled.forEach((g) => {
        const t = holeTeeTimes[g.number];
        if (!t) return;
        const key = `${startHoleOf(g.number)}@${t}`;
        byHoleTime.set(key, [...(byHoleTime.get(key) || []), g.number]);
      });
      byHoleTime.forEach((nums, key) => {
        const [h, t] = key.split("@");
        if (nums.length > 1)
          issues.push(`${nums.length} groups share the ${fmtTee12(t)} tee time on hole #${h} (groups ${nums.join(", ")}).`);
      });
      const missing = filled.filter((g) => !holeTeeTimes[g.number]).map((g) => g.number);
      if (missing.length) issues.push(`No tee time set for ${missing.length} group(s): ${missing.join(", ")}.`);
    } else {

      const times = [...new Set(filled.map((g) => holeTeeTimes[g.number]).filter(Boolean))];
      if (times.length > 1) issues.push(`Shotgun start, but ${times.length} different start times are assigned. Re-apply the shotgun time.`);
      const byHole = new Map<string, number[]>();
      filled.forEach((g) => {
        const h = startHoleOf(g.number);
        byHole.set(h, [...(byHole.get(h) || []), g.number]);
      });
      byHole.forEach((nums, h) => {
        if (nums.length > 1) issues.push(`Shotgun hole #${h} is assigned to ${nums.length} groups (${nums.join(", ")}).`);
      });
    }
    const oversized = filled.filter((g) => g.players.length > maxGroupSize).map((g) => g.number);
    if (oversized.length) issues.push(`Group(s) ${oversized.join(", ")} have more than ${maxGroupSize} players.`);
    return issues;
  }, [groupsBase.map((g) => `${g.number}:${g.players.length}`).join("|"), JSON.stringify(holeTeeTimes), JSON.stringify(holeLabels), dayCfg.startFormat, activeDay]);

  // ---- Lock / publish pairings ----
  const pairingsLocked = !!currentTournamentObj?.pairings_locked;
  const [lockSaving, setLockSaving] = useState(false);
  const lockGuard = () => {
    if (!pairingsLocked) return false;
    toast({
      title: "Pairings are locked",
      description: "Unlock pairings at the top of this section to make changes.",
      variant: "destructive",
    });
    return true;
  };
  const setPairingsLocked = async (locked: boolean) => {
    if (!selectedTournament || demoGuard()) return;
    if (locked && pairingConflicts.length) {
      toast({
        title: "Resolve conflicts first",
        description: pairingConflicts[0],
        variant: "destructive",
      });
      return;
    }
    setLockSaving(true);
    const lockedAt = locked ? new Date().toISOString() : null;
    const { error } = await (supabase as any)
      .from("tournaments")
      .update({ pairings_locked: locked, pairings_locked_at: lockedAt })
      .eq("id", selectedTournament);
    setLockSaving(false);
    if (error) {
      toast({ title: "Could not update lock", description: error.message, variant: "destructive" });
      return;
    }
    setTournaments((list: any[]) => list.map((t: any) => (
      t.id === selectedTournament ? { ...t, pairings_locked: locked, pairings_locked_at: lockedAt } : t
    )));
    toast({
      title: locked ? "Pairings locked" : "Pairings unlocked",
      description: locked
        ? "Assignments, tee times, and scoring codes are now read-only."
        : "You can edit assignments again.",
    });
  };




  useEffect(() => {
    if (!locStorageKey) return;
    try {
      const raw = localStorage.getItem(locStorageKey);
      setHoleLocations(raw ? JSON.parse(raw) : {});
    } catch { setHoleLocations({}); }
    try {
      const raw = localStorage.getItem(labelsStorageKey);
      setHoleLabels(raw ? JSON.parse(raw) : {});
    } catch { setHoleLabels({}); }
    try {
      const raw = localStorage.getItem(notesStorageKey);
      setHoleNotes(raw ? JSON.parse(raw) : {});
    } catch { setHoleNotes({}); }
    // Tee times — support legacy flat shape and new per-day shape
    try {
      const raw = teeTimesStorageKey ? localStorage.getItem(teeTimesStorageKey) : null;
      const parsed = raw ? JSON.parse(raw) : {};
      const isNested = parsed && typeof parsed === "object" && Object.values(parsed).every((v: any) => v && typeof v === "object" && !Array.isArray(v));
      setHoleTeeTimesByDay(isNested ? parsed : (Object.keys(parsed || {}).length ? { 0: parsed } : {}));
    } catch { setHoleTeeTimesByDay({}); }
    // Start format cfg — support legacy flat cfg and new per-day cfg
    try {
      const raw = startFormatStorageKey ? localStorage.getItem(startFormatStorageKey) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        if (parsed.byDay && typeof parsed.byDay === "object") {
          setStartFormatByDay(parsed.byDay);
        } else if (parsed.startFormat) {
          setStartFormatByDay({ 0: { ...defaultDayCfg(), ...parsed } });
        } else {
          setStartFormatByDay({ 0: defaultDayCfg() });
        }
      } else {
        setStartFormatByDay({ 0: defaultDayCfg() });
      }
    } catch { setStartFormatByDay({ 0: defaultDayCfg() }); }
  }, [locStorageKey, labelsStorageKey, notesStorageKey, teeTimesStorageKey, startFormatStorageKey]);

  const saveLocations = (next: Record<number, string>) => {
    setHoleLocations(next);
    try { if (locStorageKey) localStorage.setItem(locStorageKey, JSON.stringify(next)); } catch { /* noop */ }
  };
  const saveLabels = (next: Record<number, string>) => {
    setHoleLabels(next);
    try { if (labelsStorageKey) localStorage.setItem(labelsStorageKey, JSON.stringify(next)); } catch { /* noop */ }
  };
  const saveNotes = (next: Record<number, string>) => {
    setHoleNotes(next);
    try { if (notesStorageKey) localStorage.setItem(notesStorageKey, JSON.stringify(next)); } catch { /* noop */ }
  };
  const saveHoleNote = (num: number, value: string) => {
    const next = { ...holeNotes };
    const v = value.trim();
    if (v) next[num] = v; else delete next[num];
    saveNotes(next);
    setEditingNotesNum(null);
  };
  /**
   * Pairing tee times are the single source of truth for the {{tee_time}} email
   * variable, so mirror them into the database (group row + each player's
   * registration) whenever the organizer changes them here.
   */
  const persistTeeTimesToDb = async (forDay: Record<number, string>, dayIndex: number) => {
    if (!selectedTournament || demoGuard()) return;
    const entries = Object.entries(forDay);
    if (!entries.length) return;
    for (const [holeStr, raw] of entries) {
      const groupNumber = Number(holeStr);
      if (!Number.isFinite(groupNumber)) continue;
      const display = fmtTee12(raw);
      const existing = teamGroups.find((g) => g.group_number === groupNumber);
      try {
        if (existing) {
          await (supabase as any)
            .from("registration_groups")
            .update({ tee_time: display, tee_times: { ...forDay, [`day${dayIndex}`]: display } })
            .eq("id", existing.id);
        } else {
          const res = await (supabase as any)
            .from("registration_groups")
            .insert({ tournament_id: selectedTournament, group_number: groupNumber, tee_time: display, tee_times: { [`day${dayIndex}`]: display } })
            .select("id")
            .maybeSingle();
          if (res?.data?.id) {
            setTeamGroups((p) => [...p, { id: res.data.id, name: "Unnamed team", group_number: groupNumber }]);
          }
        }
        // Day 1 drives the tee time shown in confirmation / day-before emails.
        if (dayIndex === 0) {
          await (supabase as any)
            .from("tournament_registrations")
            .update({ tee_time: display })
            .eq("tournament_id", selectedTournament)
            .eq("group_number", groupNumber);
        }
      } catch { /* non-blocking */ }
    }
    if (dayIndex === 0) {
      setAllPlayers((list) => list.map((p) => (
        p.group_number != null && forDay[p.group_number]
          ? { ...p, tee_time: fmtTee12(forDay[p.group_number]) } as any
          : p
      )));
    }
  };

  const saveTeeTimes = (nextForDay: Record<number, string>) => {
    const nextAll = { ...holeTeeTimesByDay, [activeDay]: nextForDay };
    setHoleTeeTimesByDay(nextAll);
    try { if (teeTimesStorageKey) localStorage.setItem(teeTimesStorageKey, JSON.stringify(nextAll)); } catch { /* noop */ }
    void persistTeeTimesToDb(nextForDay, activeDay);
  };

  // Explicit "Save Tee Times" action. Tee times save as you edit them, but this
  // gives organizers a clear confirmation that everything (all rounds) is stored.
  const [savingTeeTimes, setSavingTeeTimes] = useState(false);
  const handleSaveTeeTimesNow = async () => {
    if (demoGuard()) return;
    setSavingTeeTimes(true);
    try { if (teeTimesStorageKey) localStorage.setItem(teeTimesStorageKey, JSON.stringify(holeTeeTimesByDay)); } catch { /* noop */ }
    try { if (startFormatStorageKey) localStorage.setItem(startFormatStorageKey, JSON.stringify(startFormatByDay)); } catch { /* noop */ }
    let saved = 0;
    for (const [dayStr, map] of Object.entries(holeTeeTimesByDay)) {
      const forDay = (map || {}) as Record<number, string>;
      saved += Object.keys(forDay).length;
      await persistTeeTimesToDb(forDay, Number(dayStr));
    }
    setSavingTeeTimes(false);
    toast({
      title: "Tee times saved",
      description: saved ? `${saved} tee time${saved === 1 ? "" : "s"} saved across all rounds.` : "No tee times to save yet.",
    });
  };
  function fmtTee12(t?: string) {
    if (!t) return "";
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return t;
    let h = parseInt(m[1]);
    const mm = m[2];
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${mm} ${ap}`;
  }

  // Pending duplicate tee time awaiting the organizer's override decision
  const [teeConflict, setTeeConflict] = useState<{ num: number; value: string; hole: string } | null>(null);
  // Holes whose tee time the organizer typed in by hand. "Assign Tee Times"
  // leaves these alone unless the organizer opts to overwrite them.
  const [manualTeeByDay, setManualTeeByDay] = useState<Record<number, number[]>>({});
  const manualTeeNums = manualTeeByDay[activeDay] || [];
  const [overwriteManualTees, setOverwriteManualTees] = useState(false);

  const commitHoleTeeTime = (num: number, value: string) => {
    const next = { ...holeTeeTimes };
    const v = value.trim();
    if (v) next[num] = v; else delete next[num];
    saveTeeTimes(next);
    setManualTeeByDay((prev) => {
      const cur = prev[activeDay] || [];
      const list = v ? [...new Set([...cur, num])] : cur.filter((n) => n !== num);
      return { ...prev, [activeDay]: list };
    });
    setEditingTeeTimeNum(null);
  };


  const saveHoleTeeTime = (num: number, value: string) => {
    if (lockGuard()) return;
    const v = value.trim();
    if (v && dayCfg.startFormat === "tee_times") {
      // Same time is allowed on different starting holes (8:00 off #1 and #10).
      // Only flag when another group has the same time on the SAME hole — and
      // even then, let the organizer override it.
      const thisHole = startHoleOf(num);
      const conflict = Object.entries(holeTeeTimes).find(
        ([h, t]) => Number(h) !== num && t === v && startHoleOf(Number(h)) === thisHole,
      );
      if (conflict) {
        setTeeConflict({ num, value: v, hole: thisHole });
        return;
      }
    }
    commitHoleTeeTime(num, value);
  };


  const persistStartFormat = (patch: Partial<DayCfg>) => {
    const nextDay: DayCfg = { ...dayCfg, ...patch };
    const nextAll = { ...startFormatByDay, [activeDay]: nextDay };
    setStartFormatByDay(nextAll);
    if (!startFormatStorageKey) return;
    try { localStorage.setItem(startFormatStorageKey, JSON.stringify({ byDay: nextAll })); } catch { /* noop */ }
  };

  const addMinutes = (hhmm: string, mins: number) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
    if (!m) return hhmm;
    const total = parseInt(m[1]) * 60 + parseInt(m[2]) + mins;
    const h = Math.floor(((total % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
    const mm = ((total % 60) + 60) % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const applyStartTimesToHoles = () => {
    if (lockGuard()) return;
    const groupNums = groupsBase
      .map((group) => group.number)
      .filter((n, i, arr) => arr.indexOf(n) === i)
      .sort((a, b) => a - b);
    if (groupNums.length === 0) {
      toast({ title: "No holes to assign", variant: "destructive" });
      return;
    }
    const dayLabel = tournamentDays[activeDay] || "Day 1";
    const next: Record<number, string> = {};
    if (startFormat === "shotgun") {
      if (!/^\d{1,2}:\d{2}/.test(shotgunTime)) {
        toast({ title: "Enter a valid shotgun time", variant: "destructive" });
        return;
      }
      groupNums.forEach(n => { next[n] = shotgunTime; });
      saveTeeTimes(next);
      toast({ title: "Shotgun time applied", description: `All ${groupNums.length} holes on ${dayLabel} set to ${fmtTee12(shotgunTime)}.` });
    } else {
      if (!Number.isFinite(teeInterval) || teeInterval < 1) {
        toast({ title: "Invalid interval", description: "Interval must be at least 1 minute to avoid duplicate tee times.", variant: "destructive" });
        return;
      }
      // Tee-time start: hole numbers are NEVER auto-assigned here — groups keep
      // whatever hole the organizer set (defaulting to the chosen starting hole
      // when "apply hole # to all groups" is on). Only the tee times step forward.
      const ordered = groupNums;
      if (dayCfg.sameStartHole) {
        const nextLabels = { ...holeLabels };
        groupNums.forEach((n) => { nextLabels[n] = String(firstTeeHole); });
        saveLabels(nextLabels);
      }
      let keptManual = 0;
      ordered.forEach((n, idx) => {
        const slot = addMinutes(firstTeeTime, idx * teeInterval);
        if (!overwriteManualTees && manualTeeNums.includes(n) && holeTeeTimes[n]) {
          next[n] = holeTeeTimes[n]; // preserve the organizer's manual edit
          keptManual++;
        } else {
          next[n] = slot;
        }
      });


      // The same tee time may be used on different starting holes. Only warn on
      // an exact duplicate of both starting hole AND tee time — never block.
      const seen = new Map<string, number>();
      const dupes: string[] = [];
      for (const [groupStr, t] of Object.entries(next)) {
        const groupNumber = Number(groupStr);
        const startingHole = startHoleOf(groupNumber);
        const key = `${startingHole}@${t}`;
        if (seen.has(key)) {
          dupes.push(`${seen.get(key)} & ${groupNumber} at ${fmtTee12(t)} on hole ${startingHole}`);
        } else {
          seen.set(key, groupNumber);
        }
      }
      saveTeeTimes(next);
      if (dupes.length) {
        toast({
          title: "Applied with duplicate tee times",
          description: `Same tee time on the same hole: ${dupes.join("; ")}. Adjust if that wasn't intended.`,
        });
      }
      toast({ title: "Tee times assigned", description: `${ordered.length} holes on ${dayLabel} starting ${fmtTee12(firstTeeTime)}, every ${teeInterval} min.${keptManual ? ` ${keptManual} manually edited tee time${keptManual === 1 ? "" : "s"} kept.` : ""}` });

    }
  };



  const handleAddGroup = () => {
    if (lockGuard()) return;
    setEmptyGroups((prev) => [...prev, nextGroupNumber]);
    toast({ title: `Hole ${nextGroupNumber} created` });
  };

  /**
   * Applies a saved pairings template: creates the empty group slots, labels each
   * with its starting hole, and pre-fills tee times. Players are dragged in after.
   */
  const applyPairingsTemplate = (slots: TemplateSlot[], startType: "tee_time" | "shotgun") => {
    if (lockGuard()) return;
    if (!slots.length) return;
    const nums = slots.map((_, i) => i + 1);
    setEmptyGroups(nums);
    const labels = { ...holeLabels };
    const tees: Record<number, string> = {};
    slots.forEach((s, i) => {
      const num = i + 1;
      const hole = Number(s.hole);
      if (Number.isFinite(hole) && hole !== num) labels[num] = String(hole);
      else delete labels[num];
      if (s.tee_time) tees[num] = s.tee_time;
    });
    saveLabels(labels);
    saveTeeTimes(tees);
    persistStartFormat({ startFormat: startType === "shotgun" ? "shotgun" : "tee_times" });
  };



  const handleRenameGroup = async (oldNum: number, rawInput: string) => {
    if (lockGuard()) return;
    setEditingGroupNum(null);
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    // Detect display-only label (contains any non-digit char, e.g. "1A", "1B", "9 Left")
    const isLabelOnly = /\D/.test(trimmed);
    if (isLabelOnly) {
      // Store as a display label — the underlying group_number stays the same
      const next = { ...holeLabels };
      if (trimmed === String(oldNum)) delete next[oldNum];
      else next[oldNum] = trimmed;
      saveLabels(next);
      toast({ title: `Hole labeled "${trimmed}"` });
      return;
    }

    const newNum = parseInt(trimmed);
    if (!newNum || isNaN(newNum) || newNum === oldNum) return;
    if (newNum < 1 || newNum > 99) {
      toast({ title: "Invalid hole number", description: "Use 1-99, or a label like 1A.", variant: "destructive" });
      return;
    }
    if (allGroupNumbers.includes(newNum)) {
      if (startFormat === "tee_times") {
        const next = { ...holeLabels, [oldNum]: String(newNum) };
        saveLabels(next);
        toast({
          title: `Starting hole set to Hole ${newNum}`,
          description: "Tee-time groups may share the same starting hole. The pairing group remains separate.",
        });
        return;
      }
      toast({ title: "Hole already exists", description: `Hole ${newNum} is already in use.`, variant: "destructive" });
      return;
    }
    const ids = players.filter((p) => p.group_number === oldNum).map((p) => p.id);
    if (ids.length > 0) {
      const { error } = await supabase
        .from("tournament_registrations")
        .update({ group_number: newNum })
        .in("id", ids);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    setAllPlayers((prev) => prev.map((p) => p.group_number === oldNum ? { ...p, group_number: newNum } : p));
    setEmptyGroups((prev) => prev.map((n) => n === oldNum ? newNum : n));
    if (holeLocations[oldNum]) {
      const next = { ...holeLocations };
      next[newNum] = next[oldNum];
      delete next[oldNum];
      saveLocations(next);
    }
    // Migrate label + notes when renumbering
    if (holeLabels[oldNum]) {
      const next = { ...holeLabels };
      next[newNum] = next[oldNum];
      delete next[oldNum];
      saveLabels(next);
    }
    if (holeNotes[oldNum]) {
      const next = { ...holeNotes };
      next[newNum] = next[oldNum];
      delete next[oldNum];
      saveNotes(next);
    }
    toast({ title: `Renamed to Hole ${newNum}` });
  };


  const handleDeleteGroup = async (num: number) => {
    if (lockGuard()) return;
    if (demoGuard()) return;
    const ids = players.filter((p) => p.group_number === num).map((p) => p.id);
    if (ids.length > 0) {
      const { error } = await supabase
        .from("tournament_registrations")
        .update({ group_number: null, group_position: null })
        .in("id", ids);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    setAllPlayers((prev) => prev.map((p) => p.group_number === num ? { ...p, group_number: null, group_position: null } : p));
    setEmptyGroups((prev) => prev.filter((n) => n !== num));
    if (holeLocations[num]) {
      const next = { ...holeLocations };
      delete next[num];
      saveLocations(next);
    }
    toast({ title: `Hole ${num} deleted`, description: ids.length > 0 ? `${ids.length} player(s) moved to Unassigned.` : undefined });
  };

  // Clears every player out of their tee time / hole group. The groups themselves
  // (and their tee times) are kept as empty slots so organizers can re-assign.
  const handleResetAllPairings = async () => {
    if (lockGuard()) return;
    if (demoGuard()) return;
    const assigned = players.filter((p) => p.group_number !== null);
    const ids = assigned.map((p) => p.id);
    const keepNums = [...new Set(assigned.map((p) => p.group_number!))];
    if (ids.length > 0) {
      const { error } = await supabase
        .from("tournament_registrations")
        .update({ group_number: null, group_position: null })
        .in("id", ids);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    setAllPlayers((prev) => prev.map((p) => p.group_number !== null ? { ...p, group_number: null, group_position: null } : p));
    setEmptyGroups((prev) => [...new Set([...prev, ...keepNums])].sort((a, b) => a - b));
    toast({
      title: "Tee time pairings reset",
      description: ids.length > 0 ? `${ids.length} player(s) moved to Unassigned. Tee times kept.` : "No players were assigned.",
    });
  };


  const handleMoveGroup = async (num: number, dir: -1 | 1) => {
    if (lockGuard()) return;
    const idx = allGroupNumbers.indexOf(num);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= allGroupNumbers.length) return;
    const other = allGroupNumbers[swapIdx];
    // Swap via temp number to avoid unique conflicts (none enforced, but safe)
    const tempNum = Math.max(...allGroupNumbers, 100) + 1;
    const idsA = players.filter((p) => p.group_number === num).map((p) => p.id);
    const idsB = players.filter((p) => p.group_number === other).map((p) => p.id);
    if (idsA.length > 0) await supabase.from("tournament_registrations").update({ group_number: tempNum }).in("id", idsA);
    if (idsB.length > 0) await supabase.from("tournament_registrations").update({ group_number: num }).in("id", idsB);
    if (idsA.length > 0) await supabase.from("tournament_registrations").update({ group_number: other }).in("id", idsA);
    setAllPlayers((prev) => prev.map((p) => {
      if (p.group_number === num) return { ...p, group_number: other };
      if (p.group_number === other) return { ...p, group_number: num };
      return p;
    }));
    setEmptyGroups((prev) => prev.map((n) => n === num ? other : n === other ? num : n));
    const next = { ...holeLocations };
    const a = next[num]; const b = next[other];
    if (a !== undefined) next[other] = a; else delete next[other];
    if (b !== undefined) next[num] = b; else delete next[num];
    saveLocations(next);
  };

  const saveHoleLocation = (num: number, value: string) => {
    const next = { ...holeLocations };
    const v = value.trim();
    if (v) next[num] = v; else delete next[num];
    saveLocations(next);
    setEditingLocationNum(null);
  };

  const handleAssignPlayer = async (playerId: string, groupNum: number, position: number) => {
    if (lockGuard()) return;
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ group_number: groupNum, group_position: position })
      .eq("id", playerId);

    if (!error) {
      setAllPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, group_number: groupNum, group_position: position } : p
        )
      );
    }
  };

  const handleUnassignPlayer = async (playerId: string) => {
    if (lockGuard()) return;
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ group_number: null, group_position: null })
      .eq("id", playerId);

    if (!error) {
      setAllPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, group_number: null, group_position: null } : p
        )
      );
    }
  };

  const handleAutoAssign = async () => {
    if (lockGuard()) return;
    // Respect the age filter: hidden age groups are left out of auto pairings.
    let unassignedPlayers = players.filter((p) => p.group_number === null && ageVisible(p));
    if (unassignedPlayers.length === 0) return;

    // Pairing method decides the order players are packed into holes.
    if (pairMethod === "handicap") {
      unassignedPlayers = [...unassignedPlayers].sort(
        (a, b) => (a.handicap ?? 99) - (b.handicap ?? 99),
      );
    } else if (pairMethod === "age") {
      const sorted = [...unassignedPlayers].sort(
        (a, b) => (ageOf(a) ?? 999) - (ageOf(b) ?? 999),
      );
      if (ageBalance) {
        // Snake the age-sorted list so every hole gets a spread of ages.
        const buckets: Registration[][] = Array.from(
          { length: Math.max(1, Math.ceil(sorted.length / maxGroupSize)) },
          () => [],
        );
        sorted.forEach((p, i) => {
          const row = Math.floor(i / buckets.length);
          const col = i % buckets.length;
          const idx = row % 2 === 0 ? col : buckets.length - 1 - col;
          buckets[idx].push(p);
        });
        unassignedPlayers = buckets.flat();
      } else {
        unassignedPlayers = sorted; // keep similar ages together
      }
    } else if (pairMethod === "random") {
      unassignedPlayers = [...unassignedPlayers].sort(() => Math.random() - 0.5);
    }

    // Keep registration groups (foursomes etc.) together: build units of players
    // that signed up on the same registration, chunked to the max hole size.
    const units = (pairMethod === "custom"
      ? (buildAutoAssignUnits(unassignedPlayers as any, maxGroupSize) as unknown as Registration[][])
      : unassignedPlayers.reduce<Registration[][]>((acc, p, i) => {
          if (i % maxGroupSize === 0) acc.push([]);
          acc[acc.length - 1].push(p);
          return acc;
        }, []));




    let currentGroup = nextGroupNumber;
    const updates: { id: string; group_number: number; group_position: number }[] = [];
    const countIn = (num: number) => updates.filter((u) => u.group_number === num).length;

    for (const unit of units) {
      // Try to fit the whole unit into an existing hole with enough room
      const target = groups.find((g) => g.players.length + countIn(g.number) + unit.length <= maxGroupSize);
      if (target) {
        unit.forEach((p) => {
          updates.push({ id: p.id, group_number: target.number, group_position: target.players.length + countIn(target.number) + 1 });
        });
        continue;
      }
      // Otherwise place into a fresh hole (creating extra holes if the unit is oversized)
      let pos = countIn(currentGroup) + 1;
      for (const p of unit) {
        if (pos > maxGroupSize) { currentGroup++; pos = 1; }
        updates.push({ id: p.id, group_number: currentGroup, group_position: pos });
        pos++;
      }
      currentGroup++;
    }


    // Batch update
    for (const update of updates) {
      await supabase
        .from("tournament_registrations")
        .update({ group_number: update.group_number, group_position: update.group_position })
        .eq("id", update.id);
    }

    setAllPlayers((prev) =>
      prev.map((p) => {
        const u = updates.find((u) => u.id === p.id);
        return u ? { ...p, group_number: u.group_number, group_position: u.group_position } : p;
      })
    );

    toast({ title: "Auto-assigned!", description: `${updates.length} players assigned to holes. Registration groups were kept together.` });
  };

  // Seed the pairings board with the teams we already know about the first time
  // an organizer opens the Pairings tab with nothing assigned yet.
  const autoSeededRef = useRef(false);
  useEffect(() => {
    if (view !== "pairings" || autoSeededRef.current) return;
    if (players.length === 0 || registrationGroups.length === 0) return;
    if (players.some((p) => p.group_number !== null)) return;
    autoSeededRef.current = true;
    handleAutoAssign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, players, registrationGroups]);



  const onDragEnd = async (result: DropResult) => {
    if (lockGuard()) return;
    const { draggableId, source, destination } = result;
    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    if (sourceId === destId && source.index === destination.index) return;

    // Parse destination group
    let destGroupNum: number | null = null;
    if (destId === "unassigned") {
      destGroupNum = null;
    } else {
      destGroupNum = parseInt(destId.replace("group-", ""));
    }

    // Check group size limit
    if (destGroupNum !== null) {
      const destGroup = groups.find((g) => g.number === destGroupNum);
      const currentSize = destGroup ? destGroup.players.length : 0;
      const isMovingWithinSameGroup = sourceId === destId;
      if (!isMovingWithinSameGroup && currentSize >= maxGroupSize) {
        toast({ title: "Hole is full", description: "Maximum 4 players per hole.", variant: "destructive" });
        return;
      }
    }

    if (destGroupNum === null) {
      await handleUnassignPlayer(draggableId);
    } else {
      await handleAssignPlayer(draggableId, destGroupNum, destination.index + 1);

      // Keep registration groups together during manual edits: pull teammates along when there's room.
      const moved = players.find((p) => p.id === draggableId);
      const strays = moved ? (teammatesAwayFromHole(moved as any, players as any, destGroupNum) as unknown as Registration[]) : [];
      if (strays.length > 0) {
        const destGroup = groups.find((g) => g.number === destGroupNum);
        const occupied = (destGroup ? destGroup.players.length : 0) + 1;
        const room = maxGroupSize - occupied;
        const toMove = strays.slice(0, Math.max(0, room));
        for (let i = 0; i < toMove.length; i++) {
          await handleAssignPlayer(toMove[i].id, destGroupNum, occupied + i + 1);
        }
        const label = groupNames[moved!.group_id as string] || "their registration group";
        if (toMove.length > 0) {
          toast({
            title: "Group kept together",
            description: `${toMove.length} teammate${toMove.length !== 1 ? "s" : ""} from ${label} moved to hole ${destGroupNum} as well.`,
          });
        }
        if (toMove.length < strays.length) {
          toast({
            title: "Group split",
            description: `Hole ${destGroupNum} doesn't have room for all of ${label}. ${strays.length - toMove.length} teammate(s) are still on another hole.`,
            variant: "destructive",
          });
        }
      }
    }
  };


  const paymentColors: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    paid: "bg-primary/10 text-primary",
    refunded: "bg-destructive/10 text-destructive",
  };

  if (loading && tournaments.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-20 bg-card rounded-lg border border-border">
        <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-display font-bold text-foreground mb-2">No tournaments yet</h3>
        <p className="text-muted-foreground">Create a tournament first to manage players.</p>
      </div>
    );
  }

  return (
    <div>
      <ManualEntryLimitModal
        open={!!manualEntry.pending}
        onOpenChange={(o) => { if (!o) manualEntry.cancelPending(); }}
        used={manualEntry.pending?.used ?? 0}
        freeLimit={manualEntry.pending?.limit ?? 10}
        initialAmountCents={manualEntry.pending?.amountCents ?? 0}
        hasStripe={manualEntry.pending?.hasStripe ?? true}
        submitting={manualEntry.submitting}
        onConfirm={manualEntry.confirmPending}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Players & Pairings</h1>
          <p className="text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{paidCount} paid</span> player{paidCount !== 1 ? "s" : ""}
          </p>


        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-[240px] bg-card">
              <Trophy className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder="Select tournament" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* View Toggle + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 bg-card rounded-lg border border-border p-1">
          <button
            onClick={() => setView("roster")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === "roster" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4 inline mr-1.5" />
            Roster
          </button>
          <button
            onClick={() => setView("pairings")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === "pairings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GripVertical className="h-4 w-4 inline mr-1.5" />
            Pairings
          </button>
        </div>
        <div className="flex items-center gap-3">
          {view === "roster" && (
            <>
              <div className="flex gap-1 bg-card rounded-lg border border-border p-1">
                {([
                  { key: "all", label: `All (${allPlayers.length})` },
                  { key: "paid", label: `Paid (${players.length})` },
                  { key: "pending", label: `Pending (${pendingPlayers.length})` },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setPaymentView(t.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      paymentView === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search players..."
                  className="pl-9 w-[200px] bg-card"
                />
              </div>


              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings2 className="h-4 w-4 mr-1.5" />
                    Columns
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Standard columns</p>
                  <div className="space-y-2 mb-3">
                    {BASE_ROSTER_COLS.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={rosterCols[c.key] !== false}
                          onCheckedChange={() => toggleRosterCol(c.key)}
                          disabled={c.key === "name"}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                  {customFieldCols.length > 0 && (
                    <>
                      <p className="text-xs font-medium mb-2 text-muted-foreground">Your custom questions</p>
                      <div className="space-y-2">
                        {customFieldCols.map((f) => {
                          const key = `custom_${f.id}`;
                          return (
                            <label key={f.id} className="flex items-center gap-2 cursor-pointer text-sm">
                              <Checkbox
                                checked={!!rosterCols[key]}
                                onCheckedChange={() => toggleRosterCol(key)}
                              />
                              {f.label}
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-3">Click any column header to sort by it.</p>
                </PopoverContent>
              </Popover>
            </>
          )}
          {selectedTournament && (
            <PlayerImport
              tournamentId={selectedTournament}
              onImported={() => {
                supabase
                  .from("tournament_registrations")
                  .select("*")
                  .eq("tournament_id", selectedTournament)
                  .order("created_at", { ascending: true })
                  .then(({ data }) => setAllPlayers((data as unknown as Registration[]) || []));
              }}
            />
          )}
          <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle>Add Player Manually</DialogTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                        <Settings2 className="h-3.5 w-3.5" />
                        <span className="text-xs">Fields</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-56">
                      <p className="text-xs font-medium mb-2 text-muted-foreground">Show optional fields</p>
                      <div className="space-y-2">
                        {FIELD_DEFS.map((f) => (
                          <label key={f.key} className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox checked={visibleFields[f.key]} onCheckedChange={() => toggleField(f.key)} />
                            {f.label}
                          </label>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3">First name, last name & email are always required.</p>
                    </PopoverContent>
                  </Popover>
                </div>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ap-first">First Name *</Label>
                    <Input id="ap-first" value={newPlayer.first_name} onChange={(e) => setNewPlayer((p) => ({ ...p, first_name: e.target.value }))} placeholder="John" />
                  </div>
                  <div>
                    <Label htmlFor="ap-last">Last Name *</Label>
                    <Input id="ap-last" value={newPlayer.last_name} onChange={(e) => setNewPlayer((p) => ({ ...p, last_name: e.target.value }))} placeholder="Smith" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ap-email">Email *</Label>
                  <Input id="ap-email" type="email" value={newPlayer.email} onChange={(e) => setNewPlayer((p) => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
                </div>
                {(visibleFields.phone || visibleFields.handicap) && (
                  <div className="grid grid-cols-2 gap-3">
                    {visibleFields.phone && (
                      <div>
                        <Label htmlFor="ap-phone">Phone</Label>
                        <Input id="ap-phone" value={newPlayer.phone} onChange={(e) => setNewPlayer((p) => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" />
                      </div>
                    )}
                    {visibleFields.handicap && (
                      <div>
                        <Label htmlFor="ap-hcp">Handicap</Label>
                        <Input id="ap-hcp" type="number" value={newPlayer.handicap} onChange={(e) => setNewPlayer((p) => ({ ...p, handicap: e.target.value }))} placeholder="12" />
                      </div>
                    )}
                  </div>
                )}
                {(visibleFields.shirt_size || visibleFields.payment_status) && (
                  <div className="grid grid-cols-2 gap-3">
                    {visibleFields.shirt_size && (
                      <div>
                        <Label htmlFor="ap-shirt">Shirt Size</Label>
                        <Select value={newPlayer.shirt_size} onValueChange={(v) => setNewPlayer((p) => ({ ...p, shirt_size: v }))}>
                          <SelectTrigger id="ap-shirt"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {["S", "M", "L", "XL", "XXL"].map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {visibleFields.payment_status && (
                      <div>
                        <Label htmlFor="ap-payment">Payment Status</Label>
                        <Select value={newPlayer.payment_status} onValueChange={(v) => setNewPlayer((p) => ({ ...p, payment_status: v }))}>
                          <SelectTrigger id="ap-payment"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="pending">Pending (not collected)</SelectItem>
                            <SelectItem value="comp">Comp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
                {(visibleFields.age || visibleFields.city_state) && (
                  <div className="grid grid-cols-3 gap-3">
                    {visibleFields.age && (
                      <div>
                        <Label htmlFor="ap-age">Age</Label>
                        <Input id="ap-age" type="number" value={newPlayer.age} onChange={(e) => setNewPlayer((p) => ({ ...p, age: e.target.value }))} placeholder="35" />
                      </div>
                    )}
                    {visibleFields.city_state && (
                      <>
                        <div className="col-span-1">
                          <Label htmlFor="ap-city">City</Label>
                          <Input id="ap-city" value={newPlayer.city} onChange={(e) => setNewPlayer((p) => ({ ...p, city: e.target.value }))} placeholder="Atlanta" />
                        </div>
                        <div className="col-span-1">
                          <Label htmlFor="ap-state">State</Label>
                          <Input id="ap-state" value={newPlayer.state} onChange={(e) => setNewPlayer((p) => ({ ...p, state: e.target.value }))} placeholder="GA" maxLength={20} />
                        </div>
                      </>
                    )}
                  </div>
                )}
                {visibleFields.division && tiers.length > 0 && (
                  <div>
                    <Label htmlFor="ap-tier">Division / Tier</Label>
                    <Select value={newPlayer.tier_id} onValueChange={(v) => setNewPlayer((p) => ({ ...p, tier_id: v }))}>
                      <SelectTrigger id="ap-tier"><SelectValue placeholder="Select division" /></SelectTrigger>
                      <SelectContent>
                        {tiers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(() => {
                  const tt = tournaments.find((t) => t.id === selectedTournament) as any;
                  return tt?.allow_cash_registration ? (
                    <div>
                      <Label htmlFor="ap-method">Payment Method</Label>
                      <Select value={newPlayer.payment_method} onValueChange={(v) => setNewPlayer((p) => ({ ...p, payment_method: v }))}>
                        <SelectTrigger id="ap-method"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Cash/Check registrations skip online payment. Mark received once you collect.</p>
                    </div>
                  ) : null;
                })()}
                <Button onClick={handleAddPlayer} disabled={addingPlayer} className="w-full">
                  {addingPlayer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Add Player
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleRegenerateAllCodes} disabled={regenerating || players.length === 0}>
            {regenerating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <QrCode className="h-4 w-4 mr-1.5" />}
            Regenerate Codes
          </Button>
          <Button variant="outline" size="sm" onClick={openAgeEditor} disabled={allPlayers.length === 0}>
            Update Ages
          </Button>
          <Dialog open={ageEditOpen} onOpenChange={setAgeEditOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Update Ages</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                Ages outside 3–100 are treated as missing. Blank an age to clear it.
              </p>
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-2">Name</th><th className="w-24">Current</th><th className="w-28">New Age</th></tr>
                  </thead>
                  <tbody>
                    {allPlayers.map((p) => {
                      const current = rawAgeAnswer(p as any);
                      const bad = isImplausibleAge(current);
                      return (
                        <tr key={p.id} className="border-t border-border">
                          <td className="py-1.5">{p.first_name} {p.last_name}</td>
                          <td className={bad ? "text-destructive" : "text-muted-foreground"}>{current || "—"}</td>
                          <td>
                            <Input
                              type="number"
                              min={3}
                              max={100}
                              className="h-8"
                              value={ageDrafts[p.id] ?? ""}
                              onChange={(e) => setAgeDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAgeEditOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveAges} disabled={savingAges}>
                  {savingAges && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Save Ages
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>

        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : allPlayers.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-lg border border-border">
          <UserPlus className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold text-foreground mb-2">No registrations yet</h3>
          <p className="text-muted-foreground mb-4">
            Players will appear here once they register, or you can add them manually.
          </p>
          <Button onClick={() => setAddPlayerOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add First Player
          </Button>
        </div>
      ) : view === "roster" ? (


        /* Roster View */
        <div className="space-y-6">
        <div className="bg-card rounded-lg border border-border overflow-hidden">

          <div className="overflow-x-auto">
            <table className="min-w-full w-max text-sm">
              <thead>
                {(() => {
                  const SortableTh = ({ colKey, align = "left", children }: { colKey: string; align?: "left" | "center"; children: React.ReactNode }) => (
                    <th
                      className={`${align === "center" ? "text-center" : "text-left"} font-semibold px-4 py-3 cursor-pointer select-none whitespace-nowrap`}
                      onClick={() => changeSort(colKey)}
                    >
                      <span className={`inline-flex items-center gap-1 ${align === "center" ? "justify-center" : ""}`}>
                        {children}
                        {sortKey === colKey
                          ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                          : <span className="h-3 w-3 opacity-30">⇅</span>}
                      </span>
                    </th>
                  );
                  return (
                    <tr className="border-b border-border bg-muted/30">
                      {rosterCols.name !== false && <SortableTh colKey="name">Name</SortableTh>}
                      {rosterCols.email !== false && <SortableTh colKey="email">Email</SortableTh>}
                      {rosterCols.phone !== false && <SortableTh colKey="phone">Phone</SortableTh>}
                      {rosterCols.hcp !== false && <SortableTh colKey="hcp" align="center">HCP</SortableTh>}
                      {rosterCols.age !== false && <SortableTh colKey="age" align="center">Age</SortableTh>}

                      {rosterCols.group !== false && <SortableTh colKey="group">Group / Team</SortableTh>}
                      {rosterCols.tier !== false && <SortableTh colKey="tier">Division / Tier</SortableTh>}
                      {rosterCols.shirt !== false && <SortableTh colKey="shirt" align="center">Shirt</SortableTh>}
                      {rosterCols.hole !== false && <SortableTh colKey="hole" align="center">Hole</SortableTh>}
                      {rosterCols.teetime !== false && <SortableTh colKey="teetime" align="center">Tee Time</SortableTh>}
                      {rosterCols.code !== false && (
                        <SortableTh colKey="code" align="center">
                          <QrCode className="h-3.5 w-3.5" /> Code
                        </SortableTh>
                      )}
                      {rosterCols.payment !== false && <SortableTh colKey="payment" align="center">Payment</SortableTh>}
                      {customFieldCols.filter((f) => rosterCols[`custom_${f.id}`]).map((f) => (
                        <SortableTh key={f.id} colKey={`custom_${f.id}`}>{f.label}</SortableTh>
                      ))}
                      <th className="text-center font-semibold px-4 py-3 w-12"></th>
                    </tr>
                  );
                })()}
              </thead>
              <tbody>
                {filteredPlayers.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    {rosterCols.name !== false && (
                      <td className="px-4 py-3 font-medium text-foreground">
                        {p.first_name} {p.last_name}
                      </td>
                    )}
                    {rosterCols.email !== false && (
                      <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    )}
                    {rosterCols.phone !== false && (
                      <td className="px-4 py-3 text-muted-foreground">{p.phone || "—"}</td>
                    )}
                    {rosterCols.hcp !== false && (
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {p.handicap !== null ? p.handicap : "—"}
                      </td>
                    )}
                    {rosterCols.age !== false && (
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {ageOf(p) ?? "—"}
                      </td>
                    )}

                    {rosterCols.group !== false && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          aria-label="Team"
                          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground max-w-[190px]"
                          value={p.group_id || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__new") { setNewTeamForPlayer(p.id); setNewTeamName(""); return; }
                            assignPlayerTeam(p.id, val || null);
                          }}
                        >
                          <option value="">Unassigned</option>
                          {teamGroups.map((t) => (
                            <option key={t.id} value={t.id}>
                              {groupNames[t.id] || t.name}
                              {t.group_number != null ? ` (Hole ${t.group_number})` : ""}
                            </option>
                          ))}
                          <option value="__new">+ Create new team…</option>
                        </select>
                      </td>
                    )}

                    {rosterCols.tier !== false && (
                      <td className="px-4 py-3">
                        {p.tier_id ? (
                          <span className="inline-flex items-center bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                            {tierName(p.tier_id)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    )}
                    {rosterCols.shirt !== false && (
                      <td className="px-4 py-3 text-center text-muted-foreground">{p.shirt_size || "—"}</td>
                    )}
                    {rosterCols.hole !== false && (
                      <td className="px-4 py-3 text-center">
                        {(p.group_label || p.group_number) ? (
                          <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                            #{p.group_label || p.group_number}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    )}
                    {rosterCols.teetime !== false && (
                      <td className="px-4 py-3 text-center text-xs">
                        {p.group_number != null && holeTeeTimes[p.group_number]
                          ? fmtTee12(holeTeeTimes[p.group_number])
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                    )}
                    {rosterCols.code !== false && (
                      <td className="px-4 py-3 text-center">
                        {editingScoringCode === p.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <Input
                              value={scoringCodeInput}
                              onChange={(e) => setScoringCodeInput(e.target.value.toUpperCase())}
                              className="w-20 h-7 text-xs text-center font-mono uppercase"
                              maxLength={8}
                              onKeyDown={(e) => e.key === "Enter" && handleSaveScoringCode(p.id)}
                            />
                            <button onClick={() => handleSaveScoringCode(p.id)} className="text-primary hover:text-primary/80">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setEditingScoringCode(null)} className="text-muted-foreground hover:text-foreground">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingScoringCode(p.id); setScoringCodeInput(codeOf(p)); }}
                            className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                            title={codeOf(p) ? "Click to edit this group's scoring code" : "Scoring codes are generated when pairings are assigned"}
                          >
                            {codeOf(p)
                              ? `${codeOf(p)}${p.group_number != null ? ` (Group ${holeLabels[p.group_number] || p.group_number})` : ""}`
                              : "— Not assigned"}
                            <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                          </button>
                        )}
                      </td>
                    )}
                    {rosterCols.payment !== false && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${paymentColors[p.payment_status] || paymentColors.pending}`}>
                            {p.payment_status}
                          </span>
                          {(p as any).payment_method && (p as any).payment_method !== "online" && (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{(p as any).payment_method}</span>
                          )}
                          {((p as any).payment_method === "cash" || (p as any).payment_method === "check") && p.payment_status !== "paid" && (
                            <button onClick={() => markCashReceived(p.id)} className="text-[10px] text-primary hover:underline">
                              Mark Received
                            </button>
                          )}
                          {p.payment_status !== "paid" && p.payment_status !== "refunded" && (
                            <button onClick={() => markAsPaid(p.id)} className="text-[10px] text-primary hover:underline">
                              Mark as Paid
                            </button>
                          )}

                        </div>
                      </td>
                    )}
                    {customFieldCols.filter((f) => rosterCols[`custom_${f.id}`]).map((f) => (
                      <td key={f.id} className="px-4 py-3 text-muted-foreground max-w-[220px] break-words">
                        {getCustomAnswer(p, f.id) || "—"}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="View full registration details"
                          onClick={() => setViewingPlayer(p)}
                        >
                          <Search className="h-4 w-4" />
                        </button>
                        <button
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Edit player"
                          onClick={() => openEditPlayer(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {p.payment_status === "paid" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="text-muted-foreground hover:text-amber-600 transition-colors" title="Issue refund">
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Refund Player</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Process a full refund for {p.first_name} {p.last_name}? This will reverse the payment through Stripe.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => {
                                  const { data, error } = await supabase.functions.invoke("process-refund", {
                                    body: { registration_id: p.id },
                                  });
                                  if (error || data?.error) {
                                    toast({ title: "Refund failed", description: data?.error || error?.message, variant: "destructive" });
                                  } else {
                                    toast({ title: "Refund processed", description: `${p.first_name} ${p.last_name} has been refunded.` });
                                    setAllPlayers((prev) => prev.map((pl) => pl.id === p.id ? { ...pl, payment_status: "refunded" } : pl));
                                  }
                                }}>
                                  Process Refund
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-muted-foreground hover:text-destructive transition-colors" title="Remove player">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Player</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove {p.first_name} {p.last_name} from this tournament? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePlayer(p.id)}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {rosterCols.code !== false && (
          <p className="text-xs text-muted-foreground">
            💡 Scoring codes are generated when pairings are assigned — everyone in a group shares the same code.
          </p>
        )}
        {registrationGroups.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-display font-bold text-foreground">Team / Group Registrations</h3>
              <span className="text-xs text-muted-foreground">{registrationGroups.length} group{registrationGroups.length !== 1 ? "s" : ""} signed up together</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {registrationGroups.map((g, gi) => (
                <div key={g.id} className="border border-border rounded-md overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 text-sm font-semibold flex items-center gap-2">
                    {editingGroupId === g.id ? (
                      <>
                        <Input
                          value={groupNameInput}
                          onChange={(e) => setGroupNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameGroup(g.id, groupNameInput);
                            if (e.key === "Escape") setEditingGroupId(null);
                          }}
                          className="h-7 text-sm"
                          aria-label="Team name"
                          autoFocus
                        />
                        <button className="text-primary" onClick={() => renameGroup(g.id, groupNameInput)} aria-label="Save team name">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button className="text-muted-foreground" onClick={() => setEditingGroupId(null)} aria-label="Cancel rename">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="truncate">
                          {g.name} ({groupSizeLabel(g.players.length)})
                        </span>
                        <button
                          className="text-muted-foreground hover:text-primary shrink-0"
                          title="Rename team"
                          onClick={() => { setEditingGroupId(g.id); setGroupNameInput(g.name); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>

                  {(() => {
                    const cap = g.players.find((p) => (p as any).is_captain || p.group_leader);
                    if (!cap) return null;
                    const contact = [cap.email, (cap as any).phone].filter(Boolean).join(" · ");
                    return (
                      <p className="px-3 pb-2 text-xs text-muted-foreground">
                        Captain: <span className="text-foreground font-medium">{cap.first_name} {cap.last_name}</span>
                        {contact ? ` (${contact})` : ""}
                      </p>
                    );
                  })()}

                  <table className="w-full text-sm">
                    <tbody>
                      {g.players.map((p) => (
                        <tr key={p.id} className="border-t border-border">
                          <td className="px-3 py-2">
                            {p.first_name} {p.last_name}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {(p as any).is_captain || p.group_leader ? (
                              <span className="text-[10px] uppercase tracking-wide text-primary">Captain</span>
                            ) : (
                              <span className="text-[10px] uppercase tracking-wide">Player</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">{p.handicap ?? "—"}</td>
                          <td className="px-3 py-2 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setViewingPlayer(p)}>View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                </div>
              ))}
            </div>
          </div>
        )}
        </div>

      ) : (
        /* Pairings View */
        <div>
          {/* Lock / publish pairings */}
          <div className={`mb-4 rounded-lg border p-4 ${pairingsLocked ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
            <div className="flex flex-wrap items-center gap-3">
              {pairingsLocked ? <Lock className="h-5 w-5 text-primary" /> : <LockOpen className="h-5 w-5 text-muted-foreground" />}
              <div className="min-w-[14rem] flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {pairingsLocked ? "Pairings locked (final)" : "Pairings unlocked (editable)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pairingsLocked
                    ? `Assignments, tee times, team names, and scoring codes are read-only${currentTournamentObj?.pairings_locked_at ? ` · locked ${new Date(currentTournamentObj.pairings_locked_at).toLocaleString()}` : ""}.`
                    : "Lock pairings once assignments are final to prevent accidental edits."}
                </p>
              </div>
              <Button
                size="sm"
                variant={pairingsLocked ? "outline" : "default"}
                disabled={lockSaving}
                onClick={() => setPairingsLocked(!pairingsLocked)}
              >
                {pairingsLocked ? (
                  <><LockOpen className="h-4 w-4 mr-1" /> Unlock Pairings</>
                ) : (
                  <><Lock className="h-4 w-4 mr-1" /> Lock &amp; Publish Pairings</>
                )}
              </Button>
            </div>
          </div>

          {/* Conflict validation */}
          {pairingConflicts.length > 0 ? (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-destructive">
                    {pairingConflicts.length} scheduling conflict{pairingConflicts.length === 1 ? "" : "s"} to review
                    {numDays > 1 ? ` (Day ${activeDay + 1})` : ""}
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-foreground space-y-0.5">
                    {pairingConflicts.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Fix these before locking pairings — locking is blocked while conflicts exist.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            groupsBase.some((g) => g.players.length > 0) && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">
                  No tee time or starting-hole conflicts detected{numDays > 1 ? ` for Day ${activeDay + 1}` : ""}.
                </p>
              </div>
            )
          )}

          {/* Start Format Controls */}
          <div className="mb-4 rounded-lg border border-border bg-card p-4">
            {numDays > 1 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Day:</span>
                <div className="inline-flex rounded-md border border-border overflow-hidden">
                  {tournamentDays.map((d, idx) => {
                    const dt = new Date(d + "T00:00:00");
                    const label = `Day ${idx + 1} · ${dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
                    return (
                      <button
                        key={d}
                        type="button"
                        className={`px-3 py-1.5 text-xs ${activeDay === idx ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"} ${idx > 0 ? "border-l border-border" : ""}`}
                        onClick={() => setActiveDay(idx)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-muted-foreground ml-1">Each day has its own start format and tee times.</span>
              </div>
            )}
            <div className="mb-3 flex flex-wrap items-end gap-4 border-b border-border pb-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Round {activeDay + 1} Format
                </Label>
                <Select
                  value={dayCfg.roundFormat || "inherit"}
                  onValueChange={(v) => persistStartFormat({ roundFormat: v === "inherit" ? "" : v })}
                >
                  <SelectTrigger className="mt-1 h-9 w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Use tournament format</SelectItem>
                    {SCORING_FORMATS.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Holes</Label>
                <Select
                  value={String(dayCfg.roundHoles || 18)}
                  onValueChange={(v) => persistStartFormat({ roundHoles: Number(v) })}
                >
                  <SelectTrigger className="mt-1 h-9 w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="18">18</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground pb-2">
                {numDays > 1
                  ? "Each round can use its own format, hole count, and start type."
                  : "Set the format and hole count for this round."}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-4">

              <div>
                <Label className="text-xs text-muted-foreground">Start Format</Label>
                <div className="mt-1 inline-flex rounded-md border border-border overflow-hidden">
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-sm ${startFormat === "tee_times" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
                    onClick={() => persistStartFormat({ startFormat: "tee_times" })}
                  >
                    Tee Times
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-sm border-l border-border ${startFormat === "shotgun" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
                    onClick={() => persistStartFormat({ startFormat: "shotgun" })}
                  >
                    Shotgun
                  </button>
                </div>
              </div>

              {/* Tee-time fields: always rendered, disabled when Shotgun */}
              <div className={startFormat === "shotgun" ? "opacity-50 pointer-events-none select-none" : ""} aria-disabled={startFormat === "shotgun"}>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Starting Hole</Label>
                    <Select
                      value={String(firstTeeHole)}
                      onValueChange={(v) => persistStartFormat({ firstTeeHole: Number(v) })}
                    >
                      <SelectTrigger className="mt-1 h-9 w-24" disabled={startFormat === "shotgun"}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
                          <SelectItem key={h} value={String(h)}>
                            {h === 1 ? "Hole 1 (standard)" : h === 10 ? "Hole 10 (standard)" : `Hole ${h} (custom)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={!!dayCfg.sameStartHole}
                      disabled={startFormat === "shotgun"}
                      onCheckedChange={(v) => persistStartFormat({ sameStartHole: !!v })}
                    />
                    Apply hole #{firstTeeHole} to all groups
                  </label>

                  <div>
                    <Label htmlFor="first-tee-time" className="text-xs text-muted-foreground">First Tee Time</Label>
                    <Input
                      id="first-tee-time"
                      type="time"
                      disabled={startFormat === "shotgun"}
                      className="mt-1 h-9 w-32"
                      value={firstTeeTime}
                      onChange={(e) => persistStartFormat({ firstTeeTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tee-interval" className="text-xs text-muted-foreground">Interval (min)</Label>
                    <Input
                      id="tee-interval"
                      type="number"
                      min={1}
                      max={30}
                      disabled={startFormat === "shotgun"}
                      className="mt-1 h-9 w-24"
                      value={teeInterval}
                      onChange={(e) => { const v = parseInt(e.target.value) || 10; persistStartFormat({ teeInterval: v }); }}
                    />
                  </div>
                  <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={overwriteManualTees}
                      disabled={startFormat === "shotgun"}
                      onCheckedChange={(v) => setOverwriteManualTees(!!v)}
                    />
                    Overwrite manually edited tee times
                  </label>

                </div>
              </div>

              {startFormat === "shotgun" && (
                <div>
                  <Label htmlFor="shotgun-time" className="text-xs text-muted-foreground">Shotgun Start Time</Label>
                  <Input
                    id="shotgun-time"
                    type="time"
                    className="mt-1 h-9 w-32"
                    value={shotgunTime}
                    onChange={(e) => persistStartFormat({ shotgunTime: e.target.value })}
                  />
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline">Reset Pairings</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset all tee time pairings?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes every player from their current tee time / hole group and moves them
                        back to Unassigned. The tee times themselves are kept as empty groups so you can
                        re-assign players. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetAllPairings}>Reset Pairings</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button onClick={applyStartTimesToHoles} size="sm">
                  {startFormat === "tee_times" ? "Assign Tee Times" : "Apply Shotgun Time"}
                </Button>
                <Button onClick={handleSaveTeeTimesNow} size="sm" variant="secondary" disabled={savingTeeTimes}>
                  {savingTeeTimes ? "Saving…" : "Save Tee Times"}
                </Button>
              </div>

            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {startFormat === "tee_times"
                ? `Click "Assign Tee Times" to auto-assign tee times in ${teeInterval}-minute intervals from ${fmtTee12(firstTeeTime)}${numDays > 1 ? ` for Day ${activeDay + 1}` : ""}. You can still manually edit any tee time afterwards — manual edits are kept and hole numbers are never auto-assigned for a tee time start.`
                : `All holes tee off at ${fmtTee12(shotgunTime)}${numDays > 1 ? ` on Day ${activeDay + 1}` : ""}. Individual hole overrides still apply below.`}
            </p>

          </div>


          {/* Age filter + pairing method */}
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="text-sm font-semibold text-foreground">Age Filter</h4>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={showAllAges} onCheckedChange={(v) => setShowAllAges(!!v)} />
                  Show all ages
                </label>
              </div>
              <div className={`space-y-2 ${showAllAges ? "opacity-50 pointer-events-none" : ""}`}>
                {AGE_GROUPS.map((g) => (
                  <label key={g.key} className="flex items-center gap-2 text-xs text-foreground">
                    <Checkbox
                      checked={ageGroupFilters[g.key] !== false}
                      onCheckedChange={(v) => setAgeGroupFilters((prev) => ({ ...prev, [g.key]: !!v }))}
                    />
                    <span className="w-20">{g.label}</span>
                    <span className="text-muted-foreground">({ageGroupCounts[g.key] || 0} players)</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowAllAges(false); setAgeGroupFilters(allAgeGroupsOn()); }}>
                  Apply Filter
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAllAges(false); setAgeGroupFilters(allAgeGroupsOff()); }}>
                  Clear All
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Generate Pairings</h4>
              <div className="space-y-1.5">
                {([
                  { key: "handicap", label: "By Handicap" },
                  { key: "age", label: "By Age" },
                  { key: "random", label: "Random" },
                  { key: "custom", label: "Custom (keep registration groups together)" },
                ] as const).map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2 text-xs text-foreground">
                    <input
                      type="radio"
                      name="pair-method"
                      checked={pairMethod === opt.key}
                      onChange={() => setPairMethod(opt.key)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {pairMethod === "age" && (
                <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Age Group Priority</p>
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox checked={!ageBalance} onCheckedChange={(v) => setAgeBalance(!v)} />
                    Keep similar ages together
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox checked={ageBalance} onCheckedChange={(v) => setAgeBalance(!!v)} />
                    Balance ages across groups
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Button onClick={handleAutoAssign} variant="outline" size="sm">
              {pairMethod === "age" ? "Generate Pairings by Age" : pairMethod === "handicap" ? "Generate Pairings by Handicap" : pairMethod === "random" ? "Generate Random Pairings" : "Auto-Assign All"}
            </Button>
            <Button onClick={handleAddGroup} variant="outline" size="sm">
              New Hole
            </Button>
            {selectedTournament ? (
              <PairingsTemplateBuilder
                tournamentId={selectedTournament}
                disabled={pairingsLocked}
                onApply={applyPairingsTemplate}
              />
            ) : null}

            <span className="text-sm text-muted-foreground ml-auto">
              Drag and drop players between holes
            </span>
          </div>

          {/* Duplicate tee time override */}
          <Dialog open={!!teeConflict} onOpenChange={(o) => { if (!o) setTeeConflict(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Duplicate Tee Time Detected</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                A group is already assigned to {teeConflict ? fmtTee12(teeConflict.value) : ""} on Hole {teeConflict?.hole}.
                The same tee time on a different starting hole is always allowed — you can also keep this one if it's intentional.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setTeeConflict(null)}>Change tee time</Button>
                <Button
                  onClick={() => {
                    if (teeConflict) commitHoleTeeTime(teeConflict.num, teeConflict.value);
                    setTeeConflict(null);
                  }}
                >
                  Confirm &amp; Override
                </Button>
              </div>
            </DialogContent>
          </Dialog>



          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Unassigned */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Unassigned ({unassigned.length})
                </h3>
                <Droppable droppableId="unassigned">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`bg-card rounded-lg border-2 border-dashed min-h-[80px] p-3 space-y-2 transition-colors ${
                        snapshot.isDraggingOver ? "border-secondary bg-secondary/5" : "border-border"
                      }`}
                    >
                      {unassigned.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          All players assigned!
                        </p>
                      )}
                      {unassigned.map((p, index) => (
                        <Draggable key={p.id} draggableId={p.id} index={index} isDragDisabled={pairingsLocked}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center gap-3 bg-background rounded-md border border-border px-3 py-2 text-sm ${
                                snapshot.isDragging ? "shadow-lg ring-2 ring-secondary" : ""
                              }`}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-foreground">
                                {p.first_name} {p.last_name}
                              </span>
                              {p.group_id && groupInfoById[p.group_id] && (
                                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                  {groupInfoById[p.group_id].name}
                                </span>
                              )}

                              {ageOf(p) !== null && (
                                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  Age {ageOf(p)}
                                </span>
                              )}
                              {p.handicap !== null && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  HCP {p.handicap}
                                </span>
                              )}

                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Groups */}
              <div className="space-y-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Holes ({visibleGroups.length}{hiddenGroupCount > 0 ? ` of ${groups.length}` : ""})
                  </h3>
                  <div className="ml-auto inline-flex rounded-md border border-border overflow-hidden">
                    {([
                      { key: "group", label: "Sort by Group" },
                      { key: "division", label: "Sort by Division" },
                      { key: "teetime", label: "Sort by Tee Time" },
                    ] as const).map((opt, i) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`px-2.5 py-1 text-xs ${pairSort === opt.key ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"} ${i > 0 ? "border-l border-border" : ""}`}
                        onClick={() => setPairSort(opt.key)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {divisionOptions.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Division:</span>
                    <button
                      type="button"
                      className={`rounded-full border px-2.5 py-1 text-xs ${divFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"}`}
                      onClick={() => setDivFilter("all")}
                    >
                      All
                    </button>
                    {divisionOptions.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`rounded-full border px-2.5 py-1 text-xs ${divFilter === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"}`}
                        onClick={() => setDivFilter(d)}
                      >
                        {d}
                      </button>
                    ))}
                    {hiddenGroupCount > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        {hiddenGroupCount} group{hiddenGroupCount === 1 ? "" : "s"} hidden by this filter
                      </span>
                    )}
                  </div>
                )}

                {visibleGroups.map((group, gIdx) => (

                  <div key={group.number}>
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                        {editingGroupNum === group.number ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              className="h-7 w-28 text-sm"
                              placeholder="e.g. 1, 1A, 1B"
                              value={editGroupValue}
                              onChange={(e) => setEditGroupValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameGroup(group.number, editGroupValue);
                                if (e.key === "Escape") setEditingGroupNum(null);
                              }}
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleRenameGroup(group.number, editGroupValue)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingGroupNum(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="text-sm font-bold text-foreground hover:text-primary inline-flex items-center gap-1"
                            onClick={() => { setEditingGroupNum(group.number); setEditGroupValue(holeLabels[group.number] || String(group.number)); }}
                            title="Rename hole — accepts numbers (1) or labels (1A, 1B)"
                          >
                            Hole {holeLabels[group.number] || group.number}
                            <Pencil className="h-3 w-3 opacity-60" />
                          </button>
                        )}
                        {editingTeamNum === group.number ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 w-44 text-xs"
                              placeholder="Team name (e.g. Team Mulligan)"
                              value={teamNameInput}
                              onChange={(e) => setTeamNameInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveHoleTeamName(group.number, teamNameInput);
                                if (e.key === "Escape") setEditingTeamNum(null);
                              }}
                              aria-label="Team name"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => saveHoleTeamName(group.number, teamNameInput)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingTeamNum(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                            onClick={() => { setEditingTeamNum(group.number); setTeamNameInput(teamNamesByHole[group.number] || ""); }}
                            title="Edit the team name shown on the live leaderboard"
                          >
                            {teamNamesByHole[group.number] || `Team ${group.number} — add name`}
                            <Pencil className="h-2.5 w-2.5 opacity-70" />
                          </button>
                        )}
                        {(() => {
                          const div = divisionOfGroup(group.players);
                          if (!div) return null;
                          return (
                            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground border border-secondary/40 whitespace-nowrap">
                              Division: {div}
                            </span>
                          );
                        })()}
                        </div>

                        <div className="flex items-center gap-3 flex-nowrap overflow-x-auto pb-0.5">
                        {editingLocationNum === group.number ? (

                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 w-40 text-xs"
                              placeholder="Location (e.g. Tee 1, Front 9)"
                              value={editLocationValue}
                              onChange={(e) => setEditLocationValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveHoleLocation(group.number, editLocationValue);
                                if (e.key === "Escape") setEditingLocationNum(null);
                              }}
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => saveHoleLocation(group.number, editLocationValue)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                            onClick={() => { setEditingLocationNum(group.number); setEditLocationValue(holeLocations[group.number] || ""); }}
                            title="Set location"
                          >
                            <MapPin className="h-3 w-3" />
                            {holeLocations[group.number] || "Add location"}
                          </button>
                        )}
                        {editingNotesNum === group.number ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 w-56 text-xs"
                              placeholder="Notes (e.g. shotgun start, cart 12)"
                              value={editNotesValue}
                              onChange={(e) => setEditNotesValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveHoleNote(group.number, editNotesValue);
                                if (e.key === "Escape") setEditingNotesNum(null);
                              }}
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => saveHoleNote(group.number, editNotesValue)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 max-w-[240px] truncate"
                            onClick={() => { setEditingNotesNum(group.number); setEditNotesValue(holeNotes[group.number] || ""); }}
                            title="Add or edit notes for this hole"
                          >
                            <StickyNote className="h-3 w-3 shrink-0" />
                            <span className="truncate">{holeNotes[group.number] || "Add note"}</span>
                          </button>
                        )}
                        {editingTeeTimeNum === group.number ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="time"
                              className="h-7 w-32 text-xs"
                              value={editTeeTimeValue}
                              onChange={(e) => setEditTeeTimeValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveHoleTeeTime(group.number, editTeeTimeValue);
                                if (e.key === "Escape") setEditingTeeTimeNum(null);
                              }}
                              // Commit when the organizer clicks away so a typed
                              // time is never lost / reverted to the old value.
                              onBlur={(e) => {
                                if (e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) return;
                                if ((editTeeTimeValue || "") !== (holeTeeTimes[group.number] || "")) {
                                  saveHoleTeeTime(group.number, editTeeTimeValue);
                                } else {
                                  setEditingTeeTimeNum(null);
                                }
                              }}
                              autoFocus
                            />

                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => saveHoleTeeTime(group.number, editTeeTimeValue)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                            onClick={() => { setEditingTeeTimeNum(group.number); setEditTeeTimeValue(holeTeeTimes[group.number] || ""); }}
                            title="Set tee time"
                          >
                            🕒 {holeTeeTimes[group.number] ? fmtTee12(holeTeeTimes[group.number]) : "Add tee time"}
                          </button>
                        )}
                        {(() => {
                          const gCode = group.players.map((p) => codeOf(p)).find(Boolean) || "";
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Scoring Code:</span>
                              <span className="text-xs font-mono font-bold text-foreground">{gCode || "Not assigned"}</span>
                              {group.players.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[11px]"
                                  onClick={() => handleAssignGroupCode(group.number)}
                                >
                                  {gCode ? "Regenerate Code" : "Assign Code"}
                                </Button>
                              )}
                            </div>
                          );
                        })()}
                        </div>
                      </div>



                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-1">
                          {group.players.length}/{maxGroupSize}
                        </span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={gIdx === 0 || pairSort !== "group" || divFilter !== "all" || pairingsLocked} onClick={() => handleMoveGroup(group.number, -1)} title={pairSort === "group" ? "Move up" : "Switch to Sort by Group to reorder"}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={gIdx === visibleGroups.length - 1 || pairSort !== "group" || divFilter !== "all" || pairingsLocked} onClick={() => handleMoveGroup(group.number, 1)} title={pairSort === "group" ? "Move down" : "Switch to Sort by Group to reorder"}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete hole">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Hole {group.number}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {group.players.length > 0
                                  ? `${group.players.length} player(s) will be moved back to Unassigned.`
                                  : "This empty hole will be removed."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteGroup(group.number)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <Droppable droppableId={`group-${group.number}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`bg-card rounded-lg border-2 min-h-[60px] p-3 space-y-2 transition-colors ${
                            snapshot.isDraggingOver
                              ? "border-secondary bg-secondary/5"
                              : "border-border"
                          }`}
                        >
                          {group.players.map((p, index) => (
                            <Draggable key={p.id} draggableId={p.id} index={index} isDragDisabled={pairingsLocked}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex items-center gap-3 bg-background rounded-md border border-border px-3 py-2 text-sm ${
                                    snapshot.isDragging ? "shadow-lg ring-2 ring-secondary" : ""
                                  }`}
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium text-foreground">
                                    {p.first_name} {p.last_name}
                                  </span>
                                  {p.group_id && groupInfoById[p.group_id] && (
                                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                      {groupInfoById[p.group_id].name}
                                    </span>
                                  )}
                                  {p.tier_id && (
                                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary/15 text-secondary-foreground border border-secondary/40">
                                      {tierName(p.tier_id)}
                                    </span>
                                  )}




                                  {ageOf(p) !== null && (
                                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      Age {ageOf(p)}
                                    </span>
                                  )}
                                  {p.handicap !== null && (
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      HCP {p.handicap}
                                    </span>
                                  )}

                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
                {visibleGroups.length === 0 && (
                  <div className="text-center py-8 bg-card rounded-lg border border-dashed border-border">
                    <p className="text-sm text-muted-foreground">
                      No holes yet. Click "Auto-Assign All" or "New Hole" to start.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DragDropContext>
        </div>
      )}

      {/* Player Detail Dialog */}
      <Dialog open={!!viewingPlayer} onOpenChange={(open) => !open && setViewingPlayer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
          </DialogHeader>
          {viewingPlayer && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">First Name</p>
                  <p className="text-sm font-medium text-foreground">{viewingPlayer.first_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Name</p>
                  <p className="text-sm font-medium text-foreground">{viewingPlayer.last_name}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{viewingPlayer.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm text-foreground">{viewingPlayer.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Handicap</p>
                  <p className="text-sm text-foreground">{viewingPlayer.handicap !== null ? viewingPlayer.handicap : "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Shirt Size</p>
                  <p className="text-sm text-foreground">{viewingPlayer.shirt_size || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Status</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${paymentColors[viewingPlayer.payment_status] || paymentColors.pending}`}>
                    {viewingPlayer.payment_status}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Division / Tier</p>
                <p className="text-sm text-foreground">{tierName(viewingPlayer.tier_id)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Hole Assignment</p>
                  <p className="text-sm text-foreground">{(viewingPlayer.group_label || viewingPlayer.group_number) ? `Hole #${viewingPlayer.group_label || viewingPlayer.group_number}` : "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scoring Code</p>
                  <p className="text-sm font-mono text-foreground">{codeOf(viewingPlayer) || "— Not assigned until pairings are set"}</p>
                </div>
              </div>
              {viewingPlayer.dietary_restrictions && (
                <div>
                  <p className="text-xs text-muted-foreground">Dietary Restrictions</p>
                  <p className="text-sm text-foreground">{viewingPlayer.dietary_restrictions}</p>
                </div>
              )}
              {viewingPlayer.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes / Additional Info</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{viewingPlayer.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Registered</p>
                <p className="text-sm text-foreground">{new Date(viewingPlayer.created_at).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ep-first">First Name *</Label>
                <Input id="ep-first" value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="ep-last">Last Name *</Label>
                <Input id="ep-last" value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="ep-email">Email *</Label>
              <Input id="ep-email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ep-phone">Phone</Label>
                <Input id="ep-phone" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="ep-hcp">Handicap</Label>
                <Input id="ep-hcp" type="number" step="0.1" value={editForm.handicap} onChange={(e) => setEditForm((f) => ({ ...f, handicap: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ep-shirt">Shirt Size</Label>
                <Select value={editForm.shirt_size} onValueChange={(v) => setEditForm((f) => ({ ...f, shirt_size: v }))}>
                  <SelectTrigger id="ep-shirt"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["S", "M", "L", "XL", "XXL"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ep-hole">Hole / Group</Label>
                <Input id="ep-hole" type="text" placeholder="Unassigned (e.g. 1, 1A, 1B)" value={editForm.group_label} onChange={(e) => setEditForm((f) => ({ ...f, group_label: e.target.value }))} />
                <p className="text-[10px] text-muted-foreground mt-1">Accepts numbers or split-tee labels like 1A / 1B.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="ep-age">Age</Label>
                <Input id="ep-age" type="number" value={editForm.age} onChange={(e) => setEditForm((f) => ({ ...f, age: e.target.value }))} placeholder="—" />
              </div>
              <div>
                <Label htmlFor="ep-city">City</Label>
                <Input id="ep-city" value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" />
              </div>
              <div>
                <Label htmlFor="ep-state">State</Label>
                <Input id="ep-state" value={editForm.state} onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))} placeholder="GA" maxLength={20} />
              </div>
            </div>
            {tiers.length > 0 && (
              <div>
                <Label htmlFor="ep-tier">Division / Tier</Label>
                <Select value={editForm.tier_id || "__none"} onValueChange={(v) => setEditForm((f) => ({ ...f, tier_id: v === "__none" ? "" : v }))}>
                  <SelectTrigger id="ep-tier"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {tiers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="ep-diet">Dietary Restrictions</Label>
              <Input id="ep-diet" value={editForm.dietary_restrictions} onChange={(e) => setEditForm((f) => ({ ...f, dietary_restrictions: e.target.value }))} placeholder="None" />
            </div>
            <div className="border-t border-border pt-3">
              <Label className="text-xs text-muted-foreground">Payment status</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm capitalize font-medium text-foreground">{editingPlayer?.payment_status}</span>
                {editingPlayer && (isPaidStatus(editingPlayer as any) ? (
                  <span className="text-xs text-muted-foreground">Paid</span>

                ) : (
                  <Button size="sm" onClick={() => { markAsPaid(editingPlayer.id); setEditingPlayer(null); }}>
                    Mark as Paid
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">

              <Button variant="outline" onClick={() => setEditingPlayer(null)} disabled={savingEdit}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!newTeamForPlayer} onOpenChange={(open) => { if (!open) { setNewTeamForPlayer(null); setNewTeamName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Team name (e.g. Team Mulligan)"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createTeamForPlayer(); }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setNewTeamForPlayer(null); setNewTeamName(""); }}>Cancel</Button>
              <Button onClick={createTeamForPlayer} disabled={!newTeamName.trim()}>Create &amp; Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <StickySaveBar onSave={() => {}} />
    </div>
  );
};

export default Players;
