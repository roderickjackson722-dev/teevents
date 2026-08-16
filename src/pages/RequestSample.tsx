import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Upload, Trophy, Sparkles, Clock } from "lucide-react";

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z.string().trim().max(40).optional(),
  organization_name: z.string().trim().max(160).optional(),
  tournament_name: z.string().trim().min(2, "Tell us your tournament name").max(200),
  tournament_date: z.string().trim().max(20).optional(),
  expected_players: z.string().trim().max(10).optional(),
  current_tools: z.string().trim().max(200).optional(),
  challenge: z.string().trim().max(2000).optional(),
});

const TOOL_OPTIONS = [
  "Eventbrite",
  "GolfStatus",
  "Golf Genius",
  "Perfect Golf Event",
  "Spreadsheets / paper",
  "Nothing yet",
  "Other",
];

const benefits = [
  { icon: Trophy, title: "Your event, your branding", text: "We load your tournament name, date, and logo into a real organizer dashboard." },
  { icon: Sparkles, title: "Full platform access", text: "Registration, pairings, live scoring, sponsors, printables — all the real screens." },
  { icon: Clock, title: "Ready in one business day", text: "No sales pitch required. Explore on your own time, then decide." },
];

const MAX_FILE_MB = 8;

export default function RequestSample() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    organization_name: "",
    tournament_name: "",
    tournament_date: "",
    expected_players: "",
    current_tools: "",
    challenge: "",
  });
  const [flyer, setFlyer] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const uploadFile = async (file: File, kind: "flyer" | "logo") => {
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${kind}s/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("sample-requests").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error(`Could not upload your ${kind}: ${error.message}`);
    return path;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    for (const [file, kind] of [[flyer, "flyer"], [logo, "logo"]] as const) {
      if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`Your ${kind} must be under ${MAX_FILE_MB}MB`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const flyer_url = flyer ? await uploadFile(flyer, "flyer") : "";
      const logo_url = logo ? await uploadFile(logo, "logo") : "";
      const players = parseInt(form.expected_players, 10);

      const res = await fetch("/api/public/sample-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          expected_players: Number.isFinite(players) ? players : null,
          flyer_url,
          logo_url,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Submission failed");
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Request a Sample – See TeeVents With Your Own Tournament"
        description="Tell us about your golf tournament and we'll build a personalized TeeVents sample — real organizer dashboard, branded event page, live scoring."
        path="/request-sample"
      />

      <section className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 py-14 md:py-20 text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-display font-bold leading-tight">
            Request a Sample of Your Own Tournament
          </h1>
          <p className="mt-4 text-base md:text-lg text-primary-foreground/85">
            Skip the generic demo. Send us your event details and we'll build a personalized
            TeeVents sample you can click through yourself.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16 grid gap-8 lg:grid-cols-[1fr_360px] max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {done ? "Request received" : "Tell us about your tournament"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-4 py-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                <p className="text-base font-semibold">Your sample is being built.</p>
                <p className="text-sm text-muted-foreground">
                  We sent a confirmation to <strong>{form.email}</strong>. You'll receive your private
                  sample link within one business day.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Button asChild className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
                    <Link to="/get-started">Start Your Tournament</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/plans">View Plans &amp; Pricing</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">Full name *</Label>
                    <Input id="full_name" value={form.full_name} maxLength={120}
                      onChange={(e) => set("full_name", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={form.email} maxLength={255}
                      onChange={(e) => set("email", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} maxLength={40}
                      onChange={(e) => set("phone", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="organization_name">Organization</Label>
                    <Input id="organization_name" value={form.organization_name} maxLength={160}
                      onChange={(e) => set("organization_name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tournament_name">Tournament name *</Label>
                    <Input id="tournament_name" value={form.tournament_name} maxLength={200}
                      onChange={(e) => set("tournament_name", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tournament_date">Event date</Label>
                    <Input id="tournament_date" type="date" value={form.tournament_date}
                      onChange={(e) => set("tournament_date", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expected_players">Expected players</Label>
                    <Input id="expected_players" type="number" min={0} value={form.expected_players}
                      onChange={(e) => set("expected_players", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>What are you using today?</Label>
                    <Select value={form.current_tools} onValueChange={(v) => set("current_tools", v)}>
                      <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                      <SelectContent>
                        {TOOL_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="challenge">What's your biggest challenge running the event?</Label>
                  <Textarea id="challenge" rows={4} maxLength={2000} value={form.challenge}
                    onChange={(e) => set("challenge", e.target.value)} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="flyer">Upload your flyer (optional)</Label>
                    <Input id="flyer" type="file" accept="image/*,application/pdf"
                      onChange={(e) => setFlyer(e.target.files?.[0] ?? null)} />
                    <p className="text-xs text-muted-foreground">PDF or image, up to {MAX_FILE_MB}MB.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="logo">Upload your logo (optional)</Label>
                    <Input id="logo" type="file" accept="image/*"
                      onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
                    <p className="text-xs text-muted-foreground">PNG or JPG, up to {MAX_FILE_MB}MB.</p>
                  </div>
                </div>

                <Button type="submit" size="lg" disabled={submitting}
                  className="w-full bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {submitting ? "Sending…" : "Request a Sample"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  We use your details only to build your sample. No spam, no obligation.
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <Card key={b.title}>
                <CardContent className="pt-6 flex gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary h-fit">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{b.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{b.text}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Card className="bg-muted/40">
            <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
              <p>Prefer to start right now? You can create your tournament and explore the dashboard yourself.</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/get-started">Start Your Tournament</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </section>
    </Layout>
  );
}
