import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, MapPin, Trophy, ExternalLink, LayoutDashboard, Smartphone, Palette } from "lucide-react";
import SEO from "@/components/SEO";
import SampleGuidedTour from "@/components/sample/SampleGuidedTour";
import SampleRegistrationPreview from "@/components/sample/SampleRegistrationPreview";
import SampleOrganizerDashboardTeaser from "@/components/sample/SampleOrganizerDashboardTeaser";
import SampleLeaderboard from "@/components/sample/SampleLeaderboard";
import { TeeventsFooter } from "@/components/TeeventsFooter";

interface Sample {
  id: string;
  unique_slug: string;
  tournament_name: string;
  event_date: string | null;
  location: string | null;
  description: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  scoring_format: string | null;
  registration_fee_cents: number;
  team_fee_cents: number;
  primary_color: string | null;
  secondary_color: string | null;
  prospect_name: string | null;
  guided_tour: boolean | null;
}

export default function SampleTournament() {
  const { slug } = useParams<{ slug: string }>();
  const [sample, setSample] = useState<Sample | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDashIntro, setShowDashIntro] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: s } = await supabase.from("sample_tournaments").select("*").eq("unique_slug", slug).maybeSingle();
      if (!s) { setLoading(false); return; }
      setSample(s as Sample);
      supabase.rpc("increment_sample_view", { _slug: slug });
      const [{ data: p }, { data: sp }, { data: lb }] = await Promise.all([
        supabase.from("sample_participants").select("*").eq("sample_tournament_id", s.id),
        supabase.from("sample_sponsors").select("*").eq("sample_tournament_id", s.id),
        supabase.from("sample_leaderboard").select("*").eq("sample_tournament_id", s.id).order("position"),
      ]);
      setParticipants(p || []);
      setSponsors(sp || []);
      setLeaderboard(lb || []);
      setLoading(false);
      // With the guided tour on, skip the dashboard pop-up so the sample stays focused.
      if (!(s as any).guided_tour) setTimeout(() => setShowDashIntro(true), 1200);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!sample) return <div className="min-h-screen flex items-center justify-center">Mockup not found</div>;

  const heroBg = sample.hero_image_url || "https://images.unsplash.com/photo-1592919505780-303950717480?w=1600";
  const primary = sample.primary_color || "#1a5c38";
  const secondary = sample.secondary_color || "#F5A623";

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${sample.tournament_name} – Sample`} description={sample.description || ""} />
      {/* Demo banner */}
      <div className="text-white text-center text-sm py-2 px-4" style={{ backgroundColor: primary }}>
        This is a <strong>custom TeeVents mockup</strong> created for {sample.tournament_name} •{" "}
        <a href="https://teevents.golf" className="underline">Learn more about TeeVents</a>
      </div>

      {/* Hero */}
      <div data-tour="event-page" className="relative h-[400px] bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${heroBg})` }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          {sample.logo_url && <img src={sample.logo_url} alt="" className="h-24 mb-4 object-contain" />}
          <h1 className="text-4xl md:text-5xl font-bold mb-3">{sample.tournament_name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-base">
            {sample.event_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(sample.event_date).toLocaleDateString("en-US", { dateStyle: "long" })}</span>}
            {sample.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{sample.location}</span>}
          </div>
          <div className="mt-6 inline-flex flex-col items-center gap-1 rounded-lg p-1">
            <Button asChild style={{ backgroundColor: secondary, color: primary }} className="hover:opacity-90">
              <a href="#sample-registration">
              Register — ${(sample.registration_fee_cents / 100).toFixed(0)}
              </a>
            </Button>
            <span className="text-xs text-white/80">Sign up, pay, and get a confirmation email in one step</span>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-card px-4 py-3">
        <p className="mx-auto flex max-w-5xl items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Palette className="h-4 w-4 shrink-0" style={{ color: primary }} />
          Your logo, primary color, and accent color can all be customized by the organizer.
        </p>
      </div>

      <SampleRegistrationPreview
        eventName={sample.tournament_name}
        feeCents={sample.registration_fee_cents}
        primaryColor={primary}
        secondaryColor={secondary}
      />

      {/* Live leaderboard + mobile scoring (tour anchors) */}
      <div className="container mx-auto px-4 pt-8 max-w-5xl grid gap-6 md:grid-cols-3">
        <div data-tour="leaderboard" className="md:col-span-2 overflow-hidden rounded-lg shadow-sm">
          <SampleLeaderboard eventName={sample.tournament_name} rows={leaderboard} logoUrl={sample.logo_url} primaryColor={primary} secondaryColor={secondary} compact />
          <p className="border border-t-0 border-border bg-card px-4 py-3 text-xs text-muted-foreground">Updates in real time as scores come in — open the matching TV display on any monitor.</p>
        </div>

        {/* Mobile scoring mockup */}
        <div data-tour="mobile-scoring" className="flex flex-col items-center">
          <div className="mx-auto w-[220px] rounded-[2rem] border-8 border-neutral-800 bg-neutral-900 p-2 shadow-xl">
            <div className="rounded-[1.4rem] bg-white overflow-hidden">
              <div className="px-3 py-2 text-white text-xs font-semibold" style={{ backgroundColor: primary }}>
                {sample.tournament_name}
              </div>
              <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Hole 7 • Par 4</span><span className="rounded px-1.5 py-0.5 font-bold" style={{ backgroundColor: `${secondary}33`, color: primary }}>Mobile scoring</span></div>
                {(participants.slice(0, 4).length ? participants.slice(0, 4) : [{ id: "a", name: "John Smith" }, { id: "b", name: "Marcus Johnson" }]).map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center justify-between border rounded-md px-2 py-1.5">
                    <span className="text-xs truncate">{p.name}</span>
                    <span className="text-sm font-bold" style={{ color: primary }}>{4 + (i % 2)}</span>
                  </div>
                ))}
                <button className="w-full rounded-md py-2 text-xs font-bold" style={{ backgroundColor: secondary, color: primary }}>
                  Save Scores
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center flex items-center gap-1">
            <Smartphone className="h-3 w-3" /> Score from any phone — no app download
          </p>
        </div>
      </div>


      <SampleOrganizerDashboardTeaser
        slug={slug || sample.unique_slug}
        eventName={sample.tournament_name}
        eventDate={sample.event_date}
        playerCount={participants.length}
        revenueCents={participants.length * sample.registration_fee_cents}
        primaryColor={primary}
        secondaryColor={secondary}
      />

      {/* Auto-popup encouraging dashboard preview */}
      <Dialog open={showDashIntro} onOpenChange={setShowDashIntro}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-[#F5A623]/20 flex items-center justify-center">
              <LayoutDashboard className="h-7 w-7 text-[#1a5c38]" />
            </div>
            <DialogTitle className="text-center text-2xl">Want to see the organizer side?</DialogTitle>
            <DialogDescription className="text-center text-base pt-1">
              We built a full mockup of the dashboard <strong>you</strong> would use to run {sample.tournament_name}. See exactly how easy TeeVents makes managing your tournament.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Link to={`/sample/${slug}/dashboard`} onClick={() => setShowDashIntro(false)}>
              <Button size="lg" className="w-full bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-bold text-base">
                <LayoutDashboard className="h-5 w-5 mr-2" /> Open Organizer Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => setShowDashIntro(false)} className="w-full">
              Keep exploring the public page
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>About the Event</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p>{sample.description || "Join us for a great day of golf supporting a great cause."}</p>
                <div className="grid sm:grid-cols-3 gap-3 pt-2">
                  <div className="border rounded-md p-3">
                    <div className="text-xs text-muted-foreground">Format</div>
                    <div className="font-semibold">{sample.scoring_format}</div>
                  </div>
                  <div className="border rounded-md p-3">
                    <div className="text-xs text-muted-foreground">Player Entry</div>
                    <div className="font-semibold">${(sample.registration_fee_cents / 100).toFixed(0)}</div>
                  </div>
                  <div className="border rounded-md p-3">
                    <div className="text-xs text-muted-foreground">Team Entry</div>
                    <div className="font-semibold">${(sample.team_fee_cents / 100).toFixed(0)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" />Live Leaderboard</CardTitle></CardHeader>
              <CardContent>
                  <SampleLeaderboard eventName={sample.tournament_name} rows={leaderboard} logoUrl={sample.logo_url} primaryColor={primary} secondaryColor={secondary} compact />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sponsors" className="mt-4">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {sponsors.map(s => (
                <div key={s.id} className="border rounded-md p-4 text-center">
                  <div className="h-20 rounded flex items-center justify-center text-white font-bold text-lg mb-2" style={{ backgroundColor: s.logo_color || "#1a5c38" }}>
                    {s.name}
                  </div>
                  <Badge variant="outline">{s.level}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Event Day Schedule</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between border-b pb-2"><span className="font-medium">8:00 AM</span><span>Registration & Breakfast</span></li>
                  <li className="flex justify-between border-b pb-2"><span className="font-medium">9:00 AM</span><span>Shotgun Start</span></li>
                  <li className="flex justify-between border-b pb-2"><span className="font-medium">2:30 PM</span><span>Lunch & Awards</span></li>
                  <li className="flex justify-between"><span className="font-medium">3:30 PM</span><span>Silent Auction Close</span></li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-8 bg-[#1a5c38] text-white">
          <CardContent className="py-6 text-center">
            <h3 className="text-xl font-bold mb-2">Like what you see?</h3>
            <p className="mb-4">This is a custom mockup. Let's build your real tournament site on TeeVents.</p>
            <a href="https://teevents.golf/get-started" target="_blank" rel="noreferrer">
              <Button className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">Get Started <ExternalLink className="h-4 w-4 ml-1" /></Button>
            </a>
          </CardContent>
        </Card>
      </div>

      <TeeventsFooter tournament={{ is_pro: false }} />

      {sample.guided_tour && slug && (
        <SampleGuidedTour
          slug={slug}
          customerName={sample.prospect_name}
          eventName={sample.tournament_name}
          primaryColor={primary}
          secondaryColor={secondary}
        />
      )}
    </div>
  );
}
