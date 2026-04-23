import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, UserPlus, Trash2, Heart, Info, Plus, Minus, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

interface AddonRow {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  max_per_golfer: number;
}

const playerSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  handicap: z.union([z.number().int().min(0).max(54), z.nan()]).optional(),
  shirt_size: z.string().optional().or(z.literal("")),
  dietary_restrictions: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

interface RegFieldConfig {
  id: string; label: string; field_type: string; options: string[] | null;
  is_required: boolean; is_enabled: boolean; is_default: boolean; sort_order: number;
}

interface RegistrationFormProps {
  tournamentId: string;
  primaryColor: string;
  secondaryColor: string;
  registrationFeeCents?: number;
  foursomeMode?: boolean;
  maxGroupSize?: number;
  isNonprofit?: boolean;
  nonprofitName?: string;
  ein?: string;
  platformFeeRate?: number;
  passFeesToRegistrants?: boolean;
  allowCoverFees?: boolean;
  tiers?: { id: string; name: string; description: string | null; eligibility_description: string | null; price_cents: number; max_registrants: number | null }[];
  fields?: RegFieldConfig[];
}

const emptyPlayer = () => ({
  first_name: "", last_name: "", email: "", phone: "",
  handicap: "", shirt_size: "", dietary_restrictions: "", notes: "",
  company: "", skill_level: "",
});

type PlayerForm = ReturnType<typeof emptyPlayer>;

