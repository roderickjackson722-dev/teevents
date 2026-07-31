import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, KeyRound, Mail } from "lucide-react";

export default function LeagueMemberLogin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const eventId = params.get("event");
  const [league, setLeague] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: lg } = await (supabase as any).from("golf_leagues").select("id, league_name, league_slug").eq("league_slug", slug).maybeSingle();
      setLeague(lg);
      if (eventId && lg) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
        if (!isUuid) {
          setEventError("The event link is malformed.");
          return;
        }
        const { data: ev } = await (supabase as any)
          .from("league_events").select("id, event_name, event_date, league_id")
          .eq("id", eventId).maybeSingle();
        if (!ev || ev.league_id !== lg.id) setEventError("That event no longer exists or belongs to another league.");
        else setEvent(ev);
      }
    })();
  }, [slug, eventId]);

  const goToPortal = (memberCode: string) => {
    if (eventId && !eventError) navigate(`/league/${slug}/register/${memberCode}?event=${eventId}`);
    else navigate(`/league/${slug}/me/${memberCode}`);
  };

  // Resolve the signed-in user's member record for this league.
  const resolveSignedInMember = async (userEmail: string) => {
    if (!league) return;
    const { data: found } = await (supabase as any).rpc("lookup_league_member_code_by_email", {
      _league_id: league.id,
      _email: userEmail,
    });
    const memberCode = typeof found === "string" ? found : null;
    if (!memberCode) {
      toast({
        title: "No membership found",
        description: `${userEmail} isn't a member of this league yet. Register first.`,
        variant: "destructive",
      });
      return;
    }
    goToPortal(memberCode);
  };

  // If the member returns from Google OAuth already signed in, forward them.
  useEffect(() => {
    if (!league) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userEmail = data.user?.email;
      if (userEmail && params.get("oauth") === "1") await resolveSignedInMember(userEmail);
    })();
  }, [league]);

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6 || !league) {
      toast({ title: "Enter your 6-character code", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: rows } = await (supabase as any).rpc("lookup_league_member_by_code", {
      _league_slug: slug || null,
      _code: clean,
    });
    setLoading(false);
    const match = Array.isArray(rows) ? rows[0] : rows;
    if (!match) {
      toast({ title: "Code not recognized", variant: "destructive" });
      return;
    }
    goToPortal(match.scoring_code || clean);
  };

  // Email-only sign in: match the address against the league roster and forward
  // the member to their portal. No password required.
  const submitEmailOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !league) return toast({ title: "Enter your email address", variant: "destructive" });
    setEmailLoading(true);
    await resolveSignedInMember(email.trim().toLowerCase());
    setEmailLoading(false);
  };

  const submitEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return toast({ title: "Enter your email and password", variant: "destructive" });
    setEmailLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setEmailLoading(false);
    if (error) return toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    await resolveSignedInMember(email.trim());
  };


  const signInWithGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/league/${slug}/score?oauth=1${eventId ? `&event=${eventId}` : ""}`,
    });
    if ((result as any).error) {
      return toast({ title: "Google sign-in failed", description: (result as any).error.message, variant: "destructive" });
    }
    if ((result as any).redirected) return;
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) await resolveSignedInMember(data.user.email);
  };

  const resetPassword = async () => {
    if (!email.trim()) return toast({ title: "Enter your email first" });
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password?league=${encodeURIComponent(slug || "")}`,
    });
    if (error) return toast({ title: "Could not send reset email", description: error.message, variant: "destructive" });
    toast({ title: "Password reset email sent" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>League Member Login</CardTitle>
          {league && <p className="text-sm text-muted-foreground">{league.league_name}</p>}
          {event && <p className="text-xs text-primary mt-1">Registering for: <span className="font-medium">{event.event_name} — {event.event_date}</span></p>}
        </CardHeader>
        <CardContent className="space-y-5">
          {eventError ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-destructive">{eventError}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/league/${slug}`)}>
                Back to league
              </Button>
            </div>
          ) : (
            <>
              {/* Login code */}
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4" /> Use Login Code</p>
                <form onSubmit={submitCode} className="space-y-3">
                  <Input
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                    placeholder="ABC123"
                    className="text-center text-3xl font-mono tracking-[0.5em] h-16"
                  />
                  <Button type="submit" className="w-full h-12" disabled={loading || code.length !== 6}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue →"}
                  </Button>
                </form>
                <p className="text-xs text-center text-muted-foreground">Your code was provided by your league organizer.</p>
              </div>

              {/* Email login (no password needed) */}
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Email Login</p>
                <form onSubmit={submitEmailOnly} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lm-email">Email</Label>
                    <Input id="lm-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={emailLoading}>
                    {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In with Email"}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  Use the email address your league manager has on file — no password required.
                </p>

                <div className="pt-2 border-t space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Have a TeeVents password?</p>
                  <form onSubmit={submitEmailPassword} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="lm-pass">Password</Label>
                      <Input id="lm-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" variant="secondary" className="w-full" disabled={emailLoading}>
                      {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In with Password"}
                    </Button>
                  </form>
                  <Button variant="link" size="sm" className="px-0" onClick={resetPassword}>Forgot password or code? Reset it here</Button>
                </div>
              </div>


              {/* Google */}
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm font-semibold">Login with Google</p>
                <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
                  Sign in with Google
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Not a member yet? <Link className="underline" to={`/league/${slug}/register`}>Join this league</Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
