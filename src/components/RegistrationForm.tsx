import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const registrationSchema = z.object({
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
}

const RegistrationForm = ({ tournamentId, primaryColor, secondaryColor, registrationFeeCents = 0 }: RegistrationFormProps) => {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    handicap: "",
    shirt_size: "",
    dietary_restrictions: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const hasFee = registrationFeeCents > 0;
  const feeDisplay = hasFee ? `$${(registrationFeeCents / 100).toFixed(2)}` : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = registrationSchema.safeParse({
      ...form,
      handicap: form.handicap ? parseInt(form.handicap) : undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    if (hasFee) {
      // Use edge function for paid registration
      try {
        const { data, error } = await supabase.functions.invoke("create-registration-checkout", {
          body: {
            tournament_id: tournamentId,
            first_name: parsed.data.first_name,
            last_name: parsed.data.last_name,
            email: parsed.data.email,
            phone: form.phone || null,
            handicap: form.handicap ? parseInt(form.handicap) : null,
            shirt_size: form.shirt_size || null,
            dietary_restrictions: form.dietary_restrictions || null,
            notes: form.notes || null,
          },
        });

        if (error) throw error;

        if (data?.checkout_url) {
          // Redirect to Stripe Checkout
          window.location.href = data.checkout_url;
          return;
        }

        if (data?.paid) {
          setSubmitted(true);
        }
      } catch (err: any) {
        setErrors({ form: err.message || "Registration failed. Please try again." });
      }
    } else {
      // Free registration — insert directly
      const { error } = await supabase.from("tournament_registrations").insert({
        tournament_id: tournamentId,
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        email: parsed.data.email,
        phone: form.phone || null,
        handicap: form.handicap ? parseInt(form.handicap) : null,
        shirt_size: form.shirt_size || null,
        dietary_restrictions: form.dietary_restrictions || null,
        notes: form.notes || null,
      });

      if (error) {
        setErrors({ form: "Registration failed. Please try again." });
      } else {
        setSubmitted(true);
      }
    }

    setSubmitting(false);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: secondaryColor }} />
        <h3 className="text-2xl font-display font-bold text-foreground mb-2">
          You're Registered!
        </h3>
        <p className="text-muted-foreground">
          Thank you for signing up. You'll receive confirmation details via email.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.form && (
        <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">{errors.form}</p>
      )}

      {hasFee && (
        <div className="rounded-md px-4 py-3 text-sm font-medium border" style={{ backgroundColor: `${secondaryColor}15`, borderColor: `${secondaryColor}30`, color: primaryColor }}>
          Registration Fee: {feeDisplay}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="reg_first_name">First Name *</Label>
          <Input
            id="reg_first_name"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            placeholder="John"
            maxLength={100}
          />
          {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name}</p>}
        </div>
        <div>
          <Label htmlFor="reg_last_name">Last Name *</Label>
          <Input
            id="reg_last_name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            placeholder="Doe"
            maxLength={100}
          />
          {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="reg_email">Email *</Label>
        <Input
          id="reg_email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="john@example.com"
          maxLength={255}
        />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="reg_phone">Phone</Label>
          <Input
            id="reg_phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(555) 123-4567"
            maxLength={20}
          />
        </div>
        <div>
          <Label htmlFor="reg_handicap">Handicap</Label>
          <Input
            id="reg_handicap"
            type="number"
            min="0"
            max="54"
            value={form.handicap}
            onChange={(e) => setForm({ ...form, handicap: e.target.value })}
            placeholder="e.g. 15"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Shirt Size</Label>
          <Select value={form.shirt_size} onValueChange={(v) => setForm({ ...form, shirt_size: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {["XS", "S", "M", "L", "XL", "2XL", "3XL"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="reg_dietary">Dietary Restrictions</Label>
          <Input
            id="reg_dietary"
            value={form.dietary_restrictions}
            onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })}
            placeholder="e.g. Vegetarian"
            maxLength={500}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="reg_notes">Additional Notes</Label>
        <Textarea
          id="reg_notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Preferred playing partners, special requests, etc."
          rows={3}
          maxLength={1000}
        />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full text-base py-3"
        style={{ backgroundColor: secondaryColor, color: primaryColor }}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {hasFee ? `Register & Pay ${feeDisplay}` : "Complete Registration"}
      </Button>
    </form>
  );
};

export default RegistrationForm;
