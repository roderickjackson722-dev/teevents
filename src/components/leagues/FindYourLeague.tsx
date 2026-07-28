import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Trophy, AlertCircle, HelpCircle } from "lucide-react";

interface LeagueResult {
  league_name: string;
  league_slug: string;
  season_year: number | null;
  is_active: boolean;
}

export default function FindYourLeague() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LeagueResult[] | null>(null);
  const [searchedFor, setSearchedFor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await (supabase as any).rpc("find_leagues", { _query: q });
    if (rpcError) {
      setError("We couldn't run that search right now. Check your connection and try again in a moment.");
      setResults(null);
    } else {
      setResults((data as LeagueResult[]) || []);
    }
    setSearchedFor(q);
    setLoading(false);
  };

  return (
    <section id="find-your-league" className="bg-golf-cream py-16 border-t border-border">
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

        {error && (
          <div role="alert" className="mt-6 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-left text-sm">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!error && results !== null && (
          <div className="mt-6 text-left space-y-2">
            {results.length === 0 ? (
              <div className="rounded-md border border-border bg-card p-4 text-sm space-y-2">
                <p className="font-semibold text-foreground">No leagues matched "{searchedFor}"</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li>Try a shorter search — just one distinctive word from the league name.</li>
                  <li>Check the spelling, and leave out the year (e.g. search "Vets" not "2026 Vets &amp; Tees").</li>
                  <li>
                    Brand-new leagues stay hidden until the manager publishes them. Ask your league manager to
                    publish the league and turn on search visibility in their League Settings.
                  </li>
                </ul>
              </div>
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
                    <Button asChild size="sm"><Link to={`/league/${l.league_slug}/score`}>Member Login</Link></Button>
                  </div>
                </div>
              ))
            )}

            {results.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
                <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Login not working? Member login uses the 6-character code your league manager assigned you — not
                  your email password. If the code is rejected or says "member not found", ask your manager to
                  resend or reset your code from their League Members tab.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
