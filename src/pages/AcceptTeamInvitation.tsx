import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import {
  getTournamentInvitation,
  acceptTournamentInvitation,
} from "@/lib/tournamentTeam.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

const AcceptTeamInvitation = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const fetchInvite = useServerFn(getTournamentInvitation);
  const accept = useServerFn(acceptTournamentInvitation);

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) {
        setError("This link is missing its invitation token.");
        setLoading(false);
        return;
      }
      try {
        const res: any = await fetchInvite({ data: { token } });
        if (!res?.valid) setError(res?.reason || "This invitation is not valid.");
        else {
          setInvite(res);
          setFullName(res.name || "");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const res: any = await accept({ data: { token, password, fullName } });
      if (res?.createdAccount) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: res.email,
          password,
        });
        if (signInErr) {
          toast({
            title: "Account created",
            description: "Please sign in with your new password.",
          });
          navigate("/login");
          return;
        }
      }
      toast({ title: "You're in!", description: "This tournament is now in your dashboard." });
      navigate(`/dashboard?tournament_id=${res.tournamentId}`);
    } catch (err: any) {
      toast({ title: "Couldn't accept invitation", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-16">
      <Card className="w-full max-w-md">
        {loading ? (
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        ) : error ? (
          <>
            <CardHeader>
              <CardTitle>Invitation unavailable</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate("/")}>
                Back to TeeVents
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <div className="mb-2 flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold">Tournament team invitation</span>
              </div>
              <CardTitle>{invite.tournamentTitle}</CardTitle>
              <CardDescription>
                You've been invited as <strong>{String(invite.role).replace("_", " ")}</strong> for{" "}
                {invite.email}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!invite.hasAccount && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Create a password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </div>
                </>
              )}
              {invite.hasAccount && (
                <p className="text-sm text-muted-foreground">
                  You already have a TeeVents account. Accepting adds this tournament to your dashboard.
                </p>
              )}
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={submitting || (!invite.hasAccount && password.length < 8)}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accept invitation
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default AcceptTeamInvitation;
