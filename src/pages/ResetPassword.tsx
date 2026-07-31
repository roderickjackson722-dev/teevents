import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";
import logoBlack from "@/assets/logo-black.png";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewSignup = searchParams.get("new") === "1";
  const workspaceType = searchParams.get("type");
  const leagueSlug = searchParams.get("league");
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!leagueSlug) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("golf_leagues")
        .select("league_name")
        .eq("league_slug", leagueSlug)
        .maybeSingle();
      setLeagueName(data?.league_name ?? null);
    })();
  }, [leagueSlug]);

  // Send league members back to their league portal, not the organizer app.
  const goAfterReset = async (userEmail?: string | null) => {
    if (!leagueSlug) {
      navigate(isNewSignup ? `/create-workspace${workspaceType ? `?type=${workspaceType}` : ""}` : "/get-started");
      return;
    }
    let code: string | null = null;
    if (userEmail) {
      const { data: lg } = await (supabase as any)
        .from("golf_leagues").select("id").eq("league_slug", leagueSlug).maybeSingle();
      if (lg) {
        const { data: found } = await (supabase as any).rpc("lookup_league_member_code_by_email", {
          _league_id: lg.id,
          _email: userEmail,
        });
        code = (typeof found === "string" ? found : null);
      }
    }
    navigate(code ? `/league/${leagueSlug}/me/${code}` : `/league/${leagueSlug}/score`);
  };

  const signInWithGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/league/${leagueSlug}/score?oauth=1`,
    });
    if ((result as any).error) {
      toast({ title: "Google sign-in failed", description: (result as any).error.message, variant: "destructive" });
      return;
    }
    if ((result as any).redirected) return;
    const { data } = await supabase.auth.getUser();
    await goAfterReset(data.user?.email);
  };


  useEffect(() => {
    let cancelled = false;

    // Listen for the PASSWORD_RECOVERY / SIGNED_IN events from the magic link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });

    (async () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const errorDescription = url.searchParams.get("error_description") || hashParams.get("error_description");
      if (errorDescription) {
        setLinkError(errorDescription);
        return;
      }

      // 1) Implicit flow: tokens arrive in the URL hash (#access_token=...&type=recovery)
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!cancelled) {
          if (error) setLinkError(error.message);
          else setReady(true);
        }
        return;
      }

      // 2) PKCE flow: ?code=...
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled) {
          if (error) setLinkError(error.message);
          else setReady(true);
        }
        return;
      }

      // 3) Verify-OTP flow: ?token_hash=...&type=recovery (admin-generated links)
      const tokenHash = url.searchParams.get("token_hash") || hashParams.get("token_hash");
      const linkType = url.searchParams.get("type") || hashParams.get("type");
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: (linkType as "recovery") || "recovery",
          token_hash: tokenHash,
        });
        if (!cancelled) {
          if (error) setLinkError(error.message);
          else setReady(true);
        }
        return;
      }

      // 4) Already signed in via an earlier redirect (e.g. page refresh)
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) setReady(true);
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: isNewSignup ? "Welcome to TeeVents!" : "Password updated!",
        description: leagueSlug
          ? `You're all set${leagueName ? ` for ${leagueName}` : ""} — taking you to your league.`
          : isNewSignup ? "Let's set up your workspace." : "You can now sign in with your new password.",
      });
      const { data } = await supabase.auth.getUser();
      await goAfterReset(data.user?.email);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-golf-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <div className="text-center mb-8">
            <img src={logoBlack} alt="TeeVents" className="h-14 w-14 mx-auto mb-4 object-contain" />
            <Lock className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h1 className="text-2xl font-display font-bold text-foreground">Set New Password</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {leagueSlug
                ? `Set a password for your ${leagueName ?? "league"} member account`
                : "Enter your new password below"}
            </p>
          </div>

          {!ready ? (
            <p className="text-center text-muted-foreground text-sm">
              {linkError
                ? `This reset link is no longer valid (${linkError}). `
                : "Verifying your reset link… If this takes too long, "}
              request a new reset from the{" "}
              <a
                href={leagueSlug ? `/league/${leagueSlug}/score` : "/get-started"}
                className="text-primary font-semibold hover:underline"
              >
                sign in page
              </a>.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          )}

          {leagueSlug && (
            <div className="mt-6 border-t border-border pt-5 space-y-3 text-center">
              <p className="text-xs text-muted-foreground">Or skip the password and use Google</p>
              <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
                Sign in with Google
              </Button>
              <p className="text-xs text-muted-foreground">
                Not registered yet?{" "}
                <a href={`/league/${leagueSlug}/register`} className="text-primary font-semibold hover:underline">
                  Join {leagueName ?? "this league"}
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
