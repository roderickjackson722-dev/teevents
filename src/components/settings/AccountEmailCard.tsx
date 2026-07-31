import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const AccountEmailCard = () => {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.auth.getUser();
    setCurrentEmail(data.user?.email ?? null);
    setPendingEmail((data.user as any)?.new_email ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Enter a valid email address");
    if (email === (currentEmail || "").toLowerCase()) return toast.error("That's already your email on file");

    setSaving(true);
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/dashboard/settings` }
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    setPendingEmail(email);
    setNewEmail("");
    toast.success("Confirmation sent — check both inboxes to finish the change");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 }}
      className="bg-card rounded-lg border border-border p-6"
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
          <Mail className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">Email on File</h2>
          <p className="text-sm text-muted-foreground">
            This is your login email and where account notices are sent.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-border bg-muted/40 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Current email</p>
        <p className="font-medium text-foreground break-all">
          {loading ? "Loading…" : currentEmail || "No email on file"}
        </p>
        {pendingEmail && (
          <p className="text-xs text-amber-600 mt-2">
            Pending change to <span className="font-medium break-all">{pendingEmail}</span> — confirm the link we
            emailed to finish.
          </p>
        )}
      </div>

      <form onSubmit={handleSave} className="mt-5 space-y-3 max-w-md">
        <div className="space-y-1.5">
          <Label htmlFor="account-email">Change or add email</Label>
          <Input
            id="account-email"
            type="email"
            autoComplete="email"
            placeholder="you@organization.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            For security, we email a confirmation link to both the old and new address. The change takes effect once
            confirmed.
          </p>
        </div>
        <Button type="submit" disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Update Email
        </Button>
      </form>
    </motion.div>
  );
};
