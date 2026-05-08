import { useOrgContext } from "@/hooks/useOrgContext";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { Loader2 } from "lucide-react";

const TeamManagementPage = () => {
  const { org, loading } = useOrgContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-display font-bold text-foreground">Team Management</h1>
        <p className="text-muted-foreground mt-1">
          Invite teammates and control what they can access in your tournament dashboard.
        </p>
      </div>

      {org && <TeamManagement orgId={org.orgId} userId={org.userId} />}
    </div>
  );
};

export default TeamManagementPage;
