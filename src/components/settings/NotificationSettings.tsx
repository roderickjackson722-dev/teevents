import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Trash2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface NotificationSettingsProps {
  orgId: string;
}

interface NotifEmail {
  id: string;
  email: string;
  notify_registration: boolean;
  notify_donation: boolean;
  notify_store_purchase: boolean;
  notify_auction_bid: boolean;
}

const EVENT_TYPES = [
  { key: "notify_registration", label: "New Registration" },
  { key: "notify_donation", label: "New Donation" },
  { key: "notify_store_purchase", label: "Store Purchase" },
  { key: "notify_auction_bid", label: "Auction Bid" },
] as const;

export function NotificationSettings({ orgId }: NotificationSettingsProps) {
  const [emails, setEmails] = useState<NotifEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [orgId]);

  const fetchEmails = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notification_emails")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at");
    setEmails((data as any) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setAdding(true);
    const { error } = await supabase.from("notification_emails").insert({
      organization_id: orgId,
      email: newEmail.trim().toLowerCase(),
    } as any);

    if (error) {
      if (error.code === "23505") toast.error("This email is already added");
      else toast.error(error.message);
    } else {
      toast.success("Notification email added");
      setNewEmail("");
      fetchEmails();
    }
    setAdding(false);
  };

  const handleToggle = async (emailId: string, field: string, value: boolean) => {
    const { error } = await supabase
      .from("notification_emails")
      .update({ [field]: value } as any)
      .eq("id", emailId);
    if (error) toast.error(error.message);
    else {
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, [field]: value } : e))
      );
    }
  };

  const handleRemove = async (emailId: string) => {
    const { error } = await supabase
      .from("notification_emails")
      .delete()
      .eq("id", emailId);
    if (error) toast.error(error.message);
    else {
      toast.success("Notification email removed");
      fetchEmails();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-card rounded-lg border border-border p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <Bell className="h-6 w-6 text-secondary" />
        <h2 className="text-lg font-display font-bold text-foreground">
          Email Notifications
        </h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Add email addresses that should receive notifications when players register, donate, make purchases, or place auction bids.
      </p>

      {/* Add Email */}
      <div className="flex gap-2 mb-6">
        <Input
          type="email"
          placeholder="notify@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={adding || !newEmail.trim()}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Add
        </Button>
      </div>

      {/* Email List */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : emails.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No notification emails configured yet. Add an email above to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {emails.map((emailRow) => (
            <div
              key={emailRow.id}
              className="p-4 rounded-lg border border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">{emailRow.email}</span>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(emailRow.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {EVENT_TYPES.map((evt) => (
                  <div key={evt.key} className="flex items-center gap-2">
                    <Switch
                      checked={(emailRow as any)[evt.key]}
                      onCheckedChange={(val) => handleToggle(emailRow.id, evt.key, val)}
                    />
                    <Label className="text-xs text-muted-foreground cursor-pointer">
                      {evt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
