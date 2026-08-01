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
import { sanitizeHtml } from "@/components/ui/rich-text-editor";
import { formatCents } from "@/lib/formatCurrency";
import type { GroupFieldKey, GroupFieldRules } from "@/lib/groupFieldRules";


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
  /** Optional early-bird team-total prices (in cents) for 2-player and 4-player teams.
   *  If provided and the team size matches, the total overrides per-player × count. */
  earlyTeamTotalsCents?: { 2?: number | null; 4?: number | null } | null;
  foursomeMode?: boolean;
  maxGroupSize?: number;
  /** Explicit list of allowed group sizes to display (e.g. [1, 4] for individual + foursome only). If null/undefined, all sizes 1..maxGroupSize are shown. */
  allowedGroupSizes?: number[] | null;
  isNonprofit?: boolean;
  nonprofitName?: string;
  ein?: string;
  platformFeeRate?: number;
  passFeesToRegistrants?: boolean;
  allowCoverFees?: boolean;
  tiers?: { id: string; name: string; description: string | null; eligibility_description: string | null; price_cents: number; max_registrants: number | null }[];
  fields?: RegFieldConfig[];
  addonsSectionTitle?: string;
  captainLabel?: string | null;
  /** Captain-vs-teammate field rules for group sign-ups */
  groupFieldRules?: GroupFieldRules | null;
  showPromoCodeInput?: boolean;

  /** Donation prompt config */
  donationPrompt?: {
    enabled: boolean;
    title: string;
    description: string | null;
    presetsCents: number[];
    allowCustom: boolean;
    customLabel: string;
  } | null;
}

const emptyPlayer = () => ({
  first_name: "", last_name: "", email: "", phone: "",
  handicap: "", shirt_size: "", dietary_restrictions: "", notes: "",
  company: "", skill_level: "",
});

type PlayerForm = ReturnType<typeof emptyPlayer>;

