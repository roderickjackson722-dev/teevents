import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trophy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ScoreLogin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [tournament, setTournament] = useState<{ id: string; title: string; slug: string | null } | null>(null);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("tournaments")
      .select("id, title, slug")
      .or(`slug.eq.${slug},custom_slug.eq.${slug},id.eq.${slug}`)
      .maybeSingle()
      .then(({ data }) => setTournament(data as any));
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) {
      toast({ title: "Enter a 6-character code", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: access, error } = await (supabase as any).rpc("lookup_scoring_access", {
      _slug: slug || null,
      _code: clean,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Could not check code", description: error.message, variant: "destructive" });
      return;
    }
    const match = Array.isArray(access) ? access[0] : null;
    if (match?.kind === "group") {
      navigate(`/score/${match.route_slug}/${clean}`);
      return;
    }
    if (match?.kind === "individual") {
      navigate(`/day-of/${match.route_slug}/${clean}`);
      return;
    }
    toast({ title: "Code not recognized", description: "Double-check the 6-character code on your scorecard.", variant: "destructive" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Enter Your Scoring Code</CardTitle>
          {tournament && <p className="text-sm text-muted-foreground mt-1">{tournament.title}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input
              autoFocus
              inputMode="text"
              autoCapitalize="characters"
              maxLength={32}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="ABC123"
              className="text-center text-3xl font-mono tracking-[0.5em] h-16"
            />
            <Button type="submit" className="w-full h-12 text-base" disabled={loading || code.length !== 6}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue →"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Your 6-character code is on your scorecard or Day-of Event page.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
