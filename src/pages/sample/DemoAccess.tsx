import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, Loader2, Eye } from "lucide-react";
import SEO from "@/components/SEO";
import { setSampleModeActive, setSampleExpiry } from "@/hooks/useSampleMode";

/**
 * Prospect entry point for a time-limited, view-only demo dashboard.
 * URL: /sample/access/:token?email=...
 */
export default function DemoAccess() {
  const { token } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(params.get("email") || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefilled = params.get("email");
    if (prefilled) setEmail(prefilled);
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await supabase.auth.signOut().catch(() => null);
      const { data, error: fnErr } = await supabase.functions.invoke("demo-access-verify", {
        body: { token, email: email.trim() },
      });
      const payload = data as any;
      if (fnErr || payload?.error || !payload?.access_token) {
        setError(
          payload?.error ||
            "This link has expired or the email is not authorized. Please contact the tournament organizer."
        );
        return;
      }
      const { error: setErr } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      if (setErr) throw setErr;

      setSampleModeActive(true);
      setSampleExpiry(payload.expires_at || null);
      navigate(
        `/dashboard?sample=1&sample_org=${payload.organization_id}&tournament_id=${payload.tournament_id}`,
        { replace: true }
      );
    } catch (err: any) {
      setError(err?.message || "Unable to open the sample dashboard.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-golf-cream p-6">
      <SEO title="View Sample Dashboard | TeeVents" description="Enter your email to view a sample tournament dashboard." noIndex />
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" /> View Sample Dashboard
          </CardTitle>
          <CardDescription>
            Enter the email address or mobile number your invitation was sent to.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="demo-email">Email or Mobile Number</Label>
              <Input
                id="demo-email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com or (555) 555-1234"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold"
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              View Dashboard
            </Button>
          </form>

          <div className="border-t pt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>This link expires 7 days after it was sent. No login required.</span>
          </div>

          <div className="text-xs text-muted-foreground">
            Questions? <Link to="/contact" className="underline">Contact us</Link>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
