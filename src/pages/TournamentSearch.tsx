import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Calendar, ExternalLink, Trophy, Loader2 } from "lucide-react";

interface PublicTournament {
  id: string;
  title: string;
  slug: string | null;
  custom_slug: string | null;
  date: string | null;
  location: string | null;
  course_name: string | null;
  site_hero_image_url: string | null;
}

const DATE_FILTERS = [
  { value: "any", label: "Any date" },
  { value: "30", label: "Next 30 days" },
  { value: "90", label: "Next 3 months" },
  { value: "365", label: "Next year" },
];

const PAGE_SIZE = 12;

const TournamentSearch = () => {
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("any");
  const [dateRange, setDateRange] = useState("any");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("tournaments")
      .select("id, title, slug, custom_slug, date, location, course_name, site_hero_image_url")
      .eq("show_in_public_search", true)
      .eq("site_published", true)
      .or(`date.gte.${today},date.is.null`)
      .order("date", { ascending: true, nullsFirst: false })
      .limit(200)
      .then(({ data }) => {
        setTournaments((data as PublicTournament[]) || []);
        setLoading(false);
      });
  }, []);

  const locations = useMemo(() => {
    const set = new Set<string>();
    tournaments.forEach((t) => {
      if (t.location) set.add(t.location);
    });
    return Array.from(set).sort();
  }, [tournaments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff =
      dateRange === "any"
        ? null
        : new Date(Date.now() + parseInt(dateRange, 10) * 86400 * 1000);

    return tournaments.filter((t) => {
      if (q) {
        const haystack = `${t.title} ${t.location || ""} ${t.course_name || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (location !== "any" && t.location !== location) return false;
      if (cutoff && t.date) {
        if (new Date(t.date) > cutoff) return false;
      }
      return true;
    });
  }, [tournaments, search, location, dateRange]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const formatDate = (d: string | null) =>
    d
      ? new Date(d + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Date TBA";

  const tournamentUrl = (t: PublicTournament) =>
    t.custom_slug ? `/tournament/${t.custom_slug}` : `/t/${t.slug}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Find a Golf Tournament | TeeVents"
        description="Browse upcoming golf tournaments and charity events. Search by location, date, and event type to find the right tournament for you."
        path="/tournaments/search"
      />
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-10">
            <Trophy className="h-10 w-10 text-secondary mx-auto mb-3" />
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Find a Golf Tournament
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Browse upcoming tournaments and charity events. Register, sponsor, or follow live
              scoring.
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardContent className="p-4 md:p-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1 relative">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    placeholder="Search tournaments…"
                    className="pl-9"
                  />
                </div>
                <div>
                  <Select
                    value={location}
                    onValueChange={(v) => {
                      setLocation(v);
                      setVisibleCount(PAGE_SIZE);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any location</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select
                    value={dateRange}
                    onValueChange={(v) => {
                      setDateRange(v);
                      setVisibleCount(PAGE_SIZE);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FILTERS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-lg">
              <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-display font-bold text-foreground text-lg">
                No tournaments found
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Showing <strong>{visible.length}</strong> of{" "}
                <strong>{filtered.length}</strong> upcoming tournaments
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visible.map((t) => (
                  <Link key={t.id} to={tournamentUrl(t)} className="group">
                    <Card className="h-full overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5">
                      {t.site_hero_image_url ? (
                        <div
                          className="h-36 bg-cover bg-center"
                          style={{ backgroundImage: `url(${t.site_hero_image_url})` }}
                        />
                      ) : (
                        <div className="h-36 bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
                          <Trophy className="h-10 w-10 text-primary-foreground/60" />
                        </div>
                      )}
                      <CardContent className="p-5">
                        <h3 className="font-display font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {t.title}
                        </h3>
                        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{formatDate(t.date)}</span>
                          </div>
                          {(t.location || t.course_name) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">
                                {t.course_name || t.location}
                                {t.course_name && t.location ? ` · ${t.location}` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 inline-flex items-center text-sm font-semibold text-primary">
                          View tournament
                          <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TournamentSearch;
