import { markVettingEmailVerified } from "@/lib/vetting.functions";
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
        setLinkError(null);
        setReady(true);
      }
    });

    // A recovery session may already be established by the Supabase client
    // (it consumes the URL hash itself), or by an earlier hit on the same link.
    const sessionFallback = async (tries = 8): Promise<boolean> => {
      for (let i = 0; i < tries; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return true;
        if (cancelled) return false;
        await new Promise((r) => setTimeout(r, 400));
      }
      return false;
    };

    const settle = async (error: string | null) => {
      if (cancelled) return;
      if (!error) {
        setLinkError(null);
        setReady(true);
        return;
      }
      // Token errors are common when a link is opened twice or pre-fetched by an
      // email scanner. If we still have a valid session, let them set a password.
      if (await sessionFallback(3)) {
        if (cancelled) return;
        setLinkError(null);
        setReady(true);
        return;
      }
      if (!cancelled) setLinkError(error);
    };

    (async () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const errorDescription = url.searchParams.get("error_description") || hashParams.get("error_description");
      if (errorDescription) {
        await settle(errorDescription);
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
        await settle(error?.message ?? null);
        return;
      }

      // 2) PKCE flow: ?code=...
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        await settle(error?.message ?? null);
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
        await settle(error?.message ?? null);
        return;
      }

      // 4) Six-digit / raw token links: ?token=...&email=...
      const rawToken = url.searchParams.get("token");
      const tokenEmail = url.searchParams.get("email");
      if (rawToken && tokenEmail) {
        const { error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token: rawToken,
          email: tokenEmail,
        });
        await settle(error?.message ?? null);
        return;
      }

      // 5) Already signed in via an earlier redirect (e.g. page refresh)
      const hasSession = await sessionFallback();
      if (cancelled) return;
      if (hasSession) setReady(true);
      else setLinkError("We couldn't find a valid reset link.");
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  const resendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = resendEmail.trim().toLowerCase();
    if (!target) return;
    setResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password${leagueSlug ? `?league=${encodeURIComponent(leagueSlug)}` : ""}`,
    });
    setResending(false);
    if (error) {
      toast({ title: "Couldn't send the link", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "New link sent",
      description: `Check ${target} for a fresh password reset link. Open it in the same browser and only click it once.`,
    });
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast({
        title: "A fresh reset link is required",
        description: "Enter your email below and we’ll send a new secure link.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      if (isNewSignup) {
        markVettingEmailVerified().catch(() => {});
      }
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

          {!ready && !linkError && (
            <p className="mb-4 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying your reset link…
            </p>
          )}

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
              <Button type="submit" className="w-full" disabled={loading || !ready}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {ready ? "Update Password" : "Waiting for secure reset link"}
              </Button>
          </form>

          {linkError && (
            <div className="mt-6 space-y-4 border-t border-border pt-5">
              <p className="text-sm text-muted-foreground text-center">
                This reset link has already been used or has expired. Enter your email and we'll send you a
                fresh one right now.
              </p>
              <form onSubmit={resendLink} className="space-y-3">
                <div>
                  <Label htmlFor="resend-email">Email</Label>
                  <Input
                    id="resend-email"
                    type="email"
                    autoComplete="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resending}>
                  {resending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send me a new link
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center">
                Open the new link in the same browser. Or{" "}
                <a
                  href={leagueSlug ? `/league/${leagueSlug}/score` : "/get-started"}
                  className="text-primary font-semibold hover:underline"
                >
                  sign in
                </a>{" "}
                if you remember your password.
              </p>
            </div>
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
