import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogIn, User, Mail, ChevronRight, CheckCircle, Clock, ExternalLink, FileText } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import aboutBg from "@/assets/golf-about-bg.jpg";

const Login = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Tables<"events"> | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<"approved" | "pending" | null>(null);
  const [resources, setResources] = useState<Tables<"event_resources">[]>([]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("event_access_requests")
      .insert({ event_id: selectedEvent.id, name: name.trim(), email: email.trim().toLowerCase() })
      .select()
      .single();

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already Registered", description: "You've already requested access for this event." });
      } else {
        toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
      return;
    }

    if (data.status === "approved") {
      try {
        const res = await supabase.functions.invoke("event-resources", {
          body: { event_id: selectedEvent.id, email: email.trim().toLowerCase() },
        });
        if (res.data?.resources) {
          setResources(res.data.resources);
        }
      } catch {}
      setSubmitted("approved");
    } else {
      setSubmitted("pending");
    }
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
            {submitted ? (
              <div className="py-4">
                {submitted === "approved" ? (
                  <>
                    <div className="text-center mb-6">
                      <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
                      <h2 className="text-2xl font-display font-bold text-foreground mb-1">Access Granted!</h2>
                      <p className="text-muted-foreground text-sm">
                        Welcome to <strong>{selectedEvent?.title}</strong>
                      </p>
                    </div>
                    {resources.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Event Resources</p>
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
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <Clock className="h-14 w-14 text-secondary mx-auto mb-4" />
                    <h2 className="text-2xl font-display font-bold text-foreground mb-2">Request Submitted</h2>
                    <p className="text-muted-foreground text-sm">
                      Your request for <strong>{selectedEvent?.title}</strong> is pending approval. You'll be notified once approved.
                    </p>
                  </div>
                )}
              </div>
            ) : !selectedEvent ? (
              <>
                <div className="text-center mb-8">
                  <div className="h-14 w-14 rounded-full bg-primary mx-auto flex items-center justify-center mb-4">
                    <LogIn className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h1 className="text-2xl font-display font-bold text-foreground">Event Login</h1>
                  <p className="text-muted-foreground text-sm mt-2">Select a tournament to request access</p>
                </div>

                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm">No events available right now.</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="w-full text-left p-4 rounded-md border border-border hover:border-secondary/50 hover:bg-muted/50 transition-all flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-display font-semibold text-foreground">{event.title}</p>
                          {event.date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-secondary transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-display font-bold text-foreground">Request Access</h1>
                  <p className="text-muted-foreground text-sm mt-2">{selectedEvent.title}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Full name"
                      className="pl-10"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Submitting..." : "Request Access"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to events
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </section>
    </Layout>
  );
};

export default Login;
