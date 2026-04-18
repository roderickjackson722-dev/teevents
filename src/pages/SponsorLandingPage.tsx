import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, MapPin, FileDown, Mail, Phone, CheckCircle2, ArrowRight } from "lucide-react";

interface Tier {
  id?: string;
  name: string;
  price_cents: number;
  description?: string | null;
  benefits?: string | null;
}

interface PageData {
  tournament: {
    id: string;
    title: string;
    slug: string | null;
    custom_slug: string | null;
    date: string | null;
    location: string | null;
    course_name: string | null;
    site_hero_image_url: string | null;
    site_logo_url: string | null;
    site_primary_color: string | null;
  };
  page: {
    hero_title: string | null;
    hero_description: string | null;
    tiers_content: Tier[] | null;
    use_imported_tiers: boolean;
    contact_email: string | null;
    contact_phone: string | null;
    contact_name: string | null;
    pdf_url: string | null;
    custom_html: string | null;
    cta_register_label: string | null;
    published: boolean;
  };
  importedTiers: Tier[];
}

const SponsorLandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });

  useEffect(() => {
    if (!slug) return;
    (async () => {
      // Find tournament by slug or custom_slug
      const { data: tList } = await supabase
        .from("tournaments")
        .select("id, title, slug, custom_slug, date, location, course_name, site_hero_image_url, site_logo_url, site_primary_color")
        .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
        .limit(1);
      const tournament = tList?.[0];
      if (!tournament) {
        setLoading(false);
        return;
      }

      const [pageRes, tiersRes] = await Promise.all([
        supabase
          .from("sponsorship_pages")
          .select("*")
          .eq("tournament_id", tournament.id)
          .eq("published", true)
          .maybeSingle(),
        supabase
          .from("sponsorship_tiers")
          .select("id, name, price_cents, description, benefits")
          .eq("tournament_id", tournament.id)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);

      if (!pageRes.data) {
        setLoading(false);
        return;
      }

      setData({
        tournament,
        page: pageRes.data as any,
        importedTiers: (tiersRes.data || []) as Tier[],
      });
      setLoading(false);
    })();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-sponsor-inquiry", {
        body: { tournament_id: data.tournament.id, ...form },
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Inquiry sent!", description: "We'll be in touch shortly." });
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <>
        <Navbar />
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
          <h1 className="text-3xl font-display font-bold mb-2">Sponsorship page not available</h1>
          <p className="text-muted-foreground mb-6">This tournament does not have a published sponsorship page.</p>
          <Link to="/"><Button>Back to home</Button></Link>
        </div>
        <Footer />
      </>
    );
  }

  const { tournament, page, importedTiers } = data;
  const tiers: Tier[] = page.use_imported_tiers
    ? importedTiers
    : (page.tiers_content as Tier[] | null) || [];

  const heroImage = tournament.site_hero_image_url;
  const heroTitle = page.hero_title || `Sponsor ${tournament.title}`;
  const heroDescription =
    page.hero_description ||
    "Partner with us to make this tournament a success. Choose a sponsorship level below or get in touch.";

  return (
    <>
      <SEO
        title={`Sponsor ${tournament.title} | TeeVents`}
        description={heroDescription.slice(0, 155)}
      />
      <Navbar />

      {/* Hero */}
      <section
        className="relative bg-primary text-primary-foreground"
        style={
          heroImage
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url(${heroImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="container mx-auto px-4 py-20 max-w-4xl text-center">
          {tournament.site_logo_url && (
            <img
              src={tournament.site_logo_url}
              alt={`${tournament.title} logo`}
              className="h-20 mx-auto mb-6 object-contain"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{heroTitle}</h1>
          <p className="text-lg text-primary-foreground/90 mb-6 max-w-2xl mx-auto">{heroDescription}</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {tournament.date && (
              <span className="inline-flex items-center gap-1.5 bg-primary-foreground/15 px-3 py-1.5 rounded-full">
                <Calendar className="h-4 w-4" />
                {new Date(tournament.date).toLocaleDateString(undefined, {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </span>
            )}
            {(tournament.location || tournament.course_name) && (
              <span className="inline-flex items-center gap-1.5 bg-primary-foreground/15 px-3 py-1.5 rounded-full">
                <MapPin className="h-4 w-4" />
                {tournament.course_name || tournament.location}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Sponsorship tiers */}
      <section className="bg-golf-cream py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-display font-bold text-center mb-2">Sponsorship Opportunities</h2>
          <p className="text-center text-muted-foreground mb-10">
            Choose the level that fits your goals.
          </p>

          {tiers.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Sponsorship tiers will be announced soon. Use the form below to inquire.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tiers.map((tier, i) => (
                <Card key={tier.id || i} className="flex flex-col">
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-display font-bold mb-1">{tier.name}</h3>
                    <p className="text-3xl font-bold text-primary mb-4">
                      ${(tier.price_cents / 100).toLocaleString()}
                    </p>
                    {tier.description && (
                      <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                    )}
                    {tier.benefits && (
                      <ul className="space-y-1.5 mb-6 flex-1">
                        {tier.benefits.split("\n").filter(Boolean).map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>{b.replace(/^[-•]\s*/, "")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <a href={`/t/${tournament.slug}/sponsor`}>
                      <Button className="w-full mt-auto">
                        {page.cta_register_label || "Become a Sponsor"}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* PDF + Register CTAs */}
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {page.pdf_url && (
              <a href={page.pdf_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg">
                  <FileDown className="h-4 w-4 mr-2" />
                  Download Prospectus (PDF)
                </Button>
              </a>
            )}
            <a href={`/t/${tournament.slug}/sponsor`}>
              <Button size="lg">
                {page.cta_register_label || "Become a Sponsor"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Custom HTML block */}
      {page.custom_html && (
        <section className="bg-card py-12">
          <div
            className="container mx-auto px-4 max-w-4xl prose prose-sm sm:prose"
            // Admin-controlled content only (RLS restricts writes to admins)
            dangerouslySetInnerHTML={{ __html: page.custom_html }}
          />
        </section>
      )}

      {/* Inquiry form */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-3xl font-display font-bold text-center mb-2">Have Questions?</h2>
          <p className="text-center text-muted-foreground mb-8">
            Send us a note and we'll get back to you within one business day.
          </p>

          {(page.contact_name || page.contact_email || page.contact_phone) && (
            <div className="bg-muted/40 rounded-lg p-4 mb-6 text-sm flex flex-wrap gap-4 justify-center">
              {page.contact_name && <span><strong>{page.contact_name}</strong></span>}
              {page.contact_email && (
                <a href={`mailto:${page.contact_email}`} className="inline-flex items-center gap-1.5 text-primary">
                  <Mail className="h-4 w-4" /> {page.contact_email}
                </a>
              )}
              {page.contact_phone && (
                <a href={`tel:${page.contact_phone}`} className="inline-flex items-center gap-1.5 text-primary">
                  <Phone className="h-4 w-4" /> {page.contact_phone}
                </a>
              )}
            </div>
          )}

          {submitted ? (
            <Card><CardContent className="p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-1">Thank you!</h3>
              <p className="text-muted-foreground">We've received your inquiry and will be in touch shortly.</p>
            </CardContent></Card>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" required maxLength={200}
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" required maxLength={320}
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" maxLength={200}
                    value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" maxLength={50}
                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea id="message" required rows={5} maxLength={5000}
                  value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Inquiry
              </Button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
};

export default SponsorLandingPage;
