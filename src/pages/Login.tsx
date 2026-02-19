import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, FileText, ExternalLink, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import aboutBg from "@/assets/golf-about-bg.jpg";

const Login = () => {
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Tables<"events"> | null>(null);
  const [resources, setResources] = useState<Tables<"event_resources">[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("status", "current")
        .order("date", { ascending: true });
      setEvents(data || []);
    };
    fetchEvents();
  }, []);

  const handleSelectEvent = async (event: Tables<"events">) => {
    setSelectedEvent(event);
    setLoadingResources(true);
    const { data } = await supabase
      .from("event_resources")
      .select("*")
      .eq("event_id", event.id)
      .order("sort_order", { ascending: true });
    setResources(data || []);
    setLoadingResources(false);
  };

  const handleBack = () => {
    setSelectedEvent(null);
    setResources([]);
  };

  return (
    <Layout>
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${aboutBg})` }} />
        <div className="absolute inset-0 bg-overlay-green" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="bg-card rounded-lg shadow-xl p-8 border border-border">
            <AnimatePresence mode="wait">

              {/* Event List */}
              {!selectedEvent && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-display font-bold text-foreground">Event Login</h1>
                    <p className="text-muted-foreground text-sm mt-2">Select a tournament to access resources</p>
                  </div>

                  {events.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm">No events available right now.</p>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => handleSelectEvent(event)}
                          className="w-full text-left p-4 rounded-md border border-border hover:border-secondary/50 hover:bg-muted/50 transition-all flex items-center gap-3 group"
                        >
                          {event.image_url && (
                            <img src={event.image_url} alt={event.title} className="h-10 w-10 rounded-md object-cover shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-semibold text-foreground">{event.title}</p>
                            {event.date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-secondary transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Resources View */}
              {selectedEvent && (
                <motion.div
                  key="resources"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="text-center mb-6">
                    {selectedEvent.image_url && (
                      <img src={selectedEvent.image_url} alt={selectedEvent.title} className="h-16 w-16 rounded-lg object-cover mx-auto mb-3" />
                    )}
                    <h2 className="text-2xl font-display font-bold text-foreground">{selectedEvent.title}</h2>
                    {selectedEvent.date && (
                      <p className="text-muted-foreground text-sm mt-1">
                        {new Date(selectedEvent.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>

                  {loadingResources ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : resources.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">No resources available yet.</p>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Event Resources</p>
                      <div className="space-y-2">
                        {resources.map((resource) => (
                          <a
                            key={resource.id}
                            href={resource.link || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-3 p-3 rounded-md border border-border transition-all ${resource.link ? "hover:border-secondary/50 hover:bg-muted/50 cursor-pointer" : "opacity-60 pointer-events-none"}`}
                          >
                            <FileText className="h-4 w-4 text-secondary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{resource.title}</p>
                              {resource.description && (
                                <p className="text-xs text-muted-foreground truncate">{resource.description}</p>
                              )}
                            </div>
                            {resource.link && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}
                          </a>
                        ))}
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to events
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
};

export default Login;
