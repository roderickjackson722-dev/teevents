import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Trash2, Loader2, Settings, Globe, CreditCard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeagueForm from "./LeagueForm";

export default function LeagueSettingsTab({ league, onSaved }: { league: any; onSaved: () => void }) {
  const navigate = useNavigate();
  const [showEdit, setShowEdit] = useState(false);
  const [pts, setPts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVis, setSavingVis] = useState(false);
  const [vis, setVis] = useState({
    publish_status: league.publish_status || (league.is_public ? "published" : "draft"),
    is_public: !!league.is_public,
    allow_search: league.allow_search ?? true,
  });

  const [passFee, setPassFee] = useState(league.pass_platform_fee_to_members !== false);
  const [savingFee, setSavingFee] = useState(false);

  const saveFeeSetting = async (val: boolean) => {
    setPassFee(val);
    setSavingFee(true);
    const { error } = await (supabase as any)
      .from("golf_leagues")
      .update({ pass_platform_fee_to_members: val })
      .eq("id", league.id);
    setSavingFee(false);
    if (error) {
      setPassFee(!val);
      return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }
    toast({ title: val ? "Members will pay the platform + processing fees" : "Your league will absorb the platform + processing fees" });
    onSaved();
  };

  const saveVisibility = async () => {
    setSavingVis(true);
    const { error } = await (supabase as any)
      .from("golf_leagues")
      .update({
        publish_status: vis.publish_status,
        is_public: vis.is_public,
        allow_search: vis.allow_search,
      })
      .eq("id", league.id);
    setSavingVis(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: vis.publish_status === "published" ? "League published" : "Saved as draft" });
    onSaved();
  };


  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("league_point_systems").select("*").eq("league_id", league.id).maybeSingle();
    setPts(data || { win_points: 2, tie_points: 1, loss_points: 0, position_points: { "1": 10, "2": 8, "3": 6, "4": 4, "5": 2 } });
    setLoading(false);
  };

  useEffect(() => { load(); }, [league.id]);

  const savePts = async () => {
    setSaving(true);
    const payload = {
      league_id: league.id,
      win_points: Number(pts.win_points),
      tie_points: Number(pts.tie_points),
      loss_points: Number(pts.loss_points),
      position_points: typeof pts.position_points === "string" ? JSON.parse(pts.position_points) : pts.position_points,
    };
    const { error } = await (supabase as any).from("league_point_systems").upsert(payload, { onConflict: "league_id" });
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Point system saved" });
    setSaving(false);
  };

  const del = async () => {
    if (!confirm(`Delete "${league.league_name}"? This removes all members, events, and scores.`)) return;
    if (!confirm("This action cannot be undone. Really delete?")) return;
    const { error } = await (supabase as any).from("golf_leagues").delete().eq("id", league.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "League deleted" });
    navigate("/dashboard/leagues");
  };

  const paymentsCard = (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5" /> Platform Fee</h2>
          <p className="text-sm text-muted-foreground">
            Choose who covers the 5% TeeVents platform fee and the card processing fee on every league
            transaction — memberships, registrations, and event entry fees.
          </p>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-md border p-4">
          <div>
            <p className="font-medium text-sm">Pass the 5% platform fee + card processing fee to members</p>
            <p className="text-xs text-muted-foreground">
              On (recommended): both fees are added as line items at checkout and your league receives the
              full amount you set. Off: the fees are deducted from your payout.
            </p>
          </div>
          <Switch checked={passFee} disabled={savingFee} onCheckedChange={saveFeeSetting} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="rounded-md border p-3 space-y-1">
            <p className="font-medium">Fee passed to member (on)</p>
            <div className="flex justify-between text-muted-foreground"><span>Event fee</span><span>$50.00</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Platform fee (5%)</span><span>$2.50</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Card processing</span><span>$1.88</span></div>
            <div className="flex justify-between font-semibold"><span>Member pays</span><span>$54.38</span></div>
            <div className="flex justify-between text-primary"><span>You receive</span><span>$50.00</span></div>
          </div>
          <div className="rounded-md border p-3 space-y-1">
            <p className="font-medium">League absorbs the fee (off)</p>
            <div className="flex justify-between text-muted-foreground"><span>Event fee</span><span>$50.00</span></div>
            <div className="flex justify-between font-semibold"><span>Member pays</span><span>$50.00</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Platform fee (5%)</span><span>−$2.50</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Card processing</span><span>−$1.75</span></div>
            <div className="flex justify-between text-primary"><span>You receive</span><span>$45.75</span></div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Card processing is 2.9% + 30¢ per transaction. When the toggle is on, it is grossed up at
          checkout so your league nets the full listed amount.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <Tabs defaultValue="general" className="space-y-4">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
      </TabsList>

      <TabsContent value="payments" className="space-y-4">{paymentsCard}</TabsContent>

      <TabsContent value="general" className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="h-5 w-5" /> League Details</h2>
            <Button variant="outline" onClick={() => setShowEdit(true)}>Edit</Button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {league.league_name}</div>
            <div><span className="text-muted-foreground">Slug:</span> {league.league_slug}</div>
            <div><span className="text-muted-foreground">Season:</span> {league.season_year || "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> {league.is_active ? "Active" : "Inactive"}</div>
            <div><span className="text-muted-foreground">Public:</span> {league.is_public ? "Yes" : "No"}</div>
            <div><span className="text-muted-foreground">Dates:</span> {league.start_date || "?"} → {league.end_date || "?"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Globe className="h-5 w-5" /> Publishing & Visibility</h2>
            <p className="text-sm text-muted-foreground">Members can only find and log in to a league that is published.</p>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={vis.publish_status} onValueChange={(v) => setVis({ ...vis, publish_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft — only your team can see it</SelectItem>
                <SelectItem value="published">Published — members can find and log in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div>
              <p className="font-medium text-sm">Public league page</p>
              <p className="text-xs text-muted-foreground">Show standings and events at /league/{league.league_slug || "your-slug"}.</p>
            </div>
            <Switch checked={!!vis.is_public} onCheckedChange={(v) => setVis({ ...vis, is_public: v })} />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div>
              <p className="font-medium text-sm">Listed in "Find Your League"</p>
              <p className="text-xs text-muted-foreground">Let members search for this league by name on the TeeVents homepage.</p>
            </div>
            <Switch checked={!!vis.allow_search} onCheckedChange={(v) => setVis({ ...vis, allow_search: v })} />
          </div>

          <Button onClick={saveVisibility} disabled={savingVis}>
            {savingVis && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Visibility
          </Button>
        </CardContent>
      </Card>



      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-lg font-semibold">Point System</h2>
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Win Points</Label>
                  <Input type="number" value={pts.win_points} onChange={(e) => setPts({ ...pts, win_points: e.target.value })} />
                </div>
                <div>
                  <Label>Tie Points</Label>
                  <Input type="number" value={pts.tie_points} onChange={(e) => setPts({ ...pts, tie_points: e.target.value })} />
                </div>
                <div>
                  <Label>Loss Points</Label>
                  <Input type="number" value={pts.loss_points} onChange={(e) => setPts({ ...pts, loss_points: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Position Points (JSON)</Label>
                <Input
                  value={typeof pts.position_points === "string" ? pts.position_points : JSON.stringify(pts.position_points)}
                  onChange={(e) => setPts({ ...pts, position_points: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Example: {`{"1":10,"2":8,"3":6,"4":4,"5":2}`}</p>
              </div>
              <Button onClick={savePts} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Point System
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-destructive mb-3">Danger Zone</h2>
          <Button variant="destructive" onClick={del}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete League
          </Button>
        </CardContent>
      </Card>

      {showEdit && (
        <LeagueForm
          initial={league}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onSaved(); }}
        />
      )}
      </TabsContent>
    </Tabs>
  );
}
