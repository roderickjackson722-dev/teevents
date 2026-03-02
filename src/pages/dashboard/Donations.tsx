import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Heart, DollarSign, TrendingUp, Users, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Donation {
  id: string;
  amount_cents: number;
  donor_email: string | null;
  status: string;
  created_at: string;
}

interface Tournament {
  id: string;
  title: string;
}

const Donations = () => {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tournaments
  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const t = (data || []) as Tournament[];
        setTournaments(t);
        if (t.length > 0) setSelectedTournament(t[0].id);
        setLoading(false);
      });
  }, [org]);

  // Fetch donations for selected tournament
  useEffect(() => {
    if (!selectedTournament) return;
    setLoading(true);
    supabase
      .from("tournament_donations")
      .select("id, amount_cents, donor_email, status, created_at")
      .eq("tournament_id", selectedTournament)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDonations((data || []) as Donation[]);
        setLoading(false);
      });
  }, [selectedTournament]);

  const completedDonations = donations.filter((d) => d.status === "completed");
  const totalCents = completedDonations.reduce((sum, d) => sum + d.amount_cents, 0);
  const avgCents = completedDonations.length > 0 ? Math.round(totalCents / completedDonations.length) : 0;
  const uniqueDonors = new Set(completedDonations.filter((d) => d.donor_email).map((d) => d.donor_email)).size;

  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Donations</h1>
          <p className="text-muted-foreground text-sm">Track charitable donations received for your tournaments.</p>
        </div>
        {tournaments.length > 1 && (
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select tournament" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Raised", value: fmt(totalCents), icon: DollarSign, color: "text-primary" },
          { label: "Donations", value: completedDonations.length, icon: Heart, color: "text-destructive" },
          { label: "Avg Donation", value: fmt(avgCents), icon: TrendingUp, color: "text-secondary" },
          { label: "Unique Donors", value: uniqueDonors, icon: Users, color: "text-primary" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-lg border border-border p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Donations table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : donations.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">No donations yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Donations will appear here once visitors contribute through your tournament site.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm">
                    {new Date(d.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {d.donor_email || <span className="text-muted-foreground italic">Anonymous</span>}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{fmt(d.amount_cents)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.status === "completed"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {d.status === "completed" ? "Completed" : "Pending"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default Donations;
