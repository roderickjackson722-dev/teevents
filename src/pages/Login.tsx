import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogIn, User, Mail, ChevronRight, CheckCircle, Clock, ExternalLink, FileText, ArrowLeft } from "lucide-react";
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
  const [mode, setMode] = useState<"choose" | "new" | "returning">("choose");
  const [returningEmail, setReturningEmail] = useState("");
  const [returningEvents, setReturningEvents] = useState<(Tables<"events"> & { resources: Tables<"event_resources">[] })[]>([]);

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
      // Send notification to admins (fire and forget)
      supabase.functions.invoke("notify-access-request", {
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          event_title: selectedEvent.title,
        },
      }).catch(() => {});
      setSubmitted("pending");
    }
  };

  const handleReturningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await supabase.functions.invoke("event-resources", {
        body: { email: returningEmail.trim().toLowerCase() },
      });

      if (res.data?.events && res.data.events.length > 0) {
        setReturningEvents(res.data.events);
      } else {
        toast({ title: "No Events Found", description: "No approved events found for this email.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    }

    setLoading(false);
  };

  const resetAll = () => {
    setMode("choose");
    setSelectedEvent(null);
    setSubmitted(null);
    setResources([]);
    setReturningEmail("");
    setReturningEvents([]);
    setName("");
    setEmail("");
  };

  const renderResources = (resourceList: Tables<"event_resources">[]) => (
    <div className="space-y-2">
      {resourceList.map((resource) => (
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
  );

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

            {/* MODE: Choose new or returning */}
            {mode === "choose" && (
              <>
                <div className="text-center mb-8">
                  <div className="h-14 w-14 rounded-full bg-primary mx-auto flex items-center justify-center mb-4">
                    <LogIn className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h1 className="text-2xl font-display font-bold text-foreground">Event Login</h1>
                  <p className="text-muted-foreground text-sm mt-2">Access tournament resources</p>
                </div>
                <div className="space-y-3">
                  <Button onClick={() => setMode("new")} className="w-full" variant="default">
                    Request Event Access
                  </Button>
                  <Button onClick={() => setMode("returning")} className="w-full" variant="outline">
                    Returning Member
                  </Button>
                </div>
              </>
            )}

            {/* MODE: Returning member */}
            {mode === "returning" && returningEvents.length === 0 && (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-display font-bold text-foreground">Welcome Back</h1>
                  <p className="text-muted-foreground text-sm mt-2">Enter your email to access your events</p>
                </div>
                <form onSubmit={handleReturningSubmit} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      className="pl-10"
                      value={returningEmail}
                      onChange={(e) => setReturningEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Looking up..." : "Access Resources"}
                  </Button>
                  <button type="button" onClick={resetAll} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                    ← Back
                  </button>
                </form>
              </>
            )}

            {/* MODE: Returning member - show events + resources */}
            {mode === "returning" && returningEvents.length > 0 && (
              <>
                <div className="text-center mb-6">
                  <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
                  <h2 className="text-2xl font-display font-bold text-foreground mb-1">Your Events</h2>
                  <p className="text-muted-foreground text-sm">{returningEmail}</p>
                </div>
                <div className="space-y-5">
                  {returningEvents.map((event) => (
                    <div key={event.id}>
                      <div className="flex items-center gap-2 mb-2">
                        {event.image_url && (
                          <img src={event.image_url} alt={event.title} className="h-8 w-8 rounded-md object-cover shrink-0" />
                        )}
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{event.title}</p>
                      </div>
                      {event.resources.length > 0 ? renderResources(event.resources) : (
                        <p className="text-xs text-muted-foreground italic">No resources available yet.</p>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={resetAll} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-6">
                  ← Back
                </button>
              </>
            )}

            {/* MODE: New access request - submitted */}
            {mode === "new" && submitted ? (
              <div className="py-4">
                {submitted === "approved" ? (
                  <>
                    <div className="text-center mb-6">
                      {selectedEvent?.image_url ? (
                        <img src={selectedEvent.image_url} alt={selectedEvent.title} className="h-16 w-16 rounded-lg object-cover mx-auto mb-3" />
                      ) : (
                        <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
                      )}
                      <h2 className="text-2xl font-display font-bold text-foreground mb-1">Access Granted!</h2>
                      <p className="text-muted-foreground text-sm">
                        Welcome to <strong>{selectedEvent?.title}</strong>
                      </p>
                    </div>
                    {resources.length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Event Resources</p>
                        {renderResources(resources)}
                      </>
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
                <button type="button" onClick={resetAll} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-4">
                  ← Back to start
                </button>
              </div>
            ) : null}

            {/* MODE: New access request - select event */}
            {mode === "new" && !submitted && !selectedEvent && (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-display font-bold text-foreground">Select Event</h1>
                  <p className="text-muted-foreground text-sm mt-2">Choose a tournament to request access</p>
                </div>
                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm">No events available right now.</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
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
                <button type="button" onClick={resetAll} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-4">
                  ← Back
                </button>
              </>
            )}

            {/* MODE: New access request - form */}
            {mode === "new" && !submitted && selectedEvent && (
              <>
                <div className="text-center mb-6">
                  {selectedEvent.image_url && (
                    <img src={selectedEvent.image_url} alt={selectedEvent.title} className="h-14 w-14 rounded-lg object-cover mx-auto mb-3" />
                  )}
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
