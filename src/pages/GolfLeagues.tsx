import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Trophy, Users, BarChart3, Smartphone, Award, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FEATURES = [
  { icon: BarChart3, text: "Real-time scoring and live leaderboards" },
  { icon: Trophy, text: "Multiple formats: Stroke Play, Scramble, Stableford, Match Play, Skins" },
  { icon: Award, text: "Handicap tracking with WHS course handicaps" },
  { icon: Users, text: "Skins tracking with automatic payout calculations" },
  { icon: Calendar, text: "Season schedule and player statistics" },
  { icon: Smartphone, text: "Mobile-responsive scoring on the course" },
];

export default function GolfLeagues() {
  const { org } = useOrgContext();
  const navigate = useNavigate();
  const [golferCount, setGolferCount] = useState<number>(10);
  const [loading, setLoading] = useState<null | "flat_fee" | "per_golfer">(null);

  const subscribe = async (type: "flat_fee" | "per_golfer") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate(`/login?next=${encodeURIComponent("/golf-leagues")}`);
      return;
    }
    if (!org?.orgId) {
      toast({
        title: "Create your organization first",
        description: "You need an organization before subscribing to Golf Leagues.",
      });
      navigate("/onboarding");
      return;
    }
    setLoading(type);
    const { data, error } = await (supabase as any).functions.invoke("create-league-subscription", {
      body: {
        organization_id: org.orgId,
        subscription_type: type,
        golfer_count: type === "per_golfer" ? golferCount : undefined,
      },
    });
    setLoading(null);
    if (error || !data?.url) {
      return toast({
        title: "Checkout failed",
        description: error?.message || data?.error || "Please try again",
        variant: "destructive",
      });
    }
    window.location.href = data.url;
  };

  return (
    <>
      <SEO
        title="Golf League Management Software | TeeVents"
        description="Run your golf league with real-time scoring, live leaderboards, skins, handicap tracking, and season stats. From $199/year."
        
      />
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-4">
              <Trophy className="h-3.5 w-3.5" /> New — Golf League Management
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Golf League Management with TeeVents
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Manage your season-long golf league with real-time scoring, live leaderboards, skins, and full player stats — all in one place.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-10">Everything you need to run a league</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
                  <f.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-10">Simple annual pricing</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Flat Fee</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-bold">$199</span>
                    <span className="text-muted-foreground">/year</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {["Unlimited golfers", "All league features included", "Best for larger leagues (20+)"].map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{f}</span>
                    </div>
                  ))}
                  <Button className="w-full mt-4" onClick={() => subscribe("flat_fee")} disabled={loading === "flat_fee"}>
                    {loading === "flat_fee" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Subscribe — Flat Fee
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Per-Golfer</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-bold">$10</span>
                    <span className="text-muted-foreground">/golfer/year</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {["Pay only for active golfers", "All league features included", "Best for small leagues (5–20)"].map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{f}</span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Label htmlFor="gc" className="text-xs">Number of golfers</Label>
                    <Input
                      id="gc"
                      type="number"
                      min={1}
                      value={golferCount}
                      onChange={(e) => setGolferCount(Math.max(1, Number(e.target.value) || 1))}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: <strong>${(golferCount * 10).toLocaleString()}/year</strong>
                    </p>
                  </div>
                  <Button className="w-full mt-2" onClick={() => subscribe("per_golfer")} disabled={loading === "per_golfer"}>
                    {loading === "per_golfer" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Subscribe — Per Golfer
                  </Button>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Already have a TeeVents account?{" "}
              <Link to="/dashboard/leagues" className="text-primary font-semibold underline">
                Go to League Manager
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
