import { useState, useEffect, useCallback } from "react";
import StickySaveBar from "@/components/dashboard/StickySaveBar";
import DropdownOptionsEditor from "@/components/dashboard/DropdownOptionsEditor";
import { useSearchParams } from "react-router-dom";
import { useTournamentIdParam } from "@/hooks/useTournamentIdParam";
import { useDemoMode } from "@/hooks/useDemoMode";
import { markChecklistTaskComplete } from "@/hooks/useSetupChecklist";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import GroupRegistrationSettings from "@/components/dashboard/GroupRegistrationSettings";
import AddonDisplaySettings from "@/components/dashboard/AddonDisplaySettings";

import {
  ClipboardList,
  Plus,
  Trash2,
  Save,
  Loader2,
  DollarSign,
  Tag,
  Package,
  GripVertical,
  ToggleLeft,
  Info,
  Crown,
  RotateCcw,
  Pencil,
} from "lucide-react";
import RefundPolicySettings from "@/components/dashboard/RefundPolicySettings";
import RefundManagement from "@/components/dashboard/RefundManagement";
import FlightsManager from "@/components/dashboard/FlightsManager";
import RegistrationSubmissions from "@/components/dashboard/RegistrationSubmissions";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const DEFAULT_CLOSED_MESSAGE =
  "Registration for this event is now closed. Thank you for your interest — we have reached our registration deadline. If you would still like to play, be added to our waitlist, or ask about sponsorship opportunities, please contact us using the information below and we will do our best to help.";

/* ── types ── */

interface Tournament {
  id: string;
  title: string;
  registration_fee_cents: number | null;
  registration_open: boolean | null;
  max_players: number | null;
  foursome_registration: boolean;
  max_group_size: number;
  allow_cover_fees: boolean;
  early_registration_enabled?: boolean | null;
  early_registration_price_cents?: number | null;
  early_registration_price_2_cents?: number | null;
  early_registration_price_4_cents?: number | null;
  early_registration_expires_at?: string | null;
  allow_cash_registration?: boolean | null;
  show_registration_count?: boolean | null;
  registration_auto_close_enabled?: boolean | null;
  registration_close_at?: string | null;
  registration_closed_message?: string | null;
  registration_closed_contact_email?: string | null;
  registration_closed_contact_phone?: string | null;
}


interface RegistrationTier {
  id?: string;
  tournament_id: string;
  name: string;
  description: string | null;
  eligibility_description: string | null;
  price_cents: number;
  max_registrants: number | null;
  sort_order: number;
  is_active: boolean;
}

interface RegField {
  id?: string;
  tournament_id: string;
  label: string;
  field_type: string;
  options: string[] | null;
  is_required: boolean;
  is_default: boolean;
  is_enabled: boolean;
  sort_order: number;
}

interface Addon {
  id?: string;
  tournament_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  is_active: boolean;
  sort_order: number;
  max_per_golfer: number;
}

