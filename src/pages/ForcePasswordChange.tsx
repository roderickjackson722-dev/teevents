import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import logoBlack from "@/assets/logo-black.png";

const PERMISSION_ROUTES: Record<string, string> = {
  manage_players: "/dashboard/players",
  manage_registration: "/dashboard/registration",
  manage_budget: "/dashboard/budget",
  manage_sponsors: "/dashboard/sponsors",
  manage_messages: "/dashboard/email-templates",
  manage_leaderboard: "/dashboard/leaderboard",
  manage_store: "/dashboard/store",
  manage_auction: "/dashboard/auction",
  manage_gallery: "/dashboard/gallery",
  manage_volunteers: "/dashboard/volunteers",
  manage_surveys: "/dashboard/surveys",
  manage_donations: "/dashboard/donations",
  manage_check_in: "/dashboard/check-in",
  manage_settings: "/dashboard/settings",
};

const ForcePasswordChange = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/get-started");
        return;
      }
      // If the flag isn't set, send them to the dashboard
      if (!session.user.user_metadata?.force_password_change) {
        navigate("/dashboard");
        return;
      }
      setChecking(false);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: { force_password_change: false },
      });
      if (error) throw error;

      toast.success("Password updated — welcome aboard!");

      // Route to the first page the user has permission for
      const { data: { user } } = await supabase.auth.getUser();
      let landing = "/dashboard";
      if (user) {
        const { data: member } = await supabase
          .from("org_members")
          .select("role, permissions")
          .eq("user_id", user.id)
          .limit(1)
          .single();
        if (member) {
          if (member.role === "owner" || member.role === "admin") {
            landing = "/dashboard";
          } else {
            const perms: string[] = (member.permissions as any) || [];
            const first = perms.find((p) => PERMISSION_ROUTES[p]);
            if (first) landing = PERMISSION_ROUTES[first];
          }
        }
      }
      navigate(landing);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-golf-cream">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-golf-cream flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-8 shadow-lg">
        <div className="text-center mb-6">
          <img src={logoBlack} alt="TeeVents" className="h-12 w-12 mx-auto mb-4 object-contain" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure your account
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Set Your Password</h1>
          <p className="text-sm text-muted-foreground mt-2">
            For security, please replace your temporary password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pw">New Password</Label>
            <Input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoFocus
              required
              minLength={8}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="pw2">Confirm Password</Label>
            <Input
              id="pw2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              required
              minLength={8}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save & Continue
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
