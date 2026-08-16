import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Download, Loader2, FileText } from "lucide-react";

interface Magnet {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  file_url: string | null;
  cover_image_url: string | null;
  article_type: string;
  view_count: number;
}

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z.string().trim().max(40).optional(),
  organization_name: z.string().trim().max(160).optional(),
  tournament_name: z.string().trim().max(200).optional(),
  tournament_date: z.string().trim().max(20).optional(),
  expected_players: z.string().trim().max(10).optional(),
  challenge: z.string().trim().max(2000).optional(),
});

function useMagnet(slug: string | undefined) {
  const [magnet, setMagnet] = useState<Magnet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("lead_magnets")
        .select("id, title, slug, description, content, file_url, cover_image_url, article_type, view_count")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (!active) return;
      setMagnet((data as Magnet) ?? null);
      setLoading(false);
      if (data) {
        await supabase
          .from("lead_magnets")
          .update({ view_count: ((data as Magnet).view_count ?? 0) + 1 })
          .eq("id", (data as Magnet).id);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  return { magnet, loading };
}

export default function LeadMagnet() {
  const { slug } = useParams<{ slug: string }>();
  const { magnet, loading } = useMagnet(slug);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    organization_name: "",
    tournament_name: "",
    tournament_date: "",
    expected_players: "",
    challenge: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/lead-magnet-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          ...parsed.data,
          expected_players: form.expected_players ? Number(form.expected_players) : null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Something went wrong");
      setDownloadUrl(body.download_url as string);
      toast.success("Your copy is ready — check your email too.");
    } catch (err: any) {
      toast.error(err?.message || "Could not process your download");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!magnet) {
    return (
      <Layout>
        <SEO title="Resource not found" description="This free resource is no longer available." noIndex />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Resource not found</h1>
          <p className="mt-2 text-muted-foreground">This resource may have been unpublished.</p>
          <Button asChild className="mt-6">
            <Link to="/">Back to TeeVents</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title={magnet.title}
        description={magnet.description || `Download the free ${magnet.title} from TeeVents Golf.`}
        path={`/lead-magnet/${magnet.slug}`}
        ogImage={magnet.cover_image_url || undefined}
      />
      <div className="mx-auto max-w-3xl px-4 py-12">
        {magnet.cover_image_url && (
          <img
            src={magnet.cover_image_url}
            alt={magnet.title}
            className="mb-8 w-full rounded-lg border border-border object-cover"
            loading="lazy"
          />
        )}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{magnet.title}</h1>
        {magnet.description && <p className="mt-4 text-lg text-muted-foreground">{magnet.description}</p>}

        <div className="my-10 border-t border-border" />

        {downloadUrl ? (
          <Card>
            <CardContent className="space-y-5 py-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
              <h2 className="text-xl font-bold">Your copy is ready</h2>
              <p className="text-muted-foreground">
                We also emailed the link to <strong>{form.email}</strong>.
              </p>
              <Button asChild size="lg">
                <a href={downloadUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Download {magnet.title}
                </a>
              </Button>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Want to see your own tournament on TeeVents?
                </p>
                <Button asChild variant="outline" className="mt-3">
                  <Link to="/request-sample">Request a Sample Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Get your free copy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={120} required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} required />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
                  </div>
                  <div>
                    <Label htmlFor="organization_name">Organization</Label>
                    <Input id="organization_name" value={form.organization_name} onChange={(e) => set("organization_name", e.target.value)} maxLength={160} />
                  </div>
                  <div>
                    <Label htmlFor="tournament_name">Tournament Name</Label>
                    <Input id="tournament_name" value={form.tournament_name} onChange={(e) => set("tournament_name", e.target.value)} maxLength={200} />
                  </div>
                  <div>
                    <Label htmlFor="tournament_date">Tournament Date</Label>
                    <Input id="tournament_date" type="date" value={form.tournament_date} onChange={(e) => set("tournament_date", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="expected_players">Expected Players</Label>
                    <Input id="expected_players" type="number" min={0} value={form.expected_players} onChange={(e) => set("expected_players", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="challenge">What's your biggest challenge with running tournaments?</Label>
                  <Textarea id="challenge" value={form.challenge} onChange={(e) => set("challenge", e.target.value)} maxLength={2000} rows={3} />
                </div>
                <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Download Now
                </Button>
                <p className="text-xs text-muted-foreground">
                  By downloading, you agree to receive occasional updates from TeeVents.
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

/** Readable version of an article-type lead magnet (linked from the email). */
export function LeadMagnetRead() {
  const { slug } = useParams<{ slug: string }>();
  const { magnet, loading } = useMagnet(slug);

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!magnet) {
    return (
      <Layout>
        <SEO title="Resource not found" description="This free resource is no longer available." noIndex />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Resource not found</h1>
          <Button asChild className="mt-6">
            <Link to="/">Back to TeeVents</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title={magnet.title}
        description={magnet.description || magnet.title}
        path={`/lead-magnet/${magnet.slug}/read`}
        ogImage={magnet.cover_image_url || undefined}
      />
      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{magnet.title}</h1>
        {magnet.description && <p className="mt-4 text-lg text-muted-foreground">{magnet.description}</p>}
        {magnet.file_url && /^https?:\/\//i.test(magnet.file_url) && (
          <Button asChild className="mt-6">
            <a href={magnet.file_url} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-4 w-4" /> Download the PDF
            </a>
          </Button>
        )}
        {magnet.content && (
          <div
            className="prose prose-slate mt-8 max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(magnet.content) }}
          />
        )}
        <div className="mt-12 rounded-lg border border-border bg-muted/40 p-6 text-center">
          <h2 className="text-lg font-bold">See your tournament on TeeVents</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We'll build a custom sample dashboard for your event — no obligation.
          </p>
          <Button asChild className="mt-4">
            <Link to="/request-sample">Request a Sample</Link>
          </Button>
        </div>
      </article>
    </Layout>
  );
}