/** Convert an ISO timestamp into a `datetime-local` value in the viewer's timezone. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Friendly, timezone-labeled display of a scheduled close time. */
function formatCloseAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function countdownTo(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "";
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rem = mins % 60;
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${rem}m`;
  return `in ${rem}m`;
}


interface PromoCode {
  id?: string;
  tournament_id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  auto_apply?: boolean;
  applies_to?: string;
  applies_to_custom?: string | null;
  alert_enabled?: boolean;
  alert_html?: string | null;
  show_alert_at_checkout?: boolean;
  show_alert_on_top?: boolean;
}

const DEFAULT_FIELDS: Omit<RegField, "tournament_id">[] = [
  { label: "Phone", field_type: "text", options: null, is_required: false, is_default: true, is_enabled: true, sort_order: 1 },
  { label: "Handicap", field_type: "number", options: null, is_required: false, is_default: true, is_enabled: true, sort_order: 2 },
  { label: "Shirt Size", field_type: "dropdown", options: ["XS", "S", "M", "L", "XL", "2XL", "3XL"], is_required: false, is_default: true, is_enabled: true, sort_order: 3 },
  { label: "Dietary Restrictions", field_type: "text", options: null, is_required: false, is_default: true, is_enabled: true, sort_order: 4 },
  { label: "Company / Organization", field_type: "text", options: null, is_required: false, is_default: true, is_enabled: false, sort_order: 5 },
  { label: "Skill Level", field_type: "dropdown", options: ["Beginner", "Intermediate", "Advanced", "Scratch"], is_required: false, is_default: true, is_enabled: false, sort_order: 6 },
];

/* ── main component ── */
const Registration = () => {
  const { org } = useOrgContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "settings";
  const setActiveTab = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", v);
    setSearchParams(next, { replace: true });
  };
  const { demoGuard } = useDemoMode();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useTournamentIdParam();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* data */
  const [fields, setFields] = useState<RegField[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [tiers, setTiers] = useState<RegistrationTier[]>([]);

  /* tournament settings */
  const [feeDisplay, setFeeDisplay] = useState<string>("0.00");
  const [feeCents, setFeeCents] = useState<number>(0);
  const [regOpen, setRegOpen] = useState<boolean>(false);
  /* Scheduled auto-close of registration */
  const [autoCloseEnabled, setAutoCloseEnabled] = useState<boolean>(false);
  const [closeAt, setCloseAt] = useState<string>(""); // datetime-local string
  const [savedCloseAt, setSavedCloseAt] = useState<string | null>(null); // ISO, as stored
  const [closedMessage, setClosedMessage] = useState<string>("");
  const [closedContactEmail, setClosedContactEmail] = useState<string>("");
  const [closedContactPhone, setClosedContactPhone] = useState<string>("");
  const [closeIncludesAddons, setCloseIncludesAddons] = useState<boolean>(true);

  const [maxPlayersDisplay, setMaxPlayersDisplay] = useState<string>("144");
  const [maxPlayers, setMaxPlayers] = useState<number>(144);
  const [foursomeReg, setFoursomeReg] = useState<boolean>(false);
  const [maxGroupSize, setMaxGroupSize] = useState<number>(1);
  const [allowedGroupSizes, setAllowedGroupSizes] = useState<number[] | null>(null);
  const [allowCoverFees, setAllowCoverFees] = useState<boolean>(true);
  const [captainLabel, setCaptainLabel] = useState<string>("");
  /* Early registration discount */
  const [earlyEnabled, setEarlyEnabled] = useState<boolean>(false);
  const [earlyPriceDisplay, setEarlyPriceDisplay] = useState<string>("");
  const [earlyPrice2Display, setEarlyPrice2Display] = useState<string>("");
  const [earlyPrice4Display, setEarlyPrice4Display] = useState<string>("");
  const [earlyExpires, setEarlyExpires] = useState<string>(""); // datetime-local string
  /* Cash registration */
  const [allowCash, setAllowCash] = useState<boolean>(false);
  const [showRegCount, setShowRegCount] = useState<boolean>(false);
  /* Promo code input visibility */
  const [showPromoCodeInput, setShowPromoCodeInput] = useState<boolean>(true);
  /* Public registration page custom content */
  const [registrationIntroHtml, setRegistrationIntroHtml] = useState<string>("");
  const [registrationPromoHtml, setRegistrationPromoHtml] = useState<string>("");
  /* Donation prompt */
  const [donationEnabled, setDonationEnabled] = useState<boolean>(false);
  const [donationTitle, setDonationTitle] = useState<string>("Support Our Mission");
  const [donationDescription, setDonationDescription] = useState<string>("");
  const [donationPresetsDisplay, setDonationPresetsDisplay] = useState<string>("10, 25, 50, 100, 250, 500");
  const [donationAllowCustom, setDonationAllowCustom] = useState<boolean>(true);
  const [donationCustomLabel, setDonationCustomLabel] = useState<string>("Enter your own amount");

  /* fetch tournaments */
  useEffect(() => {
    if (!org) return;
    (supabase as any)
      .from("tournaments")
      .select("id, title, registration_fee_cents, registration_open, max_players, foursome_registration, max_group_size, allowed_group_sizes, allow_cover_fees, captain_label, early_registration_enabled, early_registration_price_cents, early_registration_price_2_cents, early_registration_price_4_cents, early_registration_expires_at, allow_cash_registration, registration_intro_html, registration_promo_html, show_registration_count, show_promo_code_input, donation_prompt_enabled, donation_prompt_title, donation_prompt_description, donation_preset_amounts, donation_allow_custom, donation_custom_label, registration_auto_close_enabled, registration_close_at, registration_closed_message, registration_closed_contact_email, registration_closed_contact_phone, registration_close_includes_addons")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        const t = (data as Tournament[]) || [];
        setTournaments(t);
        if (t.length > 0 && !t.some((x) => x.id === selectedTournament)) setSelectedTournament(t[0].id);
        setLoading(false);
      });
  }, [org]);

  /* fetch data when tournament changes */
  const fetchData = useCallback(async (tid: string) => {
    if (!tid) return;
    setLoading(true);

    const tournament = tournaments.find((t) => t.id === tid);
    if (tournament) {
      const cents = tournament.registration_fee_cents || 0;
      setFeeCents(cents);
      setFeeDisplay((cents / 100).toFixed(2));
      setRegOpen(tournament.registration_open || false);
      const mp = tournament.max_players || 144;
      setMaxPlayers(mp);
      setMaxPlayersDisplay(String(mp));
      setFoursomeReg(tournament.foursome_registration || false);
      setMaxGroupSize(tournament.max_group_size || 1);
      const ags = (tournament as any).allowed_group_sizes;
      setAllowedGroupSizes(Array.isArray(ags) && ags.length > 0 ? ags : null);
      setAllowCoverFees(tournament.allow_cover_fees !== false);
      setCaptainLabel(((tournament as any).captain_label as string) || "");
      setEarlyEnabled(!!tournament.early_registration_enabled);
      const earlyCents = tournament.early_registration_price_cents;
      setEarlyPriceDisplay(earlyCents != null ? (earlyCents / 100).toFixed(2) : "");
      const early2 = (tournament as any).early_registration_price_2_cents;
      setEarlyPrice2Display(early2 != null ? (early2 / 100).toFixed(2) : "");
      const early4 = (tournament as any).early_registration_price_4_cents;
      setEarlyPrice4Display(early4 != null ? (early4 / 100).toFixed(2) : "");
      const exp = tournament.early_registration_expires_at;
      setEarlyExpires(exp ? new Date(exp).toISOString().slice(0, 16) : "");
      setAllowCash(!!tournament.allow_cash_registration);
      setShowRegCount((tournament as any).show_registration_count === true);
      setShowPromoCodeInput((tournament as any).show_promo_code_input !== false);
      setRegistrationIntroHtml(((tournament as any).registration_intro_html as string) || "");
      setRegistrationPromoHtml(((tournament as any).registration_promo_html as string) || "");
      setDonationEnabled(!!(tournament as any).donation_prompt_enabled);
      setDonationTitle(((tournament as any).donation_prompt_title as string) || "Support Our Mission");
      setDonationDescription(((tournament as any).donation_prompt_description as string) || "");
      const presets = (tournament as any).donation_preset_amounts as number[] | null;
      setDonationPresetsDisplay(
        Array.isArray(presets) && presets.length > 0
          ? presets.map((c) => (c / 100).toString()).join(", ")
          : "10, 25, 50, 100, 250, 500",
      );
      setDonationAllowCustom((tournament as any).donation_allow_custom !== false);
      setDonationCustomLabel(((tournament as any).donation_custom_label as string) || "Enter your own amount");
      setAutoCloseEnabled(!!(tournament as any).registration_auto_close_enabled);
      const closeIso = (tournament as any).registration_close_at as string | null;
      setCloseAt(closeIso ? toLocalInputValue(closeIso) : "");
      setSavedCloseAt(closeIso && (tournament as any).registration_auto_close_enabled ? closeIso : null);
      setClosedMessage(((tournament as any).registration_closed_message as string) || "");
      setClosedContactEmail(((tournament as any).registration_closed_contact_email as string) || "");
      setClosedContactPhone(((tournament as any).registration_closed_contact_phone as string) || "");
      setCloseIncludesAddons((tournament as any).registration_close_includes_addons !== false);
    }

    const [fieldsRes, addonsRes, promoRes, tiersRes] = await Promise.all([
      supabase.from("tournament_registration_fields").select("*").eq("tournament_id", tid).order("sort_order"),
      supabase.from("tournament_registration_addons").select("*").eq("tournament_id", tid).order("sort_order"),
      supabase.from("tournament_promo_codes").select("*").eq("tournament_id", tid).order("created_at", { ascending: false }),
      supabase.from("tournament_registration_tiers").select("*").eq("tournament_id", tid).order("sort_order"),
    ]);

    let loadedFields = (fieldsRes.data as RegField[]) || [];

    // Seed default fields if none exist
    if (loadedFields.length === 0) {
      const defaults = DEFAULT_FIELDS.map((f) => ({ ...f, tournament_id: tid }));
      const { data: seeded } = await supabase.from("tournament_registration_fields").insert(defaults as any).select("*");
      loadedFields = (seeded as RegField[]) || [];
    }

    setFields(loadedFields);
    setAddons((addonsRes.data as Addon[]) || []);
    setPromoCodes((promoRes.data as PromoCode[]) || []);
    setTiers((tiersRes.data as RegistrationTier[]) || []);
    setLoading(false);
  }, [tournaments]);

  useEffect(() => {
    if (selectedTournament) fetchData(selectedTournament);
  }, [selectedTournament, fetchData]);

  /* ── save helpers ── */
  const saveSettings = async () => {
    if (demoGuard()) return;
    setSaving(true);
    const earlyCents = earlyPriceDisplay ? Math.round(parseFloat(earlyPriceDisplay) * 100) : null;
    const early2Cents = earlyPrice2Display ? Math.round(parseFloat(earlyPrice2Display) * 100) : null;
    const early4Cents = earlyPrice4Display ? Math.round(parseFloat(earlyPrice4Display) * 100) : null;
    const earlyIso = earlyExpires ? new Date(earlyExpires).toISOString() : null;
    const updates: any = {
      registration_fee_cents: feeCents,
      registration_open: regOpen,
      max_players: maxPlayers,
      foursome_registration: foursomeReg,
      max_group_size: maxGroupSize,
      allowed_group_sizes: allowedGroupSizes && allowedGroupSizes.length > 0
        ? [...allowedGroupSizes].filter((n) => n >= 1 && n <= maxGroupSize).sort((a, b) => a - b)
        : null,
      allow_cover_fees: allowCoverFees,
      captain_label: captainLabel.trim() || null,
      early_registration_enabled: earlyEnabled,
      early_registration_price_cents: earlyCents,
      early_registration_price_2_cents: early2Cents,
      early_registration_price_4_cents: early4Cents,
      early_registration_expires_at: earlyIso,
      allow_cash_registration: allowCash,
      show_registration_count: showRegCount,
      show_promo_code_input: showPromoCodeInput,
      registration_intro_html: registrationIntroHtml.trim() || null,
      registration_promo_html: registrationPromoHtml.trim() || null,
      donation_prompt_enabled: donationEnabled,
      donation_prompt_title: donationTitle.trim() || "Support Our Mission",
      donation_prompt_description: donationDescription.trim() || null,
      donation_preset_amounts: donationPresetsDisplay
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
        .map((n) => Math.round(n * 100)),
      donation_allow_custom: donationAllowCustom,
      donation_custom_label: donationCustomLabel.trim() || "Enter your own amount",
      registration_auto_close_enabled: autoCloseEnabled,
      registration_close_at: autoCloseEnabled && closeAt ? new Date(closeAt).toISOString() : null,
      registration_closed_message: closedMessage.trim() || null,
      registration_closed_contact_email: closedContactEmail.trim() || null,
      registration_closed_contact_phone: closedContactPhone.trim() || null,
      registration_close_includes_addons: closeIncludesAddons,
    };
    const { error } = await supabase.from("tournaments").update(updates).eq("id", selectedTournament);
    if (error) toast.error(error.message);
    else {
      setSavedCloseAt(updates.registration_close_at as string | null);
      if (updates.registration_close_at) {
        toast.success(`Saved — registration closes ${formatCloseAt(updates.registration_close_at as string)}`);
      } else {
        toast.success("Registration settings saved!");
      }
      setTournaments((prev) =>
        prev.map((t) =>
          t.id === selectedTournament
            ? { ...t, ...updates }
            : t,
        ),
      );
      markChecklistTaskComplete(selectedTournament, "set_registration_pricing");
    }
    setSaving(false);
  };

  const toggleField = async (field: RegField) => {
    if (demoGuard()) return;
    const updated = !field.is_enabled;
    const { error } = await supabase
      .from("tournament_registration_fields")
      .update({ is_enabled: updated } as any)
      .eq("id", field.id!);
    if (error) toast.error(error.message);
    else setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, is_enabled: updated } : f)));
  };

  const toggleFieldRequired = async (field: RegField) => {
    if (demoGuard()) return;
    const updated = !field.is_required;
    const { error } = await supabase
      .from("tournament_registration_fields")
      .update({ is_required: updated } as any)
      .eq("id", field.id!);
    if (error) toast.error(error.message);
    else setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, is_required: updated } : f)));
  };

  /* ── custom field CRUD ── */
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([""]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldLabel, setEditFieldLabel] = useState("");
  const [editFieldType, setEditFieldType] = useState("text");
  const [editFieldOptions, setEditFieldOptions] = useState<string[]>([""]);

  const cleanOptions = (opts: string[]) => opts.map((o) => o.trim()).filter(Boolean);

  const addCustomField = async () => {
    if (!newFieldLabel.trim()) return;
    const payload: any = {
      tournament_id: selectedTournament,
      label: newFieldLabel.trim(),
      field_type: newFieldType,
      options: newFieldType === "dropdown" ? cleanOptions(newFieldOptions) : null,
      is_required: false,
      is_default: false,
      is_enabled: true,
      sort_order: fields.length + 1,
    };
    const { data, error } = await supabase.from("tournament_registration_fields").insert(payload).select("*").single();
    if (error) toast.error(error.message);
    else {
      setFields((prev) => [...prev, data as RegField]);
      setNewFieldLabel("");
      setNewFieldOptions([""]);
      toast.success("Custom field added!");
    }
  };

  const startEditField = (field: RegField) => {
    setEditingFieldId(field.id!);
    setEditFieldLabel(field.label);
    setEditFieldType(field.field_type);
    setEditFieldOptions(field.options && (field.options as string[]).length ? [...(field.options as string[])] : [""]);
  };

  const cancelEditField = () => {
    setEditingFieldId(null);
    setEditFieldLabel("");
    setEditFieldType("text");
    setEditFieldOptions([""]);
  };

  const saveEditField = async (id: string) => {
    if (!editFieldLabel.trim()) return;
    const updates: any = {
      label: editFieldLabel.trim(),
      field_type: editFieldType,
      options: editFieldType === "dropdown" ? cleanOptions(editFieldOptions) : null,
    };
    const { error } = await supabase.from("tournament_registration_fields").update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
      setEditingFieldId(null);
      toast.success("Field updated!");
    }
  };


  const deleteField = async (id: string) => {
    const { error } = await supabase.from("tournament_registration_fields").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setFields((prev) => prev.filter((f) => f.id !== id));
  };

  /* ── addon CRUD ── */
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonDesc, setNewAddonDesc] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const [newAddonMaxQty, setNewAddonMaxQty] = useState("1");

  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [editAddonName, setEditAddonName] = useState("");
  const [editAddonDesc, setEditAddonDesc] = useState("");
  const [editAddonPrice, setEditAddonPrice] = useState("");
  const [editAddonMaxQty, setEditAddonMaxQty] = useState("1");

  const startEditAddon = (a: Addon) => {
    setEditingAddonId(a.id!);
    setEditAddonName(a.name);
    setEditAddonDesc(a.description || "");
    setEditAddonPrice((a.price_cents / 100).toFixed(2));
    setEditAddonMaxQty(String(a.max_per_golfer ?? 1));
  };
  const cancelEditAddon = () => setEditingAddonId(null);

  const saveEditAddon = async (id: string) => {
    if (demoGuard()) return;
    if (!editAddonName.trim()) return;
    const updates: any = {
      name: editAddonName.trim(),
      description: editAddonDesc.trim() || null,
      price_cents: Math.round(parseFloat(editAddonPrice || "0") * 100),
      max_per_golfer: Math.max(1, Math.min(50, parseInt(editAddonMaxQty || "1", 10) || 1)),
    };
    const { error } = await supabase.from("tournament_registration_addons").update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
      setEditingAddonId(null);
      toast.success("Add-on updated!");
    }
  };

  const addAddon = async () => {
    if (!newAddonName.trim()) return;
    const maxQty = Math.max(1, Math.min(50, parseInt(newAddonMaxQty || "1", 10) || 1));
    const payload: any = {
      tournament_id: selectedTournament,
      name: newAddonName.trim(),
      description: newAddonDesc.trim() || null,
      price_cents: Math.round(parseFloat(newAddonPrice || "0") * 100),
      is_active: true,
      sort_order: addons.length,
      max_per_golfer: maxQty,
    };
    const { data, error } = await supabase.from("tournament_registration_addons").insert(payload).select("*").single();
    if (error) toast.error(error.message);
    else {
      setAddons((prev) => [...prev, data as Addon]);
      setNewAddonName("");
      setNewAddonDesc("");
      setNewAddonPrice("");
      setNewAddonMaxQty("1");
      toast.success("Add-on created!");
    }
  };

  const updateAddonMaxQty = async (addon: Addon, value: string) => {
    const maxQty = Math.max(1, Math.min(50, parseInt(value || "1", 10) || 1));
    const { error } = await supabase
      .from("tournament_registration_addons")
      .update({ max_per_golfer: maxQty } as any)
      .eq("id", addon.id!);
    if (error) toast.error(error.message);
    else setAddons((prev) => prev.map((a) => (a.id === addon.id ? { ...a, max_per_golfer: maxQty } : a)));
  };

  const toggleAddon = async (addon: Addon) => {
    const { error } = await supabase
      .from("tournament_registration_addons")
      .update({ is_active: !addon.is_active } as any)
      .eq("id", addon.id!);
    if (error) toast.error(error.message);
    else setAddons((prev) => prev.map((a) => (a.id === addon.id ? { ...a, is_active: !a.is_active } : a)));
  };

  const deleteAddon = async (id: string) => {
    const { error } = await supabase.from("tournament_registration_addons").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setAddons((prev) => prev.filter((a) => a.id !== id));
  };

  /* ── promo code CRUD ── */
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoType, setNewPromoType] = useState("percent");
  const [newPromoValue, setNewPromoValue] = useState("");
  const [newPromoMaxUses, setNewPromoMaxUses] = useState("");
  const [newPromoExpires, setNewPromoExpires] = useState(""); // datetime-local
  const [newPromoAutoApply, setNewPromoAutoApply] = useState(false);
  const [newPromoAppliesTo, setNewPromoAppliesTo] = useState("all");
  const [newPromoAppliesCustom, setNewPromoAppliesCustom] = useState("");
  const [newPromoAlertEnabled, setNewPromoAlertEnabled] = useState(false);
  const [newPromoAlertOnTop, setNewPromoAlertOnTop] = useState(true);
  const [newPromoAlertHtml, setNewPromoAlertHtml] = useState("");

  const resetNewPromo = () => {
    setNewPromoCode(""); setNewPromoValue(""); setNewPromoMaxUses("");
    setNewPromoExpires(""); setNewPromoAutoApply(false); setNewPromoAppliesTo("all");
    setNewPromoAppliesCustom(""); setNewPromoAlertEnabled(false);
    setNewPromoAlertOnTop(true); setNewPromoAlertHtml("");
  };

  const addPromoCode = async () => {
    if (!newPromoCode.trim() || !newPromoValue) return;
    const payload: any = {
      tournament_id: selectedTournament,
      code: newPromoCode.trim().toUpperCase(),
      discount_type: newPromoType,
      discount_value: parseFloat(newPromoValue),
      max_uses: newPromoMaxUses ? parseInt(newPromoMaxUses) : null,
      is_active: true,
      expires_at: newPromoExpires ? new Date(newPromoExpires).toISOString() : null,
      auto_apply: newPromoAutoApply,
      applies_to: newPromoAppliesTo,
      applies_to_custom: newPromoAppliesTo === "custom" ? (newPromoAppliesCustom.trim() || null) : null,
      alert_enabled: newPromoAlertEnabled,
      alert_html: newPromoAlertEnabled ? (newPromoAlertHtml || null) : null,
      show_alert_at_checkout: newPromoAlertEnabled,
      show_alert_on_top: newPromoAlertOnTop,
    };
    const { data, error } = await supabase.from("tournament_promo_codes").insert(payload).select("*").single();
    if (error) toast.error(error.message);
    else {
      setPromoCodes((prev) => [data as PromoCode, ...prev]);
      resetNewPromo();
      toast.success("Promo code created!");
    }
  };

  const togglePromo = async (promo: PromoCode) => {
    const { error } = await supabase
      .from("tournament_promo_codes")
      .update({ is_active: !promo.is_active } as any)
      .eq("id", promo.id!);
    if (error) toast.error(error.message);
    else setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, is_active: !p.is_active } : p)));
  };

  const updatePromoField = async (promo: PromoCode, patch: Partial<PromoCode>) => {
    const { error } = await supabase
      .from("tournament_promo_codes")
      .update(patch as any)
      .eq("id", promo.id!);
    if (error) { toast.error(error.message); return; }
    setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, ...patch } : p)));
  };

  const deletePromo = async (id: string) => {
    const { error } = await supabase.from("tournament_promo_codes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setPromoCodes((prev) => prev.filter((p) => p.id !== id));
  };


  /* ── tier CRUD ── */
  const [newTierName, setNewTierName] = useState("");
  const [newTierDesc, setNewTierDesc] = useState("");
  const [newTierEligibility, setNewTierEligibility] = useState("");
  const [newTierPrice, setNewTierPrice] = useState("");
  const [newTierMax, setNewTierMax] = useState("");

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editTierName, setEditTierName] = useState("");
  const [editTierDesc, setEditTierDesc] = useState("");
  const [editTierEligibility, setEditTierEligibility] = useState("");
  const [editTierPrice, setEditTierPrice] = useState("");
  const [editTierMax, setEditTierMax] = useState("");

  const startEditTier = (t: RegistrationTier) => {
    setEditingTierId(t.id!);
    setEditTierName(t.name);
    setEditTierDesc(t.description || "");
    setEditTierEligibility(t.eligibility_description || "");
    setEditTierPrice((t.price_cents / 100).toFixed(2));
    setEditTierMax(t.max_registrants ? String(t.max_registrants) : "");
  };
  const cancelEditTier = () => setEditingTierId(null);

  const saveEditTier = async (id: string) => {
    if (demoGuard()) return;
    if (!editTierName.trim()) return;
    const updates: any = {
      name: editTierName.trim(),
      description: editTierDesc.trim() || null,
      eligibility_description: editTierEligibility.trim() || null,
      price_cents: Math.round(parseFloat(editTierPrice || "0") * 100),
      max_registrants: editTierMax ? parseInt(editTierMax) : null,
    };
    const { error } = await supabase.from("tournament_registration_tiers").update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      setEditingTierId(null);
      toast.success("Tier updated!");
    }
  };

  const addTier = async () => {
    if (!newTierName.trim() || demoGuard()) return;
    const payload: any = {
      tournament_id: selectedTournament,
      name: newTierName.trim(),
      description: newTierDesc.trim() || null,
      eligibility_description: newTierEligibility.trim() || null,
      price_cents: Math.round(parseFloat(newTierPrice || "0") * 100),
      max_registrants: newTierMax ? parseInt(newTierMax) : null,
      sort_order: tiers.length,
      is_active: true,
    };
    const { data, error } = await supabase.from("tournament_registration_tiers").insert(payload).select("*").single();
    if (error) toast.error(error.message);
    else {
      setTiers((prev) => [...prev, data as RegistrationTier]);
      setNewTierName("");
      setNewTierDesc("");
      setNewTierEligibility("");
      setNewTierPrice("");
      setNewTierMax("");
      toast.success("Registration tier created!");
    }
  };

  const toggleTier = async (tier: RegistrationTier) => {
    if (demoGuard()) return;
    const { error } = await supabase
      .from("tournament_registration_tiers")
      .update({ is_active: !tier.is_active } as any)
      .eq("id", tier.id!);
    if (error) toast.error(error.message);
    else setTiers((prev) => prev.map((t) => (t.id === tier.id ? { ...t, is_active: !t.is_active } : t)));
  };

  const deleteTier = async (id: string) => {
    if (demoGuard()) return;
    const { error } = await supabase.from("tournament_registration_tiers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setTiers((prev) => prev.filter((t) => t.id !== id));
  };

  /* ── render ── */
  if (loading && tournaments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-20">
        <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-display font-bold text-foreground mb-2">No Tournaments Yet</h2>
        <p className="text-muted-foreground">Create a tournament first to configure registration.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Registration Management</h1>
          <p className="text-muted-foreground mt-1">Configure fields, fees, captain label, add-ons, and promo codes.</p>
        </div>
        {tournaments.length > 1 && (
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="inline-flex w-max sm:grid sm:grid-cols-8 sm:w-full sm:max-w-4xl">
              <TabsTrigger value="settings" className="shrink-0 whitespace-nowrap">Settings</TabsTrigger>
              <TabsTrigger value="tiers" className="shrink-0 whitespace-nowrap">Tiers</TabsTrigger>
              <TabsTrigger value="flights" className="shrink-0 whitespace-nowrap">Flights</TabsTrigger>
              <TabsTrigger value="fields" className="shrink-0 whitespace-nowrap">Fields</TabsTrigger>
              <TabsTrigger value="addons" className="shrink-0 whitespace-nowrap">Add-ons</TabsTrigger>
              <TabsTrigger value="promos" className="shrink-0 whitespace-nowrap">Promo Codes</TabsTrigger>
              <TabsTrigger value="submissions" className="shrink-0 whitespace-nowrap">Submissions</TabsTrigger>
              <TabsTrigger value="refunds" className="shrink-0 whitespace-nowrap flex items-center gap-1">
                <RotateCcw className="h-3.5 w-3.5" />
                Refunds
              </TabsTrigger>
            </TabsList>
          </div>


          {/* ── Settings Tab ── */}
          <TabsContent value="settings">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg border border-border p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-display font-bold text-foreground">General Settings</h2>
              </div>

              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <Label>Registration Fee ($)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={feeDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      // Allow only digits and a single decimal point (max 2 decimals)
                      if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
                        setFeeDisplay(raw);
                        const parsed = parseFloat(raw);
                        setFeeCents(isNaN(parsed) ? 0 : Math.round(parsed * 100));
                      }
                    }}
                    onBlur={() => setFeeDisplay((feeCents / 100).toFixed(2))}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Set to $0 for free registration</p>
                </div>
                <div>
                  <Label>Max Players</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={maxPlayersDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "" || /^\d+$/.test(raw)) {
                        setMaxPlayersDisplay(raw);
                        const parsed = parseInt(raw);
                        if (!isNaN(parsed) && parsed > 0) setMaxPlayers(parsed);
                      }
                    }}
                    onBlur={() => setMaxPlayersDisplay(String(maxPlayers))}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Switch checked={showRegCount} onCheckedChange={setShowRegCount} id="show-reg-count" />
                    <Label htmlFor="show-reg-count" className="text-xs text-muted-foreground cursor-pointer">
                      {(() => {
                        const sizes = allowedGroupSizes ?? [];
                        const fixed = sizes.length === 1 && sizes[0] > 1 ? sizes[0] : (sizes.length === 0 && foursomeReg && maxGroupSize === 4 ? 4 : null);
                        if (fixed) {
                          const label = fixed === 4 ? "foursome" : fixed === 3 ? "threesome" : fixed === 2 ? "twosome" : "team";
                          return `Show "X / ${Math.floor(maxPlayers / fixed)} ${label} spots filled" on public page (off by default)`;
                        }
                        return `Show "X / ${maxPlayers} spots filled" on public page (off by default)`;
                      })()}
                    </Label>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Registration Status</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Switch checked={regOpen} onCheckedChange={setRegOpen} />
                    <span className="text-sm font-medium text-foreground">
                      {regOpen ? "Registration Open" : "Registration Closed"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Toggle on = players can register. Toggle off to close registration.
                  </p>

                </div>
              </div>

              {/* Scheduled registration close */}
              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-semibold">Automatically Close Registration</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pick a date and time and registration closes on its own — no need to log in and flip the switch.
                      Guests who visit afterward see your closed-registration message instead of the form.
                    </p>
                  </div>
                  <Switch checked={autoCloseEnabled} onCheckedChange={setAutoCloseEnabled} />
                </div>

                {autoCloseEnabled && (
                  <div className="space-y-3 rounded-md border border-border bg-background p-3">
                    <div>
                      <Label className="text-xs">Close registration at (your local time)</Label>
                      <Input
                        type="datetime-local"
                        value={closeAt}
                        onChange={(e) => setCloseAt(e.target.value)}
                        className="max-w-[260px]"
                      />
                      {closeAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(closeAt).getTime() <= Date.now()
                            ? "This time is in the past — registration will close on the next check (within 5 minutes)."
                            : `Registration closes ${new Date(closeAt).toLocaleString()}.`}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs">Message shown when registration is closed</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setClosedMessage(DEFAULT_CLOSED_MESSAGE)}
                        >
                          Use template
                        </Button>
                      </div>
                      <Textarea
                        rows={4}
                        value={closedMessage}
                        onChange={(e) => setClosedMessage(e.target.value)}
                        placeholder={DEFAULT_CLOSED_MESSAGE}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank to use our default closed-registration message.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">Contact email for late requests</Label>
                        <Input
                          type="email"
                          value={closedContactEmail}
                          onChange={(e) => setClosedContactEmail(e.target.value)}
                          placeholder="organizer@example.com"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Contact phone (optional)</Label>
                        <Input
                          value={closedContactPhone}
                          onChange={(e) => setClosedContactPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch checked={closeIncludesAddons} onCheckedChange={setCloseIncludesAddons} id="close-addons" />
                      <Label htmlFor="close-addons" className="text-xs text-muted-foreground cursor-pointer">
                        Also stop add-on and side-event sales (mulligans, dinner tickets, etc.) at this time
                      </Label>
                    </div>
                  </div>
                )}
              </div>



              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-semibold">Team / Group Registration</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Let one person sign up a twosome, threesome, or foursome in a single checkout.
                      Price is per player × team size.
                    </p>
                  </div>
                  <Select
                    value={String(maxGroupSize)}
                    onValueChange={(v) => {
                      const val = parseInt(v);
                      setMaxGroupSize(val);
                      setFoursomeReg(val > 1);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Individual only</SelectItem>
                      <SelectItem value="2">Up to 2 (Twosome)</SelectItem>
                      <SelectItem value="3">Up to 3 (Threesome)</SelectItem>
                      <SelectItem value="4">Up to 4 (Foursome)</SelectItem>
                      <SelectItem value="5">Up to 5</SelectItem>
                      <SelectItem value="6">Up to 6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {maxGroupSize > 1 && (
                  <div className="rounded-md border border-border bg-background p-3 space-y-2">
                    <Label className="text-sm font-semibold">Group Sizes Shown on Public Form</Label>
                    <p className="text-xs text-muted-foreground">
                      Choose which group-size buttons appear to registrants. Leave all checked to show every option, or uncheck any you don't want (for example, show only Individual and Foursome).
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      {Array.from({ length: maxGroupSize }, (_, i) => i + 1).map((n) => {
                        const labels: Record<number, string> = { 1: "Individual", 2: "Twosome", 3: "Threesome", 4: "Foursome" };
                        const current = allowedGroupSizes ?? Array.from({ length: maxGroupSize }, (_, i) => i + 1);
                        const checked = current.includes(n);
                        return (
                          <label key={n} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const base = new Set(current);
                                if (e.target.checked) base.add(n);
                                else base.delete(n);
                                // Always keep at least one selection
                                const next = Array.from(base).sort((a, b) => a - b);
                                setAllowedGroupSizes(next.length > 0 ? next : [n]);
                              }}
                              className="h-4 w-4"
                            />
                            <span>{labels[n] || `${n} Players`}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {maxGroupSize > 1 && (
                  <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-md p-2">
                    <strong className="text-foreground">Tip:</strong> To control which fields
                    (Phone, Handicap, Shirt Size, Company, etc.) are required for <em>each</em> teammate,
                    open the <strong>Registration Form Fields</strong> tab above — every toggle applies to
                    every player on the team.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                <div>
                  <Label className="text-sm font-semibold">"Cover the Fees" Option</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Allow golfers to optionally cover the 5% platform fee and Stripe processing fee.
                    When enabled, a checkbox appears on the registration form.
                  </p>
                </div>
                <Switch checked={allowCoverFees} onCheckedChange={setAllowCoverFees} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                <div>
                  <Label className="text-sm font-semibold">Promo Code Box</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Show the promo code input on the public registration form. Disable this if you do not want participants to enter promo codes.
                  </p>
                </div>
                <Switch checked={showPromoCodeInput} onCheckedChange={setShowPromoCodeInput} />
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/20">
                <Label className="text-sm font-semibold">Captain Label (group registrations)</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Shown next to the first player on the public registration form (e.g. "Player 1 (Captain)"). Leave blank to hide.
                </p>
                <Input
                  value={captainLabel}
                  onChange={(e) => setCaptainLabel(e.target.value)}
                  placeholder="Captain"
                  maxLength={40}
                  className="max-w-xs"
                />
              </div>

              {/* Early Registration Discount */}
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-900 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-200">
                <strong>Heads up — two separate discount tools:</strong>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li><strong>Early Registration Discount</strong> (this section): an automatic time-based price drop applied to every registration before the deadline. No code required.</li>
                  <li><strong>Promo Codes</strong> (Promo Codes tab): manual codes golfers enter at checkout — or auto-apply codes you control by team size. Use these for partner/sponsor discounts that aren't time-based.</li>
                </ul>
                You can use one or both. Promo codes apply on top of whichever price (regular or early-bird) is active at checkout.
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-semibold">Early Registration Discount</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Offer a lower price to golfers who register before a deadline. After the deadline, the regular registration fee applies.
                    </p>
                  </div>
                  <Switch checked={earlyEnabled} onCheckedChange={setEarlyEnabled} />
                </div>
                {earlyEnabled && (
                  <div className="space-y-4 pt-2">
                    <p className="text-xs text-muted-foreground">
                      Set the early-bird price per player for individual registrations, plus optional <strong>team-total</strong> prices for 2-player and 4-player team registrations. Leave team fields blank to fall back to per-player × team size.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Early Bird Price — Per Player ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={earlyPriceDisplay}
                          onChange={(e) => setEarlyPriceDisplay(e.target.value)}
                          placeholder="e.g. 125.00"
                        />
                      </div>
                      <div>
                        <Label>Discount Expires On</Label>
                        <Input
                          type="datetime-local"
                          value={earlyExpires}
                          onChange={(e) => setEarlyExpires(e.target.value)}
                        />
                      </div>
                      {maxGroupSize >= 2 && (
                        <div>
                          <Label>Early Bird — 2-Player Team Total ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={earlyPrice2Display}
                            onChange={(e) => setEarlyPrice2Display(e.target.value)}
                            placeholder="e.g. 240.00"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Total price for a 2-player team (not per player).</p>
                        </div>
                      )}
                      {maxGroupSize >= 4 && (
                        <div>
                          <Label>Early Bird — 4-Player Team Total ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={earlyPrice4Display}
                            onChange={(e) => setEarlyPrice4Display(e.target.value)}
                            placeholder="e.g. 460.00"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Total price for a 4-player team (not per player).</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cash payment registration */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                <div>
                  <Label className="text-sm font-semibold">Allow Cash Payment Registrations</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lets you add players who will pay with cash or check on the day of the event. When adding a player, you'll be able to choose Cash or Check as the payment method and mark payment received later.
                  </p>
                </div>
                <Switch checked={allowCash} onCheckedChange={setAllowCash} />
              </div>


              {/* Public Registration Page Content */}
              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Registration Intro Text</Label>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                    Shown directly below the "REGISTRATION" heading on your public tournament page. Leave blank to use the default ("Register your foursome below to secure your spots." / "Fill out the form below to secure your spot.").
                  </p>
                  <RichTextEditor
                    value={registrationIntroHtml}
                    onChange={setRegistrationIntroHtml}
                    placeholder="e.g. Use promo code EARLY50 at checkout to save $50 per player!"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Promotional Info (shown below the registration form)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                    Optional rich-text block displayed under the registration form. Use it to highlight promo codes, special pricing, what's included, or anything else you want viewers to see.
                  </p>
                  <RichTextEditor
                    value={registrationPromoHtml}
                    onChange={setRegistrationPromoHtml}
                    placeholder="e.g. 🎉 Use promo code SUMMER25 for 25% off! Includes lunch, range balls, and cart."
                  />
                </div>
              </div>

              {/* Donation Prompt */}
              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Donation Prompt
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ask registrants to add a donation during checkout. They can pick a preset amount or enter their own.
                    </p>
                  </div>
                  <Switch checked={donationEnabled} onCheckedChange={setDonationEnabled} />
                </div>

                {donationEnabled && (
                  <div className="space-y-4 pt-1">
                    <div>
                      <Label className="text-xs">Prompt Title</Label>
                      <Input
                        value={donationTitle}
                        onChange={(e) => setDonationTitle(e.target.value)}
                        placeholder="Support Our Mission"
                        maxLength={120}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Prompt Description</Label>
                      <Textarea
                        value={donationDescription}
                        onChange={(e) => setDonationDescription(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Help us provide scholarships to deserving students. Your donation makes a direct impact."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Preset Donation Amounts (comma-separated dollar values)</Label>
                      <Input
                        value={donationPresetsDisplay}
                        onChange={(e) => setDonationPresetsDisplay(e.target.value)}
                        placeholder="10, 25, 50, 100, 250, 500"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        These appear as one-tap buttons in the donation prompt.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Switch checked={donationAllowCustom} onCheckedChange={setDonationAllowCustom} />
                      <div className="flex-1">
                        <Label className="text-sm font-semibold cursor-pointer block">Allow custom donation amount</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Registrants can type in their own amount in addition to the presets.
                        </p>
                      </div>
                    </div>
                    {donationAllowCustom && (
                      <div>
                        <Label className="text-xs">Custom Amount Label</Label>
                        <Input
                          value={donationCustomLabel}
                          onChange={(e) => setDonationCustomLabel(e.target.value)}
                          placeholder="Enter your own amount"
                          maxLength={80}
                        />
                      </div>
                    )}
                    <div className="rounded-md border border-dashed border-border p-3 bg-background/60 text-xs text-muted-foreground">
                      <strong className="text-foreground">💡 Recommended description:</strong> "Help us provide scholarships to deserving students. Every dollar supports a student's future — tuition, books, and mentorship programs."
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={saveSettings} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Settings
              </Button>
            </motion.div>

            {selectedTournament && (
              <div className="mt-6">
                <GroupRegistrationSettings tournamentId={selectedTournament} />
              </div>
            )}
          </TabsContent>


          {/* ── Tiers Tab ── */}
          <TabsContent value="tiers">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg border border-border p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-display font-bold text-foreground">Registration Tiers</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Create different registration categories (e.g., Pro, Amateur, Celebrity). Each tier can have its own pricing,
                capacity limit, and eligibility requirements shown to registrants before they select.
              </p>

              {tiers.length > 0 && (
                <div className="space-y-3">
                  {tiers.map((tier) => (
                    <div key={tier.id} className="p-4 rounded-lg border border-border space-y-2">
                      {editingTierId === tier.id ? (
                        <div className="space-y-3">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <Input value={editTierName} onChange={(e) => setEditTierName(e.target.value)} placeholder="Tier name" maxLength={100} />
                            <Input type="number" min="0" step="0.01" value={editTierPrice} onChange={(e) => setEditTierPrice(e.target.value)} placeholder="Price ($)" />
                          </div>
                          <Textarea value={editTierDesc} onChange={(e) => setEditTierDesc(e.target.value)} rows={2} maxLength={500} placeholder="Description" />
                          <Textarea value={editTierEligibility} onChange={(e) => setEditTierEligibility(e.target.value)} rows={2} maxLength={1000} placeholder="Eligibility requirements" />
                          <div className="flex items-center gap-3">
                            <Input type="number" min="1" value={editTierMax} onChange={(e) => setEditTierMax(e.target.value)} placeholder="Max registrants (optional)" className="max-w-[200px]" />
                            <Button size="sm" onClick={() => saveEditTier(tier.id!)} disabled={!editTierName.trim()}>
                              <Save className="h-3.5 w-3.5 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditTier}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Switch checked={tier.is_active} onCheckedChange={() => toggleTier(tier)} />
                              <div>
                                <span className="font-semibold text-foreground text-sm">{tier.name}</span>
                                {tier.description && <p className="text-xs text-muted-foreground">{tier.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                {tier.price_cents > 0 ? `$${(tier.price_cents / 100).toFixed(2)}` : "Free"}
                              </Badge>
                              {tier.max_registrants && (
                                <span className="text-xs text-muted-foreground">{tier.max_registrants} max</span>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => startEditTier(tier)} className="text-muted-foreground hover:text-foreground" title="Edit tier">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteTier(tier.id!)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {tier.eligibility_description && (
                            <div className="flex items-start gap-2 bg-muted/30 rounded-md p-2.5 ml-10">
                              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-muted-foreground">{tier.eligibility_description}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Add a Registration Tier</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Tier name (e.g., Pro Division)"
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                    maxLength={100}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price ($) — 0 for free"
                    value={newTierPrice}
                    onChange={(e) => setNewTierPrice(e.target.value)}
                  />
                </div>
                <Textarea
                  placeholder="Description (shown on registration page)"
                  value={newTierDesc}
                  onChange={(e) => setNewTierDesc(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
                <Textarea
                  placeholder="Eligibility requirements (shown in a popup before registrant selects this tier)"
                  value={newTierEligibility}
                  onChange={(e) => setNewTierEligibility(e.target.value)}
                  rows={2}
                  maxLength={1000}
                />
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Max registrants (optional)"
                    value={newTierMax}
                    onChange={(e) => setNewTierMax(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <Button onClick={addTier} disabled={!newTierName.trim()}>
                    <Plus className="h-4 w-4 mr-1" /> Add Tier
                  </Button>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Flights Tab ── */}
          <TabsContent value="flights">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg border border-border p-6">
              <FlightsManager tournamentId={selectedTournament} />
            </motion.div>
          </TabsContent>

          {/* ── Fields Tab ── */}
          <TabsContent value="fields">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Default / preset toggles */}
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ToggleLeft className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-display font-bold text-foreground">Standard Fields</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Name and Email are always required. Toggle additional fields on or off.
                </p>
                <div className="space-y-3">
                  {fields.filter((f) => f.is_default).map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <Switch checked={field.is_enabled} onCheckedChange={() => toggleField(field)} />
                        <span className="font-medium text-foreground text-sm">{field.label}</span>
                        <Badge variant="outline" className="text-[10px]">{field.field_type}</Badge>
                      </div>
                      {field.is_enabled && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Required</span>
                          <Switch checked={field.is_required} onCheckedChange={() => toggleFieldRequired(field)} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom fields */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-display font-bold text-foreground mb-4">Custom Questions</h2>

                {fields.filter((f) => !f.is_default).length > 0 && (
                  <div className="space-y-3 mb-6">
                    {fields.filter((f) => !f.is_default).map((field) => (
                      <div key={field.id} className="p-3 rounded-lg border border-border space-y-2">
                        {editingFieldId === field.id ? (
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-3 gap-3">
                              <Input
                                value={editFieldLabel}
                                onChange={(e) => setEditFieldLabel(e.target.value)}
                                placeholder="Question label"
                                maxLength={100}
                              />
                              <Select value={editFieldType} onValueChange={setEditFieldType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="dropdown">Dropdown</SelectItem>
                                  <SelectItem value="checkbox">Checkbox</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => saveEditField(field.id!)} disabled={!editFieldLabel.trim()}>
                                  <Save className="h-3.5 w-3.5 mr-1" /> Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditField}>Cancel</Button>
                              </div>
                            </div>
                            {editFieldType === "dropdown" && (
                              <DropdownOptionsEditor options={editFieldOptions} onChange={setEditFieldOptions} />
                            )}

                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-foreground text-sm">{field.label}</span>
                              <Badge variant="outline" className="text-[10px]">{field.field_type}</Badge>
                              {field.is_required && <Badge variant="secondary" className="text-[10px]">Required</Badge>}
                              {field.options && (
                                <span className="text-xs text-muted-foreground">{(field.options as string[]).join(", ")}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">Required</span>
                                <Switch checked={field.is_required} onCheckedChange={() => toggleFieldRequired(field)} />
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => startEditField(field)} className="text-muted-foreground hover:text-foreground" title="Edit field">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteField(field.id!)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Add a Custom Question</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Input
                      placeholder="Question label"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      maxLength={100}
                    />
                    <Select value={newFieldType} onValueChange={setNewFieldType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="dropdown">Dropdown</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addCustomField} disabled={!newFieldLabel.trim()}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                  {newFieldType === "dropdown" && (
                    <DropdownOptionsEditor options={newFieldOptions} onChange={setNewFieldOptions} />
                  )}

                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Add-ons Tab ── */}
          <TabsContent value="addons">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg border border-border p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-display font-bold text-foreground">Registration Add-ons</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Offer optional add-ons during checkout (e.g., Lunch Package, Mulligan Pack, Raffle Tickets).
              </p>

              <AddonDisplaySettings tournamentId={selectedTournament} demoGuard={demoGuard} />


              {addons.length > 0 && (
                <div className="space-y-3">
                  {addons.map((addon) => (
                    <div key={addon.id} className="p-3 rounded-lg border border-border">
                      {editingAddonId === addon.id ? (
                        <div className="space-y-3">
                          <div className="grid sm:grid-cols-3 gap-3">
                            <Input value={editAddonName} onChange={(e) => setEditAddonName(e.target.value)} placeholder="Name" maxLength={100} />
                            <Input type="number" min="0" step="0.01" value={editAddonPrice} onChange={(e) => setEditAddonPrice(e.target.value)} placeholder="Price ($)" />
                            <Input type="number" min="1" max="50" value={editAddonMaxQty} onChange={(e) => setEditAddonMaxQty(e.target.value)} placeholder="Max per golfer" />
                          </div>
                          <Textarea value={editAddonDesc} onChange={(e) => setEditAddonDesc(e.target.value)} rows={2} maxLength={500} placeholder="Description (optional)" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEditAddon(addon.id!)} disabled={!editAddonName.trim()}>
                              <Save className="h-3.5 w-3.5 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditAddon}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Switch checked={addon.is_active} onCheckedChange={() => toggleAddon(addon)} />
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{addon.name}</p>
                              {addon.description && <p className="text-xs text-muted-foreground truncate">{addon.description}</p>}
                            </div>
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                              ${(addon.price_cents / 100).toFixed(2)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`max-${addon.id}`} className="text-xs text-muted-foreground whitespace-nowrap">Max/golfer</Label>
                            <Input
                              id={`max-${addon.id}`}
                              type="number"
                              min="1"
                              max="50"
                              value={addon.max_per_golfer ?? 1}
                              onChange={(e) => updateAddonMaxQty(addon, e.target.value)}
                              className="h-8 w-16"
                            />
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => startEditAddon(addon)} className="text-muted-foreground hover:text-foreground" title="Edit add-on">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteAddon(addon.id!)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">New Add-on</p>
                <div className="grid sm:grid-cols-4 gap-3">
                  <Input
                    placeholder="Name (e.g., Lunch Package)"
                    value={newAddonName}
                    onChange={(e) => setNewAddonName(e.target.value)}
                    maxLength={100}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price ($)"
                    value={newAddonPrice}
                    onChange={(e) => setNewAddonPrice(e.target.value)}
                  />
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="Max per golfer"
                    value={newAddonMaxQty}
                    onChange={(e) => setNewAddonMaxQty(e.target.value)}
                  />
                  <Button onClick={addAddon} disabled={!newAddonName.trim()}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <Textarea
                  placeholder="Description (optional)"
                  value={newAddonDesc}
                  onChange={(e) => setNewAddonDesc(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Promo Codes Tab ── */}
          <TabsContent value="promos">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg border border-border p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-display font-bold text-foreground">Promo Codes</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Create discount codes specific to this tournament's registration.
              </p>
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-900 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-200">
                <strong>Promo Codes vs. Early Bird:</strong> Promo Codes (here) are manual or auto-apply codes for partner/sponsor or team-size discounts. For an automatic time-based price drop for everyone before a deadline, use the <strong>Early Registration Discount</strong> on the <em>Settings</em> tab instead. Both can be active at the same time.
              </div>


              {promoCodes.length > 0 && (
                <div className="space-y-4">
                  {promoCodes.map((promo) => {
                    const expired = !!promo.expires_at && new Date(promo.expires_at) < new Date();
                    return (
                      <div key={promo.id} className="p-4 rounded-lg border border-border space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Switch checked={promo.is_active} onCheckedChange={() => togglePromo(promo)} />
                            <span className="font-mono font-bold text-foreground text-sm">{promo.code}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {promo.discount_type === "percent" ? `${promo.discount_value}% off` : `$${promo.discount_value} off`}
                            </Badge>
                            {promo.auto_apply && <Badge className="text-[10px]">Auto-apply</Badge>}
                            {promo.applies_to && promo.applies_to !== "all" && (
                              <Badge variant="secondary" className="text-[10px]">
                                {promo.applies_to === "individual" ? "Individual"
                                  : promo.applies_to === "team_2" ? "2-Player Team"
                                  : promo.applies_to === "team_4" ? "4-Player Team"
                                  : `Custom: ${promo.applies_to_custom || ""}`}
                              </Badge>
                            )}
                            {promo.max_uses && (
                              <span className="text-xs text-muted-foreground">
                                {promo.current_uses}/{promo.max_uses} used
                              </span>
                            )}
                            {expired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                            {!promo.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deletePromo(promo.id!)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Applies To</Label>
                            <Select value={promo.applies_to || "all"} onValueChange={(v) => updatePromoField(promo, { applies_to: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All registrations</SelectItem>
                                <SelectItem value="individual">Individual</SelectItem>
                                <SelectItem value="team_2">2-Player Team</SelectItem>
                                <SelectItem value="team_4">4-Player Team</SelectItem>
                                <SelectItem value="custom">Custom (tier name)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {promo.applies_to === "custom" && (
                            <div>
                              <Label className="text-xs">Custom value</Label>
                              <Input
                                value={promo.applies_to_custom || ""}
                                onChange={(e) => updatePromoField(promo, { applies_to_custom: e.target.value })}
                                placeholder="Tier name to match"
                              />
                            </div>
                          )}
                          <div>
                            <Label className="text-xs">Expiration</Label>
                            <Input
                              type="datetime-local"
                              value={promo.expires_at ? new Date(promo.expires_at).toISOString().slice(0, 16) : ""}
                              onChange={(e) => updatePromoField(promo, { expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-5">
                            <Switch checked={!!promo.auto_apply} onCheckedChange={(v) => updatePromoField(promo, { auto_apply: v })} />
                            <Label className="text-xs">Auto-apply</Label>
                          </div>
                        </div>
                        <div className="space-y-2 border-t pt-3">
                          <div className="flex items-center gap-2">
                            <Switch checked={!!promo.alert_enabled} onCheckedChange={(v) => updatePromoField(promo, { alert_enabled: v, show_alert_at_checkout: v })} />
                            <Label className="text-xs">Show alert at checkout</Label>
                            {promo.alert_enabled && (
                              <>
                                <div className="ml-4" />
                                <Switch checked={promo.show_alert_on_top !== false} onCheckedChange={(v) => updatePromoField(promo, { show_alert_on_top: v })} />
                                <Label className="text-xs">Pin alert to top</Label>
                              </>
                            )}
                          </div>
                          {promo.alert_enabled && (
                            <RichTextEditor
                              value={promo.alert_html || ""}
                              onChange={(html) => updatePromoField(promo, { alert_html: html })}
                              placeholder="🎉 Special discount message…"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">New Promo Code</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Input
                    placeholder="Code (e.g., EARLYBIRD)"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                    maxLength={30}
                    className="font-mono"
                  />
                  <Select value={newPromoType} onValueChange={setNewPromoType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage Off</SelectItem>
                      <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    placeholder={newPromoType === "percent" ? "Discount %" : "Discount $"}
                    value={newPromoValue}
                    onChange={(e) => setNewPromoValue(e.target.value)}
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Max uses (optional)"
                    value={newPromoMaxUses}
                    onChange={(e) => setNewPromoMaxUses(e.target.value)}
                  />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Applies To</Label>
                    <Select value={newPromoAppliesTo} onValueChange={setNewPromoAppliesTo}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All registrations</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="team_2">2-Player Team</SelectItem>
                        <SelectItem value="team_4">4-Player Team</SelectItem>
                        <SelectItem value="custom">Custom (tier name)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newPromoAppliesTo === "custom" && (
                    <div>
                      <Label className="text-xs">Custom value</Label>
                      <Input value={newPromoAppliesCustom} onChange={(e) => setNewPromoAppliesCustom(e.target.value)} placeholder="Tier name to match" />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Expiration (optional)</Label>
                    <Input type="datetime-local" value={newPromoExpires} onChange={(e) => setNewPromoExpires(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Switch checked={newPromoAutoApply} onCheckedChange={setNewPromoAutoApply} />
                    <Label className="text-xs">Auto-apply (no manual entry)</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={newPromoAlertEnabled} onCheckedChange={setNewPromoAlertEnabled} />
                    <Label className="text-xs">Show special alert at checkout</Label>
                    {newPromoAlertEnabled && (
                      <>
                        <div className="ml-4" />
                        <Switch checked={newPromoAlertOnTop} onCheckedChange={setNewPromoAlertOnTop} />
                        <Label className="text-xs">Pin alert to top</Label>
                      </>
                    )}
                  </div>
                  {newPromoAlertEnabled && (
                    <RichTextEditor
                      value={newPromoAlertHtml}
                      onChange={setNewPromoAlertHtml}
                      placeholder="🎉 Early Bird Discount! Save 20% when you register as a 2-player team."
                    />
                  )}
                </div>
                <Button onClick={addPromoCode} disabled={!newPromoCode.trim() || !newPromoValue}>
                  <Plus className="h-4 w-4 mr-1" /> Create Code
                </Button>
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Submissions Tab ── */}
          <TabsContent value="submissions">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              {selectedTournament ? (
                <RegistrationSubmissions tournamentId={selectedTournament} fields={fields as any} />
              ) : (
                <p className="text-muted-foreground">Select a tournament to view submissions.</p>
              )}
            </motion.div>
          </TabsContent>

          {/* ── Refunds Tab ── */}
          <TabsContent value="refunds">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="bg-card rounded-lg border border-border p-6">
                <RefundPolicySettings tournamentId={selectedTournament} demoGuard={demoGuard} />
              </div>
              <div className="bg-card rounded-lg border border-border p-6">
                <RefundManagement tournamentId={selectedTournament} demoGuard={demoGuard} />
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      )}
      <StickySaveBar onSave={() => {}} />
    </div>
  );
};

export default Registration;
