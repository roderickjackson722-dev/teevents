import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const ChangePasswordCard = () => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const strongEnough = (pw: string) =>
    pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return toast.error("Enter your current password");
    if (!strongEnough(next))
      return toast.error("New password must be at least 8 characters and include a letter and a number");
    if (next !== confirm) return toast.error("New passwords don't match");
    if (next === current) return toast.error("New password must differ from the current password");

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No active session");

      // Re-verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (verifyError) {
        toast.error("Current password is incorrect");
        setSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: next,
        data: { force_password_change: false },
      });
      if (error) throw error;

      toast.success("Password updated successfully");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-lg border border-border p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <KeyRound className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-display font-bold text-foreground">Change Password</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        For your security, you'll need to enter your current password before setting a new one.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <Label htmlFor="current-pw">Current password</Label>
          <Input
            id="current-pw"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="new-pw">New password</Label>
          <Input
            id="new-pw"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="At least 8 characters, letter + number"
            className="mt-1"
            minLength={8}
            required
          />
        </div>
        <div>
          <Label htmlFor="confirm-pw">Confirm new password</Label>
          <Input
            id="confirm-pw"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1"
            minLength={8}
            required
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
          Update password
        </Button>
      </form>
    </motion.div>
  );
};

export default ChangePasswordCard;
