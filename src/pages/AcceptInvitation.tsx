import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import logoBlack from "@/assets/logo-black.png";

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "needs_auth" | "accepting" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Listen for auth state changes (handles magic link callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && token && status === "loading") {
        acceptInvitation(session.access_token);
      }
    });

    checkAuth();

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No invitation token found");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      acceptInvitation(session.access_token);
    } else {
      // No session yet — could be waiting for magic link auth to complete
      // Give a brief moment for the auth state change to fire
      setTimeout(async () => {
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession) {
          acceptInvitation(retrySession.access_token);
        } else {
          setStatus("needs_auth");
        }
      }, 1500);
    }
  };

  const acceptInvitation = async (accessToken: string) => {
    if (status === "accepting" || status === "success") return;
    setStatus("accepting");
    try {
      const { data, error } = await supabase.functions.invoke("accept-invitation", {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { token },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStatus("success");
      toast.success("You've joined the team!");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to accept invitation");
    }
  };

  const handleSignInAndAccept = () => {
    navigate(`/get-started?redirect=/accept-invitation?token=${token}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-golf-cream p-6">
      <div className="bg-card rounded-xl border border-border p-8 max-w-md w-full text-center space-y-6">
        <img src={logoBlack} alt="TeeVents" className="h-10 mx-auto" />

        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Checking invitation...</span>
          </div>
        )}

        {status === "needs_auth" && (
          <>
            <UserPlus className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-display font-bold text-foreground">
              You've Been Invited!
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in or create an account to join the team and start managing tournaments together.
            </p>
            <Button onClick={handleSignInAndAccept} className="w-full">
              Sign In to Accept
            </Button>
          </>
        )}

        {status === "accepting" && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Joining the team...</span>
          </div>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-display font-bold text-foreground">
              Welcome to the Team!
            </h1>
            <p className="text-muted-foreground text-sm">
              Redirecting you to the dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-display font-bold text-foreground">
              Invitation Error
            </h1>
            <p className="text-muted-foreground text-sm">{errorMsg}</p>
            <Button variant="outline" onClick={() => navigate("/get-started")}>
              Go to Sign In
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;
