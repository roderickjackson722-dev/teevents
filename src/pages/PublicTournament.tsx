import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Clock, Mail, Phone, ExternalLink, Loader2, UserPlus, Award, ShoppingBag, Package } from "lucide-react";
import RegistrationForm from "@/components/RegistrationForm";

interface PublicSponsor {
  id: string;
  name: string;
  tier: string;
  logo_url: string | null;
  website_url: string | null;
}

interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  purchase_url: string | null;
}

interface TournamentSite {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  date: string | null;
  location: string | null;
  course_name: string | null;
  site_logo_url: string | null;
  site_hero_title: string | null;
  site_hero_subtitle: string | null;
  site_primary_color: string | null;
  site_secondary_color: string | null;
  site_hero_image_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  schedule_info: string | null;
  registration_url: string | null;
  registration_open: boolean | null;
}

const PublicTournament = () => {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<TournamentSite | null>(null);
  const [sponsors, setSponsors] = useState<PublicSponsor[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("tournaments")
      .select("*")
      .eq("slug", slug)
      .eq("site_published", true)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setTournament(data as unknown as TournamentSite);
          // Fetch sponsors and products in parallel
          const [sponsorRes, productRes] = await Promise.all([
            supabase
              .from("tournament_sponsors")
              .select("id, name, tier, logo_url, website_url")
              .eq("tournament_id", data.id)
              .order("sort_order", { ascending: true }),
            supabase
              .from("tournament_store_products")
              .select("id, name, description, price, image_url, category, purchase_url")
              .eq("tournament_id", data.id)
              .eq("is_active", true)
              .order("sort_order", { ascending: true }),
          ]);
          setSponsors((sponsorRes.data as PublicSponsor[]) || []);
          setProducts((productRes.data as PublicProduct[]) || []);
        }
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-foreground mb-4">Tournament Not Found</h1>
          <p className="text-muted-foreground">This tournament page doesn't exist or hasn't been published yet.</p>
        </div>
      </div>
    );
  }

  const primary = tournament.site_primary_color || "#1a5c38";
  const secondary = tournament.site_secondary_color || "#c8a84e";
  const heroTitle = tournament.site_hero_title || tournament.title;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section
        className="relative min-h-[60vh] flex items-center justify-center"
        style={{
          backgroundColor: primary,
          backgroundImage: tournament.site_hero_image_url
            ? `url(${tournament.site_hero_image_url})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {tournament.site_hero_image_url && (
          <div className="absolute inset-0 bg-black/55" />
        )}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4 max-w-3xl mx-auto"
        >
          {tournament.site_logo_url && (
            <img
              src={tournament.site_logo_url}
              alt={heroTitle}
              className="h-24 w-24 mx-auto mb-6 object-contain"
            />
          )}
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>
            {heroTitle}
          </h1>
          {tournament.site_hero_subtitle && (
            <p className="mt-4 text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
              {tournament.site_hero_subtitle}
            </p>
          )}

          {/* Quick Info Pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {tournament.date && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                <Calendar className="h-4 w-4" />
                {new Date(tournament.date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            {tournament.course_name && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                ⛳ {tournament.course_name}
              </span>
            )}
            {tournament.location && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                <MapPin className="h-4 w-4" />
                {tournament.location}
              </span>
            )}
          </div>

          {tournament.registration_url ? (
            <a
              href={tournament.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-8 px-8 py-3 rounded-md text-lg font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: secondary, color: primary }}
            >
              Register Now
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : tournament.registration_open ? (
            <a
              href="#register"
              className="inline-flex items-center gap-2 mt-8 px-8 py-3 rounded-md text-lg font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: secondary, color: primary }}
            >
              Register Now
              <UserPlus className="h-4 w-4" />
            </a>
          ) : null}
        </motion.div>
      </section>

      {/* About */}
      {tournament.description && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2
                className="text-sm font-bold tracking-[0.3em] uppercase mb-4"
                style={{ color: secondary }}
              >
                About the Tournament
              </h2>
              <p className="text-lg text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {tournament.description}
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* Schedule */}
      {tournament.schedule_info && (
        <section className="py-16" style={{ backgroundColor: primary + "0a" }}>
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2
                className="text-sm font-bold tracking-[0.3em] uppercase mb-6"
                style={{ color: secondary }}
              >
                <Clock className="h-4 w-4 inline mr-2" />
                Event Schedule
              </h2>
              <div className="bg-card rounded-lg border border-border p-6">
                <pre className="text-foreground/80 whitespace-pre-wrap font-body text-base leading-relaxed">
                  {tournament.schedule_info}
                </pre>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Built-in Registration Form */}
      {tournament.registration_open && !tournament.registration_url && (
        <section id="register" className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-center mb-8">
                <UserPlus className="h-8 w-8 mx-auto mb-3" style={{ color: secondary }} />
                <h2 className="text-3xl font-display font-bold text-foreground mb-2">
                  Register to Play
                </h2>
                <p className="text-muted-foreground">
                  Fill out the form below to secure your spot.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <RegistrationForm
                  tournamentId={tournament.id}
                  primaryColor={primary}
                  secondaryColor={secondary}
                />
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* External Registration CTA */}
      {tournament.registration_url && (
        <section className="py-16" style={{ backgroundColor: primary }}>
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                Ready to Play?
              </h2>
              <p className="text-white/70 max-w-xl mx-auto mb-8">
                Secure your spot today. Space is limited!
              </p>
              <a
                href={tournament.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-md text-lg font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: secondary, color: primary }}
              >
                Register Now
                <ExternalLink className="h-4 w-4" />
              </a>
            </motion.div>
          </div>
        </section>
      )}

      {/* Store */}
      {products.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2
                className="text-sm font-bold tracking-[0.3em] uppercase mb-2 text-center"
                style={{ color: secondary }}
              >
                <ShoppingBag className="h-4 w-4 inline mr-2" />
                Tournament Store
              </h2>
              <p className="text-center text-muted-foreground mb-10 text-sm">
                Support the tournament with merchandise and gear
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow group"
                  >
                    {p.image_url ? (
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-display font-bold text-foreground">{p.name}</h3>
                      <p className="text-lg font-semibold mt-1" style={{ color: primary }}>
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(p.price)}
                      </p>
                      {p.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                      )}
                      {p.purchase_url && (
                        <a
                          href={p.purchase_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90"
                          style={{ backgroundColor: primary, color: "white" }}
                        >
                          Buy Now
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {sponsors.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2
                className="text-sm font-bold tracking-[0.3em] uppercase mb-2 text-center"
                style={{ color: secondary }}
              >
                <Award className="h-4 w-4 inline mr-2" />
                Our Sponsors
              </h2>
              <p className="text-center text-muted-foreground mb-10 text-sm">
                Thank you to our generous sponsors
              </p>
              <div className="flex flex-wrap justify-center items-center gap-8">
                {sponsors.map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center"
                  >
                    {s.website_url ? (
                      <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="group">
                        {s.logo_url ? (
                          <img
                            src={s.logo_url}
                            alt={s.name}
                            className="h-16 w-auto max-w-[140px] object-contain grayscale group-hover:grayscale-0 transition-all"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {s.name}
                          </span>
                        )}
                      </a>
                    ) : s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="h-16 w-auto max-w-[140px] object-contain" />
                    ) : (
                      <span className="text-sm font-semibold text-foreground">{s.name}</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Contact Footer */}
      {(tournament.contact_email || tournament.contact_phone) && (
        <section className="py-12 bg-card border-t border-border">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h3
              className="text-sm font-bold tracking-[0.3em] uppercase mb-4"
              style={{ color: secondary }}
            >
              Questions?
            </h3>
            <div className="flex flex-wrap justify-center gap-6">
              {tournament.contact_email && (
                <a
                  href={`mailto:${tournament.contact_email}`}
                  className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {tournament.contact_email}
                </a>
              )}
              {tournament.contact_phone && (
                <a
                  href={`tel:${tournament.contact_phone}`}
                  className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {tournament.contact_phone}
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Powered By */}
      <footer className="py-4 text-center border-t border-border">
        <p className="text-xs text-muted-foreground">
          Powered by <span className="font-semibold" style={{ color: primary }}>TeeVents</span>
        </p>
      </footer>
    </div>
  );
};

export default PublicTournament;
