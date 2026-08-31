import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Receipt, ArrowRight, Award, Sparkles } from "lucide-react";
import FlatRateProCard from "@/components/dashboard/FlatRateProCard";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";
import { sortTournamentsForPicker, isPastTournament } from "@/lib/tournamentOrder";

interface Row {
  id: string;
  title: string;
  date: string | null;
  end_date: string | null;
}

/**
 * Dashboard → Payments: pay the one-time $299 Flat-Rate Pro fee for a single
 * tournament and see the other paid upgrades available for that event.
 */
const TournamentPayment = () => {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<Row[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, date, end_date")
      .eq("organization_id", org.orgId)
      .then(({ data }) => {
        const list = sortTournamentsForPicker((data || []) as unknown as Row[]) as Row[];
        setTournaments(list);
        if (list.length > 0) setSelected(pickTournamentId(list as any));
        setLoading(false);
      });
  }, [org]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Tournament Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pay the one-time $299 Flat-Rate Pro fee for an event and skip the 5% platform fee on
            every transaction for that tournament.
          </p>
        </div>
        {tournaments.length > 0 && (
          <div className="w-full md:w-72">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Select a tournament" /></SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                    {isPastTournament(t) ? " (past)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {tournaments.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Create a tournament first, then come back to pay for it here.
        </CardContent></Card>
      ) : (
        <>
          <FlatRateProCard tournamentId={selected || null} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Other upgrades for this event</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" /> Branding Removal — $500
                </p>
                <p className="text-xs text-muted-foreground">
                  One-time per event. Removes the TeeVents logo and tagline from your live leaderboard
                  and mobile scoring pages so the space is entirely your sponsor's.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/dashboard/leaderboard?tournament_id=${selected}`}>
                    Purchase on Leaderboard Branding <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-secondary" /> Digital Sponsor package — $799
                </p>
                <p className="text-xs text-muted-foreground">
                  One-time per event. The full turnkey sponsorship package most organizers resell to a
                  title sponsor for $5,000–$10,000.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/dashboard/sponsorship-tools?tournament_id=${selected}`}>
                    Purchase in Sponsorship Tools <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Payments are processed securely by Stripe. Every purchase appears on your receipt email and
            in your TeeVents transaction history.
          </p>
        </>
      )}
    </div>
  );
};

export default TournamentPayment;
