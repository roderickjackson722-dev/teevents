import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, UserPlus, Trash2, Heart } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";

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

interface RegistrationFormProps {
  tournamentId: string;
  primaryColor: string;
  secondaryColor: string;
  registrationFeeCents?: number;
  foursomeMode?: boolean;
  isNonprofit?: boolean;
  nonprofitName?: string;
  ein?: string;
}

const emptyPlayer = () => ({
  first_name: "", last_name: "", email: "", phone: "",
  handicap: "", shirt_size: "", dietary_restrictions: "", notes: "",
});

type PlayerForm = ReturnType<typeof emptyPlayer>;

const PlayerFields = ({
  player, index, onChange, errors, showRemove, onRemove,
}: {
  player: PlayerForm; index: number; onChange: (p: PlayerForm) => void;
  errors: Record<string, string>; showRemove?: boolean; onRemove?: () => void;
}) => {
  const prefix = index > 0 ? `p${index}_` : "";
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
        <div>
          <Label>Phone</Label>
          <Input value={player.phone} onChange={(e) => onChange({ ...player, phone: e.target.value })} placeholder="(555) 123-4567" maxLength={20} />
        </div>
        <div>
          <Label>Handicap</Label>
          <Input type="number" min="0" max="54" value={player.handicap} onChange={(e) => onChange({ ...player, handicap: e.target.value })} placeholder="e.g. 15" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Shirt Size</Label>
          <Select value={player.shirt_size} onValueChange={(v) => onChange({ ...player, shirt_size: v })}>
            <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
            <SelectContent>
              {["XS", "S", "M", "L", "XL", "2XL", "3XL"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Dietary Restrictions</Label>
          <Input value={player.dietary_restrictions} onChange={(e) => onChange({ ...player, dietary_restrictions: e.target.value })} placeholder="e.g. Vegetarian" maxLength={500} />
        </div>
      </div>
    </div>
  );
};

const RegistrationForm = ({ tournamentId, primaryColor, secondaryColor, registrationFeeCents = 0, foursomeMode = false, isNonprofit = false, nonprofitName, ein }: RegistrationFormProps) => {
  const [players, setPlayers] = useState<PlayerForm[]>([emptyPlayer()]);
  const [groupNotes, setGroupNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [coverFees, setCoverFees] = useState(false);

  const hasFee = registrationFeeCents > 0;
  const playerCount = foursomeMode ? players.length : 1;
  const baseTotalCents = hasFee ? registrationFeeCents * playerCount : 0;
  // Stripe fee: 2.9% + $0.30 per transaction
  const stripeFee = baseTotalCents > 0 ? Math.round(baseTotalCents * 0.029 + 30) : 0;
  const totalWithCoveredFees = coverFees ? baseTotalCents + stripeFee : baseTotalCents;
  const feeDisplay = hasFee ? `$${(registrationFeeCents / 100).toFixed(2)}` : null;
  const totalDisplay = totalWithCoveredFees > 0 ? `$${(totalWithCoveredFees / 100).toFixed(2)}` : null;

  const updatePlayer = (index: number, player: PlayerForm) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? player : p)));
  };

  const addPlayer = () => {
    if (players.length < 4) setPlayers((prev) => [...prev, emptyPlayer()]);
  };

  const removePlayer = (index: number) => {
    if (players.length > 1) setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const fieldErrors: Record<string, string> = {};

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
      return parsed.data;
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    if (hasFee) {
      try {
        const body = foursomeMode
          ? {
              tournament_id: tournamentId,
              foursome: true,
              cover_fees: coverFees,
              players: parsedPlayers.map((p, i) => ({
                first_name: p!.first_name,
                last_name: p!.last_name,
                email: p!.email,
                phone: players[i].phone || null,
                handicap: players[i].handicap ? parseInt(players[i].handicap) : null,
                shirt_size: players[i].shirt_size || null,
                dietary_restrictions: players[i].dietary_restrictions || null,
                notes: i === 0 ? groupNotes || null : null,
              })),
            }
          : {
              tournament_id: tournamentId,
              cover_fees: coverFees,
              first_name: parsedPlayers[0]!.first_name,
              last_name: parsedPlayers[0]!.last_name,
              email: parsedPlayers[0]!.email,
              phone: players[0].phone || null,
              handicap: players[0].handicap ? parseInt(players[0].handicap) : null,
              shirt_size: players[0].shirt_size || null,
              dietary_restrictions: players[0].dietary_restrictions || null,
              notes: groupNotes || players[0].notes || null,
            };

        const { data, error } = await supabase.functions.invoke("create-registration-checkout", { body });

        if (error) throw error;
        if (data?.checkout_url) { window.location.href = data.checkout_url; return; }
        if (data?.paid) setSubmitted(true);
      } catch (err: any) {
        setErrors({ form: err.message || "Registration failed. Please try again." });
      }
    } else {
      // Free registration — insert directly
      const inserts = (foursomeMode ? parsedPlayers : [parsedPlayers[0]]).map((p, i) => ({
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

        {hasFee && (
          <div className="rounded-md px-4 py-3 text-sm font-medium border" style={{ backgroundColor: `${secondaryColor}15`, borderColor: `${secondaryColor}30`, color: primaryColor }}>
            Registration Fee: {feeDisplay} per player
            {foursomeMode && players.length > 1 && (
              <span className="block text-xs mt-1 opacity-80">
                {players.length} players × {feeDisplay} = {totalDisplay}
              </span>
            )}
          </div>
        )}

        {foursomeMode && (
          <div className="rounded-md px-4 py-3 text-sm border bg-muted/30 border-border">
            <p className="font-semibold text-foreground">Foursome Registration</p>
            <p className="text-xs text-muted-foreground mt-0.5">Register up to 4 players. At least 1 player is required.</p>
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
              showRemove={foursomeMode && i > 0}
              onRemove={() => removePlayer(i)}
            />
          </div>
        ))}

        {foursomeMode && players.length < 4 && (
          <Button type="button" variant="outline" className="w-full" onClick={addPlayer}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Player {players.length + 1}
          </Button>
        )}

        {!foursomeMode && (
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

        {foursomeMode && (
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

        <Button
          type="submit"
          disabled={submitting || submitted}
          className="w-full text-base py-3"
          style={{ backgroundColor: secondaryColor, color: primaryColor }}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {hasFee
            ? `Register & Pay ${foursomeMode && players.length > 1 ? totalDisplay : feeDisplay}`
            : foursomeMode
              ? `Register Foursome (${players.length} player${players.length > 1 ? "s" : ""})`
              : "Complete Registration"}
        </Button>
      </form>
    </div>
  );
};

export default RegistrationForm;
