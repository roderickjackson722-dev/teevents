import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Trophy, Users, DollarSign, Eye, Clock, ClipboardCheck, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import UpgradeToProBanner from "@/components/UpgradeToProBanner";
import UpcomingRemindersWidget from "@/components/dashboard/UpcomingRemindersWidget";
import EventTimeline from "@/components/dashboard/EventTimeline";
import SetupChecklist from "@/components/SetupChecklist";
import { toast } from "sonner";

interface Tournament {
  id: string;
  slug: string | null;
  title: string;
  date: string | null;
  is_pro?: boolean;
  setup_checklist_dismissed?: boolean;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [tournamentCount, setTournamentCount] = useState(0);
  const [latestTournament, setLatestTournament] = useState<Tournament | null>(null);
  const [countdown, setCountdown] = useState<ReturnType<typeof getCountdown>>(null);

  // Verify Pro upgrade after Stripe redirect
  useEffect(() => {
    const sessionId = searchParams.get("upgrade_session_id");
    if (!sessionId) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("verify-pro-upgrade", {
        body: { session_id: sessionId },
      });
      if (!error && data?.verified) {
        toast.success("🎉 Pro features unlocked for this tournament!");
      } else if (error) {
        toast.error("Could not verify Pro upgrade. Please contact support.");
      }
      // Clean URL
      const next = new URLSearchParams(searchParams);
      next.delete("upgrade_session_id");
      next.delete("tournament_id");
      setSearchParams(next, { replace: true });
    })();
  }, [searchParams, setSearchParams]);

  const explicitTournamentId = searchParams.get("tournament_id");

  useEffect(() => {
    if (!org) return;
    let cancelled = false;
    (async () => {
      // Total count for this organization (unaffected by an explicit selection).
      const { count } = await supabase
        .from("tournaments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org.orgId);
      if (!cancelled) setTournamentCount(count ?? 0);

      // If a specific tournament is requested via ?tournament_id=, show THAT one.
      if (explicitTournamentId) {
        const { data } = await supabase
          .from("tournaments")
          .select("id, slug, title, date, is_pro, setup_checklist_dismissed")
          .eq("organization_id", org.orgId)
          .eq("id", explicitTournamentId)
          .maybeSingle();
        if (!cancelled && data) {
          setLatestTournament(data as Tournament);
          return;
        }
      }

      const { data } = await supabase
        .from("tournaments")
        .select("id, slug, title, date, is_pro, setup_checklist_dismissed")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!cancelled && data && data.length > 0) setLatestTournament(data[0] as Tournament);
    })();
    return () => { cancelled = true; };
  }, [org, explicitTournamentId]);

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
      <div className="mb-8 bg-secondary/15 border border-secondary/30 rounded-xl p-6">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
          Event Checklist &amp; Timeline
        </h1>
        <p className="text-muted-foreground mt-1 text-base">
          {latestTournament
            ? `Track tasks and key due dates for ${latestTournament.title}.`
            : "Track tasks and key due dates for your tournament."}
        </p>
      </div>

      <Tabs defaultValue="checklist" className="mb-8">
        <TabsList className="mb-6">
          <TabsTrigger value="checklist" className="gap-2">
            <ClipboardCheck className="h-4 w-4" /> Checklist
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <CalendarClock className="h-4 w-4" /> Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist">
          {latestTournament ? (
            <SetupChecklist tournamentId={latestTournament.id} autoRecompute />
          ) : (
            <div className="bg-card rounded-lg border border-border p-6 text-sm text-muted-foreground">
              Create a tournament to see your setup checklist.
            </div>
          )}

          {latestTournament?.slug && (
            <TooltipProvider delayDuration={200}>
              <div className="mt-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="outline">
                      <Link to={`/t/${latestTournament.slug}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Tournament
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs">View your live tournament webpage</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <EventTimeline
            eventDate={latestTournament?.date ?? null}
            title={latestTournament?.title}
          />
          {latestTournament && (
            <div className="mt-6">
              <UpcomingRemindersWidget tournamentId={latestTournament.id} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Per-tournament Pro upgrade banner */}
      {latestTournament && !latestTournament.is_pro && (
        <div className="mb-8">
          <UpgradeToProBanner
            tournamentId={latestTournament.id}
            tournamentTitle={latestTournament.title}
          />
        </div>
      )}

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
    </div>
  );
};

export default DashboardHome;
