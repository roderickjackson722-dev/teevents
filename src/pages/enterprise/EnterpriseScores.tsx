import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import Leaderboard from "@/pages/dashboard/Leaderboard";

/** Enterprise Scores: the existing score entry tool inside the Enterprise shell (no behavior changes). */
export default function EnterpriseScores() {
  return (
    <EnterpriseLayout
      title="Scores"
      description="Enter and edit scores for the selected event."
      crumbs={[{ label: "Tournaments", to: "/enterprise/tournaments" }, { label: "Scores" }]}
    >
      <Leaderboard mode="entry" />
    </EnterpriseLayout>
  );
}
