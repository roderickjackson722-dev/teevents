import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Flag, ArrowRight, Loader2, Plus } from "lucide-react";
import SEO from "@/components/SEO";

interface Workspace {
  id: string;
  name: string;
  workspace_type: string;
  role: string;
}

export default function SelectWorkspace() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/get-started?mode=signin"); return; }

      const { data: memberships } = await supabase
        .from("org_members")
        .select("role, organization_id, organizations(id, name, workspace_type)")
        .eq("user_id", session.user.id);

      const list: Workspace[] = (memberships || []).map((m: any) => ({
        id: m.organizations?.id || m.organization_id,
        name: m.organizations?.name || "Untitled",
        workspace_type: m.organizations?.workspace_type || "tournament",
        role: m.role || "owner",
      }));
      setWorkspaces(list);
      setLoading(false);
    })();
  }, [navigate]);

  const openWorkspace = (w: Workspace) => {
    if (w.workspace_type === "league") {
      navigate(`/dashboard/leagues?admin_org=${w.id}`);
    } else {
      navigate(`/dashboard?admin_org=${w.id}`);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const tournaments = workspaces.filter((w) => w.workspace_type !== "league");
  const leagues = workspaces.filter((w) => w.workspace_type === "league");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-6">
      <SEO title="Your Workspaces — TeeVents" description="Choose a workspace or create a new tournament or league." />
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Your workspaces</h1>
          <p className="text-muted-foreground text-lg">Choose a workspace to manage or create a new one.</p>
        </div>

        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <p className="text-muted-foreground">You don't have any workspaces yet.</p>
              <Button asChild size="lg">
                <Link to="/create-workspace"><Plus className="h-4 w-4 mr-1" /> Create your first workspace</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {tournaments.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4" /> Tournament workspaces
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {tournaments.map((w) => (
                    <Card key={w.id} className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary" onClick={() => openWorkspace(w)}>
                      <CardContent className="p-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold">{w.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{w.role}</p>
                        </div>
                        <ArrowRight className="h-4 w-4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {leagues.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Flag className="h-4 w-4" /> League workspaces
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {leagues.map((w) => (
                    <Card key={w.id} className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-secondary" onClick={() => openWorkspace(w)}>
                      <CardContent className="p-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold">{w.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{w.role}</p>
                        </div>
                        <ArrowRight className="h-4 w-4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-center">
              <Button asChild variant="outline">
                <Link to="/create-workspace"><Plus className="h-4 w-4 mr-1" /> Create new workspace</Link>
              </Button>
            </div>
          </>
        )}

        <div className="text-center">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">← Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
