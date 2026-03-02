import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Trophy, Plus, ClipboardCheck, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const DashboardHome = () => {
  const { org } = useOrgContext();
  const [tournamentCount, setTournamentCount] = useState(0);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.orgId)
      .then(({ count }) => setTournamentCount(count ?? 0));
  }, [org]);

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
          { label: "Planning Guide", value: "View", icon: ClipboardCheck, color: "text-secondary" },
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

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-foreground">Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/dashboard/tournaments">
              <Plus className="h-4 w-4 mr-2" />
              Create Tournament
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/checklist">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Planning Guide
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
