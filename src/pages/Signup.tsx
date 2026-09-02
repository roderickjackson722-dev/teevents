import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trophy, Flag, Loader2, CheckCircle2, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import logo from "@/assets/logo-black.png";

type Step = "interest" | "details" | "sent";
type Interest = "tournament" | "league";

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("interest");
  const [loading, setLoading] = useState(false);

  const [interest, setInterest] = useState<Interest | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orgName, setOrgName] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [heardFrom, setHeardFrom] = useState("");
  const [heardFromOther, setHeardFromOther] = useState("");

  const handleSubmit = async () => {
    if (!interest || !fullName.trim() || !email.trim()) {
      toast({ title: "Missing info", description: "Please fill in your name and email.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("signup-with-vetting", {
        body: {
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          organization_name: orgName.trim() || null,
          interest_area: interest,
          heard_from: heardFrom || null,
          heard_from_other: heardFrom === "other" ? heardFromOther : null,
          primary_goal: primaryGoal || null,
          origin: window.location.origin,
        },
      });
      if (error) throw error;
      // Remember intended workspace type for post-login
      try {
        localStorage.setItem("teevents.pendingWorkspace", JSON.stringify({
          interest_area: interest,
          organization_name: orgName.trim() || null,
        }));
      } catch {}
      setStep("sent");
    } catch (e: any) {
      toast({ title: "Sign up failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4 py-12">
      <SEO title="Sign Up — TeeVents" description="Create your TeeVents account to manage golf tournaments or golf leagues." />
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <img src={logo} alt="TeeVents" className="h-12 mx-auto mb-3" />
        </div>

        {step === "interest" && (
          <Card>
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-3xl font-bold">Welcome to TeeVents</h1>
                <p className="text-muted-foreground">What would you like to manage?</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setInterest("tournament")}
                  className={`text-left border-2 rounded-xl p-6 transition-all hover:shadow-md ${interest === "tournament" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg">Golf Tournaments</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Single- or multi-day events, sponsors, registration, live scoring, and payouts.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setInterest("league")}
                  className={`text-left border-2 rounded-xl p-6 transition-all hover:shadow-md ${interest === "league" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-3">
                    <Flag className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-bold text-lg">Golf Leagues</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Season-long play, weekly events, standings, skins, and handicaps.
                  </p>
                  <p className="text-xs mt-2 font-medium text-primary">$399/year + 5% platform fee</p>
                </button>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="ghost" asChild>
                  <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
                </Button>
                <Button onClick={() => setStep("details")} disabled={!interest}>
                  Continue
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground pt-2">
                Already have an account? <Link to="/get-started?mode=signin" className="text-primary underline">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        )}

        {step === "details" && (
          <Card>
            <CardContent className="p-8 space-y-5">
              <div>
                <h1 className="text-2xl font-bold">Tell us about you</h1>
                <p className="text-muted-foreground text-sm">A few quick questions and we'll email you a link to set your password.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full name *</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>

              <div>
                <Label htmlFor="orgName">
                  {interest === "league" ? "League name" : "Organization / tournament name"}
                </Label>
                <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder={interest === "league" ? "Weekend Warriors League" : "Acme Charity Classic"} />
              </div>

              <div>
                <Label>What's your primary goal?</Label>
                <RadioGroup value={primaryGoal} onValueChange={setPrimaryGoal} className="mt-2 space-y-1">
                  {(interest === "league"
                    ? ["Run a weekly league", "Manage handicaps & standings", "Organize a season", "Just exploring"]
                    : ["Fundraise for a nonprofit", "Corporate/company event", "Run a member event", "Just exploring"]
                  ).map((g) => (
                    <div key={g} className="flex items-center gap-2">
                      <RadioGroupItem value={g} id={g} />
                      <Label htmlFor={g} className="font-normal cursor-pointer">{g}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label>How did you hear about us?</Label>
                <RadioGroup value={heardFrom} onValueChange={setHeardFrom} className="mt-2 grid grid-cols-2 gap-1">
                  {["Google search", "Social media", "Referral", "Event / demo", "other"].map((h) => (
                    <div key={h} className="flex items-center gap-2">
                      <RadioGroupItem value={h} id={`h-${h}`} />
                      <Label htmlFor={`h-${h}`} className="font-normal cursor-pointer capitalize">{h}</Label>
                    </div>
                  ))}
                </RadioGroup>
                {heardFrom === "other" && (
                  <Input className="mt-2" value={heardFromOther} onChange={(e) => setHeardFromOther(e.target.value)} placeholder="Tell us where" />
                )}
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep("interest")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create my account
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                By continuing you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
              </p>
            </CardContent>
          </Card>
        )}

        {step === "sent" && (
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="text-muted-foreground">
                We sent a link to <span className="font-medium text-foreground">{email}</span>. Click it to set your password and access your dashboard.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Account created
              </div>
              <p className="text-xs text-muted-foreground pt-4">
                Didn't get it? Check spam, or <button className="text-primary underline" onClick={handleSubmit} disabled={loading}>resend the link</button>.
              </p>
              <Button variant="outline" onClick={() => navigate("/")}>Back to home</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
