// Public code gate for a league event registration link.
// A member opens /league/:slug/register-code?event=<id>, enters their
// 6-character member login code, and is forwarded to the registration page.
import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

export default function LeagueEventRegisterCode() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const eventId = params.get("event");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [code, setCode] = useState((params.get("code") || "").toUpperCase());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    (async () => {
      if (!slug) { setLoading(false); return; }
      const { data: lg } = await (supabase as any)
        .from("golf_leagues")
        .select("id, league_name, league_slug")
        .eq("league_slug", slug)
        .maybeSingle();
      let ev = null;
      if (eventId) {
        const { data } = await (supabase as any)
          .from("league_events")
          .select("id, event_name, event_date, course_name")
          .eq("id", eventId)
          .maybeSingle();
        ev = data;
      }
      setLeague(lg); setEvent(ev); setLoading(false);
    })();
  }, [slug, eventId]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const entered = code.trim().toUpperCase();
    if (entered.length < 4) return toast({ title: "Enter your member login code", variant: "destructive" });
    setChecking(true);
    const { data: rows } = await (supabase as any).rpc("lookup_league_member_by_code", {
      _league_slug: slug,
      _code: entered,
    });
    const member = Array.isArray(rows) ? rows[0] : rows;
    setChecking(false);
    if (!member) {
      return toast({
        title: "Code not recognized",
        description: "Double-check the code from your email, or ask your league manager.",
        variant: "destructive",
      });
    }
    navigate(`/league/${slug}/register/${entered}${eventId ? `?event=${eventId}` : ""}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={event ? `Register — ${event.event_name}` : "League Event Registration"}
        description={`Enter your member login code to register${event ? ` for ${event.event_name}` : ""}.`}
      />
      <div className="max-w-md mx-auto p-6 space-y-6">
        {league && (
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to={`/league/${slug}`}><ArrowLeft className="h-4 w-4 mr-1" /> {league.league_name}</Link>
          </Button>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Enter Your Member Code</CardTitle>
            {event && (
              <p className="text-sm text-muted-foreground">
                {event.event_name}
                {event.event_date ? ` • ${event.event_date}` : ""}
                {event.course_name ? ` • ${event.course_name}` : ""}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="member-code">Member login code</Label>
                <Input
                  id="member-code"
                  value={code}
                  onChange={(ev) => setCode(ev.target.value.toUpperCase())}
                  placeholder="A1B2C3"
                  maxLength={10}
                  autoFocus
                  className="mt-1 text-center text-2xl tracking-[0.4em] font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This is the 6-character code from your league email. Your league manager can resend it anytime.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={checking}>
                {checking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking…</> : "Continue to Registration"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
