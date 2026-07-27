import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, MapPin, Trophy, ExternalLink, LayoutDashboard, Tv, ArrowRight, Sparkles } from "lucide-react";
import { formatScore } from "@/lib/sampleMockData";
import { toast } from "sonner";
import SEO from "@/components/SEO";

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
      const { data: s } = await supabase.from("sample_tournaments").select("id,admin_id,unique_slug,tournament_name,event_date,location,description,logo_url,hero_image_url,scoring_format,registration_fee_cents,team_fee_cents,view_count,last_accessed_at,created_at,updated_at").eq("unique_slug", slug).maybeSingle();
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
      setTimeout(() => setShowDashIntro(true), 1200);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!sample) return <div className="min-h-screen flex items-center justify-center">Mockup not found</div>;

  const heroBg = sample.hero_image_url || "https://images.unsplash.com/photo-1592919505780-303950717480?w=1600";

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${sample.tournament_name} – Sample`} description={sample.description || ""} />
      {/* Demo banner */}
      <div className="bg-[#1a5c38] text-white text-center text-sm py-2 px-4">
        This is a <strong>custom TeeVents mockup</strong> created for {sample.tournament_name} •{" "}
        <a href="https://teevents.golf" className="underline">Learn more about TeeVents</a>
      </div>

      {/* Hero */}
      <div className="relative h-[400px] bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${heroBg})` }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          {sample.logo_url && <img src={sample.logo_url} alt="" className="h-24 mb-4 object-contain" />}
          <h1 className="text-4xl md:text-5xl font-bold mb-3">{sample.tournament_name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-base">
            {sample.event_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(sample.event_date).toLocaleDateString("en-US", { dateStyle: "long" })}</span>}
            {sample.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{sample.location}</span>}
          </div>
          <Button className="mt-6 bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90" onClick={() => toast.message("This is a demo", { description: "On a real TeeVents tournament, this opens registration." })}>
            Open Registration
          </Button>
        </div>
      </div>

      {/* BIG Dashboard Preview CTA */}
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="relative overflow-hidden rounded-2xl border-2 border-[#F5A623] bg-gradient-to-r from-[#1a5c38] via-[#1a5c38] to-[#0f3d24] p-6 md:p-8 shadow-2xl">
          <div className="absolute -top-10 -right-10 opacity-10">
            <LayoutDashboard className="h-48 w-48 text-[#F5A623]" />
          </div>
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 bg-[#F5A623] text-[#1a5c38] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="h-3.5 w-3.5" /> See It In Action
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                See What Your Organizer Dashboard Looks Like
              </h2>
              <p className="text-white/80 text-sm md:text-base">
                Step inside the back-end of {sample.tournament_name} and see every feature you'll use to run your tournament — players, sponsors, leaderboard, finances and more.
              </p>
            </div>
            <Link to={`/sample/${slug}/dashboard`} className="w-full md:w-auto flex-shrink-0">
              <Button size="lg" className="w-full md:w-auto bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-bold text-base md:text-lg px-6 md:px-8 py-6 shadow-lg">
                <LayoutDashboard className="h-5 w-5 mr-2" />
                Open Organizer Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-3 flex justify-center">
          <Link to={`/sample/${slug}/live`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Tv className="h-4 w-4 mr-1" /> Or preview the Live TV Leaderboard
            </Button>
          </Link>
        </div>
      </div>

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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="py-2 pr-3">Pos</th>
                        <th className="py-2 pr-3">Team / Player</th>
                        <th className="py-2 pr-3">Gross</th>
                        <th className="py-2 pr-3">Net</th>
                        <th className="py-2 pr-3">Thru</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map(l => (
                        <tr key={l.id} className="border-b">
                          <td className="py-2 pr-3 font-semibold">{l.position}</td>
                          <td className="py-2 pr-3">{l.player_name}</td>
                          <td className="py-2 pr-3">{formatScore(l.gross_score)}</td>
                          <td className="py-2 pr-3">{formatScore(l.net_score)}</td>
                          <td className="py-2 pr-3">{l.thru}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
    </div>
  );
}