const PlayerFields = ({
  player, index, onChange, errors, showRemove, onRemove, fields, captainLabel, groupRules, groupMode,
}: {
  player: PlayerForm; index: number; onChange: (p: PlayerForm) => void;
  errors: Record<string, string>; showRemove?: boolean; onRemove?: () => void;
  fields?: RegFieldConfig[]; captainLabel?: string | null;
  groupRules?: GroupFieldRules | null; groupMode?: boolean;
}) => {
  const prefix = index > 0 ? `p${index}_` : "";

  // Captain-vs-teammate field rules (only when group registration rules are active)
  const roleRules = groupRules && groupMode
    ? (index === 0 ? groupRules.captain : groupRules.member)
    : null;
  const ruleFor = (key: GroupFieldKey) => roleRules?.[key] ?? null;

  // Map default field labels to player form keys
  const defaultFieldMap: Record<string, keyof PlayerForm> = {
    "Phone": "phone",
    "Handicap": "handicap",
    "Shirt Size": "shirt_size",
    "Dietary Restrictions": "dietary_restrictions",
    "Company / Organization": "company",
    "Skill Level": "skill_level",
  };

  const ruleKeyByLabel: Record<string, GroupFieldKey> = {
    "phone": "phone",
    "handicap": "handicap",
    "shirt size": "shirt_size",
    "dietary restrictions": "dietary_restrictions",
  };

  // If fields config provided, check which default fields are enabled
  const isFieldEnabled = (label: string) => {
    const rk = ruleKeyByLabel[label.toLowerCase()];
    if (rk && ruleFor(rk) === "hidden") return false;
    if (!fields || fields.length === 0) return true; // no config = show all defaults
    const f = fields.find((fld) => fld.label.toLowerCase() === label.toLowerCase());
    return f ? f.is_enabled : false;
  };

  const isFieldRequired = (label: string) => {
    const rk = ruleKeyByLabel[label.toLowerCase()];
    if (rk) {
      const mode = ruleFor(rk);
      if (mode === "required") return true;
      if (mode === "optional" || mode === "hidden") return false;
    }
    if (!fields || fields.length === 0) return false;
    const f = fields.find((fld) => fld.label.toLowerCase() === label.toLowerCase());
    return f ? f.is_required : false;
  };

  const emailMode = ruleFor("email");
  const showEmail = emailMode !== "hidden";
  const emailRequired = emailMode ? emailMode === "required" : true;

  // Custom fields (non-default)
  const customFields = (fields || []).filter((f) => !f.is_default && f.is_enabled);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          {index === 0
            ? (groupMode && groupRules?.enabled
                ? `Team Captain (Primary Contact)`
                : captainLabel && captainLabel.trim() ? `Player 1 (${captainLabel.trim()})` : "Player 1")
            : `Player ${index + 1}`}
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
      {showEmail && (
        <div>
          <Label>Email{emailRequired ? " *" : ""}</Label>
          <Input type="email" value={player.email} onChange={(e) => onChange({ ...player, email: e.target.value })} placeholder="john@example.com" maxLength={255} />
          {errors[`${prefix}email`] && <p className="text-xs text-destructive mt-1">{errors[`${prefix}email`]}</p>}
        </div>
      )}

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

const RegistrationForm = ({ tournamentId, primaryColor, secondaryColor, registrationFeeCents = 0, earlyTeamTotalsCents = null, foursomeMode = false, maxGroupSize = foursomeMode ? 4 : 1, allowedGroupSizes = null, isNonprofit = false, nonprofitName, ein, platformFeeRate = 0.05, passFeesToRegistrants = false, allowCoverFees = true, tiers = [], fields = [], addonsSectionTitle = "Optional Add-ons", captainLabel = null, groupFieldRules = null, showPromoCodeInput = true, donationPrompt = null }: RegistrationFormProps) => {
  // When the organizer restricts group sizes (e.g. foursomes only), start at the
  // smallest allowed size so the total reflects the real number of players.
  const initialGroupSize = (() => {
    const all = Array.from({ length: Math.max(1, maxGroupSize) }, (_, i) => i + 1);
    const allowed = Array.isArray(allowedGroupSizes) && allowedGroupSizes.length > 0
      ? all.filter((n) => allowedGroupSizes.includes(n))
      : all;
    return allowed.length ? Math.min(...allowed) : 1;
  })();
  const [players, setPlayers] = useState<PlayerForm[]>(() =>
    Array.from({ length: initialGroupSize }, () => emptyPlayer()),
  );
  const [teamName, setTeamName] = useState("");
  const [groupNotes, setGroupNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [coverFees, setCoverFees] = useState(passFeesToRegistrants);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showEligibility, setShowEligibility] = useState<string | null>(null);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount_type: string; discount_value: number; alert_html?: string | null; show_alert_on_top?: boolean; auto?: boolean } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [autoPromos, setAutoPromos] = useState<any[]>([]);
  const [flights, setFlights] = useState<{ id: string; tier_name: string; tier_description: string | null }[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  // Donation state
  const [donationSelectedCents, setDonationSelectedCents] = useState<number | null>(null);
  const [donationCustomDisplay, setDonationCustomDisplay] = useState<string>("");
  const donationCustomCents = (() => {
    const n = parseFloat(donationCustomDisplay);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  })();
  const donationCents = donationSelectedCents === -1
    ? donationCustomCents
    : (donationSelectedCents || 0);

  // Load competition flights for this tournament
  useEffect(() => {
    let cancelled = false;
    (supabase as any)
      .from("tournament_tiers")
      .select("id, tier_name, tier_description")
      .eq("tournament_id", tournamentId)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(({ data }: any) => {
        if (!cancelled) setFlights(data || []);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

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
    // Load auto-apply promo codes
    (supabase as any)
      .from("tournament_promo_codes")
      .select("code, discount_type, discount_value, expires_at, max_uses, current_uses, auto_apply, applies_to, applies_to_custom, alert_enabled, alert_html, show_alert_on_top, show_alert_at_checkout")
      .eq("tournament_id", tournamentId)
      .eq("is_active", true)
      .eq("auto_apply", true)
      .then(({ data }: any) => {
        if (cancelled) return;
        setAutoPromos(data || []);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

  // Keep the group size valid if allowed sizes arrive/change after mount
  useEffect(() => {
    setPlayers((prev) => {
      const all = Array.from({ length: Math.max(1, maxGroupSize) }, (_, i) => i + 1);
      const allowed = Array.isArray(allowedGroupSizes) && allowedGroupSizes.length > 0
        ? all.filter((n) => allowedGroupSizes.includes(n))
        : all;
      if (!allowed.length || allowed.includes(prev.length)) return prev;
      const target = Math.min(...allowed);
      if (target === prev.length) return prev;
      return target > prev.length
        ? [...prev, ...Array.from({ length: target - prev.length }, () => emptyPlayer())]
        : prev.slice(0, target);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxGroupSize, JSON.stringify(allowedGroupSizes)]);

  const allowGroup_pre = maxGroupSize > 1;
  const playerCount_pre = allowGroup_pre ? players.length : 1;

  // Auto-apply matching promo when player count or tier changes
  useEffect(() => {
    if (!autoPromos.length) return;
    // Don't override a manually-applied (non-auto) code
    if (appliedPromo && !appliedPromo.auto) return;

    const now = Date.now();
    const tierName = (tiers.find((t) => t.id === selectedTier)?.name || "").trim().toLowerCase();

    const match = autoPromos.find((p: any) => {
      if (p.expires_at && new Date(p.expires_at).getTime() < now) return false;
      if (p.max_uses && (p.current_uses ?? 0) >= p.max_uses) return false;
      const at = p.applies_to || "all";
      if (at === "all") return true;
      if (at === "individual") return playerCount_pre === 1;
      if (at === "team_2") return playerCount_pre === 2;
      if (at === "team_4") return playerCount_pre === 4;
      if (at === "custom") {
        const want = (p.applies_to_custom || "").trim().toLowerCase();
        if (!want) return false;
        return tierName === want;
      }
      return false;
    });

    if (match) {
      setAppliedPromo({
        code: match.code,
        discount_type: match.discount_type,
        discount_value: Number(match.discount_value),
        alert_html: match.alert_enabled ? match.alert_html : null,
        show_alert_on_top: match.show_alert_on_top !== false,
        auto: true,
      });
      setPromoError(null);
    } else if (appliedPromo?.auto) {
      // Previously auto-applied but no longer matches
      setAppliedPromo(null);
    }
  }, [autoPromos, players.length, selectedTier, tiers, maxGroupSize]);




  const allowGroup = maxGroupSize > 1;
  // Group rules only apply when more than one player is being registered together.
  const groupRulesActive = !!groupFieldRules?.enabled && allowGroup && players.length > 1;

  const activeFee = selectedTier
    ? (tiers.find(t => t.id === selectedTier)?.price_cents || 0)
    : registrationFeeCents;
  const playerCount = allowGroup ? players.length : 1;
  // Early-bird team total override (only when no tier selected and total provided for this team size).
  const teamTotalOverride = !selectedTier && earlyTeamTotalsCents
    ? (playerCount === 4 && earlyTeamTotalsCents[4] != null
        ? Number(earlyTeamTotalsCents[4])
        : playerCount === 2 && earlyTeamTotalsCents[2] != null
          ? Number(earlyTeamTotalsCents[2])
          : null)
    : null;
  const baseRegistrationCents = teamTotalOverride != null
    ? teamTotalOverride
    : (activeFee ? activeFee * playerCount : 0);
  // Add-on totals (qty is per-golfer; total = qty * playerCount * price)
  const addonTotalCents = addons.reduce((sum, a) => {
    const qty = addonQty[a.id] || 0;
    return sum + qty * playerCount * a.price_cents;
  }, 0);
  const subtotalBeforeDiscount = baseRegistrationCents + addonTotalCents;
  // Apply promo discount to subtotal
  const discountCents = appliedPromo && subtotalBeforeDiscount > 0
    ? Math.min(
        subtotalBeforeDiscount,
        appliedPromo.discount_type === "percent"
          ? Math.round(subtotalBeforeDiscount * (Number(appliedPromo.discount_value) / 100))
          : Math.round(Number(appliedPromo.discount_value) * 100),
      )
    : 0;
  const baseTotalCents = Math.max(0, subtotalBeforeDiscount - discountCents);
  // Donation is charged separately (not discounted, not fee-bearing at organizer level — but
  // fees are still computed on the full charge so we treat it as part of the fee-bearing base).
  const totalWithDonationCents = baseTotalCents + donationCents;
  const hasFee = totalWithDonationCents > 0;
  const platformFeeCents = Math.round(totalWithDonationCents * platformFeeRate);
  // Stripe fee: 2.9% + $0.30 per transaction (on total including platform fee)
  const stripeFee = totalWithDonationCents > 0 ? Math.round((totalWithDonationCents + platformFeeCents) * 0.029 + 30) : 0;
  const coverageAmount = stripeFee + platformFeeCents;
  const totalWithCoveredFees = coverFees ? totalWithDonationCents + coverageAmount : totalWithDonationCents;
  const feeDisplay = activeFee ? `${formatCents(activeFee)}` : null;
  const totalDisplay = totalWithCoveredFees > 0 ? `${formatCents(totalWithCoveredFees)}` : null;

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoError(null);
    setValidatingPromo(true);
    try {
      const { data: promo } = await supabase
        .from("tournament_promo_codes")
        .select("code, discount_type, discount_value, is_active, expires_at, max_uses, current_uses")
        .eq("tournament_id", tournamentId)
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();
      if (!promo) {
        setPromoError("Invalid or inactive promo code");
        setAppliedPromo(null);
        return;
      }
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        setPromoError("This promo code has expired");
        setAppliedPromo(null);
        return;
      }
      if (promo.max_uses && (promo.current_uses ?? 0) >= promo.max_uses) {
        setPromoError("This promo code has reached its usage limit");
        setAppliedPromo(null);
        return;
      }
      setAppliedPromo({ code: promo.code, discount_type: promo.discount_type, discount_value: Number(promo.discount_value) });
    } finally {
      setValidatingPromo(false);
    }
  };

  const clearPromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

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

    // Captain / teammate rules for group sign-ups
    const ruleKeyByLabel: Record<string, GroupFieldKey> = {
      "phone": "phone",
      "handicap": "handicap",
      "shirt size": "shirt_size",
      "dietary restrictions": "dietary_restrictions",
    };
    const rulesFor = (i: number) =>
      groupRulesActive ? (i === 0 ? groupFieldRules!.captain : groupFieldRules!.member) : null;

    // Teammates may not be asked for an email — reuse the captain's address with a
    // +alias so every registration row still has a deliverable contact email.
    const captainEmail = (players[0].email || "").trim();
    const effectiveEmail = (i: number) => {
      const own = (players[i].email || "").trim();
      if (i === 0 || !groupRulesActive) return own;
      if (own) return own;
      const [local, domain] = captainEmail.split("@");
      return local && domain ? `${local}+p${i + 1}@${domain}` : own;
    };

    // Validate required custom fields from field config
    const validateRequiredFields = (player: PlayerForm, prefix: string, index: number) => {
      const roleRules = rulesFor(index);
      if (fields && fields.length > 0) {
        const fieldMap: Record<string, string> = { "phone": "phone", "handicap": "handicap", "shirt size": "shirt_size", "dietary restrictions": "dietary_restrictions", "company / organization": "company", "skill level": "skill_level" };
        fields.filter((f) => f.is_enabled && f.is_required).forEach((f) => {
          const rk = ruleKeyByLabel[f.label.toLowerCase()];
          // Group rules win: skip fields the organizer made optional/hidden for this role
          if (roleRules && rk && roleRules[rk] !== "required") return;
          const key = fieldMap[f.label.toLowerCase()] || `custom_${f.id}`;
          const val = (player as any)[key];
          if (!val || (typeof val === "string" && !val.trim())) {
            fieldErrors[`${prefix}${key}`] = `${f.label} is required`;
          }
        });
      }
      if (roleRules) {
        (Object.keys(ruleKeyByLabel) as string[]).forEach((label) => {
          const rk = ruleKeyByLabel[label];
          if (roleRules[rk] !== "required") return;
          const key = rk;
          const val = (player as any)[key];
          if (!val || (typeof val === "string" && !val.trim())) {
            fieldErrors[`${prefix}${key}`] = `This field is required`;
          }
        });
      }
    };

    const parsedPlayers = players.map((player, i) => {
      const prefix = i > 0 ? `p${i}_` : "";
      const roleRules = rulesFor(i);
      const emailOptional = !!roleRules && roleRules.email !== "required";
      const email = effectiveEmail(i);
      const schema = emailOptional
        ? playerSchema.extend({ email: z.string().trim().max(255).optional().or(z.literal("")) })
        : playerSchema;
      const parsed = schema.safeParse({
        ...player,
        email,
        handicap: player.handicap ? parseInt(player.handicap) : undefined,
      });
      if (!parsed.success) {
        parsed.error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[`${prefix}${err.path[0]}`] = err.message;
        });
        return null;
      }
      validateRequiredFields(player, prefix, i);
      return { ...parsed.data, email } as typeof playerSchema._type;
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }


    setSubmitting(true);

    // Build a labelled answers array for every organizer-configured field so
    // the dashboard can show the exact registration submission later.
    const buildCustomAnswers = (playerIdx: number) => {
      const fieldDefs = (fields || []).filter((f) => f.is_enabled);
      const raw = players[playerIdx] as any;
      const defaultFieldMap: Record<string, string> = {
        "phone": "phone",
        "handicap": "handicap",
        "shirt size": "shirt_size",
        "dietary restrictions": "dietary_restrictions",
        "company / organization": "company",
        "skill level": "skill_level",
      };
      return fieldDefs.map((cf) => {
        const mappedKey = defaultFieldMap[cf.label.toLowerCase()];
        const answer = mappedKey ? raw[mappedKey] : raw[`custom_${cf.id}`];
        return ({
        field_id: cf.id,
        label: cf.label,
        field_type: cf.field_type,
        answer: answer ?? "",
        });
      });
    };

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
              company: players[i].company || null,
              skill_level: players[i].skill_level || null,
              notes: i === 0 ? groupNotes || null : null,
              is_captain: i === 0,
              custom_answers: buildCustomAnswers(i),

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
          company: players[0].company || null,
          skill_level: players[0].skill_level || null,
          notes: groupNotes || players[0].notes || null,
          custom_answers: buildCustomAnswers(0),
        } : null;

        const addonSelections = Object.entries(addonQty)
          .filter(([, qty]) => qty > 0)
          .map(([id, qty]) => ({ addon_id: id, qty_per_player: qty }));

        // Read stored team-promoter referral code (if any)
        let referralCode: string | null = null;
        try {
          const raw = localStorage.getItem(`tv_ref_${tournamentId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            // 30-day expiry
            if (parsed?.code && parsed?.ts && Date.now() - parsed.ts < 30 * 24 * 60 * 60 * 1000) {
              referralCode = parsed.code;
            }
          }
        } catch {}

        const promoCodeToSend = appliedPromo?.code || null;
        const body = allowGroup
            ? { tournament_id: tournamentId, foursome: true, cover_fees: coverFees, tier_id: selectedTier, players: playerData, team_name: teamName.trim() || null, addons: addonSelections, referral_code: referralCode, promo_code: promoCodeToSend, donation_amount_cents: donationCents }
            : { tournament_id: tournamentId, cover_fees: coverFees, tier_id: selectedTier, addons: addonSelections, referral_code: referralCode, promo_code: promoCodeToSend, donation_amount_cents: donationCents, ...singleData };


          const { data, error } = await supabase.functions.invoke("create-registration-checkout", { body });
          if (error) throw error;
          if (data?.checkout_url) { window.location.href = data.checkout_url; return; }
          if (data?.paid) setSubmitted(true);
      } catch (err: any) {
        setErrors({ form: err.message || "Registration failed. Please try again." });
      }
    } else {
      // Free registration — insert directly
      let referralCode: string | null = null;
      let promoterId: string | null = null;
      try {
        const raw = localStorage.getItem(`tv_ref_${tournamentId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.code && parsed?.ts && Date.now() - parsed.ts < 30 * 24 * 60 * 60 * 1000) {
            referralCode = parsed.code;
            const { data: rows } = await (supabase as any).rpc("validate_promoter_ref_code", {
              _tournament_id: tournamentId,
              _ref_code: referralCode,
            });
            const promoter = Array.isArray(rows) ? rows[0] : null;
            promoterId = promoter?.id || null;
          }
        }
      } catch {}

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
        is_captain: allowGroup && players.length > 1 ? i === 0 : false,

        referral_code_used: referralCode,
        promoter_id: promoterId,
        flight_id: selectedFlight,
        // Attach the donation to the first (captain) registration row only
        donation_amount_cents: i === 0 ? donationCents : 0,
        custom_answers: buildCustomAnswers(i),
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
                      {tier.price_cents > 0 ? `${formatCents(tier.price_cents)}` : "Free"}
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

        {/* Flight Selection */}
        {flights.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Select Your Flight *</p>
            <div className="grid gap-2">
              {flights.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFlight(f.id)}
                  className={cn(
                    "text-left rounded-lg border-2 p-3 transition-all",
                    selectedFlight === f.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="font-semibold text-sm text-foreground">{f.tier_name}</div>
                  {f.tier_description && <p className="text-xs text-muted-foreground mt-1">{f.tier_description}</p>}
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

        {/* Promo alert (top placement) */}
        {appliedPromo?.alert_html && appliedPromo.show_alert_on_top !== false && (
          <div
            className="rounded-md p-4 border-2"
            style={{ backgroundColor: `${secondaryColor}15`, borderColor: secondaryColor }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(appliedPromo.alert_html) }}
          />
        )}

        {(hasFee || subtotalBeforeDiscount > 0) && (
          <div className="rounded-md px-4 py-3 text-sm font-medium border" style={{ backgroundColor: `${secondaryColor}15`, borderColor: `${secondaryColor}30`, color: primaryColor }}>
            {activeFee > 0 && <>Registration Fee: {feeDisplay} per player</>}
            {addonTotalCents > 0 && (
              <span className="block text-xs mt-1 opacity-80">
                Add-ons: {formatCents(addonTotalCents)}
              </span>
            )}
            {discountCents > 0 && (
              <span className="block text-xs mt-1 opacity-80 text-green-700">
                Promo {appliedPromo?.code}: −{formatCents(discountCents)}
              </span>
            )}
            {donationCents > 0 && (
              <span className="block text-xs mt-1 opacity-80">
                Donation: +{formatCents(donationCents)}
              </span>
            )}
            {totalDisplay && (
              <span className="block text-xs mt-1 opacity-80 font-semibold">
                Total: {totalDisplay}
              </span>
            )}
          </div>
        )}

        {/* Promo alert (bottom placement) */}
        {appliedPromo?.alert_html && appliedPromo.show_alert_on_top === false && (
          <div
            className="rounded-md p-4 border-2"
            style={{ backgroundColor: `${secondaryColor}15`, borderColor: secondaryColor }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(appliedPromo.alert_html) }}
          />
        )}


        {/* Promo Code */}
        {showPromoCodeInput !== false && subtotalBeforeDiscount > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="promo_code">Promo Code</Label>
            {appliedPromo ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                <span className="text-sm">
                  <span className="font-mono font-bold">{appliedPromo.code}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {appliedPromo.discount_type === "percent"
                      ? `${appliedPromo.discount_value}% off`
                      : `$${appliedPromo.discount_value} off`}
                  </span>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={clearPromo} className="h-7 px-2 text-xs">
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  id="promo_code"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                  placeholder="Enter code"
                  maxLength={40}
                  className="font-mono uppercase"
                />
                <Button type="button" variant="outline" onClick={applyPromo} disabled={!promoInput.trim() || validatingPromo}>
                  {validatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
            {promoError && <p className="text-xs text-destructive">{promoError}</p>}
          </div>
        )}

        {allowGroup && (
          <div className="rounded-md px-4 py-3 text-sm border bg-muted/30 border-border">
            <p className="font-semibold text-foreground">How many players are you registering?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Choose your group size (up to {maxGroupSize}). The captain fills in each player's details.</p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(() => {
                const all = Array.from({ length: maxGroupSize }, (_, i) => i + 1);
                const filtered = Array.isArray(allowedGroupSizes) && allowedGroupSizes.length > 0
                  ? all.filter((n) => allowedGroupSizes.includes(n))
                  : all;
                return filtered;
              })().map((n) => {
                const labels: Record<number, string> = { 1: "Individual", 2: "Twosome (2)", 3: "Threesome (3)", 4: "Foursome (4)" };
                const active = players.length === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setPlayers((prev) => {
                        if (prev.length === n) return prev;
                        if (prev.length < n) {
                          const add = Array.from({ length: n - prev.length }, () => emptyPlayer());
                          return [...prev, ...add];
                        }
                        return prev.slice(0, n);
                      });
                    }}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted"}`}
                    aria-pressed={active}
                  >
                    {labels[n] || `${n} Players`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Optional Add-ons */}
        {addons.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">{addonsSectionTitle}</p>
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
                        <Badge variant="secondary" className="text-xs">{formatCents(addon.price_cents)}</Badge>
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

            {/* Promo Code (Add-ons) — applies the same discount to your order */}
            {showPromoCodeInput !== false && (
              <div className="pt-2">
                <Label htmlFor="promo_code_addons" className="text-xs text-muted-foreground">Promo Code</Label>
                {appliedPromo ? (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 border border-primary/30 mt-1">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="font-mono font-bold text-sm">{appliedPromo.code}</span>
                    <span className="text-xs text-muted-foreground">
                      {appliedPromo.discount_type === "percent"
                        ? `${appliedPromo.discount_value}% off`
                        : `$${appliedPromo.discount_value} off`}
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={clearPromo} className="h-7 px-2 text-xs ml-auto">
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="promo_code_addons"
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                      placeholder="Enter code"
                      maxLength={50}
                      className="font-mono text-sm"
                    />
                    <Button type="button" variant="outline" onClick={applyPromo} disabled={!promoInput.trim() || validatingPromo}>
                      {validatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
                {promoError && <p className="text-xs text-destructive mt-1">{promoError}</p>}
              </div>
            )}
          </div>
        )}

        {groupRulesActive && (
          <div>
            <Label>Team Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Team Mulligan"
              maxLength={100}
            />
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
              captainLabel={captainLabel}
              groupRules={groupFieldRules}
              groupMode={groupRulesActive}
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

        {/* Donation Prompt */}
        {donationPrompt?.enabled && (donationPrompt.presetsCents.length > 0 || donationPrompt.allowCustom) && (
          <div className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: `${secondaryColor}60`, backgroundColor: `${secondaryColor}08` }}>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4" style={{ color: secondaryColor }} />
              <p className="text-sm font-semibold text-foreground">{donationPrompt.title || "Support Our Mission"}</p>
            </div>
            {donationPrompt.description && (
              <p className="text-xs text-muted-foreground">{donationPrompt.description}</p>
            )}
            {donationPrompt.presetsCents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {donationPrompt.presetsCents.map((cents) => {
                  const active = donationSelectedCents === cents;
                  return (
                    <button
                      key={cents}
                      type="button"
                      onClick={() => {
                        setDonationSelectedCents(active ? null : cents);
                        setDonationCustomDisplay("");
                      }}
                      className={cn(
                        "px-3 py-2 rounded-md border-2 text-sm font-semibold transition-colors",
                        active ? "text-white" : "bg-background text-foreground hover:bg-muted",
                      )}
                      style={active
                        ? { borderColor: secondaryColor, backgroundColor: secondaryColor }
                        : { borderColor: `${secondaryColor}40` }}
                    >
                      ${Math.round(cents / 100).toLocaleString("en-US")}
                    </button>
                  );
                })}
              </div>
            )}
            {donationPrompt.allowCustom && (
              <div className="flex items-center gap-2">
                <Label htmlFor="donation_custom" className="text-xs whitespace-nowrap">
                  {donationPrompt.customLabel || "Enter your own amount"}
                </Label>
                <div className="relative flex-1 max-w-[160px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="donation_custom"
                    type="text"
                    inputMode="decimal"
                    value={donationCustomDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
                        setDonationCustomDisplay(raw);
                        setDonationSelectedCents(raw ? -1 : null);
                      }
                    }}
                    placeholder="0.00"
                    className="pl-6"
                  />
                </div>
                {donationCents > 0 && (
                  <button
                    type="button"
                    onClick={() => { setDonationSelectedCents(null); setDonationCustomDisplay(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            {donationCents > 0 && (
              <p className="text-xs font-semibold" style={{ color: secondaryColor }}>
                ✓ Adding {formatCents(donationCents)} donation to your registration
              </p>
            )}
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
