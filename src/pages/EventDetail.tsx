import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Calendar, MapPin, Ticket, ArrowLeft, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatTournamentDate } from "@/lib/formatDate";
import { formatCents } from "@/lib/formatCurrency";

type Tier = {
  id: string;
  tier_name: string;
  description: string | null;
  price_cents: number;
  max_quantity: number | null;
  sold_quantity: number;
  display_order: number;
};

type Question = { label: string; type: "text" | "email" | "phone" | "select"; required: boolean; options?: string };

type Sponsor = { name: string; logo_url: string; website_url: string };

type EventDetailRow = {
  id: string;
  event_title: string;
  event_slug: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  address: string | null;
  hero_image_url: string | null;
  description_html: string | null;
  schedule_html: string | null;
  status: string;
  purchase_questions: Question[] | null;
  sponsors: Sponsor[] | null;
  photos: string[] | null;
  event_ticket_tiers: Tier[];
};



const formatTime = (t: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? "PM" : "AM";
  const disp = ((hr + 11) % 12) + 1;
  return `${disp}:${m} ${ampm}`;
};

const EventDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [event, setEvent] = useState<EventDetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("public_events")
        .select("id, event_title, event_slug, event_date, event_time, location, address, hero_image_url, description_html, schedule_html, status, purchase_questions, sponsors, photos, event_ticket_tiers(id, tier_name, description, price_cents, max_quantity, sold_quantity, display_order)")
        .eq("event_slug", slug)
        .maybeSingle();

      const evt = data as EventDetailRow | null;
      if (evt?.event_ticket_tiers) {
        evt.event_ticket_tiers.sort((a, b) => a.display_order - b.display_order);
        if (evt.event_ticket_tiers.length) setSelectedTier(evt.event_ticket_tiers[0].id);
      }
      setEvent(evt);
      setLoading(false);
    })();
  }, [slug]);


  // Verify purchase on redirect
  useEffect(() => {
    const purchase = searchParams.get("purchase");
    const sid = searchParams.get("session_id");
    if (purchase === "success" && sid) {
      supabase.functions.invoke("verify-event-ticket", { body: { session_id: sid } }).then(({ data }) => {
        if (data?.paid) toast.success("Payment confirmed! Check your email for your ticket.");
      });
      const p = new URLSearchParams(searchParams);
      p.delete("session_id");
      setSearchParams(p, { replace: true });
    } else if (purchase === "cancel") {
      toast.info("Purchase cancelled.");
    }
  }, [searchParams, setSearchParams]);

  const tier = useMemo(() => event?.event_ticket_tiers.find((t) => t.id === selectedTier), [event, selectedTier]);
  const total = tier ? tier.price_cents * quantity : 0;
  const remaining = tier?.max_quantity == null ? null : (tier.max_quantity - tier.sold_quantity);

  const questions = event?.purchase_questions || [];

  const handlePurchase = async () => {
    if (!event || !tier) return;
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter your name and email");
      return;
    }
    for (const q of questions) {
      if (q.required && !(answers[q.label] || "").trim()) {
        toast.error(`Please answer: ${q.label}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const isFree = tier.price_cents === 0;
      const fnName = isFree ? "verify-event-ticket" : "create-event-ticket-checkout";
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: isFree
          ? {
              free_registration: true,
              event_id: event.id,
              tier_id: tier.id,
              quantity,
              buyer_name: name.trim(),
              buyer_email: email.trim(),
              buyer_answers: answers,
            }
          : {
              event_id: event.id,
              tier_id: tier.id,
              quantity,
              buyer_name: name.trim(),
              buyer_email: email.trim(),
              buyer_answers: answers,
            },
      });
      if (error) throw error;
      if (isFree) {
        toast.success("Registration confirmed! Check your email.");
        setName(""); setEmail(""); setAnswers({}); setQuantity(1);
      } else if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (err) {
      toast.error((err as Error).message || "Could not complete registration");
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) return <Layout><div className="container py-16 text-center text-muted-foreground">Loading event...</div></Layout>;
  if (!event) return <Layout><div className="container py-16 text-center">Event not found. <Link to="/events" className="text-secondary underline">Back to events</Link></div></Layout>;

  const soldOut = event.status === "sold_out";

  return (
    <Layout>
      <SEO title={event.event_title} description={event.description_html?.replace(/<[^>]+>/g, "").slice(0, 160) || `Register for ${event.event_title}`} path={`/events/${event.event_slug}`} />
      <div className="bg-golf-cream min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <Link to="/events" className="inline-flex items-center gap-1 text-sm text-secondary hover:underline mb-4">
            <ArrowLeft className="h-4 w-4" /> All Events
          </Link>

          <div className="bg-card rounded-lg border border-border overflow-hidden mb-6">
            {event.hero_image_url && (
              <div className="w-full bg-muted flex items-center justify-center">
                <img
                  src={event.hero_image_url}
                  alt={event.event_title}
                  className="w-full h-auto max-h-[720px] object-contain"
                />
              </div>
            )}
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground leading-tight break-words hyphens-auto min-w-0 flex-1">{event.event_title}</h1>
                {soldOut && <Badge variant="destructive">Sold Out</Badge>}
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {formatTournamentDate(event.event_date, { year: "numeric", month: "long", day: "numeric" })}{event.event_time && ` · ${formatTime(event.event_time)}`}</span>
                {event.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {event.location}</span>}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-[1fr_360px] gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="font-display text-xl font-bold mb-3">About This Event</h2>
              {event.description_html ? (
                <div
                  className="prose prose-base max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-a:text-secondary prose-a:underline prose-strong:text-foreground prose-img:rounded-md"
                  dangerouslySetInnerHTML={{ __html: event.description_html }}
                />
              ) : (
                <p className="text-muted-foreground">No description provided.</p>
              )}

              {event.address && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="font-semibold mb-1">Location</h3>
                  <p className="text-sm text-muted-foreground">{event.address}</p>
                </div>
              )}
            </div>

            {event.schedule_html && (
              <div className="bg-card rounded-lg border border-border p-4 md:p-5 mt-6 md:col-start-1 md:mt-4">
                <h2 className="font-display text-lg font-bold mb-2">Schedule of Events</h2>
                <div
                  className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-a:text-secondary prose-a:underline prose-strong:text-foreground prose-img:rounded-md prose-img:my-2"
                  dangerouslySetInnerHTML={{ __html: event.schedule_html }}
                />
              </div>
            )}

            <div className="bg-card rounded-lg border border-border p-6 h-fit md:sticky md:top-24">
              <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><Ticket className="h-5 w-5" /> Get Your Tickets</h2>

              {event.event_ticket_tiers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tickets not yet available.</p>
              ) : soldOut ? (
                <p className="text-sm text-muted-foreground">This event is sold out.</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ticket type</Label>
                    {event.event_ticket_tiers.map((t) => {
                      const rem = t.max_quantity == null ? null : t.max_quantity - t.sold_quantity;
                      const disabled = rem !== null && rem <= 0;
                      return (
                        <label key={t.id} className={`block border rounded-md p-3 cursor-pointer transition-colors ${selectedTier === t.id ? "border-secondary bg-secondary/5" : "border-border"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                          <input type="radio" name="tier" value={t.id} checked={selectedTier === t.id} onChange={(e) => setSelectedTier(e.target.value)} disabled={disabled} className="sr-only" />
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-semibold text-sm flex items-center gap-2">
                                {selectedTier === t.id && <CheckCircle2 className="h-4 w-4 text-secondary" />}
                                {t.tier_name}
                              </div>
                              {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
                              {rem !== null && rem > 0 && rem <= 10 && <div className="text-xs text-amber-600 mt-0.5">Only {rem} left</div>}
                              {disabled && <div className="text-xs text-destructive mt-0.5">Sold out</div>}
                            </div>
                            <div className="font-bold text-sm whitespace-nowrap">{formatCents(t.price_cents)}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div>
                    <Label htmlFor="qty">Quantity</Label>
                    <Input id="qty" type="number" min={1} max={remaining ?? 20} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
                  </div>

                  <div className="pt-2 border-t border-border">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>

                  {questions.length > 0 && (
                    <div className="pt-2 border-t border-border space-y-3">
                      {questions.map((q, idx) => (
                        <div key={idx}>
                          <Label>{q.label}{q.required && <span className="text-destructive ml-0.5">*</span>}</Label>
                          {q.type === "select" ? (
                            <select
                              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                              value={answers[q.label] || ""}
                              onChange={(e) => setAnswers((p) => ({ ...p, [q.label]: e.target.value }))}
                            >
                              <option value="">Select…</option>
                              {(q.options || "").split(",").map((o) => o.trim()).filter(Boolean).map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              type={q.type === "email" ? "email" : q.type === "phone" ? "tel" : "text"}
                              value={answers[q.label] || ""}
                              onChange={(e) => setAnswers((p) => ({ ...p, [q.label]: e.target.value }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}


                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-xl font-bold">{formatCents(total)}</span>
                  </div>

                  <Button onClick={handlePurchase} disabled={submitting || !tier} className="w-full">
                    {submitting ? "Processing..." : "Register Now →"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {event.sponsors && event.sponsors.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-6 mt-6">
              <h2 className="font-display text-xl font-bold mb-1 text-center">Thank You to Our Sponsors</h2>
              <p className="text-sm text-muted-foreground text-center mb-5">
                These sponsors make this event possible — click a logo to visit their site.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
                {event.sponsors.map((s, i) => {
                  const logo = s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt={s.name || `Sponsor ${i + 1}`}
                      className="max-h-20 md:max-h-24 max-w-[180px] object-contain transition-opacity hover:opacity-80"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                  );
                  return s.website_url ? (
                    <a
                      key={i}
                      href={s.website_url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      title={s.name}
                      className="inline-flex flex-col items-center gap-1"
                    >
                      {logo}
                      {s.name && s.logo_url && <span className="text-xs text-muted-foreground">{s.name}</span>}
                    </a>
                  ) : (
                    <div key={i} className="inline-flex flex-col items-center gap-1">
                      {logo}
                      {s.name && s.logo_url && <span className="text-xs text-muted-foreground">{s.name}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {event.photos && event.photos.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-6 mt-6">
              <h2 className="font-display text-xl font-bold mb-4 text-center">Photo Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {event.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-md border border-border bg-muted">
                    <img src={url} alt={`${event.event_title} photo ${i + 1}`} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default EventDetail;
