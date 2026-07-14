import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Eye, Sparkles, Trophy, Users, DollarSign, Heart, ClipboardList, Calendar, MapPin, Lock } from "lucide-react";
import SEO from "@/components/SEO";
import logoBlack from "@/assets/logo-black.png";

interface Snapshot {
  tournament: any;
  organization: any | null;
  registrations: any[];
  sponsors: any[];
  scores: any[];
  transactions: any[];
  volunteers: any[];
}

const money = (c?: number | null) => `$${((c || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SampleDashboard() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgrade, setUpgrade] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("sample-tournament-snapshot", {
          body: { token },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setSnap(data as Snapshot);
      } catch (e: any) {
        setError(e.message || "Sample not available");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const blockEdit = () => toast.info("This is a sample dashboard. Upgrade to a live tournament to make changes.");

  async function submitUpgrade() {
    if (!upgrade.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(upgrade.email)) {
      toast.error("Please enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("notify_sample_upgrade_interest", {
        _token: token,
        _email: upgrade.email,
        _name: upgrade.name || null,
        _message: upgrade.message || null,
      });
      if (error) throw error;
      if (data === false) throw new Error("Sample link no longer valid");
      toast.success("Thanks! We'll reach out shortly.");
      setUpgradeOpen(false);
      setUpgrade({ name: "", email: "", message: "" });
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-golf-cream"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (error || !snap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-golf-cream p-6">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle>Sample not available</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error || "This sample link is inactive or has been converted to a live tournament."}</p>
            <Button asChild className="mt-4"><Link to="/">Back to TeeVents</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tournament, organization, registrations, sponsors, transactions, volunteers, scores } = snap;
  const paid = registrations.filter((r) => r.payment_status === "paid");
  const revenue = paid.reduce((s, r) => s + (r.amount_paid_cents || 0), 0);
  const platformFees = transactions.reduce((s, t) => s + (t.platform_fee_cents || 0), 0);

  return (
    <div className="min-h-screen bg-golf-cream">
      <SEO title={`Sample: ${tournament.title} | TeeVents`} description="Preview a TeeVents tournament dashboard." noIndex />

      {/* Sample banner */}
      <div className="bg-secondary text-secondary-foreground px-4 py-3 flex flex-wrap items-center justify-center gap-3 text-sm font-medium">
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        <span className="text-center">
          <strong>SAMPLE MODE</strong> — This is a preview of your tournament dashboard. No changes are saved.
        </span>
        <Button size="sm" variant="default" onClick={() => setUpgradeOpen(true)}>Upgrade Now</Button>
      </div>

      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={logoBlack} alt="TeeVents" className="h-8 w-8 object-contain" />
            <div>
              <div className="text-xs text-muted-foreground">{organization?.dashboard_name || organization?.name || "Organizer"} Dashboard</div>
              <h1 className="text-sm sm:text-base font-bold leading-tight">{tournament.title}</h1>
            </div>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex"><Lock className="h-3 w-3 mr-1" />Read-only</Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Users className="h-4 w-4" />} label="Registrations" value={registrations.length.toString()} />
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Paid" value={paid.length.toString()} />
          <StatCard icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={money(revenue)} />
          <StatCard icon={<Heart className="h-4 w-4" />} label="Sponsors" value={sponsors.length.toString()} />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
            {[
              { v: "overview", l: "Overview", i: ClipboardList },
              { v: "players", l: "Players", i: Users },
              { v: "leaderboard", l: "Leaderboard", i: Trophy },
              { v: "sponsors", l: "Sponsors", i: Heart },
              { v: "volunteers", l: "Volunteers", i: Users },
              { v: "finances", l: "Finances", i: DollarSign },
              { v: "payouts", l: "Payout Settings", i: DollarSign },
              { v: "checkin", l: "Check-In", i: ClipboardList },
              { v: "scoring", l: "Scoring", i: Trophy },
              { v: "dayof", l: "Day-of", i: Calendar },
            ].map((t) => (
              <TabsTrigger key={t.v} value={t.v} className="flex items-center gap-1.5 text-xs px-3 py-2">
                <t.i className="h-3.5 w-3.5" /><span>{t.l}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader><CardTitle>{tournament.title}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{tournament.date ? new Date(tournament.date + "T00:00:00").toLocaleDateString(undefined, { dateStyle: "long" }) : "TBD"}</div>
                {tournament.course_name && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{tournament.course_name}{tournament.location ? `, ${tournament.location}` : ""}</div>}
                <div>Entry fee: <strong>{money(tournament.registration_fee_cents)}</strong></div>
                {tournament.max_players && <div>Field: {registrations.length} / {tournament.max_players}</div>}
                {tournament.description && <p className="pt-2 text-muted-foreground whitespace-pre-wrap">{tournament.description}</p>}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={blockEdit}>Edit Tournament</Button>
                  <Button size="sm" variant="outline" onClick={blockEdit}>Publish Site</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="players">
            <Card><CardHeader><CardTitle>Registered Players ({registrations.length})</CardTitle></CardHeader>
              <CardContent>
                {registrations.length === 0 ? <p className="text-sm text-muted-foreground">No registrations yet.</p> : (
                  <div className="overflow-x-auto"><Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Handicap</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Paid</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {registrations.slice(0, 100).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.first_name} {r.last_name}</TableCell>
                          <TableCell className="text-xs">{r.email}</TableCell>
                          <TableCell>{r.handicap ?? "—"}</TableCell>
                          <TableCell><Badge variant={r.payment_status === "paid" ? "default" : "outline"}>{r.payment_status || "pending"}</Badge></TableCell>
                          <TableCell className="text-right">{money(r.amount_paid_cents)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                )}
                <Button size="sm" className="mt-4" onClick={blockEdit}>Add Player</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card><CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader>
              <CardContent>
                {scores.length === 0 ? <p className="text-sm text-muted-foreground">Leaderboard will populate once scores are entered on tournament day.</p> :
                  <p className="text-sm">{scores.length} score entries recorded.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sponsors">
            <Card><CardHeader><CardTitle>Sponsors ({sponsors.length})</CardTitle></CardHeader>
              <CardContent>
                {sponsors.length === 0 ? <p className="text-sm text-muted-foreground">No sponsors added yet.</p> : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sponsors.map((s) => (
                      <div key={s.id} className="border rounded p-3 text-center">
                        {s.logo_url && <img src={s.logo_url} alt={s.name} className="h-16 w-full object-contain mb-2" />}
                        <div className="text-sm font-medium">{s.name}</div>
                      </div>
                    ))}
                  </div>
                )}
                <Button size="sm" className="mt-4" onClick={blockEdit}>Add Sponsor</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="volunteers">
            <Card><CardHeader><CardTitle>Volunteers ({volunteers.length})</CardTitle></CardHeader>
              <CardContent>
                {volunteers.length === 0 ? <p className="text-sm text-muted-foreground">No volunteers yet.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>{volunteers.map((v) => (
                      <TableRow key={v.id}><TableCell>{v.name}</TableCell><TableCell className="text-xs">{v.email}</TableCell><TableCell>{v.status || "—"}</TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finances">
            <Card><CardHeader><CardTitle>Finances</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Total Collected</div><div className="text-lg font-bold">{money(revenue)}</div></div>
                  <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Platform Fees</div><div className="text-lg font-bold">{money(platformFees)}</div></div>
                </div>
                <div className="text-sm">{transactions.length} transactions recorded.</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card><CardHeader><CardTitle>Payout Settings</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Connect Stripe, PayPal, or request a check payout. Configure in the live dashboard.</p>
                <Button size="sm" className="mt-3" onClick={blockEdit}>Connect Stripe</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkin">
            <Card><CardHeader><CardTitle>Check-In</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">On tournament day, use the QR scanner or manual check-in to mark players as arrived. Scanning is disabled in sample mode.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scoring">
            <Card><CardHeader><CardTitle>Live Scoring</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Groups enter scores hole-by-hole. Live leaderboard updates in real time. Score entry disabled in sample mode.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dayof">
            <Card><CardHeader><CardTitle>Day-of Event Page</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Public page for players with schedule, hole assignments, leaderboard link, and announcements.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-3">Like what you see? Let's make it live.</p>
          <Button size="lg" onClick={() => setUpgradeOpen(true)}><Sparkles className="h-4 w-4 mr-2" />Upgrade to Live Tournament</Button>
        </div>
      </div>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to a Live Tournament</DialogTitle>
            <DialogDescription>Leave your details and the TeeVents team will get you set up.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Your name" value={upgrade.name} onChange={(e) => setUpgrade({ ...upgrade, name: e.target.value })} />
            <Input placeholder="Email *" type="email" value={upgrade.email} onChange={(e) => setUpgrade({ ...upgrade, email: e.target.value })} />
            <Textarea placeholder="Anything you'd like us to know?" rows={3} value={upgrade.message} onChange={(e) => setUpgrade({ ...upgrade, message: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>Cancel</Button>
            <Button onClick={submitUpgrade} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}
