import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Trophy, Users, BarChart3, Smartphone, Award, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImg from "@/assets/golf-league-hero.jpg";
import seasonBoardImg from "@/assets/season-leaderboard-preview.jpg";
import { LeaderboardRenderer } from "@/components/leaderboard/LeaderboardCore";
import { DEFAULT_DESIGN } from "@/components/dashboard/LeaderboardDesignCard";
import FindYourLeague from "@/components/leagues/FindYourLeague";

const FEATURES = [
  { icon: BarChart3, text: "Real-time scoring and live leaderboards" },
  { icon: Trophy, text: "Multiple formats: Stroke Play, Scramble, Stableford, Match Play, Skins" },
  { icon: Award, text: "Handicap tracking with WHS course handicaps" },
  { icon: Users, text: "Skins tracking with automatic payout calculations" },
  { icon: Calendar, text: "Season schedule and player statistics" },
  { icon: Smartphone, text: "Mobile-responsive scoring on the course" },
];

const SAMPLE_STANDINGS = [
  { name: "Team Eagle Eyes", total: 428, thru: "8 events" as any, players: ["M. Rivera", "J. Chen"] },
  { name: "Fairway Kings", total: 412, thru: "8 events" as any, players: ["D. Patel", "T. Brooks"] },
  { name: "Birdie Brigade", total: 397, thru: "8 events" as any, players: ["S. Okafor", "L. Nguyen"] },
  { name: "Green Jackets", total: 384, thru: "7 events" as any, players: ["A. Morales", "K. Reid"] },
  { name: "Bogey Busters", total: 371, thru: "8 events" as any, players: ["R. Johnson", "P. Alvarez"] },
  { name: "The Sandbaggers", total: 356, thru: "7 events" as any, players: ["C. Whitman", "E. Park"] },
  { name: "Mulligan Crew", total: 342, thru: "8 events" as any, players: ["B. Thompson", "N. Rossi"] },
  { name: "Pin Seekers", total: 328, thru: "6 events" as any, players: ["V. Ahmed", "J. Kelly"] },
];

export default function GolfLeagues() {
  const { org } = useOrgContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const subscribe = async () => {
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
    setLoading(true);
    const { data, error } = await (supabase as any).functions.invoke("create-league-subscription", {
      body: {
        organization_id: org.orgId,
        subscription_type: "flat_fee",
      },
    });
    setLoading(false);
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
        description="Run your golf league with real-time scoring, live leaderboards, skins, handicap tracking, and season stats. $399/year for up to 24 events, unlimited golfers."
      />
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="relative overflow-hidden">
          <img
            src={heroImg}
            alt="Golfers celebrating a league win at sunset"
            width={1600}
            height={912}
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
          <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-primary/20 text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-4 backdrop-blur">
                <Trophy className="h-3.5 w-3.5" /> New — Golf League Management
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 leading-tight">
                Run your season. Crown your champions.
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-8">
                Real-time scoring, live leaderboards, skins, and season-long standings — the same tools TeeVents customers use, purpose-built for leagues.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" onClick={subscribe} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Start your league — $399/year
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <a href="#find-your-league">Find your league</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <FindYourLeague />



        <section id="standings" className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">Season-long standings, live all year</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every league gets the same seasonal leaderboard experience as our tournament customers — consistent, branded, and updated in real time.
              </p>
            </div>
            <div className="shadow-xl rounded-lg overflow-hidden">
              <LeaderboardRenderer
                design={DEFAULT_DESIGN}
                title="2026 Season Standings"
                rows={SAMPLE_STANDINGS}
                compact
              />
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">Sample data — your league's standings will appear here automatically.</p>

            <div className="mt-12 grid md:grid-cols-5 gap-6 items-center">
              <div className="md:col-span-3 rounded-lg overflow-hidden shadow-xl border border-border">
                <img
                  src={seasonBoardImg}
                  alt="Season standings dashboard showing ranked teams, events played, points and trend indicators"
                  width={1600}
                  height={1008}
                  loading="lazy"
                  className="w-full h-auto"
                />
              </div>
              <div className="md:col-span-2">
                <h3 className="text-xl font-display font-bold mb-2">Your own branded season hub</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Players, points, trends, and next event — all in one place. Share a single custom URL with your league all season long:
                </p>
                <div className="bg-card border border-border rounded-md px-3 py-2 font-mono text-sm">
                  teevents.golf/<span className="text-primary font-semibold">your-league</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Pick any slug when you create your league — the short URL routes straight to your public standings page.
                </p>
              </div>
            </div>
          </div>
        </section>


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

        <section id="pricing" className="py-16 px-4 bg-muted/30">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-10">Simple annual pricing</h2>
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle>Golf League — Annual</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">$399</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {["Up to 24 league events per year", "Unlimited golfers", "5% platform fee on paid registrations", "Live leaderboard & mobile scoring included", "Skins, standings & season stats", "Your year starts on your first league event date"].map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{f}</span>
                  </div>
                ))}
                <Button className="w-full mt-4" onClick={subscribe} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Subscribe — $399/year
                </Button>
              </CardContent>
            </Card>

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
