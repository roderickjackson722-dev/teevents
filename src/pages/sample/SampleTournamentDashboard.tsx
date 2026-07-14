import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { setSampleModeActive } from "@/hooks/useSampleMode";
import { Link } from "react-router-dom";

/**
 * Bootstrap page for the sample dashboard link.
 * - Validates the sample token via the sample-session-mint edge function
 * - Signs the browser into the shared sample-viewer account
 * - Enables sample-mode write blocking
 * - Redirects to the real /dashboard so the visitor sees the exact
 *   organizer dashboard, just with saves disabled.
 */
export default function SampleTournamentDashboard() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;

    (async () => {
      try {
        // Sign out any existing session so we don't clobber it silently
        await supabase.auth.signOut().catch(() => null);

        const { data, error } = await supabase.functions.invoke("sample-session-mint", {
          body: { token },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);

        const { access_token, refresh_token, organization_id } = data as {
          access_token: string;
          refresh_token: string;
          organization_id: string;
        };
        if (!access_token || !refresh_token) throw new Error("Missing session tokens");

        const { error: setErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (setErr) throw setErr;

        setSampleModeActive(true);
        navigate(`/dashboard?sample=1&sample_org=${organization_id}`, { replace: true });
      } catch (e: any) {
        setError(e?.message || "Sample link unavailable");
      }
    })();
  }, [token, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-golf-cream p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sample not available</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error}. This link may have been turned off by the admin, or the
              tournament has already been converted to live.
            </p>
            <Button asChild>
              <Link to="/">Back to TeeVents</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-golf-cream">
      <div className="text-center space-y-4">
        <Sparkles className="h-10 w-10 mx-auto text-secondary" />
        <div className="flex items-center gap-3 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading sample dashboard…</span>
        </div>
      </div>
    </div>
  );
}