const PlayerFields = ({
  player, index, onChange, errors, showRemove, onRemove, fields,
}: {
  player: PlayerForm; index: number; onChange: (p: PlayerForm) => void;
  errors: Record<string, string>; showRemove?: boolean; onRemove?: () => void;
  fields?: RegFieldConfig[];
}) => {
  const prefix = index > 0 ? `p${index}_` : "";

  // Map default field labels to player form keys
  const defaultFieldMap: Record<string, keyof PlayerForm> = {
    "Phone": "phone",
    "Handicap": "handicap",
    "Shirt Size": "shirt_size",
    "Dietary Restrictions": "dietary_restrictions",
    "Company / Organization": "company",
    "Skill Level": "skill_level",
  };

  // If fields config provided, check which default fields are enabled
  const isFieldEnabled = (label: string) => {
    if (!fields || fields.length === 0) return true; // no config = show all defaults
    const f = fields.find((fld) => fld.label.toLowerCase() === label.toLowerCase());
    return f ? f.is_enabled : false;
  };

  const isFieldRequired = (label: string) => {
    if (!fields || fields.length === 0) return false;
    const f = fields.find((fld) => fld.label.toLowerCase() === label.toLowerCase());
    return f ? f.is_required : false;
  };

  // Custom fields (non-default)
  const customFields = (fields || []).filter((f) => !f.is_default && f.is_enabled);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          {index === 0 ? "Player 1 (Captain)" : `Player ${index + 1}`}
        </h4>
        {showRemove && onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-destructive h-7 px-2">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>First Name *</Label>
          <Input value={player.first_name} onChange={(e) => onChange({ ...player, first_name: e.target.value })} placeholder="John" maxLength={100} />
          {errors[`${prefix}first_name`] && <p className="text-xs text-destructive mt-1">{errors[`${prefix}first_name`]}</p>}
        </div>
        <div>
          <Label>Last Name *</Label>
          <Input value={player.last_name} onChange={(e) => onChange({ ...player, last_name: e.target.value })} placeholder="Doe" maxLength={100} />
          {errors[`${prefix}last_name`] && <p className="text-xs text-destructive mt-1">{errors[`${prefix}last_name`]}</p>}
        </div>
      </div>
      <div>
        <Label>Email *</Label>
        <Input type="email" value={player.email} onChange={(e) => onChange({ ...player, email: e.target.value })} placeholder="john@example.com" maxLength={255} />
        {errors[`${prefix}email`] && <p className="text-xs text-destructive mt-1">{errors[`${prefix}email`]}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {isFieldEnabled("Phone") && (
          <div>
            <Label>Phone{isFieldRequired("Phone") ? " *" : ""}</Label>
            <Input value={player.phone} onChange={(e) => onChange({ ...player, phone: e.target.value })} placeholder="(555) 123-4567" maxLength={20} />
            {errors[`${prefix}phone`] && <p className="text-xs text-destructive mt-1">{errors[`${prefix}phone`]}</p>}
          </div>
        )}
        {isFieldEnabled("Handicap") && (
          <div>
            <Label>Handicap{isFieldRequired("Handicap") ? " *" : ""}</Label>
            <Input type="number" min="0" max="54" value={player.handicap} onChange={(e) => onChange({ ...player, handicap: e.target.value })} placeholder="e.g. 15" />
            {errors[`${prefix}handicap`] && <p className="text-xs text-destructive mt-1">{errors[`${prefix}handicap`]}</p>}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {isFieldEnabled("Shirt Size") && (
          <div>
            <Label>Shirt Size{isFieldRequired("Shirt Size") ? " *" : ""}</Label>
            <Select value={player.shirt_size} onValueChange={(v) => onChange({ ...player, shirt_size: v })}>
              <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
              <SelectContent>
                {(() => {
                  const f = (fields || []).find((fld) => fld.label.toLowerCase() === "shirt size");
                  const opts = f?.options && Array.isArray(f.options) && f.options.length > 0 ? f.options : ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
                  return opts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>);
                })()}
              </SelectContent>
            </Select>
            {errors[`${prefix}shirt_size`] && <p className="text-xs text-destructive mt-1">{errors[`${prefix}shirt_size`]}</p>}
          </div>
        )}
        {isFieldEnabled("Dietary Restrictions") && (
          <div>
            <Label>Dietary Restrictions{isFieldRequired("Dietary Restrictions") ? " *" : ""}</Label>
            <Input value={player.dietary_restrictions} onChange={(e) => onChange({ ...player, dietary_restrictions: e.target.value })} placeholder="e.g. Vegetarian" maxLength={500} />
            {errors[`${prefix}dietary_restrictions`] && <p className="text-xs text-destructive mt-1">{errors[`${prefix}dietary_restrictions`]}</p>}
          </div>
        )}
      </div>
      {/* Company / Organization & Skill Level */}
      <div className="grid grid-cols-2 gap-4">
        {isFieldEnabled("Company / Organization") && (
          <div>
            <Label>Company / Organization{isFieldRequired("Company / Organization") ? " *" : ""}</Label>
            <Input value={player.company} onChange={(e) => onChange({ ...player, company: e.target.value })} placeholder="e.g. Acme Corp" maxLength={200} />
            {errors[`${prefix}company`] && <p className="text-xs text-destructive mt-1">{errors[`${prefix}company`]}</p>}
          </div>
        )}
        {isFieldEnabled("Skill Level") && (
          <div>
            <Label>Skill Level{isFieldRequired("Skill Level") ? " *" : ""}</Label>
            <Select value={player.skill_level} onValueChange={(v) => onChange({ ...player, skill_level: v })}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                {(() => {
                  const f = (fields || []).find((fld) => fld.label.toLowerCase() === "skill level");
                  const opts = f?.options && Array.isArray(f.options) && f.options.length > 0 ? f.options : ["Beginner", "Intermediate", "Advanced", "Scratch"];
                  return opts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>);
                })()}
              </SelectContent>
            </Select>
            {errors[`${prefix}skill_level`] && <p className="text-xs text-destructive mt-1">{errors[`${prefix}skill_level`]}</p>}
          </div>
        )}
      </div>
      {/* Custom fields */}
      {customFields.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {customFields.map((cf) => {
            const key = `custom_${cf.id}`;
            return (
              <div key={cf.id}>
                <Label>{cf.label}{cf.is_required ? " *" : ""}</Label>
                {cf.field_type === "dropdown" && cf.options ? (
                  <Select value={(player as any)[key] || ""} onValueChange={(v) => onChange({ ...player, [key]: v })}>
                    <SelectTrigger><SelectValue placeholder={`Select ${cf.label}`} /></SelectTrigger>
                    <SelectContent>
                      {cf.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : cf.field_type === "number" ? (
                  <Input type="number" value={(player as any)[key] || ""} onChange={(e) => onChange({ ...player, [key]: e.target.value })} placeholder={cf.label} />
                ) : (
                  <Input value={(player as any)[key] || ""} onChange={(e) => onChange({ ...player, [key]: e.target.value })} placeholder={cf.label} maxLength={500} />
                )}
                {errors[`${prefix}${key}`] && <p className="text-xs text-destructive mt-1">{errors[`${prefix}${key}`]}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const RegistrationForm = ({ tournamentId, primaryColor, secondaryColor, registrationFeeCents = 0, foursomeMode = false, maxGroupSize = foursomeMode ? 4 : 1, isNonprofit = false, nonprofitName, ein, platformFeeRate = 0.05, passFeesToRegistrants = false, allowCoverFees = true, tiers = [], fields = [] }: RegistrationFormProps) => {
  const [players, setPlayers] = useState<PlayerForm[]>([emptyPlayer()]);
  const [groupNotes, setGroupNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [coverFees, setCoverFees] = useState(passFeesToRegistrants);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showEligibility, setShowEligibility] = useState<string | null>(null);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});

  // Load active add-ons for this tournament
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("tournament_registration_addons")
      .select("id, name, description, price_cents, max_per_golfer")
      .eq("tournament_id", tournamentId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setAddons((data as AddonRow[]) || []);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

  const allowGroup = maxGroupSize > 1;
  const activeFee = selectedTier
    ? (tiers.find(t => t.id === selectedTier)?.price_cents || 0)
    : registrationFeeCents;
  const playerCount = allowGroup ? players.length : 1;
  const baseRegistrationCents = activeFee ? activeFee * playerCount : 0;
  // Add-on totals (qty is per-golfer; total = qty * playerCount * price)
  const addonTotalCents = addons.reduce((sum, a) => {
    const qty = addonQty[a.id] || 0;
    return sum + qty * playerCount * a.price_cents;
  }, 0);
  const baseTotalCents = baseRegistrationCents + addonTotalCents;
  const hasFee = baseTotalCents > 0;
  const platformFeeCents = Math.round(baseTotalCents * platformFeeRate);
  // Stripe fee: 2.9% + $0.30 per transaction (on total including platform fee)
  const stripeFee = baseTotalCents > 0 ? Math.round((baseTotalCents + platformFeeCents) * 0.029 + 30) : 0;
  const coverageAmount = stripeFee + platformFeeCents;
  const totalWithCoveredFees = coverFees ? baseTotalCents + coverageAmount : baseTotalCents;
  const feeDisplay = activeFee ? `$${(activeFee / 100).toFixed(2)}` : null;
  const totalDisplay = totalWithCoveredFees > 0 ? `$${(totalWithCoveredFees / 100).toFixed(2)}` : null;

  const setQty = (id: string, value: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, value));
    setAddonQty((prev) => ({ ...prev, [id]: clamped }));
  };

  const updatePlayer = (index: number, player: PlayerForm) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? player : p)));
  };

  const addPlayer = () => {
    if (players.length < maxGroupSize) setPlayers((prev) => [...prev, emptyPlayer()]);
  };

  const removePlayer = (index: number) => {
    if (players.length > 1) setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const fieldErrors: Record<string, string> = {};

    // Validate required custom fields from field config
    const validateRequiredFields = (player: PlayerForm, prefix: string) => {
      if (fields && fields.length > 0) {
        const fieldMap: Record<string, string> = { "phone": "phone", "handicap": "handicap", "shirt size": "shirt_size", "dietary restrictions": "dietary_restrictions", "company / organization": "company", "skill level": "skill_level" };
        fields.filter((f) => f.is_enabled && f.is_required).forEach((f) => {
          const key = fieldMap[f.label.toLowerCase()] || `custom_${f.id}`;
          const val = (player as any)[key];
          if (!val || (typeof val === "string" && !val.trim())) {
            fieldErrors[`${prefix}${key}`] = `${f.label} is required`;
          }
        });
      }
    };

    const parsedPlayers = players.map((player, i) => {
      const prefix = i > 0 ? `p${i}_` : "";
      const parsed = playerSchema.safeParse({
        ...player,
        handicap: player.handicap ? parseInt(player.handicap) : undefined,
      });
      if (!parsed.success) {
        parsed.error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[`${prefix}${err.path[0]}`] = err.message;
        });
        return null;
      }
      validateRequiredFields(player, prefix);
      return parsed.data;
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    if (hasFee) {
      try {
        const playerData = allowGroup
          ? parsedPlayers.map((p, i) => ({
              first_name: p!.first_name,
              last_name: p!.last_name,
              email: p!.email,
              phone: players[i].phone || null,
              handicap: players[i].handicap ? parseInt(players[i].handicap) : null,
              shirt_size: players[i].shirt_size || null,
              dietary_restrictions: players[i].dietary_restrictions || null,
              notes: i === 0 ? groupNotes || null : null,
            }))
          : null;

        const singleData = !allowGroup ? {
          first_name: parsedPlayers[0]!.first_name,
          last_name: parsedPlayers[0]!.last_name,
          email: parsedPlayers[0]!.email,
          phone: players[0].phone || null,
          handicap: players[0].handicap ? parseInt(players[0].handicap) : null,
          shirt_size: players[0].shirt_size || null,
          dietary_restrictions: players[0].dietary_restrictions || null,
          notes: groupNotes || players[0].notes || null,
        } : null;

        const addonSelections = Object.entries(addonQty)
          .filter(([, qty]) => qty > 0)
          .map(([id, qty]) => ({ addon_id: id, qty_per_player: qty }));

        const body = allowGroup
            ? { tournament_id: tournamentId, foursome: true, cover_fees: coverFees, tier_id: selectedTier, players: playerData, addons: addonSelections }
            : { tournament_id: tournamentId, cover_fees: coverFees, tier_id: selectedTier, addons: addonSelections, ...singleData };

          const { data, error } = await supabase.functions.invoke("create-registration-checkout", { body });
          if (error) throw error;
          if (data?.checkout_url) { window.location.href = data.checkout_url; return; }
          if (data?.paid) setSubmitted(true);
      } catch (err: any) {
        setErrors({ form: err.message || "Registration failed. Please try again." });
      }
    } else {
      // Free registration — insert directly
      const inserts = (allowGroup ? parsedPlayers : [parsedPlayers[0]]).map((p, i) => ({
        tournament_id: tournamentId,
        first_name: p!.first_name,
        last_name: p!.last_name,
        email: p!.email,
        phone: players[i].phone || null,
        handicap: players[i].handicap ? parseInt(players[i].handicap) : null,
        shirt_size: players[i].shirt_size || null,
        dietary_restrictions: players[i].dietary_restrictions || null,
        notes: i === 0 ? groupNotes || null : null,
      }));

      const { error } = await supabase.from("tournament_registrations").insert(inserts);

      if (error) {
        setErrors({ form: "Registration failed. Please try again." });
      } else {
        setSubmitted(true);
      }
    }

    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            className="text-center p-6 rounded-xl border-2 overflow-hidden"
            style={{ borderColor: `${secondaryColor}40`, backgroundColor: `${secondaryColor}10` }}
          >
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: secondaryColor }} />
            <h3 className="text-xl font-display font-bold text-foreground mb-2">
              You're Registered!
            </h3>
            <p className="text-sm text-muted-foreground">
              Thank you for signing up. You'll receive confirmation details via email.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleSubmit}
        className={cn("space-y-5 transition-all duration-500", submitted ? "opacity-40 pointer-events-none grayscale-[50%]" : "")}
      >
        {errors.form && (
          <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">{errors.form}</p>
        )}

        {/* Tier Selection */}
        {tiers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Select Registration Tier *</p>
            <div className="grid gap-2">
              {tiers.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => {
                    if (tier.eligibility_description) {
                      setShowEligibility(tier.id);
                    } else {
                      setSelectedTier(tier.id);
                    }
                  }}
                  className={cn(
                    "text-left rounded-lg border-2 p-3 transition-all",
                    selectedTier === tier.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{tier.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {tier.price_cents > 0 ? `$${(tier.price_cents / 100).toFixed(2)}` : "Free"}
                    </Badge>
                  </div>
                  {tier.description && <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>}
                  {tier.eligibility_description && (
                    <p className="text-[10px] text-primary mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" /> Eligibility requirements apply
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Eligibility Confirmation Dialog */}
        {showEligibility && (() => {
          const tier = tiers.find(t => t.id === showEligibility);
          return tier ? (
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Eligibility Requirements — {tier.name}</p>
              <p className="text-sm text-muted-foreground">{tier.eligibility_description}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => { setSelectedTier(tier.id); setShowEligibility(null); }}
                  style={{ backgroundColor: secondaryColor, color: primaryColor }}
                >
                  I Confirm I'm Eligible
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowEligibility(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null;
        })()}

        {hasFee && (
          <div className="rounded-md px-4 py-3 text-sm font-medium border" style={{ backgroundColor: `${secondaryColor}15`, borderColor: `${secondaryColor}30`, color: primaryColor }}>
            {activeFee > 0 && <>Registration Fee: {feeDisplay} per player</>}
            {addonTotalCents > 0 && (
              <span className="block text-xs mt-1 opacity-80">
                Add-ons: ${(addonTotalCents / 100).toFixed(2)}
              </span>
            )}
            {totalDisplay && (
              <span className="block text-xs mt-1 opacity-80 font-semibold">
                Total: {totalDisplay}
              </span>
            )}
          </div>
        )}

        {allowGroup && (
          <div className="rounded-md px-4 py-3 text-sm border bg-muted/30 border-border">
            <p className="font-semibold text-foreground">Group Registration</p>
            <p className="text-xs text-muted-foreground mt-0.5">Register up to {maxGroupSize} players. At least 1 player is required.</p>
          </div>
        )}

        {/* Optional Add-ons */}
        {addons.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Optional Add-ons</p>
              {playerCount > 1 && (
                <span className="text-xs text-muted-foreground">(quantity is per player × {playerCount} players)</span>
              )}
            </div>
            <div className="grid gap-2">
              {addons.map((addon) => {
                const qty = addonQty[addon.id] || 0;
                const max = Math.max(1, addon.max_per_golfer || 1);
                return (
                  <div key={addon.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">{addon.name}</span>
                        <Badge variant="secondary" className="text-xs">${(addon.price_cents / 100).toFixed(2)}</Badge>
                        {max > 1 && <span className="text-[10px] text-muted-foreground">max {max} per player</span>}
                      </div>
                      {addon.description && <p className="text-xs text-muted-foreground mt-0.5">{addon.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQty(addon.id, qty - 1, max)}
                        disabled={qty <= 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{qty}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQty(addon.id, qty + 1, max)}
                        disabled={qty >= max}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {players.map((player, i) => (
          <div key={i}>
            {i > 0 && <div className="border-t border-border my-4" />}
            <PlayerFields
              player={player}
              index={i}
              onChange={(p) => updatePlayer(i, p)}
              errors={errors}
              showRemove={allowGroup && i > 0}
              onRemove={() => removePlayer(i)}
              fields={fields}
            />
          </div>
        ))}

        {allowGroup && players.length < maxGroupSize && (
          <Button type="button" variant="outline" className="w-full" onClick={addPlayer}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Player {players.length + 1}
          </Button>
        )}

        {!allowGroup && (
          <div>
            <Label htmlFor="reg_notes">Additional Notes</Label>
            <Textarea
              id="reg_notes"
              value={players[0].notes}
              onChange={(e) => updatePlayer(0, { ...players[0], notes: e.target.value })}
              placeholder="Preferred playing partners, special requests, etc."
              rows={3}
              maxLength={1000}
            />
          </div>
        )}

        {allowGroup && (
          <div>
            <Label htmlFor="group_notes">Group Notes</Label>
            <Textarea
              id="group_notes"
              value={groupNotes}
              onChange={(e) => setGroupNotes(e.target.value)}
              placeholder="Special requests for the group, etc."
              rows={3}
              maxLength={1000}
            />
          </div>
        )}

        {/* Tax-Exempt Notice */}
        {isNonprofit && (
          <p className="text-xs text-muted-foreground text-center">
            🧾 {nonprofitName || "This organization"} is a registered 501(c)(3) nonprofit{ein ? ` (EIN: ${ein})` : ""}. Your registration may be tax-deductible. A receipt will be emailed to you.
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting || submitted}
          className="w-full text-base py-3"
          style={{ backgroundColor: secondaryColor, color: primaryColor }}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {hasFee
            ? `Register & Pay ${totalDisplay}`
            : allowGroup
              ? `Register Group (${players.length} player${players.length > 1 ? "s" : ""})`
              : "Complete Registration"}
        </Button>
      </form>
    </div>
  );
};

export default RegistrationForm;
