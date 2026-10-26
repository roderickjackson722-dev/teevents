import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import Leaderboard from "@/pages/dashboard/Leaderboard";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { enterpriseLink } from "@/lib/enterpriseNavigation";
import { Coins } from "lucide-react";

/** Enterprise Scores: the existing score entry tool inside the Enterprise shell (no behavior changes). */
export default function EnterpriseScores() {
  const { search } = useLocation();
  return (
    <EnterpriseLayout
      title="Scores"
      description="Enter and edit scores for the selected event."
      crumbs={[{ label: "Tournaments", to: "/enterprise/tournaments" }, { label: "Scores" }]}
    >
      <Button asChild variant="outline" size="sm" className="mb-5">
        <Link to={enterpriseLink("/enterprise/skins-payouts", search)}><Coins className="mr-1.5 h-4 w-4" />Skins and Payouts</Link>
      </Button>
      <Leaderboard mode="entry" />
    </EnterpriseLayout>
  );
}
