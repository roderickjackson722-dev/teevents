import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Clock, CheckCircle2, Users } from "lucide-react";
import { z } from "zod";

const waitlistSchema = z.object({
  user_name: z.string().trim().min(1, "Name is required").max(100),
  user_email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  group_size: z.number().int().min(1).max(6),
});

interface WaitlistSignupProps {
  tournamentId: string;
  primaryColor: string;
  secondaryColor: string;
  depositCents?: number;
  maxGroupSize?: number;
}

export default function WaitlistSignup({
  tournamentId,
  primaryColor,
  secondaryColor,
  depositCents = 0,
  maxGroupSize = 4,
}: WaitlistSignupProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [groupSize, setGroupSize] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = waitlistSchema.safeParse({
      user_name: name,
      user_email: email,
      phone,
      group_size: parseInt(groupSize),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase
      .from("tournament_waitlist")
      .insert({
        tournament_id: tournamentId,
        user_name: parsed.data.user_name,
        user_email: parsed.data.user_email,
        phone: parsed.data.phone || null,
        group_size: parsed.data.group_size,
      })
      .select("position")
      .single();

    setSubmitting(false);

    if (error) {
      setErrors({ form: error.message });
      return;
    }

    setPosition(data.position);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center p-6 rounded-xl border-2" style={{ borderColor: `${secondaryColor}40`, backgroundColor: `${secondaryColor}10` }}>
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: secondaryColor }} />
        <h3 className="text-xl font-bold mb-2" style={{ color: "#1a1a1a" }}>You're on the Waitlist!</h3>
        <p className="text-sm mb-3" style={{ color: "#666" }}>
          Your position: <strong>#{position}</strong>
        </p>
        <p className="text-xs" style={{ color: "#999" }}>
          We'll email you at <strong>{email}</strong> when a spot opens up. You'll have 24 hours to claim it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-5 w-5" style={{ color: secondaryColor }} />
        <h3 className="text-lg font-bold" style={{ color: "#1a1a1a" }}>Join the Waitlist</h3>
      </div>
      <p className="text-sm" style={{ color: "#666" }}>
        This tournament is full, but spots may open up. Join the waitlist and we'll notify you automatically.
      </p>

      {errors.form && (
        <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">{errors.form}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Full Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" maxLength={100} />
          {errors.user_name && <p className="text-xs text-destructive mt-1">{errors.user_name}</p>}
        </div>
        <div>
          <Label>Email *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" maxLength={255} />
          {errors.user_email && <p className="text-xs text-destructive mt-1">{errors.user_email}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" maxLength={20} />
          </div>
          <div>
            <Label>Group Size</Label>
            <Select value={groupSize} onValueChange={setGroupSize}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxGroupSize }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} {n === 1 ? "player" : "players"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {depositCents > 0 && (
          <div className="rounded-md px-4 py-3 text-sm border" style={{ backgroundColor: `${secondaryColor}10`, borderColor: `${secondaryColor}30` }}>
            <p className="font-medium" style={{ color: "#1a1a1a" }}>
              💰 Optional: Pay a ${(depositCents / 100).toFixed(2)} deposit to secure your priority
            </p>
            <p className="text-xs mt-1" style={{ color: "#666" }}>
              Your deposit will be applied toward registration when a spot opens.
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full"
          style={{ backgroundColor: secondaryColor, color: primaryColor }}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          <Users className="h-4 w-4 mr-2" />
          Join Waitlist
        </Button>
      </form>
    </div>
  );
}
