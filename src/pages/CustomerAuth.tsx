import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { checkAuthRateLimit } from "@/lib/authRateLimit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import logoBlack from "@/assets/logo-black.png";
import { ArrowLeft, Loader2, FileText, CheckCircle2, CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";

const BASE_AGREEMENT_ITEMS = [
  {
    id: "platform_fee_5",
    label: (
      <>
        I understand that TeeVents charges a 5% platform fee per transaction.{" "}
        <strong className="text-foreground">I can choose to pass this fee to my registrants (golfers — recommended) or absorb it myself.</strong>{" "}
        This fee is automatically deducted at checkout.{" "}
        <a href="/help/fees-and-hold" target="_blank" className="text-primary underline">See how it works</a>.
      </>
    ),
  },
  {
    id: "stripe_fee",
    label: "I understand that Stripe's standard processing fee of 2.9% + $0.30 per transaction applies to all payments processed through my tournament. This fee can also be passed to registrants or absorbed by my organization.",
  },
  {
    id: "stripe_connect",
    label: "I agree to connect a Stripe account to receive payouts and understand that I am responsible for setting up and maintaining my Stripe account.",
  },
  {
    id: "terms_agreement",
    label: (
      <>
        I have read and agree to the{" "}
        <a href="/terms-of-service" target="_blank" className="text-primary underline">Terms of Service</a>{" "}
        and{" "}
        <a href="/privacy-policy" target="_blank" className="text-primary underline">Privacy Policy</a>.
      </>
    ),
  },
];

const FREE_PLAN_AGREEMENT_ITEM = {
  id: "platform_fee",
  label: (
    <>
      I understand that TeeVents charges a 5% platform fee per transaction.{" "}
      <strong className="text-foreground">I can choose to pass this fee to my registrants (golfers — recommended) or absorb it myself.</strong>{" "}
      Standard Stripe processing fees (2.9% + $0.30) also apply and can be passed to registrants or absorbed.
    </>
  ),
};

const PLANNING_OPTIONS = [
  { value: "scheduled", label: "Yes, we have a date scheduled" },
  { value: "planning", label: "We are planning but don't have a date yet" },
  { value: "browsing", label: "I'm just browsing / exploring" },
];

const ROLE_OPTIONS = [
  "Tournament Organizer / Director",
  "Team member working for an organizer",
  "Golf club staff",
  "Nonprofit / charity staff",
  "Corporate event planner",
];

const HEARD_FROM_OPTIONS = [
  { value: "google", label: "Google / Search" },
  { value: "social", label: "Social media (Facebook, Instagram, etc.)" },
  { value: "referral", label: "Referral from another organizer" },
  { value: "platform", label: "Eventbrite / GiveButter / Other platform" },
];

const CustomerAuth = () => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const isFreePlan = params.get("plan") === "free";
  const redirectParam = params.get("redirect") || "";
  const isInviteFlow = redirectParam.includes("accept-invitation") || params.get("invite") === "1";

  const AGREEMENT_ITEMS = isFreePlan
    ? [FREE_PLAN_AGREEMENT_ITEM, ...BASE_AGREEMENT_ITEMS]
    : BASE_AGREEMENT_ITEMS;
  const [agreements, setAgreements] = useState<Record<string, boolean>>({});

  // Vetting state
  const [planningStatus, setPlanningStatus] = useState<string>("");
  const [roles, setRoles] = useState<string[]>([]);
  const [roleOther, setRoleOther] = useState("");
  const [heardFrom, setHeardFrom] = useState<string>("");
  const [heardFromOther, setHeardFromOther] = useState("");

  // Demo request page state
  const [showDemoPage, setShowDemoPage] = useState(false);
  const [demoTournamentName, setDemoTournamentName] = useState("");
  const [demoExpectedPlayers, setDemoExpectedPlayers] = useState("");
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const allAgreed = isSignUp
    ? AGREEMENT_ITEMS.every((item) => agreements[item.id])
    : true;

  const vettingComplete =
    isInviteFlow ||
    (planningStatus && (roles.length > 0 || roleOther.trim()) && (heardFrom && (heardFrom !== "other" || heardFromOther.trim())));

  useEffect(() => {
    // Route signup traffic to the new unified /signup flow.
    // Signin (?mode=signin) and invite flows still use this page.
    const mode = params.get("mode");
    if (mode !== "signin" && !isInviteFlow) {
      navigate("/signup" + (window.location.search || ""), { replace: true });
      return;
    }
    if (params.get("plan") === "free") setIsSignUp(true);
    if (mode === "signin") setIsSignUp(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) checkUserOrg(session.user.id);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkUserOrg(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkUserOrg = async (userId: string) => {
    const { data } = await supabase
      .from("org_members")
      .select("organization_id")
      .eq("user_id", userId);
    if (redirectParam && redirectParam.startsWith("/")) {
      navigate(redirectParam);
      return;
    }
    if (!data || data.length === 0) {
      navigate("/create-workspace");
      return;
    }
    const orgIds = data.map((r: any) => r.organization_id);
    const [{ count: tCount }, { count: lCount }] = await Promise.all([
      (supabase as any).from("tournaments").select("id", { count: "exact", head: true }).in("organization_id", orgIds),
      (supabase as any).from("golf_leagues").select("id", { count: "exact", head: true }).in("organization_id", orgIds),
    ]);
    const hasT = (tCount || 0) > 0;
    const hasL = (lCount || 0) > 0;
    if (hasT && hasL) navigate("/select-workspace");
    else if (hasL && !hasT) navigate("/dashboard/leagues");
    else navigate("/dashboard");
  };

  const toggleRole = (r: string) => {
    setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const rl = await checkAuthRateLimit("password_reset");
    if (!rl.allowed) {
      toast({ title: "Too many attempts", description: rl.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Check your email", description: "We sent a password reset link." });
    setLoading(false);
  };

  const submitDemoRequestOnly = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("demo_requests" as any).insert({
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        tournament_name: demoTournamentName.trim() || null,
        expected_players: demoExpectedPlayers ? parseInt(demoExpectedPlayers, 10) : null,
        role: roles.join(", ") + (roleOther ? ` (Other: ${roleOther})` : ""),
        heard_from: heardFrom === "other" ? `Other: ${heardFromOther}` : heardFrom,
        planning_status: planningStatus,
        status: "pending",
      });
      if (error) throw error;

      await supabase.functions.invoke("notify-new-signup", {
        body: {
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          planning_status: planningStatus,
          roles,
          role_other: roleOther,
          heard_from: heardFrom,
          heard_from_other: heardFromOther,
          vetting_status: "demo_requested",
          tournament_name: demoTournamentName.trim(),
          expected_players: demoExpectedPlayers ? parseInt(demoExpectedPlayers, 10) : null,
        },
      });
      setDemoSubmitted(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      if (password !== confirmPassword) {
        toast({ title: "Passwords don't match", variant: "destructive" });
        setLoading(false); return;
      }
      if (!allAgreed) {
        toast({ title: "Please accept all agreements", variant: "destructive" });
        setLoading(false); return;
      }
      if (!fullName.trim()) {
        toast({ title: "Please enter your full name", variant: "destructive" });
        setLoading(false); return;
      }
      if (!phone.trim()) {
        toast({ title: "Please enter a contact phone number", variant: "destructive" });
        setLoading(false); return;
      }
      if (!isInviteFlow && !vettingComplete) {
        toast({ title: "Please answer the vetting questions", variant: "destructive" });
        setLoading(false); return;
      }

      // Route based on planning_status (unless invite flow)
      if (!isInviteFlow && planningStatus !== "scheduled") {
        setShowDemoPage(true);
        setLoading(false);
        return;
      }

      // Approved → create account
      const rlSignup = await checkAuthRateLimit("signup");
      if (!rlSignup.allowed) {
        toast({ title: "Too many attempts", description: rlSignup.message, variant: "destructive" });
        setLoading(false); return;
      }
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName.trim(), phone: phone.trim() },
        },
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setLoading(false); return;
      }

      // Persist vetting + notify
      if (signUpData.user) {
        await supabase.from("signup_vetting" as any).insert({
          user_id: signUpData.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          planning_status: planningStatus || null,
          roles: roles.length ? roles : null,
          role_other: roleOther || null,
          heard_from: heardFrom || null,
          heard_from_other: heardFromOther || null,
          vetting_status: isInviteFlow ? "approved_invite" : "approved",
        });
      }

      // Fire admin + welcome emails (non-blocking)
      supabase.functions.invoke("notify-new-signup", {
        body: {
          email,
          full_name: fullName.trim(),
          phone: phone.trim(),
          planning_status: planningStatus,
          roles,
          role_other: roleOther,
          heard_from: heardFrom,
          heard_from_other: heardFromOther,
          vetting_status: isInviteFlow ? "approved" : "approved",
        },
      });
      supabase.functions.invoke("send-organizer-welcome", {
        body: { email, full_name: fullName.trim(), plan: "Base" },
      });

      recordSecurityEvent({
        data: { actionType: "signup", userEmail: email, userId: signUpData.user?.id ?? null },
      }).catch(() => null);

      // Auto-login: if signup didn't return a session (email confirmation required),
      // attempt an immediate password sign-in so the user lands on the dashboard.
      let hasSession = !!signUpData.session;
      if (!hasSession) {
        const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
        hasSession = !!signInData?.session;
      }
      if (hasSession) {
        toast({ title: "Welcome to TeeVents!", description: "Your account is ready." });
        navigate("/onboarding");
      } else {
        toast({
          title: "Check your email",
          description: "Please confirm your email to finish activating your account.",
        });
      }
    } else {
      const rlLogin = await checkAuthRateLimit("login");
      if (!rlLogin.allowed) {
        toast({ title: "Too many attempts", description: rlLogin.message, variant: "destructive" });
        setLoading(false); return;
      }
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const check = await recordSecurityEvent({
          data: { actionType: "login_failed", userEmail: email },
        }).catch(() => null);
        toast({
          title: "Error",
          description: check?.message || signInError.message,
          variant: "destructive",
        });
      } else {
        const check = await recordSecurityEvent({
          data: { actionType: "login", userEmail: email, userId: signInData?.user?.id ?? null },
        }).catch(() => null);
        if (check && check.allow === false) {
          await supabase.auth.signOut();
          toast({
            title: "Sign-in blocked",
            description: check.message || "This account cannot sign in.",
            variant: "destructive",
          });
        }
      }
    }

    setLoading(false);
  };

  // ----- Demo Request Page -----
  if (showDemoPage) {
    return (
      <div className="min-h-screen bg-golf-cream flex items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
            {demoSubmitted ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
                <h1 className="text-2xl font-display font-bold">Thanks, {fullName.split(" ")[0]}!</h1>
                <p className="text-muted-foreground">
                  Our team will reach out within 1 business day to schedule your free 15-minute demo.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => window.open("https://calendly.com/teevents/demo", "_blank")}
                >
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  Or book a time now
                </Button>
                <div className="pt-6 border-t border-border">
                  <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Back to home</Link>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <img src={logoBlack} alt="TeeVents" className="h-12 w-12 mx-auto mb-3 object-contain" />
                  <h1 className="text-2xl font-display font-bold">Let's find the right plan for you</h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    We noticed you're still planning your tournament. That's completely fine!
                    Schedule a free 15-min demo with our team. We'll walk you through the platform
                    and answer your questions.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label>Tournament Name (if known)</Label>
                    <Input value={demoTournamentName} onChange={(e) => setDemoTournamentName(e.target.value)} placeholder="Spring Charity Classic" />
                  </div>
                  <div>
                    <Label>Expected Players</Label>
                    <Input type="number" value={demoExpectedPlayers} onChange={(e) => setDemoExpectedPlayers(e.target.value)} placeholder="100" />
                  </div>
                  <Button className="w-full" onClick={submitDemoRequestOnly} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Schedule Demo →
                  </Button>
                  <div className="text-center text-xs text-muted-foreground pt-3 border-t border-border">
                    Already have an invite from an organizer?{" "}
                    <Link to="/accept-invitation" className="text-primary underline">Click here to accept</Link>.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDemoPage(false)}
                    className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
                  >
                    ← Back to signup
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-golf-cream flex items-center justify-center px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <div className="text-center mb-6">
            <img src={logoBlack} alt="TeeVents" className="h-14 w-14 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-display font-bold text-foreground">
              {isForgotPassword ? "Reset Password" : isSignUp ? "Create Your Free Account" : "Welcome Back"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isForgotPassword
                ? "Enter your email and we'll send a reset link"
                : isSignUp
                ? "Start free in under 2 minutes — no credit card required"
                : "Sign in to manage your tournaments"}
            </p>
          </div>

          {!isForgotPassword && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg mb-6">
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setAgreements({}); }}
                className={`py-2 px-4 rounded-md text-sm font-semibold transition-all ${isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >Sign Up</button>
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setAgreements({}); }}
                className={`py-2 px-4 rounded-md text-sm font-semibold transition-all ${!isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >Sign In</button>
            </div>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organization.com" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <button type="button" onClick={() => setIsForgotPassword(false)} className="text-primary font-semibold hover:underline">
                  Back to Sign In
                </button>
              </p>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <>
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required maxLength={100} />
                    </div>
                    <div>
                      <Label htmlFor="phone">Contact Phone Number</Label>
                      <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" required maxLength={20} />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organization.com" required />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                </div>
                {isSignUp && (
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                  </div>
                )}

                {isSignUp && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      {isFreePlan ? "Free Plan Agreement" : "Platform Agreement"}
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      {AGREEMENT_ITEMS.map((item) => (
                        <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                          <Checkbox
                            checked={!!agreements[item.id]}
                            onCheckedChange={(checked) => setAgreements((prev) => ({ ...prev, [item.id]: !!checked }))}
                            className="mt-0.5"
                          />
                          <span className="text-xs leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vetting Questions */}
                {isSignUp && !isInviteFlow && (
                  <div className="space-y-4 pt-2">
                    <div className="text-sm font-semibold text-foreground">Tell us about your tournament</div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-5">
                      {/* Q1 */}
                      <div>
                        <div className="text-xs font-semibold mb-2">1. Do you have a golf tournament currently planned?</div>
                        <div className="space-y-2">
                          {PLANNING_OPTIONS.map((opt) => (
                            <label key={opt.value} className="flex items-start gap-2 cursor-pointer text-xs">
                              <input
                                type="radio"
                                name="planning"
                                value={opt.value}
                                checked={planningStatus === opt.value}
                                onChange={(e) => setPlanningStatus(e.target.value)}
                                className="mt-0.5"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Q2 */}
                      <div>
                        <div className="text-xs font-semibold mb-2">2. What is your role? (select all that apply)</div>
                        <div className="space-y-2">
                          {ROLE_OPTIONS.map((r) => (
                            <label key={r} className="flex items-start gap-2 cursor-pointer text-xs">
                              <Checkbox
                                checked={roles.includes(r)}
                                onCheckedChange={() => toggleRole(r)}
                                className="mt-0.5"
                              />
                              <span>{r}</span>
                            </label>
                          ))}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs text-muted-foreground">Other:</span>
                            <Input
                              value={roleOther}
                              onChange={(e) => setRoleOther(e.target.value)}
                              placeholder="Describe your role"
                              className="h-7 text-xs"
                              maxLength={80}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Q3 */}
                      <div>
                        <div className="text-xs font-semibold mb-2">3. How did you hear about TeeVents?</div>
                        <div className="space-y-2">
                          {HEARD_FROM_OPTIONS.map((opt) => (
                            <label key={opt.value} className="flex items-start gap-2 cursor-pointer text-xs">
                              <input
                                type="radio"
                                name="heard"
                                value={opt.value}
                                checked={heardFrom === opt.value}
                                onChange={(e) => setHeardFrom(e.target.value)}
                                className="mt-0.5"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                          <label className="flex items-start gap-2 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name="heard"
                              value="other"
                              checked={heardFrom === "other"}
                              onChange={(e) => setHeardFrom(e.target.value)}
                              className="mt-0.5"
                            />
                            <span className="flex-1 flex items-center gap-2">
                              Other:
                              <Input
                                value={heardFromOther}
                                onChange={(e) => setHeardFromOther(e.target.value)}
                                placeholder="Tell us"
                                className="h-7 text-xs"
                                maxLength={80}
                                disabled={heardFrom !== "other"}
                              />
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading || (isSignUp && (!allAgreed || !vettingComplete))}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </form>

              {!isSignUp && (
                <p className="text-center text-sm mt-3">
                  <button onClick={() => setIsForgotPassword(true)} className="text-muted-foreground hover:text-primary transition-colors hover:underline">
                    Forgot your password?
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuth;
