import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { Loader2, CheckCircle2, ImagePlus, ArrowLeft } from "lucide-react";
import { normalizeFields, type RegField } from "@/components/leagues/LeagueRegistrationTab";
import { formatCents } from "@/lib/formatCurrency";

const PLATFORM_FEE_RATE = 0.05;

export default function LeagueRegisterPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const payState = params.get("pay");

  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<RegField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<any>(null);
  const [agreed, setAgreed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ code: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: lg } = await (supabase as any)
          .from("golf_leagues")
          .select("id, league_name, league_slug, logo_url, tagline, is_public, is_active, pass_platform_fee_to_members")
          .eq("league_slug", slug)
          .maybeSingle();
        setLeague(lg);
        if (lg) {
          const { data: f } = await (supabase as any)
            .from("league_registration_forms").select("*").eq("league_id", lg.id).maybeSingle();
          setForm(f);
          setFields(normalizeFields(f?.custom_fields).filter(x => x.enabled));
        }
      } catch (e) {
        console.error("League registration load failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);


  const baseCents = form ? (form.is_free ? 0 : Number(form.league_fee_cents || 0)) : 0;
  const discounted = (() => {
    if (!promo) return baseCents;
    let a = baseCents;
    if (promo.discount_percent) a = Math.round(a * (1 - promo.discount_percent / 100));
    if (promo.discount_cents) a -= promo.discount_cents;
    return Math.max(0, a);
  })();
  const passPlatformFee = !!form?.pass_platform_fee_to_player || (league as any)?.pass_platform_fee_to_members !== false;
  const platformFee = passPlatformFee ? Math.round(discounted * PLATFORM_FEE_RATE) : 0;
  const total = discounted + platformFee;

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code || !league) return;
    const { data } = await (supabase as any)
      .from("league_registration_promo_codes")
      .select("*")
      .eq("league_id", league.id)
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (!data) { setPromo(null); return toast({ title: "Promo code not valid", variant: "destructive" }); }
    setPromo(data);
    toast({ title: "Promo code applied" });
  };

  const uploadPhoto = async (key: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast({ title: "Image must be under 5MB", variant: "destructive" });
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `league-member-photos/${league.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("sponsorship-assets").upload(path, file, { upsert: false });
    setUploading(false);
    if (error) return toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    const { data } = supabase.storage.from("sponsorship-assets").getPublicUrl(path);
    setValues(v => ({ ...v, [key]: data.publicUrl }));
    toast({ title: "Photo uploaded" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !String(values[f.key] ?? "").trim()) {
        return toast({ title: `${f.label} is required`, variant: "destructive" });
      }
    }
    if (form?.terms_text && !agreed) {
      return toast({ title: "Please agree to the league terms", variant: "destructive" });
    }
    setSubmitting(true);
    const { data, error } = await (supabase as any).functions.invoke("league-member-register", {
      body: {
        league_slug: slug,
        answers: values,
        promo_code: promo?.code || undefined,
        return_url: `${window.location.origin}/league/${slug}/register`,
      },
    });
    setSubmitting(false);
    if (error || data?.error) {
      return toast({ title: "Registration failed", description: data?.error || error?.message, variant: "destructive" });
    }
    if (data?.url) { window.location.href = data.url; return; }
    setDone({ code: data?.scoring_code || null });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!league) {
    return <div className="min-h-screen flex items-center justify-center p-6"><p className="text-muted-foreground">League not found.</p></div>;
  }

  if (payState === "success" || done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <SEO title={`Registered — ${league.league_name}`} description={`Registration confirmed for ${league.league_name}`} />
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">You're registered!</h1>
            <p className="text-muted-foreground">Welcome to {league.league_name}. A confirmation email is on the way.</p>
            {done?.code && (
              <div className="rounded-md border p-4">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Your member login code</p>
                <p className="text-3xl font-mono font-bold tracking-[0.3em]">{done.code}</p>
              </div>
            )}
            <Button asChild className="w-full"><Link to={`/league/${slug}/score`}>Go to Member Login</Link></Button>
            <Button asChild variant="ghost" className="w-full"><Link to={`/league/${slug}`}>Back to league page</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const closed = !form || !form.is_open || !league.is_active;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <SEO title={`Join ${league.league_name}`} description={`Register to join ${league.league_name} — sign up, pay your league fee, and get your member login code.`} />
      <div className="max-w-2xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/league/${slug}`}><ArrowLeft className="h-4 w-4 mr-1" /> {league.league_name}</Link>
        </Button>

        <Card>
          <CardHeader>
            {league.logo_url && <img src={league.logo_url} alt={`${league.league_name} logo`} className="h-14 object-contain mb-2" />}
            <CardTitle className="text-2xl">Join {league.league_name}</CardTitle>
            {form?.intro_text && <p className="text-sm text-muted-foreground">{form.intro_text}</p>}
          </CardHeader>
          <CardContent>
            {closed ? (
              <p className="text-muted-foreground">Registration is currently closed for this league.</p>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="rounded-md border p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">League Fee</span>
                    <span className="font-semibold">{baseCents === 0 ? "Free" : `${formatCents(baseCents)}`}</span>
                  </div>
                  {form.promo_code_enabled && baseCents > 0 && (
                    <div className="flex gap-2">
                      <Input placeholder="Promo code" value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} />
                      <Button type="button" variant="outline" onClick={applyPromo}>Apply</Button>
                    </div>
                  )}
                  {promo && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Discount ({promo.code})</span>
                      <span>-{formatCents((baseCents - discounted))}</span>
                    </div>
                  )}
                  {platformFee > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Processing fee</span><span>{formatCents(platformFee)}</span>
                    </div>
                  )}
                  {baseCents > 0 && (
                    <div className="flex items-center justify-between border-t pt-2 font-bold">
                      <span>Total</span><span>{formatCents(total)}</span>
                    </div>
                  )}
                </div>

                {fields.map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                    {f.type === "select" ? (
                      <Select value={values[f.key] || ""} onValueChange={(v) => setValues(s => ({ ...s, [f.key]: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {(f.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : f.type === "textarea" ? (
                      <Textarea value={values[f.key] || ""} onChange={(e) => setValues(s => ({ ...s, [f.key]: e.target.value }))} />
                    ) : f.type === "image" ? (
                      <div className="flex items-center gap-3">
                        {values[f.key] && <img src={values[f.key]} alt="Profile preview" className="h-16 w-16 rounded-full object-cover border" />}
                        <label className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-2 cursor-pointer hover:bg-muted">
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                          Choose File
                          <input
                            type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadPhoto(f.key, file); e.target.value = ""; }}
                          />
                        </label>
                        <span className="text-xs text-muted-foreground">JPG, PNG — max 5MB</span>
                      </div>
                    ) : (
                      <Input
                        type={f.type === "number" ? "number" : f.type}
                        value={values[f.key] || ""}
                        onChange={(e) => setValues(s => ({ ...s, [f.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}

                {form.terms_text && (
                  <div className="flex items-start gap-2">
                    <Checkbox id="terms" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
                    <Label htmlFor="terms" className="text-sm font-normal leading-snug">{form.terms_text}</Label>
                  </div>
                )}

                <Button type="submit" className="w-full h-12" disabled={submitting || uploading}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : total > 0 ? `Register & Pay ${formatCents(total)}` : "Complete Registration"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
