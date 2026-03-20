import { useState, useEffect, useCallback } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
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
} from "lucide-react";
import RefundPolicySettings from "@/components/dashboard/RefundPolicySettings";
import RefundManagement from "@/components/dashboard/RefundManagement";
import { toast } from "sonner";

/* ── types ── */
interface Tournament {
  id: string;
  title: string;
  registration_fee_cents: number | null;
  registration_open: boolean | null;
  max_players: number | null;
  foursome_registration: boolean;
  max_group_size: number;
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
  const { demoGuard } = useDemoMode();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
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
  const [maxPlayersDisplay, setMaxPlayersDisplay] = useState<string>("144");
  const [maxPlayers, setMaxPlayers] = useState<number>(144);
  const [foursomeReg, setFoursomeReg] = useState<boolean>(false);
  const [maxGroupSize, setMaxGroupSize] = useState<number>(1);

  /* fetch tournaments */
  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, registration_fee_cents, registration_open, max_players, foursome_registration, max_group_size")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const t = (data as Tournament[]) || [];
        setTournaments(t);
        if (t.length > 0) setSelectedTournament(t[0].id);
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
    const { error } = await supabase
      .from("tournaments")
      .update({
        registration_fee_cents: feeCents,
        registration_open: regOpen,
        max_players: maxPlayers,
        foursome_registration: foursomeReg,
        max_group_size: maxGroupSize,
      } as any)
      .eq("id", selectedTournament);
    if (error) toast.error(error.message);
    else {
      toast.success("Registration settings saved!");
      setTournaments((prev) =>
        prev.map((t) =>
          t.id === selectedTournament
            ? { ...t, registration_fee_cents: feeCents, registration_open: regOpen, max_players: maxPlayers, foursome_registration: foursomeReg, max_group_size: maxGroupSize }
            : t,
        ),
      );
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
  const [newFieldOptions, setNewFieldOptions] = useState("");

  const addCustomField = async () => {
    if (!newFieldLabel.trim()) return;
    const payload: any = {
      tournament_id: selectedTournament,
      label: newFieldLabel.trim(),
      field_type: newFieldType,
      options: newFieldType === "dropdown" ? newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean) : null,
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
      setNewFieldOptions("");
      toast.success("Custom field added!");
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

  const addAddon = async () => {
    if (!newAddonName.trim()) return;
    const payload: any = {
      tournament_id: selectedTournament,
      name: newAddonName.trim(),
      description: newAddonDesc.trim() || null,
      price_cents: Math.round(parseFloat(newAddonPrice || "0") * 100),
      is_active: true,
      sort_order: addons.length,
    };
    const { data, error } = await supabase.from("tournament_registration_addons").insert(payload).select("*").single();
    if (error) toast.error(error.message);
    else {
      setAddons((prev) => [...prev, data as Addon]);
      setNewAddonName("");
      setNewAddonDesc("");
      setNewAddonPrice("");
      toast.success("Add-on created!");
    }
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

  const addPromoCode = async () => {
    if (!newPromoCode.trim() || !newPromoValue) return;
    const payload: any = {
      tournament_id: selectedTournament,
      code: newPromoCode.trim().toUpperCase(),
      discount_type: newPromoType,
      discount_value: parseFloat(newPromoValue),
      max_uses: newPromoMaxUses ? parseInt(newPromoMaxUses) : null,
      is_active: true,
    };
    const { data, error } = await supabase.from("tournament_promo_codes").insert(payload).select("*").single();
    if (error) toast.error(error.message);
    else {
      setPromoCodes((prev) => [data as PromoCode, ...prev]);
      setNewPromoCode("");
      setNewPromoValue("");
      setNewPromoMaxUses("");
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
          <h1 className="text-3xl font-display font-bold text-foreground">Registration</h1>
          <p className="text-muted-foreground mt-1">Configure fields, fees, add-ons, and promo codes.</p>
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
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="tiers">Tiers</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="addons">Add-ons</TabsTrigger>
            <TabsTrigger value="promos">Promo Codes</TabsTrigger>
            <TabsTrigger value="refunds" className="flex items-center gap-1">
              <RotateCcw className="h-3.5 w-3.5" />
              Refunds
            </TabsTrigger>
          </TabsList>

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
                    type="number"
                    min="0"
                    step="0.01"
                    value={feeDisplay}
                    onChange={(e) => {
                      setFeeDisplay(e.target.value);
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed)) setFeeCents(Math.round(parsed * 100));
                    }}
                    onBlur={() => setFeeDisplay((feeCents / 100).toFixed(2))}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Set to $0 for free registration</p>
                </div>
                <div>
                  <Label>Max Players</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxPlayersDisplay}
                    onChange={(e) => {
                      setMaxPlayersDisplay(e.target.value);
                      const parsed = parseInt(e.target.value);
                      if (!isNaN(parsed) && parsed > 0) setMaxPlayers(parsed);
                    }}
                    onBlur={() => setMaxPlayersDisplay(String(maxPlayers))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Registration Status</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Switch checked={regOpen} onCheckedChange={setRegOpen} />
                    <span className="text-sm font-medium text-foreground">{regOpen ? "Open" : "Closed"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                <div>
                  <Label className="text-sm font-semibold">Group Registration</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Allow players to register multiple players at once</p>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={String(maxGroupSize)}
                    onValueChange={(v) => {
                      const val = parseInt(v);
                      setMaxGroupSize(val);
                      setFoursomeReg(val > 1);
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Individual Only</SelectItem>
                      <SelectItem value="2">Up to 2</SelectItem>
                      <SelectItem value="3">Up to 3</SelectItem>
                      <SelectItem value="4">Up to 4 (Foursome)</SelectItem>
                      <SelectItem value="5">Up to 5</SelectItem>
                      <SelectItem value="6">Up to 6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={saveSettings} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Settings
              </Button>
            </motion.div>
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
                      <div key={field.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
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
                          <Button variant="ghost" size="icon" onClick={() => deleteField(field.id!)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
                    <Input
                      placeholder="Options (comma-separated): Option A, Option B"
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                      maxLength={500}
                    />
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

              {addons.length > 0 && (
                <div className="space-y-3">
                  {addons.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <Switch checked={addon.is_active} onCheckedChange={() => toggleAddon(addon)} />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{addon.name}</p>
                          {addon.description && <p className="text-xs text-muted-foreground truncate">{addon.description}</p>}
                        </div>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          ${(addon.price_cents / 100).toFixed(2)}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteAddon(addon.id!)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">New Add-on</p>
                <div className="grid sm:grid-cols-3 gap-3">
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

              {promoCodes.length > 0 && (
                <div className="space-y-3">
                  {promoCodes.map((promo) => (
                    <div key={promo.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Switch checked={promo.is_active} onCheckedChange={() => togglePromo(promo)} />
                        <span className="font-mono font-bold text-foreground text-sm">{promo.code}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {promo.discount_type === "percent" ? `${promo.discount_value}% off` : `$${promo.discount_value} off`}
                        </Badge>
                        {promo.max_uses && (
                          <span className="text-xs text-muted-foreground">
                            {promo.current_uses}/{promo.max_uses} used
                          </span>
                        )}
                        {!promo.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deletePromo(promo.id!)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
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
                <Button onClick={addPromoCode} disabled={!newPromoCode.trim() || !newPromoValue}>
                  <Plus className="h-4 w-4 mr-1" /> Create Code
                </Button>
              </div>
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
    </div>
  );
};

export default Registration;
