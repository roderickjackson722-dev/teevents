import { useEffect, useState } from "react";
import StickySaveBar from "@/components/dashboard/StickySaveBar";
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
import { Settings2 } from "lucide-react";
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
  created_at: string;
  scoring_code: string | null;
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
type RosterColKey = "name" | "email" | "phone" | "hcp" | "shirt" | "hole" | "code" | "payment";
const BASE_ROSTER_COLS: { key: RosterColKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "hcp", label: "Handicap" },
  { key: "shirt", label: "Shirt" },
  { key: "hole", label: "Hole" },
  { key: "code", label: "Scoring Code" },
  { key: "payment", label: "Payment" },
];

const Players = () => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useTournamentIdParam();
  const [players, setPlayers] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
  });
  const [emptyGroups, setEmptyGroups] = useState<number[]>([]);
  const FIELD_DEFS = [
    { key: "phone", label: "Phone" },
    { key: "handicap", label: "Handicap" },
    { key: "shirt_size", label: "Shirt Size" },
    { key: "payment_status", label: "Payment Status" },
  ] as const;
  type FieldKey = typeof FIELD_DEFS[number]["key"];
  const fieldsStorageKey = selectedTournament ? `teevents_add_player_fields_${selectedTournament}` : "";
  const [visibleFields, setVisibleFields] = useState<Record<FieldKey, boolean>>({
    phone: true, handicap: true, shirt_size: true, payment_status: true,
  });
  useEffect(() => {
    if (!fieldsStorageKey) return;
    try {
      const raw = localStorage.getItem(fieldsStorageKey);
      if (raw) setVisibleFields((prev) => ({ ...prev, ...JSON.parse(raw) }));
      else setVisibleFields({ phone: true, handicap: true, shirt_size: true, payment_status: true });
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
    name: true, email: true, phone: true, hcp: true, shirt: true, hole: true, code: true, payment: true,
  });
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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
      .select("id, title, max_players, allow_cash_registration, registration_fee_cents")
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
    ]).then(([regsRes, fieldsRes]) => {
      setPlayers((regsRes.data as unknown as Registration[]) || []);
      setRegFieldDefs((fieldsRes.data as RegFieldDef[]) || []);
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

  const getSortValue = (p: Registration, key: string): string | number => {
    switch (key) {
      case "name": return `${p.first_name} ${p.last_name}`.toLowerCase();
      case "email": return (p.email || "").toLowerCase();
      case "phone": return (p.phone || "").toLowerCase();
      case "hcp": return p.handicap ?? Number.POSITIVE_INFINITY;
      case "shirt": return (p.shirt_size || "").toLowerCase();
      case "hole": return p.group_number ?? Number.POSITIVE_INFINITY;
      case "code": return (p.scoring_code || "").toLowerCase();
      case "payment": return (p.payment_status || "").toLowerCase();
      default:
        if (key.startsWith("custom_")) return getCustomAnswer(p, key.slice("custom_".length)).toLowerCase();
        return "";
    }
  };

  const filteredPlayers = players
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



  const handleDeletePlayer = async (id: string) => {
    if (demoGuard()) return;
    const { error } = await supabase.from("tournament_registrations").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
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
    };
    const { error } = await supabase
      .from("tournament_registrations")
      .update(updates)
      .eq("id", editingPlayer.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setPlayers((prev) => prev.map((p) => p.id === editingPlayer.id ? { ...p, ...updates } : p));
    toast({ title: "Player updated", description: `${updates.first_name} ${updates.last_name} saved.` });
    setEditingPlayer(null);
  };

  const handleSaveScoringCode = async (playerId: string) => {
    if (demoGuard()) return;
    const code = scoringCodeInput.trim().toUpperCase();
    if (!code) {
      toast({ title: "Code cannot be empty", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ scoring_code: code })
      .eq("id", playerId);
    if (error) {
      toast({ title: "Error", description: error.message.includes("unique") ? "This code is already in use" : error.message, variant: "destructive" });
    } else {
      setPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, scoring_code: code } : p));
      setEditingScoringCode(null);
      toast({ title: "Scoring code updated" });
    }
  };

  const handleExportCSV = () => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Handicap", "Shirt Size", "Hole", "Payment", "Scoring Code"];
    const rows = players.map((p) => [
      p.first_name,
      p.last_name,
      p.email,
      p.phone || "",
      p.handicap?.toString() || "",
      p.shirt_size || "",
      p.group_number?.toString() || "Unassigned",
      p.payment_status,
      p.scoring_code || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "players.csv";
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
    const insertPayload: any = {
      tournament_id: selectedTournament,
      first_name: newPlayer.first_name.trim(),
      last_name: newPlayer.last_name.trim(),
      email: newPlayer.email.trim().toLowerCase(),
      phone: newPlayer.phone.trim() || null,
      handicap: newPlayer.handicap ? parseInt(newPlayer.handicap) : null,
      shirt_size: newPlayer.shirt_size || null,
      payment_method: newPlayer.payment_method || "online",
      payment_status: isCash
        ? (newPlayer.payment_status === "paid" ? "paid" : "pending")
        : newPlayer.payment_status,
      cash_payment_received: isCash && newPlayer.payment_status === "paid",
    };
    const { data, error } = await supabase.from("tournament_registrations").insert(insertPayload).select("*").single();
    setAddingPlayer(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setPlayers((prev) => [...prev, data as Registration]);
      setNewPlayer({ first_name: "", last_name: "", email: "", phone: "", handicap: "", shirt_size: "", payment_status: "paid", payment_method: "online" });
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
      setPlayers((prev) => prev.map((p) => p.id === id ? { ...p, payment_status: "paid", cash_payment_received: true } : p));
      toast({ title: "Payment marked received" });
      supabase.functions.invoke("notify-manual-registration", {
        body: { registration_id: id },
      }).catch((e) => console.error("notify-manual-registration failed:", e));
    }
  };

  const handleRegenerateAllCodes = async () => {
    if (players.length === 0 || demoGuard()) return;
    setRegenerating(true);
    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    };

    const usedCodes = new Set<string>();
    const updates: { id: string; code: string }[] = [];
    for (const p of players) {
      let code = generateCode();
      while (usedCodes.has(code)) code = generateCode();
      usedCodes.add(code);
      updates.push({ id: p.id, code });
    }

    let success = 0;
    for (const u of updates) {
      const { error } = await supabase
        .from("tournament_registrations")
        .update({ scoring_code: u.code })
        .eq("id", u.id);
      if (!error) success++;
    }

    setPlayers((prev) =>
      prev.map((p) => {
        const u = updates.find((u) => u.id === p.id);
        return u ? { ...p, scoring_code: u.code } : p;
      })
    );
    setRegenerating(false);
    toast({ title: "Codes regenerated", description: `${success} scoring codes updated.` });
  };


  const maxGroupSize = 4;
  const unassigned = players.filter((p) => p.group_number === null);
  const groupNumbers = [...new Set(players.filter((p) => p.group_number !== null).map((p) => p.group_number!))].sort((a, b) => a - b);
  const groupsFromPlayers = groupNumbers.map((num) => ({
    number: num,
    players: players
      .filter((p) => p.group_number === num)
      .sort((a, b) => (a.group_position || 0) - (b.group_position || 0)),
  }));

  // Merge empty groups that have no players yet
  const allGroupNumbers = [...new Set([...groupNumbers, ...emptyGroups])].sort((a, b) => a - b);
  const groups = allGroupNumbers.map((num) => {
    const existing = groupsFromPlayers.find((g) => g.number === num);
    return existing || { number: num, players: [] };
  });

  const nextGroupNumber = allGroupNumbers.length > 0 ? Math.max(...allGroupNumbers) + 1 : 1;

  const [editingGroupNum, setEditingGroupNum] = useState<number | null>(null);
  const [editGroupValue, setEditGroupValue] = useState<string>("");
  const [editingLocationNum, setEditingLocationNum] = useState<number | null>(null);
  const [editLocationValue, setEditLocationValue] = useState<string>("");
  const [editingNotesNum, setEditingNotesNum] = useState<number | null>(null);
  const [editNotesValue, setEditNotesValue] = useState<string>("");
  const locStorageKey = selectedTournament ? `teevents_hole_locations_${selectedTournament}` : "";
  const labelsStorageKey = selectedTournament ? `teevents_hole_labels_${selectedTournament}` : "";
  const notesStorageKey = selectedTournament ? `teevents_hole_notes_${selectedTournament}` : "";
  const [holeLocations, setHoleLocations] = useState<Record<number, string>>({});
  const [holeLabels, setHoleLabels] = useState<Record<number, string>>({});
  const [holeNotes, setHoleNotes] = useState<Record<number, string>>({});
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
  }, [locStorageKey, labelsStorageKey, notesStorageKey]);
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


  const handleAddGroup = () => {
    setEmptyGroups((prev) => [...prev, nextGroupNumber]);
    toast({ title: `Hole ${nextGroupNumber} created` });
  };

  const handleRenameGroup = async (oldNum: number, rawInput: string) => {
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
    setPlayers((prev) => prev.map((p) => p.group_number === oldNum ? { ...p, group_number: newNum } : p));
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
    if (demoGuard()) return;
    const ids = players.filter((p) => p.group_number === num).map((p) => p.id);
    if (ids.length > 0) {
      const { error } = await supabase
        .from("tournament_registrations")
        .update({ group_number: null, group_position: null })
        .in("id", ids);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    setPlayers((prev) => prev.map((p) => p.group_number === num ? { ...p, group_number: null, group_position: null } : p));
    setEmptyGroups((prev) => prev.filter((n) => n !== num));
    if (holeLocations[num]) {
      const next = { ...holeLocations };
      delete next[num];
      saveLocations(next);
    }
    toast({ title: `Hole ${num} deleted`, description: ids.length > 0 ? `${ids.length} player(s) moved to Unassigned.` : undefined });
  };

  const handleMoveGroup = async (num: number, dir: -1 | 1) => {
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
    setPlayers((prev) => prev.map((p) => {
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
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ group_number: groupNum, group_position: position })
      .eq("id", playerId);

    if (!error) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, group_number: groupNum, group_position: position } : p
        )
      );
    }
  };

  const handleUnassignPlayer = async (playerId: string) => {
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ group_number: null, group_position: null })
      .eq("id", playerId);

    if (!error) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, group_number: null, group_position: null } : p
        )
      );
    }
  };

  const handleAutoAssign = async () => {
    const unassignedPlayers = players.filter((p) => p.group_number === null);
    if (unassignedPlayers.length === 0) return;

    let currentGroup = nextGroupNumber;
    let positionInGroup = 1;

    // Fill existing groups first
    const updates: { id: string; group_number: number; group_position: number }[] = [];
    let idx = 0;

    for (const group of groups) {
      while (group.players.length + (updates.filter((u) => u.group_number === group.number).length) < maxGroupSize && idx < unassignedPlayers.length) {
        const pos = group.players.length + updates.filter((u) => u.group_number === group.number).length + 1;
        updates.push({ id: unassignedPlayers[idx].id, group_number: group.number, group_position: pos });
        idx++;
      }
    }

    // Remaining into new groups
    while (idx < unassignedPlayers.length) {
      updates.push({ id: unassignedPlayers[idx].id, group_number: currentGroup, group_position: positionInGroup });
      positionInGroup++;
      if (positionInGroup > maxGroupSize) {
        positionInGroup = 1;
        currentGroup++;
      }
      idx++;
    }

    // Batch update
    for (const update of updates) {
      await supabase
        .from("tournament_registrations")
        .update({ group_number: update.group_number, group_position: update.group_position })
        .eq("id", update.id);
    }

    setPlayers((prev) =>
      prev.map((p) => {
        const u = updates.find((u) => u.id === p.id);
        return u ? { ...p, group_number: u.group_number, group_position: u.group_position } : p;
      })
    );

    toast({ title: "Auto-assigned!", description: `${updates.length} players assigned to holes.` });
  };

  const onDragEnd = async (result: DropResult) => {
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
            {players.length} registered player{players.length !== 1 ? "s" : ""}
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
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search players..."
                className="pl-9 w-[200px] bg-card"
              />
            </div>
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
                  .then(({ data }) => setPlayers((data as unknown as Registration[]) || []));
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
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="comp">Comp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
      ) : players.length === 0 ? (
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
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-semibold px-4 py-3">Name</th>
                  <th className="text-left font-semibold px-4 py-3">Email</th>
                  <th className="text-left font-semibold px-4 py-3">Phone</th>
                  <th className="text-center font-semibold px-4 py-3">HCP</th>
                  <th className="text-center font-semibold px-4 py-3">Shirt</th>
                  <th className="text-center font-semibold px-4 py-3">Hole</th>
                  <th className="text-center font-semibold px-4 py-3">
                    <span className="flex items-center justify-center gap-1"><QrCode className="h-3.5 w-3.5" /> Code</span>
                  </th>
                  <th className="text-center font-semibold px-4 py-3">Payment</th>
                  <th className="text-center font-semibold px-4 py-3 w-12"></th>
                </tr>
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
                    <td className="px-4 py-3 font-medium text-foreground">
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone || "—"}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {p.handicap !== null ? p.handicap : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{p.shirt_size || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {(p.group_label || p.group_number) ? (
                        <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                          #{p.group_label || p.group_number}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
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
                          onClick={() => { setEditingScoringCode(p.id); setScoringCodeInput(p.scoring_code || ""); }}
                          className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                          title="Click to edit scoring code"
                        >
                          {p.scoring_code || "—"}
                          <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                        </button>
                      )}
                    </td>
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
                      </div>
                    </td>
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
                                    setPlayers((prev) => prev.map((pl) => pl.id === p.id ? { ...pl, payment_status: "refunded" } : pl));
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
      ) : (
        /* Pairings View */
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Button onClick={handleAutoAssign} variant="outline" size="sm">
              Auto-Assign All
            </Button>
            <Button onClick={handleAddGroup} variant="outline" size="sm">
              New Hole
            </Button>
            <span className="text-sm text-muted-foreground ml-auto">
              Drag and drop players between holes
            </span>
          </div>

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
                        <Draggable key={p.id} draggableId={p.id} index={index}>
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
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Holes ({groups.length})
                </h3>
                {groups.map((group, gIdx) => (
                  <div key={group.number}>
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
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
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-1">
                          {group.players.length}/{maxGroupSize}
                        </span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={gIdx === 0} onClick={() => handleMoveGroup(group.number, -1)} title="Move up">
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={gIdx === groups.length - 1} onClick={() => handleMoveGroup(group.number, 1)} title="Move down">
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
                            <Draggable key={p.id} draggableId={p.id} index={index}>
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
                {groups.length === 0 && (
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Hole Assignment</p>
                  <p className="text-sm text-foreground">{(viewingPlayer.group_label || viewingPlayer.group_number) ? `Hole #${viewingPlayer.group_label || viewingPlayer.group_number}` : "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scoring Code</p>
                  <p className="text-sm font-mono text-foreground">{viewingPlayer.scoring_code || "—"}</p>
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
            <div>
              <Label htmlFor="ep-diet">Dietary Restrictions</Label>
              <Input id="ep-diet" value={editForm.dietary_restrictions} onChange={(e) => setEditForm((f) => ({ ...f, dietary_restrictions: e.target.value }))} placeholder="None" />
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
      <StickySaveBar onSave={() => {}} />
    </div>
  );
};

export default Players;
