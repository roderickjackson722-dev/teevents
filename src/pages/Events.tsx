import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Ticket, Search } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTournamentDate } from "@/lib/formatDate";
import aboutBg from "@/assets/golf-about-bg.jpg";

type Tier = { id: string; price_cents: number; max_quantity: number | null; sold_quantity: number };
type EventRow = {
  id: string;
  event_title: string;
  event_slug: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  address: string | null;
  hero_image_url: string | null;
  description_html: string | null;
  status: string;
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

const priceRange = (tiers: Tier[]) => {
  if (!tiers.length) return "Free";
  const prices = tiers.map((t) => t.price_cents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === 0 && max === 0) return "Free";
  const f = (c: number) => `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;
  return min === max ? f(min) : `${f(min)} – ${f(max)}`;
};

const remainingInfo = (tiers: Tier[]) => {
  let sold = 0;
  let cap = 0;
  let unlimited = false;
  for (const t of tiers) {
    sold += t.sold_quantity || 0;
    if (t.max_quantity == null) unlimited = true;
    else cap += t.max_quantity;
  }
  if (unlimited || cap === 0) return `${sold} tickets sold`;
  return `${sold} sold · ${Math.max(0, cap - sold)} remaining`;
};

const dateFilterMatch = (dateStr: string, filter: string): boolean => {
  const d = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (filter === "all") return true;
  if (filter === "today") return d.getTime() === now.getTime();
  if (filter === "week") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return d >= now && d <= end;
  }
  if (filter === "month") {
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    return d >= now && d <= end;
  }
  return true;
};

const priceFilterMatch = (tiers: Tier[], filter: string): boolean => {
  if (filter === "all") return true;
  const min = tiers.length ? Math.min(...tiers.map((t) => t.price_cents)) / 100 : 0;
  if (filter === "0-50") return min <= 50;
  if (filter === "50-100") return min > 50 && min <= 100;
  if (filter === "100-200") return min > 100 && min <= 200;
  if (filter === "200+") return min > 200;
  return true;
};

const Events = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("public_events")
        .select("id, event_title, event_slug, event_date, event_time, location, address, hero_image_url, description_html, status, event_ticket_tiers(id, price_cents, max_quantity, sold_quantity)")
        .in("status", ["published", "sold_out"])
        .order("event_date", { ascending: true });
      setEvents((data as EventRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const locations = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.location && set.add(e.location));
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (q && !`${e.event_title} ${e.description_html || ""}`.toLowerCase().includes(q)) return false;
      if (location !== "all" && e.location !== location) return false;
      if (!dateFilterMatch(e.event_date, dateFilter)) return false;
      if (!priceFilterMatch(e.event_ticket_tiers, priceFilter)) return false;
      return true;
    });
  }, [events, search, location, dateFilter, priceFilter]);

  return (
    <Layout>
      <SEO title="Upcoming Events" description="Discover and register for upcoming golf tournaments and events." path="/events" />
      <section className="relative py-20 md:py-28">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${aboutBg})` }} />
        <div className="absolute inset-0 bg-overlay-green" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-3">Upcoming Events</h1>
          <p className="text-primary-foreground/80 max-w-xl mx-auto">Discover and register for upcoming golf tournaments</p>
        </div>
      </section>

      <section className="bg-golf-cream py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8 bg-card p-4 rounded-lg border border-border">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger><SelectValue placeholder="Date" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any date</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger><SelectValue placeholder="Price" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any price</SelectItem>
                <SelectItem value="0-50">$0 – $50</SelectItem>
                <SelectItem value="50-100">$50 – $100</SelectItem>
                <SelectItem value="100-200">$100 – $200</SelectItem>
                <SelectItem value="200+">$200+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-16">Loading events...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No events match your filters.</p>
          ) : (
            <div className="space-y-6">
              {filtered.map((event, i) => {
                const soldOut = event.status === "sold_out";
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <Link to={`/events/${event.event_slug}`} className="grid md:grid-cols-[280px_1fr] gap-0">
                      <div className="h-48 md:h-full bg-muted overflow-hidden">
                        {event.hero_image_url ? (
                          <img src={event.hero_image_url} alt={event.event_title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Ticket className="h-12 w-12" />
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">{event.event_title}</h3>
                            {soldOut && <Badge variant="destructive">Sold Out</Badge>}
                          </div>
                          <div className="space-y-1.5 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatTournamentDate(event.event_date, { year: "numeric", month: "long", day: "numeric" })}
                              {event.event_time && ` · ${formatTime(event.event_time)}`}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> {event.location}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Ticket className="h-4 w-4" /> {priceRange(event.event_ticket_tiers)}
                            </div>
                            <div className="text-xs">{remainingInfo(event.event_ticket_tiers)}</div>
                          </div>
                        </div>
                        <div>
                          <Button className="w-full md:w-auto" disabled={soldOut}>
                            {soldOut ? "Sold Out" : "Register Now"}
                          </Button>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Events;
