import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trophy, DollarSign, Share2, CreditCard, Award } from "lucide-react";
import { formatScore } from "@/lib/sampleMockData";

export default function SampleDashboardPreview() {
  const { slug } = useParams<{ slug: string }>();
  const [sample, setSample] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: s } = await supabase.from("sample_tournaments").select("*").eq("unique_slug", slug).maybeSingle();
      if (!s) { setLoading(false); return; }
      setSample(s);
      const [{ data: p }, { data: sp }, { data: lb }] = await Promise.all([
        supabase.from("sample_participants").select("*").eq("sample_tournament_id", s.id),
        supabase.from("sample_sponsors").select("*").eq("sample_tournament_id", s.id),
        supabase.from("sample_leaderboard").select("*").eq("sample_tournament_id", s.id).order("position"),
      ]);
      setParticipants(p || []);
      setSponsors(sp || []);
      setLeaderboard(lb || []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!sample) return <div className="min-h-screen flex items-center justify-center">Mockup not found</div>;

  const totalRevenue = participants.length * sample.registration_fee_cents;
  const platformFee = Math.round(totalRevenue * 0.05);
  const netPayout = totalRevenue - platformFee;
  const fmt = (c: number) => `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-[#1a5c38] text-white px-4 py-3">
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs opacity-75">ORGANIZER DASHBOARD PREVIEW</div>
            <div className="font-bold text-lg">{sample.tournament_name}</div>
          </div>
          <Link to={`/sample/${slug}`}><Button size="sm" variant="outline" className="bg-white text-[#1a5c38]">← Public Site</Button></Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
            <TabsTrigger value="finances">Finances</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="share">Share</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-4 gap-3">
              <Card><CardContent className="pt-4"><Users className="h-5 w-5 mb-1" /><div className="text-2xl font-bold">{participants.length}</div><div className="text-xs text-muted-foreground">Registered Players</div></CardContent></Card>
              <Card><CardContent className="pt-4"><Award className="h-5 w-5 mb-1" /><div className="text-2xl font-bold">{sponsors.length}</div><div className="text-xs text-muted-foreground">Sponsors</div></CardContent></Card>
              <Card><CardContent className="pt-4"><DollarSign className="h-5 w-5 mb-1" /><div className="text-2xl font-bold">{fmt(totalRevenue)}</div><div className="text-xs text-muted-foreground">Gross Revenue</div></CardContent></Card>
              <Card><CardContent className="pt-4"><Trophy className="h-5 w-5 mb-1" /><div className="text-2xl font-bold">{fmt(netPayout)}</div><div className="text-xs text-muted-foreground">Net to Organizer</div></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="players" className="mt-4">
            <Card><CardHeader><CardTitle>Registered Players</CardTitle></CardHeader><CardContent>
              <table className="w-full text-sm">
                <thead className="border-b"><tr className="text-left"><th className="py-2">Name</th><th>Handicap</th></tr></thead>
                <tbody>{participants.map(p => <tr key={p.id} className="border-b"><td className="py-2">{p.name}</td><td>{p.handicap}</td></tr>)}</tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-4">
            <Card><CardHeader><CardTitle>Live Leaderboard</CardTitle></CardHeader><CardContent>
              <table className="w-full text-sm">
                <thead className="border-b"><tr className="text-left"><th className="py-2">Pos</th><th>Team</th><th>Gross</th><th>Net</th><th>Thru</th></tr></thead>
                <tbody>{leaderboard.map(l => <tr key={l.id} className="border-b"><td className="py-2 font-semibold">{l.position}</td><td>{l.player_name}</td><td>{formatScore(l.gross_score)}</td><td>{formatScore(l.net_score)}</td><td>{l.thru}</td></tr>)}</tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="sponsors" className="mt-4">
            <Card><CardHeader><CardTitle>Sponsors</CardTitle></CardHeader><CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {sponsors.map(s => (
                  <div key={s.id} className="border rounded-md p-3 flex items-center gap-3">
                    <div className="h-12 w-12 rounded flex items-center justify-center text-white font-bold" style={{ backgroundColor: s.logo_color }}>{s.name[0]}</div>
                    <div className="flex-1"><div className="font-medium">{s.name}</div><Badge variant="outline" className="text-xs">{s.level}</Badge></div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="finances" className="mt-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Transactions</CardTitle></CardHeader><CardContent>
              <table className="w-full text-sm">
                <thead className="border-b"><tr className="text-left"><th className="py-2">Customer</th><th>Type</th><th>Gross</th><th>Platform Fee (5%)</th><th>Net</th></tr></thead>
                <tbody>{participants.slice(0, 8).map(p => {
                  const gross = sample.registration_fee_cents;
                  const fee = Math.round(gross * 0.05);
                  return <tr key={p.id} className="border-b"><td className="py-2">{p.name}</td><td><Badge variant="outline">Registration</Badge></td><td>{fmt(gross)}</td><td className="text-orange-600">{fmt(fee)}</td><td className="text-green-600">{fmt(gross - fee)}</td></tr>;
                })}</tbody>
                <tfoot className="font-bold border-t-2"><tr><td className="py-2">Totals</td><td></td><td>{fmt(totalRevenue)}</td><td>{fmt(platformFee)}</td><td>{fmt(netPayout)}</td></tr></tfoot>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="payouts" className="mt-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Payout Settings</CardTitle></CardHeader><CardContent className="space-y-3">
              <div className="border rounded-md p-3 bg-green-50">
                <div className="flex justify-between"><span className="font-medium">Stripe Connect</span><Badge className="bg-green-600">Connected</Badge></div>
                <div className="text-xs text-muted-foreground mt-1">Account ending •••• 4242 — Payouts arrive within 2 business days</div>
              </div>
              <p className="text-sm text-muted-foreground">In a live TeeVents account, payouts to your bank happen automatically after each transaction.</p>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="share" className="mt-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" />Share & Promote</CardTitle></CardHeader><CardContent>
              <p className="text-sm mb-3">Your tournament site URL:</p>
              <code className="block bg-muted p-3 rounded font-mono text-sm">{window.location.origin}/sample/{slug}</code>
              <p className="text-xs text-muted-foreground mt-3">A real TeeVents tournament includes QR codes, social share images, custom domains, and email blast tools.</p>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
