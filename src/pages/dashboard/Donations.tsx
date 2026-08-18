import { useEffect, useState } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Heart, DollarSign, TrendingUp, Users, Loader2, Target, Save, Trash2, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import ManualEntryLimitModal from "@/components/ManualEntryLimitModal";
import { useManualEntryEnforcement } from "@/hooks/useManualEntryEnforcement";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";

interface Donation { id: string; amount_cents: number; donor_email: string | null; status: string; created_at: string; }
interface OfflineDonation { id: string; amount_cents: number; donor_name: string | null; received_date: string; notes: string | null; }
interface Tournament { id: string; title: string; }

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const Donations = () => {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [offline, setOffline] = useState<OfflineDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const manualEntry = useManualEntryEnforcement(selectedTournament || null);

  // Settings
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [goalCustom, setGoalCustom] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Offline donation form
  const [offlineForm, setOfflineForm] = useState({
    donor_name: "", amount: "", received_date: new Date().toISOString().slice(0, 10), notes: "",
  });
  const [savingOffline, setSavingOffline] = useState(false);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const t = (data || []) as Tournament[];
        setTournaments(t);
        if (t.length > 0) setSelectedTournament(pickTournamentId(t));
        setLoading(false);
      });
  }, [org]);

  useEffect(() => {
    if (!selectedTournament) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("tournament_donations")
        .select("id, amount_cents, donor_email, status, created_at")
        .eq("tournament_id", selectedTournament)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("tournaments")
        .select("donation_goal_cents, donations_header_text, donations_footer_text, fundraising_goal_custom")
        .eq("id", selectedTournament)
        .single(),
      (supabase as any)
        .from("tournament_offline_donations")
        .select("id, amount_cents, donor_name, received_date, notes")
        .eq("tournament_id", selectedTournament)
        .order("received_date", { ascending: false }),
    ]).then(([donRes, tRes, offRes]) => {
      setDonations((donRes.data || []) as Donation[]);
      const t: any = tRes.data;
      setGoalInput(t?.donation_goal_cents ? String(t.donation_goal_cents / 100) : "");
      setHeaderText(t?.donations_header_text || "");
      setFooterText(t?.donations_footer_text || "");
      setGoalCustom(!!t?.fundraising_goal_custom);
      setOffline(((offRes as any).data || []) as OfflineDonation[]);
      setLoading(false);
    });
  }, [selectedTournament]);

  const saveSettings = async () => {
    if (demoGuard()) return;
    setSavingSettings(true);
    const cents = goalInput ? Math.round(parseFloat(goalInput) * 100) : null;
    const { error } = await supabase
      .from("tournaments")
      .update({
        donation_goal_cents: cents,
        donations_header_text: headerText.trim() || null,
        donations_footer_text: footerText.trim() || null,
        fundraising_goal_custom: goalCustom,
      } as any)
      .eq("id", selectedTournament);
    setSavingSettings(false);
    if (error) toast.error(error.message);
    else toast.success("Donation settings saved");
  };

  const addOffline = async () => {
    if (demoGuard()) return;
    const cents = Math.round(parseFloat(offlineForm.amount || "0") * 100);
    if (!cents || cents <= 0) { toast.error("Enter a valid amount"); return; }
    const proceed = await manualEntry.guard("donation", cents);
    if (!proceed) return;
    setSavingOffline(true);
    const { data, error } = await (supabase as any)
      .from("tournament_offline_donations")
      .insert({
        tournament_id: selectedTournament,
        donor_name: offlineForm.donor_name.trim() || null,
        amount_cents: cents,
        received_date: offlineForm.received_date,
        notes: offlineForm.notes.trim() || null,
      })
      .select("*")
      .single();
    setSavingOffline(false);
    if (error) toast.error(error.message);
    else {
      setOffline((prev) => [data as OfflineDonation, ...prev]);
      setOfflineForm({ donor_name: "", amount: "", received_date: new Date().toISOString().slice(0, 10), notes: "" });
      toast.success("Offline donation added");
    }
  };

  const deleteOffline = async (id: string) => {
    if (demoGuard()) return;
    const { error } = await (supabase as any).from("tournament_offline_donations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setOffline((prev) => prev.filter((o) => o.id !== id));
  };

  const completedDonations = donations.filter((d) => d.status === "completed");
  const platformTotalCents = completedDonations.reduce((s, d) => s + d.amount_cents, 0);
  const offlineTotalCents = offline.reduce((s, o) => s + o.amount_cents, 0);
  const totalCents = platformTotalCents + offlineTotalCents;
  const avgCents = completedDonations.length > 0 ? Math.round(platformTotalCents / completedDonations.length) : 0;
  const uniqueDonors = new Set(completedDonations.filter((d) => d.donor_email).map((d) => d.donor_email)).size;
  const goalCents = goalInput ? Math.round(parseFloat(goalInput) * 100) : 0;

  return (
    <div>
      <ManualEntryLimitModal
        open={!!manualEntry.pending}
        onOpenChange={(o) => { if (!o) manualEntry.cancelPending(); }}
        used={manualEntry.pending?.used ?? 0}
        freeLimit={manualEntry.pending?.limit ?? 10}
        initialAmountCents={manualEntry.pending?.amountCents ?? 0}
        hasStripe={manualEntry.pending?.hasStripe ?? true}
        submitting={manualEntry.submitting}
        onConfirm={manualEntry.confirmPending}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Donations</h1>
          <p className="text-muted-foreground text-sm">Track charitable donations and configure your public donation page.</p>
        </div>
        {tournaments.length > 1 && (
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Raised", value: fmt(totalCents), icon: DollarSign },
          { label: "Online Donations", value: completedDonations.length, icon: Heart },
          { label: "Offline Donations", value: fmt(offlineTotalCents), icon: TrendingUp },
          { label: "Unique Donors", value: uniqueDonors, icon: Users },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Public page text + fundraising goal */}
      <div className="bg-card rounded-lg border border-border p-6 mb-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-bold text-foreground">Donation Page Settings</h2>
        </div>

        <div>
          <Label>Public Page Header Text</Label>
          <Textarea
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value)}
            placeholder="Support our tournament and help us reach our goal!"
            rows={2}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">Shown above the fundraising goal on your public donation page.</p>
        </div>

        <div>
          <Label>Public Page Footer Text (optional)</Label>
          <Textarea
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="All donations are tax-deductible. Thank you for your support!"
            rows={2}
            maxLength={500}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-md border border-border">
          <div>
            <Label>Manually set fundraising goal</Label>
            <p className="text-xs text-muted-foreground">Use a custom goal amount that includes offline donations not tracked by the platform.</p>
          </div>
          <Switch checked={goalCustom} onCheckedChange={setGoalCustom} />
        </div>

        <div>
          <Label>Fundraising Goal ($)</Label>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 10000"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {goalCents > 0 && (
          <div className="rounded-lg border border-border p-3 bg-muted/30">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-lg font-bold text-foreground">{fmt(totalCents)}</span>
              <span className="text-sm text-muted-foreground">of {fmt(goalCents)} goal</span>
            </div>
            <Progress value={Math.min((totalCents / goalCents) * 100, 100)} className="h-3" />
          </div>
        )}

        <Button onClick={saveSettings} disabled={savingSettings}>
          {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      {/* Offline donations */}
      <div className="bg-card rounded-lg border border-border p-6 mb-6">
        <h2 className="text-lg font-display font-bold text-foreground mb-3">Offline Donations</h2>
        <p className="text-sm text-muted-foreground mb-4">Track checks, cash, or other donations received outside the platform. These count toward your displayed total when you have a manual goal.</p>

        <div className="grid sm:grid-cols-4 gap-3 mb-4">
          <Input placeholder="Donor name" value={offlineForm.donor_name} onChange={(e) => setOfflineForm({ ...offlineForm, donor_name: e.target.value })} maxLength={120} />
          <Input type="number" min="0" step="0.01" placeholder="Amount" value={offlineForm.amount} onChange={(e) => setOfflineForm({ ...offlineForm, amount: e.target.value })} />
          <Input type="date" value={offlineForm.received_date} onChange={(e) => setOfflineForm({ ...offlineForm, received_date: e.target.value })} />
          <Input placeholder="Notes" value={offlineForm.notes} onChange={(e) => setOfflineForm({ ...offlineForm, notes: e.target.value })} maxLength={300} />
        </div>
        <Button size="sm" onClick={addOffline} disabled={savingOffline}>
          {savingOffline ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          Add Offline Donation
        </Button>

        {offline.length > 0 && (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offline.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="text-sm">{new Date(o.received_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">{o.donor_name || <span className="italic text-muted-foreground">Anonymous</span>}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(o.amount_cents)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.notes || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteOffline(o.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Platform donations table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-display font-bold text-foreground">Online Donations</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : donations.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">No online donations yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm">
                    {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </TableCell>
                  <TableCell className="text-sm">{d.donor_email || <span className="text-muted-foreground italic">Anonymous</span>}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(d.amount_cents)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${d.status === "completed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {d.status === "completed" ? "Completed" : "Pending"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default Donations;
