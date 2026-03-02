import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Clock, Mail, Phone, ExternalLink, Loader2 } from "lucide-react";

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
}

const PublicTournament = () => {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<TournamentSite | null>(null);
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
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setTournament(data as unknown as TournamentSite);
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

          {tournament.registration_url && (
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
          )}
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

      {/* Registration CTA */}
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
