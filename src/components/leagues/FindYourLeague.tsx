import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Trophy } from "lucide-react";

interface LeagueResult {
  league_name: string;
  league_slug: string;
  season_year: number | null;
  is_active: boolean;
}

export default function FindYourLeague() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LeagueResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const { data } = await (supabase as any).rpc("find_leagues", { _query: query.trim() });
    setResults((data as LeagueResult[]) || []);
    setLoading(false);
  };

  return (
    <section className="bg-golf-cream py-16 border-t border-border">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Find Your League</h2>
        <p className="text-muted-foreground mb-6">
          League member? Search for your league by name to view standings or sign in.
        </p>
        <form onSubmit={search} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Vets & Tees"
              className="pl-9 bg-card"
              aria-label="Search leagues by name"
            />
          </div>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </form>

        {results !== null && (
          <div className="mt-6 text-left space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">
                No published leagues matched "{query}". Ask your league manager to publish the league.
              </p>
            ) : (
              results.map((l) => (
                <div key={l.league_slug} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Trophy className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{l.league_name}</p>
                      <p className="text-xs text-muted-foreground">{l.season_year || ""} {l.is_active ? "· Active" : ""}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button asChild variant="outline" size="sm"><Link to={`/league/${l.league_slug}`}>View</Link></Button>
                    <Button asChild size="sm"><Link to={`/league/${l.league_slug}/login`}>Member Login</Link></Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
