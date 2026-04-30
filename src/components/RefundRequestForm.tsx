import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, RotateCcw } from "lucide-react";

interface RefundRequestFormProps {
  tournamentId: string;
  primaryColor: string;
  secondaryColor: string;
  prefillEmail?: string;
}

export default function RefundRequestForm({ tournamentId, primaryColor, secondaryColor, prefillEmail = "" }: RefundRequestFormProps) {
  const [email, setEmail] = useState(prefillEmail);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !reason.trim()) {
      setError("Please provide your email and reason for the refund request.");
      return;
    }

    setLoading(true);

    // Look up the most recent paid (non-refunded) registration for this email + tournament.
    // Note: we intentionally do NOT use .single() — a golfer may have multiple paid
    // registrations for the same tournament (e.g. group registrations or re-registrations).
    const { data: regs, error: lookupErr } = await supabase
      .from("tournament_registrations")
      .select("id, payment_status, tournament_id, email")
      .eq("tournament_id", tournamentId)
      .ilike("email", email.trim())
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(1) as any;

    const reg = regs?.[0];

    if (lookupErr || !reg) {
      setError("No paid registration found for this email. If you believe this is an error, please contact the tournament organizer directly.");
      setLoading(false);
      return;
    }

    // Get the registration fee to store amount
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("registration_fee_cents")
      .eq("id", tournamentId)
      .single() as any;

    const { error: insertErr } = await supabase
      .from("tournament_refund_requests")
      .insert({
        tournament_id: tournamentId,
        registration_id: reg.id,
        amount_cents: tournament?.registration_fee_cents || 0,
        reason: reason.trim(),
      } as any);

    if (insertErr) {
      setError("There was an error submitting your request. Please try again.");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="h-12 w-12 mx-auto mb-3" style={{ color: secondaryColor }} />
        <h3 className="text-lg font-bold mb-1" style={{ color: "#1a1a1a" }}>Request Submitted</h3>
        <p style={{ color: "#666" }} className="text-sm">
          Your refund request has been submitted and is under review. You'll receive a response via email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <RotateCcw className="h-4 w-4" style={{ color: primaryColor }} />
        <h3 className="font-bold" style={{ color: "#1a1a1a" }}>Request a Refund</h3>
      </div>
      <p className="text-sm" style={{ color: "#666" }}>
        If you need to cancel your registration, submit a refund request below. The tournament organizer will review your request.
      </p>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "#333" }}>
          Registration Email
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="The email you used to register"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "#333" }}>
          Reason for Refund
        </label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please explain why you're requesting a refund..."
          rows={3}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full"
        style={{ backgroundColor: primaryColor, color: "#ffffff" }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
        Submit Refund Request
      </Button>
    </form>
  );
}
