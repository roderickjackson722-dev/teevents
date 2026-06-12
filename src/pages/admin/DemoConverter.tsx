import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Send, Sparkles, RotateCcw, Plus, Trash2 } from "lucide-react";

interface DemoRow {
  id: string;
  tournament_name: string;
  event_date: string | null;
  location: string | null;
  course_name: string | null;
  registration_fee_cents: number;
  scoring_format: string;
  status: string;
  prospect_email: string | null;
  prospect_name: string | null;
  public_token: string;
  conversion_token: string | null;
  converted_at: string | null;
  created_at: string;
}

const SCORING_FORMATS = ["Scramble", "Best Ball", "Stroke Play", "Stableford", "Modified Stableford", "Match Play", "Shamble", "Chapman"];

export default function DemoConverter() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [demos, setDemos] = useState<DemoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DemoRow | null>(null);

  // form state
  const [form, setForm] = useState({
    tournament_name: "",
    event_date: "",
    location: "",
    course_name: "",
    registration_fee_dollars: "150",
    scoring_format: "Scramble",
    generate_players: true,
    generate_sponsors: true,
    generate_scores: true,
    generate_checkins: true,
  });
  const [creating, setCreating] = useState(false);

  // convert state
  const [convert, setConvert] = useState({ email: "", name: "" });
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/admin-login");
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      setAuthChecked(true);
      if (data) loadDemos();
    })();
  }, [navigate]);

  async function loadDemos() {
    setLoading(true);
    const { data } = await supabase
      .from("demo_tournaments")
      .select("*")
      .order("created_at", { ascending: false });
    setDemos((data as DemoRow[]) || []);
    setLoading(false);
  }

  async function createDemo() {
    if (!form.tournament_name.trim()) {
      toast({ title: "Tournament name required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const fee_cents = Math.round(parseFloat(form.registration_fee_dollars || "0") * 100);
    const { data, error } = await supabase.functions.invoke("create-demo-tournament", {
      body: {
        tournament_name: form.tournament_name,
        event_date: form.event_date || null,
        location: form.location,
        course_name: form.course_name,
        registration_fee_cents: fee_cents,
        scoring_format: form.scoring_format,
        generate_players: form.generate_players,
        generate_sponsors: form.generate_sponsors,
        generate_scores: form.generate_scores,
      },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast({ title: "Failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Demo created" });
    setSelected((data as any).demo);
    setForm({ ...form, tournament_name: "", event_date: "", location: "", course_name: "" });
    await loadDemos();
  }

  async function mockToggle(demo_id: string, action: "add" | "remove" | "reset", kind: "players" | "sponsors" | "scores" | "all") {
    const { error } = await supabase.functions.invoke("demo-mock-data-toggle", {
      body: { demo_id, action, kind },
    });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Mock ${kind} ${action}` });
    await loadDemos();
  }

  async function convertDemo() {
    if (!selected) return;
    if (!convert.email) {
      toast({ title: "Prospect email required", variant: "destructive" });
      return;
    }
    setConverting(true);
    const { data, error } = await supabase.functions.invoke("convert-demo-to-live", {
      body: {
        demo_id: selected.id,
        prospect_email: convert.email,
        prospect_name: convert.name,
        app_base_url: window.location.origin,
      },
    });
    setConverting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Converted! Claim email sent to prospect." });
    await loadDemos();
    setSelected(null);
  }

  function demoUrls(d: DemoRow) {
    const base = window.location.origin;
    return {
      site: `${base}/demo/${d.public_token}`,
      dashboard: `${base}/demo/${d.public_token}/dashboard`,
      live: `${base}/demo/${d.public_token}/live`,
      dayOf: `${base}/demo/${d.public_token}/day-of`,
    };
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  }

  if (!authChecked) return <div className="p-8">Loading…</div>;
  if (!isAdmin) return <div className="p-8">Admin access required.</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Admin
          </Button>
          <h1 className="text-xl font-semibold">Demo Converter</h1>
          <Badge variant="secondary" className="ml-2">Turn prospects into customers</Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Step 1 + 2: Create */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1 & 2 — Create a Demo Tournament</CardTitle>
            <CardDescription>Generate a fully populated demo to show prospects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tournament Name</Label>
                <Input value={form.tournament_name} onChange={(e) => setForm({ ...form, tournament_name: e.target.value })} placeholder="Spring Charity Classic" />
              </div>
              <div>
                <Label>Event Date</Label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Pebble Beach, CA" />
              </div>
              <div>
                <Label>Course</Label>
                <Input value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} placeholder="Pebble Beach Golf Links" />
              </div>
              <div>
                <Label>Registration Fee ($)</Label>
                <Input type="number" value={form.registration_fee_dollars} onChange={(e) => setForm({ ...form, registration_fee_dollars: e.target.value })} />
              </div>
              <div>
                <Label>Scoring Format</Label>
                <Select value={form.scoring_format} onValueChange={(v) => setForm({ ...form, scoring_format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCORING_FORMATS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-sm font-medium">Generate Mock Data</div>
              {([
                ["generate_players", "Mock players (12 golfers with realistic names, handicaps)"],
                ["generate_sponsors", "Mock sponsors (6 sponsors with tiers and logos)"],
                ["generate_scores", "Mock scores (for live leaderboard)"],
                ["generate_checkins", "Mock check-ins (simulate player check-in)"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={(form as any)[key]} onCheckedChange={(v) => setForm({ ...form, [key]: !!v })} />
                  {label}
                </label>
              ))}
            </div>

            <Button onClick={createDemo} disabled={creating} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold">
              <Sparkles className="h-4 w-4 mr-2" />
              {creating ? "Creating…" : "Create Demo Tournament"}
            </Button>
          </CardContent>
        </Card>

        {/* Step 3: Share */}
        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3 — Share Demo</CardTitle>
              <CardDescription>{selected.tournament_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(demoUrls(selected)).map(([k, url]) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <span className="w-32 capitalize text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}:</span>
                  <a href={url} target="_blank" rel="noreferrer" className="text-primary underline truncate flex-1">{url}</a>
                  <Button size="sm" variant="ghost" onClick={() => copy(url)}><Copy className="h-3 w-3" /></Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy(Object.values(demoUrls(selected)).join("\n"))}
              >
                <Copy className="h-3 w-3 mr-1" /> Copy All Links
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Convert */}
        {selected && selected.status === "active" && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4 — Convert to Live Tournament</CardTitle>
              <CardDescription>Send the prospect a claim link to take ownership.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Prospect Email</Label>
                  <Input type="email" value={convert.email} onChange={(e) => setConvert({ ...convert, email: e.target.value })} />
                </div>
                <div>
                  <Label>Prospect Name</Label>
                  <Input value={convert.name} onChange={(e) => setConvert({ ...convert, name: e.target.value })} />
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 border border-border rounded p-3 bg-muted/40">
                <div>When converting:</div>
                <div>• Mock players, sponsors, scores will be removed</div>
                <div>• Tournament structure (dates, fees, course details) retained</div>
                <div>• Prospect will receive a signup link to claim their tournament</div>
              </div>
              <Button onClick={convertDemo} disabled={converting} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold">
                <Send className="h-4 w-4 mr-2" />
                {converting ? "Converting…" : "Convert to Live Tournament"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Mock data controls */}
        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>Demo Controls (Admin Only)</CardTitle>
              <CardDescription>These actions only affect the demo.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(["players", "sponsors", "scores"] as const).map((k) => (
                <div key={k} className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => mockToggle(selected.id, "add", k)}>
                    <Plus className="h-3 w-3 mr-1" /> Add {k}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => mockToggle(selected.id, "remove", k)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remove {k}
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={() => mockToggle(selected.id, "reset", "all")}>
                <RotateCcw className="h-3 w-3 mr-1" /> Reset Demo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* All demos */}
        <Card>
          <CardHeader>
            <CardTitle>All Demos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading…</div>
            ) : demos.length === 0 ? (
              <div className="text-sm text-muted-foreground">No demos yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prospect</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demos.map((d) => (
                    <TableRow key={d.id} className={selected?.id === d.id ? "bg-muted/40" : ""}>
                      <TableCell className="font-medium">{d.tournament_name}</TableCell>
                      <TableCell>{d.event_date || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "active" ? "default" : d.status === "converted" ? "secondary" : "outline"}>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{d.prospect_email || "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setSelected(d)}>Manage</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
