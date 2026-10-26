import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import LeagueManage from "@/pages/dashboard/LeagueManage";

/** One Enterprise shell around the unchanged shared league tools. */
export default function EnterpriseLeagueManage() {
  return (
    <EnterpriseLayout
      title="Manage League"
      crumbs={[{ label: "Leagues", to: "/enterprise/leagues" }, { label: "Manage League" }]}
    >
      <LeagueManage />
    </EnterpriseLayout>
  );
}