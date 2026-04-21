import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  ExternalLink,
  Trophy,
  Loader2,
} from "lucide-react";
import { US_STATES, stateNameByCode } from "@/lib/usStates";

interface PublicTournament {
  id: string;
  title: string;
  slug: string | null;
  custom_slug: string | null;
  date: string | null;
  location: string | null;
  state: string | null;
  course_name: string | null;
  site_hero_image_url: string | null;
}

const SORT_OPTIONS = [
  { value: "date_asc", label: "Date (soonest first)" },
  { value: "name_asc", label: "Name (A–Z)" },
];

const PAGE_SIZE = 12;

const TournamentSearch = () => {
  // Form state (uncommitted)
  const [nameInput, setNameInput] = useState("");
  const [stateInput, setStateInput] = useState<string>("any");
  const [dateFromInput, setDateFromInput] = useState<string>("");
  const [sortInput, setSortInput] = useState<string>("date_asc");

  // Committed search state
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PublicTournament[]>([]);
  const [page, setPage] = useState(1);
  const [committedSort, setCommittedSort] = useState("date_asc");

  const runSearch = async () => {
    setHasSearched(true);
    setLoading(true);
    setPage(1);
    setCommittedSort(sortInput);

    let query = supabase
      .from("tournaments")
      .select(
        "id, title, slug, custom_slug, date, location, state, course_name, site_hero_image_url",
      )
      .eq("show_in_public_search", true)
      .limit(500);

    if (nameInput.trim()) {
      query = query.ilike("title", `%${nameInput.trim()}%`);
    }
    if (stateInput !== "any") {
      query = query.eq("state", stateInput);
    }
    if (dateFromInput) {
      query = query.gte("date", dateFromInput);
    } else {
      // Default: hide past tournaments unless user picks an earlier "from" date
      const today = new Date().toISOString().slice(0, 10);
      query = query.or(`date.gte.${today},date.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      setResults([]);
    } else {
      setResults((data as PublicTournament[]) || []);
    }
    setLoading(false);
  };

  const sorted = useMemo(() => {
    const arr = [...results];
    if (committedSort === "name_asc") {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      arr.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });
    }
    return arr;
  }, [results, committedSort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const resetForm = () => {
    setNameInput("");
    setStateInput("any");
    setDateFromInput("");
    setSortInput("date_asc");
    setHasSearched(false);
    setResults([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Find a Golf Tournament | TeeVents"
        description="Search upcoming golf tournaments and charity events by name, state, and date. Register or follow live scoring."
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
              Search by name, state, or date to find upcoming tournaments and charity events.
            </p>
          </div>

          {/* Search form */}
          <Card className="mb-8">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ts-name" className="text-sm font-medium">
                    Tournament name
                  </Label>
                  <div className="relative">
                    <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="ts-name"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") runSearch();
                      }}
                      placeholder="e.g. Atlanta Golf Club"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">State</Label>
                  <Select value={stateInput} onValueChange={setStateInput}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="any">Any state</SelectItem>
                      {US_STATES.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ts-date" className="text-sm font-medium">
                    On or after
                  </Label>
                  <div className="relative">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="ts-date"
                      type="date"
                      value={dateFromInput}
                      onChange={(e) => setDateFromInput(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Sort by</Label>
                  <Select value={sortInput} onValueChange={setSortInput}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
                {hasSearched && (
                  <Button variant="outline" onClick={resetForm}>
                    Clear
                  </Button>
                )}
                <Button onClick={runSearch} className="sm:min-w-32">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {!hasSearched ? (
            <div className="text-center py-16 bg-card border border-border rounded-lg">
              <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-display font-bold text-foreground text-lg">
                Ready when you are
              </h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                Enter a tournament name, pick a state, or choose a date and tap{" "}
                <strong>Search</strong> to see public tournaments.
              </p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-lg">
              <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-display font-bold text-foreground text-lg">
                No tournaments found
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Try adjusting your filters or removing the date range.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Found <strong>{sorted.length}</strong>{" "}
                {sorted.length === 1 ? "tournament" : "tournaments"}
                {totalPages > 1 && (
                  <>
                    {" "}
                    · Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                  </>
                )}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paged.map((t) => (
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
                            <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{formatDate(t.date)}</span>
                          </div>
                          {(t.state || t.location || t.course_name) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">
                                {[t.course_name, t.location, stateNameByCode(t.state)]
                                  .filter(Boolean)
                                  .join(" · ")}
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

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
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
