import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";

export default function LeagueMemberLogin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const eventId = params.get("event");
  const [league, setLeague] = useState<any>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("golf_leagues").select("id, league_name, league_slug").eq("league_slug", slug).maybeSingle();
      setLeague(data);
    })();
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6 || !league) {
      toast({ title: "Enter your 6-character code", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("league_members")
      .select("id, scoring_code")
      .eq("league_id", league.id)
      .eq("scoring_code", clean)
      .maybeSingle();
    setLoading(false);
    if (!data) {
      toast({ title: "Code not recognized", variant: "destructive" });
      return;
    }
    navigate(`/league/${slug}/me/${clean}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>League Member Login</CardTitle>
          {league && <p className="text-sm text-muted-foreground">{league.league_name}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="ABC123"
              className="text-center text-3xl font-mono tracking-[0.5em] h-16"
            />
            <Button type="submit" className="w-full h-12" disabled={loading || code.length !== 6}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue →"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">Your scoring code was provided by your league organizer.</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
