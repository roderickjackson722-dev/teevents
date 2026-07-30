import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Send, Sparkles, CheckCircle2, Link as LinkIcon, Copy } from "lucide-react";
import { DEFAULT_CHECKLIST, PLATFORM_LABELS, TALKING_POINTS, type PlatformKey } from "@/lib/demoTalkingPoints";
import { generateDemoAgendaPdf } from "@/lib/demoAgendaPdf";

type DbCompetitor = { slug: string; name: string; talking_points: { pain: string; solution: string }[]; is_active: boolean; sort_order: number };

export default function DemoPreparation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [t, setT] = useState<any>(null);
  const [competitors, setCompetitors] = useState<DbCompetitor[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [generatingShare, setGeneratingShare] = useState(false);

  const [platform, setPlatform] = useState<PlatformKey>("google_forms");
  const [other, setOther] = useState("");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectName, setProspectName] = useState("");

  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin-login"); return; }
      const { data: role } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!role);
      if (!role) { setLoading(false); return; }
      const { data } = await supabase
        .from("tournaments")
        .select("id, title, is_demo, demo_prospect_platform, demo_prospect_other, demo_prospect_email, demo_prospect_name, demo_notes, demo_prepared, demo_checklist, demo_converted_at, demo_conversion_token, demo_conversion_token_expires_at, demo_conversion_used_at, demo_share_token")
        .eq("id", id || "")
        .maybeSingle();
      const { data: comps } = await supabase
        .from("admin_competitors")
        .select("slug, name, talking_points, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      setCompetitors((comps || []) as any);
      if (data) {
        setT(data);
        setPlatform((data.demo_prospect_platform as PlatformKey) || "google_forms");
        setOther(data.demo_prospect_other || "");
        setNotes(data.demo_notes || "");
        setChecklist((data.demo_checklist as Record<string, boolean>) || {});
        setProspectEmail(data.demo_prospect_email || "");
        setProspectName(data.demo_prospect_name || "");
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  async function save(silent = false) {
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({
        demo_prospect_platform: platform,
        demo_prospect_other: platform === "other" ? other : null,
        demo_prospect_email: prospectEmail || null,
        demo_prospect_name: prospectName || null,
        demo_notes: notes || null,
        demo_checklist: checklist,
        demo_prepared: true,
      })
      .eq("id", id || "");
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return false; }
    if (!silent) toast({ title: "Demo preparation saved" });
    return true;
  }

  function downloadPdf() {
    if (!t) return;
    generateDemoAgendaPdf({
      tournamentName: t.title,
      prospectName,
      platform,
      notes,
    });
  }

  async function convertToLive() {
    if (!prospectEmail) {
      toast({ title: "Email required", description: "Enter the organizer's email.", variant: "destructive" });
      return;
    }
    setConverting(true);
    await save(true);
    const { data, error } = await supabase.functions.invoke("prepare-demo-conversion", {
      body: {
        tournament_id: id || "",
        prospect_email: prospectEmail,
        prospect_name: prospectName,
        app_base_url: window.location.origin,
      },
    });
    setConverting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Conversion failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setClaimUrl((data as any)?.claimUrl || null);
    toast({ title: "Signup link sent", description: `Emailed ${prospectEmail}` });
    // refresh state
    const { data: refreshed } = await supabase.from("tournaments").select("demo_converted_at, demo_conversion_token").eq("id", id || "").maybeSingle();
    if (refreshed) setT({ ...t, ...refreshed });
  }

  if (loading) return <div className="p-8">Loading…</div>;
  if (!isAdmin) return <div className="p-8">Admin access required.</div>;
  if (!t) return <div className="p-8">Tournament not found.</div>;
  if (!t.is_demo) return <div className="p-8">This is not a demo tournament.</div>;

  const selectedComp = competitors.find((c) => c.slug === platform);
  const points = selectedComp?.talking_points || TALKING_POINTS[platform as PlatformKey] || [];
  const platformOptions: { slug: string; name: string }[] = competitors.length
    ? competitors.map((c) => ({ slug: c.slug, name: c.name }))
    : (Object.keys(PLATFORM_LABELS) as PlatformKey[]).map((k) => ({ slug: k, name: PLATFORM_LABELS[k] }));

  async function generateShareLink() {
    setGeneratingShare(true);
    let token = t.demo_share_token;
    if (!token) {
      token = crypto.randomUUID();
      const { error } = await supabase.from("tournaments").update({ demo_share_token: token }).eq("id", id || "");
      if (error) { setGeneratingShare(false); toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
      setT({ ...t, demo_share_token: token });
    }
    const url = `${window.location.origin}/demo-prep/${token}`;
    setShareUrl(url);
    try { await navigator.clipboard.writeText(url); toast({ title: "Share link copied" }); } catch { toast({ title: "Share link ready" }); }
    setGeneratingShare(false);
  }

  async function revokeShareLink() {
    if (!confirm("Revoke the current share link? Anyone with the old link will lose access.")) return;
    const { error } = await supabase.from("tournaments").update({ demo_share_token: null }).eq("id", id || "");
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setT({ ...t, demo_share_token: null });
    setShareUrl(null);
    toast({ title: "Share link revoked" });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/demo-converter")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Demo Converter
          </Button>
          <h1 className="text-xl font-semibold">Prepare Demo – {t.title}</h1>
          {t.demo_converted_at && <Badge className="bg-green-600">Converted</Badge>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Step 1: Platform */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — What is the prospect currently using?</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={platform} onValueChange={(v) => setPlatform(v as PlatformKey)} className="space-y-2">
              {platformOptions.map((opt) => (
                <div key={opt.slug} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.slug} id={`p-${opt.slug}`} />
                  <Label htmlFor={`p-${opt.slug}`} className="cursor-pointer">{opt.name}</Label>
                </div>
              ))}
            </RadioGroup>
            {platform === "other" && (
              <Input className="mt-3" placeholder="Specify platform…" value={other} onChange={(e) => setOther(e.target.value)} />
            )}
            <div className="mt-3 text-xs text-muted-foreground">
              Manage the competitor list at <a href="/admin/competitors" className="underline">/admin/competitors</a>.
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Talking points */}
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Key Talking Points</CardTitle>
            <CardDescription>Auto-generated based on your selection.</CardDescription>
          </CardHeader>
          <CardContent>
            {points.length === 0 ? (
              <p className="text-sm text-muted-foreground">Select a platform to see talking points.</p>
            ) : (
              <div className="space-y-3">
                {points.map((tp, i) => (
                  <div key={i} className="border border-border rounded-md p-3 bg-muted/30">
                    <div className="text-sm font-medium text-destructive">Pain: {tp.pain}</div>
                    <div className="text-sm text-foreground mt-1">→ {tp.solution}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Step 3 — Custom Demo Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={5}
              placeholder="Add any additional observations or custom talking points…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Step 4: Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Step 4 — Demo Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DEFAULT_CHECKLIST.map((c) => (
              <label key={c.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={!!checklist[c.key]}
                  onCheckedChange={(v) => setChecklist({ ...checklist, [c.key]: !!v })}
                />
                <span className={checklist[c.key] ? "line-through text-muted-foreground" : ""}>{c.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Step 5: PDF */}
        <Card>
          <CardHeader>
            <CardTitle>Step 5 — Share Demo Agenda</CardTitle>
            <CardDescription>Download a tailored PDF you can email to the prospect before the call.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Prospect name (for the PDF / email)</Label>
                <Input value={prospectName} onChange={(e) => setProspectName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div>
                <Label>Prospect email</Label>
                <Input type="email" value={prospectEmail} onChange={(e) => setProspectEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadPdf}>
                <Download className="h-4 w-4 mr-2" /> Download Demo Agenda PDF
              </Button>
              <Button variant="outline" onClick={generateShareLink} disabled={generatingShare}>
                <LinkIcon className="h-4 w-4 mr-2" /> {t.demo_share_token ? "Copy Share Link" : "Generate Share Link"}
              </Button>
              {t.demo_share_token && (
                <Button variant="ghost" size="sm" onClick={revokeShareLink}>Revoke link</Button>
              )}
            </div>
            {(shareUrl || t.demo_share_token) && (
              <div className="text-xs break-all p-2 bg-muted rounded flex items-center gap-2">
                <span className="flex-1">{shareUrl || `${window.location.origin}/demo-prep/${t.demo_share_token}`}</span>
                <Button size="sm" variant="ghost" onClick={() => {
                  const u = shareUrl || `${window.location.origin}/demo-prep/${t.demo_share_token}`;
                  navigator.clipboard.writeText(u); toast({ title: "Copied" });
                }}><Copy className="h-3 w-3" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => save()} disabled={saving} variant="outline">
            {saving ? "Saving…" : "Save Demo Preparation"}
          </Button>
          {!t.demo_converted_at ? (
            <Button
              onClick={() => setConvertOpen(true)}
              className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Convert to Live Tournament
            </Button>
          ) : (
            <div className="flex items-center text-green-700 text-sm">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Converted — signup link sent to {t.demo_prospect_email}
            </div>
          )}
        </div>
      </div>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Live Tournament</DialogTitle>
            <DialogDescription>
              This will remove all mock players, sponsors, and scores, generate a one-time
              signup link, and email it to the prospect. Tournament settings are kept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Organizer email</Label>
              <Input type="email" value={prospectEmail} onChange={(e) => setProspectEmail(e.target.value)} />
            </div>
            <div>
              <Label>Organizer name (optional)</Label>
              <Input value={prospectName} onChange={(e) => setProspectName(e.target.value)} />
            </div>
            {claimUrl && (
              <div className="text-xs break-all p-2 bg-muted rounded">
                Claim link: <a className="underline" href={claimUrl} target="_blank" rel="noreferrer">{claimUrl}</a>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button
              onClick={convertToLive}
              disabled={converting}
              className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold"
            >
              <Send className="h-4 w-4 mr-2" /> {converting ? "Sending…" : "Send Signup Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
