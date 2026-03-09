import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Trophy, Users, DollarSign, Eye, Clock, ScanLine, MessageSquare, BarChart3, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Tournament {
  id: string;
  slug: string | null;
  title: string;
  date: string | null;
}

function getCountdown(dateStr: string | null) {
  if (!dateStr) return null;
  const now = new Date();
  const event = new Date(dateStr + "T08:00:00");
  const diff = event.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, passed: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes, passed: false };
}

const DashboardHome = () => {
  const { org } = useOrgContext();
  const [tournamentCount, setTournamentCount] = useState(0);
  const [latestTournament, setLatestTournament] = useState<Tournament | null>(null);
  const [countdown, setCountdown] = useState<ReturnType<typeof getCountdown>>(null);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, slug, title, date", { count: "exact" })
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data, count }) => {
        setTournamentCount(count ?? 0);
        if (data && data.length > 0) {
          setLatestTournament(data[0]);
        }
      });
  }, [org]);

  useEffect(() => {
    if (!latestTournament?.date) return;
    setCountdown(getCountdown(latestTournament.date));
    const interval = setInterval(() => {
      setCountdown(getCountdown(latestTournament.date));
    }, 60000);
    return () => clearInterval(interval);
  }, [latestTournament]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Welcome back{org ? `, ${org.orgName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your golf tournaments from one place.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Tournaments", value: tournamentCount, icon: Trophy, color: "text-primary" },
          { label: "Players", value: "—", icon: Users, color: "text-primary" },
          { label: "Revenue", value: "—", icon: DollarSign, color: "text-secondary" },
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

      {/* Event Countdown */}
      {latestTournament && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg border border-border p-6 mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-display font-bold text-foreground">Event Countdown</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{latestTournament.title}</p>

          {!latestTournament.date ? (
            <p className="text-sm text-muted-foreground italic">No event date set yet. Add a date in tournament settings.</p>
          ) : countdown?.passed ? (
            <p className="text-sm font-semibold text-secondary">🎉 Event day has arrived!</p>
          ) : countdown ? (
            <div className="flex gap-4">
              {[
                { value: countdown.days, label: "Days" },
                { value: countdown.hours, label: "Hours" },
                { value: countdown.minutes, label: "Minutes" },
              ].map((unit) => (
                <div key={unit.label} className="text-center">
                  <p className="text-3xl font-display font-bold text-primary">{unit.value}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{unit.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </motion.div>
      )}

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-foreground">Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {latestTournament && (
            <>
              <Button asChild>
                <Link to="/dashboard/players">
                  <Users className="h-4 w-4 mr-2" />
                  Players & Pairings
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard/check-in">
                  <ScanLine className="h-4 w-4 mr-2" />
                  Check-In
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard/messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard/leaderboard">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Leaderboard
                </Link>
              </Button>
            </>
          )}
          {latestTournament && latestTournament.slug && (
            <Button variant="outline" asChild>
              <Link to={`/t/${latestTournament.slug}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Tournament
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
