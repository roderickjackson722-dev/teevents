import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import logoBlack from "@/assets/logo-black.png";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const AGREEMENT_ITEMS = [
  {
    id: "stripe_fee",
    label: "I understand that Stripe's standard processing fee of 2.9% + $0.30 per transaction applies to all payments processed through my tournament.",
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

const CustomerAuth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreements, setAgreements] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const allAgreed = isSignUp
    ? AGREEMENT_ITEMS.every((item) => agreements[item.id])
    : true;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        checkUserOrg(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkUserOrg(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserOrg = async (userId: string) => {
    const { data } = await supabase
      .from("org_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1);

    if (data && data.length > 0) {
      navigate("/dashboard");
    } else {
      navigate("/onboarding");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Check your email",
        description: "We sent a password reset link to your email address.",
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      if (password !== confirmPassword) {
        toast({ title: "Passwords don't match", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!allAgreed) {
        toast({ title: "Please accept all agreements", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Check your email",
          description: "We sent a confirmation link to verify your account.",
        });
        // Notify admin of new signup (fire and forget)
        supabase.functions.invoke("notify-new-signup", {
          body: { email },
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-golf-cream flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <div className="text-center mb-8">
            <img src={logoBlack} alt="TeeVents" className="h-14 w-14 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-display font-bold text-foreground">
              {isForgotPassword
                ? "Reset Password"
                : isSignUp
                ? "Get Started Free"
                : "Welcome Back"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isForgotPassword
                ? "Enter your email and we'll send a reset link"
                : isSignUp
                ? "Create your account to start managing tournaments"
                : "Sign in to manage your tournaments"}
            </p>
          </div>

          {/* Forgot Password Form */}
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-primary font-semibold hover:underline"
                >
                  Back to Sign In
                </button>
              </p>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@organization.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
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
                {isSignUp && (
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                )}

                {/* Agreement checkboxes for signup */}
                {isSignUp && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      Free Platform Agreement
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      {AGREEMENT_ITEMS.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-start gap-3 cursor-pointer group"
                        >
                          <Checkbox
                            checked={!!agreements[item.id]}
                            onCheckedChange={(checked) =>
                              setAgreements((prev) => ({ ...prev, [item.id]: !!checked }))
                            }
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

                <Button type="submit" className="w-full" disabled={loading || (isSignUp && !allAgreed)}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </form>

              {/* Forgot password link (sign-in only) */}
              {!isSignUp && (
                <p className="text-center text-sm mt-3">
                  <button
                    onClick={() => setIsForgotPassword(true)}
                    className="text-muted-foreground hover:text-primary transition-colors hover:underline"
                  >
                    Forgot your password?
                  </button>
                </p>
              )}

              <p className="text-center text-sm text-muted-foreground mt-6">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAgreements({});
                  }}
                  className="text-primary font-semibold hover:underline"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuth;
