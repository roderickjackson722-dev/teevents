import { useOrgContext } from "@/hooks/useOrgContext";
import { TeamManagement } from "@/components/settings/TeamManagement";
import TournamentTeam from "@/components/settings/TournamentTeam";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTournamentIdParam } from "@/hooks/useTournamentIdParam";
import { Loader2 } from "lucide-react";

const TeamManagementPage = () => {
  const { org, loading } = useOrgContext();
  const [tournamentId] = useTournamentIdParam();

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

      <Tabs defaultValue="tournament" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tournament">By Tournament</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>
        <TabsContent value="tournament">
          <TournamentTeam initialTournamentId={tournamentId} />
        </TabsContent>
        <TabsContent value="organization">
          {org && <TeamManagement orgId={org.orgId} userId={org.userId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamManagementPage;
