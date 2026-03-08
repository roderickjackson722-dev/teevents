import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, ExternalLink, Image, Trophy } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import aboutBg from "@/assets/golf-about-bg.jpg";

const Events = () => {
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: false });
      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const currentEvents = events.filter((e) => e.status === "current");
  const pastEvents = events.filter((e) => e.status === "past");

  const EventCard = ({ event, index }: { event: Tables<"events">; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-all"
    >
      {event.image_url && (
        <div className="h-48 overflow-hidden">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-6">
        <h3 className="font-display text-xl font-bold text-foreground mb-2">{event.title}</h3>
        {event.description && (
          <p className="text-muted-foreground text-sm mb-4">{event.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
          {event.date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(event.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {event.link && (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-secondary/80 transition-colors"
            >
              View Details <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {(event as any).gallery_url && (
            <a
              href={(event as any).gallery_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-secondary/80 transition-colors"
            >
              <Image className="h-3.5 w-3.5" /> Gallery
            </a>
          )}
          {(event as any).results_url && (
            <a
              href={(event as any).results_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-secondary/80 transition-colors"
            >
              <Trophy className="h-3.5 w-3.5" /> Results
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${aboutBg})` }} />
        <div className="absolute inset-0 bg-overlay-green" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4"
          >
            Events
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-primary-foreground/80 max-w-xl mx-auto"
          >
            Browse our current and past tournament events
          </motion.p>
        </div>
      </section>

      <section className="bg-golf-cream py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-center text-muted-foreground">No events yet. Check back soon!</p>
          ) : (
            <>
              {currentEvents.length > 0 && (
                <div className="mb-16">
                  <h2 className="text-2xl font-display font-bold text-foreground mb-8">Current Events</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentEvents.map((event, i) => (
                      <EventCard key={event.id} event={event} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {pastEvents.length > 0 && (
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-8">Past Events</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastEvents.map((event, i) => (
                      <EventCard key={event.id} event={event} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Events;
