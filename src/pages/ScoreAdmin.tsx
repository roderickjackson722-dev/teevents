import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { CollegeScoringWorkspace } from "@/components/scoring/CollegeScoringWorkspace";
import { createTokenAdapter } from "@/lib/collegeScoringAdapter";

interface Session {
  token: string;
  name: string;
  tournamentId: string | null;
  allEvents: boolean;
}

const STORAGE_KEY = "scoringAdminSession";

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

/**
 * Scoring admin sign-in (email + 6-digit passcode) and scoring workspace.
 * The admin stays on their assigned event until they manually switch.
 */
export default function ScoreAdmin() {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const adapter = useMemo(() => (session ? createTokenAdapter(session.token) : null), [session?.token]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast.error("Enter your 6-digit passcode");
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("scoring_admin_login", {
      _email: email.trim(),
      _code: code.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const match = Array.isArray(data) ? data[0] : null;
    if (!match?.token) {
      toast.error("Email or passcode not recognized");
      return;
    }
    const next: Session = {
      token: match.token,
      name: match.admin_name,
      tournamentId: match.tournament_id ?? null,
      allEvents: !!match.all_events,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setSession(next);
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSession(null);
    setCode("");
  };

  if (!session || !adapter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Scoring Admin Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={login} className="space-y-4">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                />
              </div>
              <div className="space-y-1">
                <Label>6-Digit Passcode</Label>
                <Input
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="text-center text-2xl font-mono tracking-[0.4em] h-14"
                />
              </div>
              <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue →"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Your tournament organizer provides your passcode and event assignment.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-semibold">Scoring Admin</h1>
          <span className="text-sm text-muted-foreground">{session.name}</span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={logout}>
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <CollegeScoringWorkspace
          adapter={adapter}
          lockedEventId={session.allEvents ? null : session.tournamentId}
        />
      </div>
    </div>
  );
}
