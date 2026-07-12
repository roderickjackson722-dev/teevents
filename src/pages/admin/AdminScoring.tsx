import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Leaderboard from "@/pages/dashboard/Leaderboard";

/**
 * Admin scoring URL: /admin/scoring/:tournamentId
 *
 * Keeps the operator inside the admin context (no redirect to /dashboard).
 * On mount we look up the tournament's organization and inject
 * `admin_org` + `tournament_id` into the query string so the existing
 * scoring UI (Leaderboard) picks them up via useOrgContext / useTournamentIdParam.
 */
export default function AdminScoring() {
  const { tournamentId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin-login"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) { setError("Admin access required."); setChecking(false); return; }

      if (!tournamentId) { setError("Missing tournament id."); setChecking(false); return; }

      const { data: t, error: tErr } = await supabase
        .from("tournaments")
        .select("id, organization_id")
        .eq("id", tournamentId)
        .maybeSingle();

      if (tErr || !t?.organization_id) {
        setError("Tournament not found.");
        setChecking(false);
        return;
      }

      // Inject query params without leaving /admin/scoring/:tournamentId
      const next = new URLSearchParams(searchParams);
      if (next.get("admin_org") !== t.organization_id) next.set("admin_org", t.organization_id);
      if (next.get("tournament_id") !== tournamentId) next.set("tournament_id", tournamentId);
      setSearchParams(next, { replace: true });
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/platform-tournaments")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Platform Tournaments
        </Button>
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/platform-tournaments")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Platform Tournaments
          </Button>
          <h1 className="text-lg font-semibold">Admin Scoring</h1>
          <span className="text-xs text-muted-foreground ml-2 font-mono">{tournamentId}</span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <Leaderboard />
      </div>
    </div>
  );
}
