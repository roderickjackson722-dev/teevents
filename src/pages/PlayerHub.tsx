import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PenLine, BarChart3, Globe, MessageCircle, MapPin } from "lucide-react";
import SEO from "@/components/SEO";

interface PlayerHubData {
  registration_id: string;
  tournament_id: string;
  first_name: string;
  last_name: string;
  group_number: number | null;
  group_position: number | null;
  scoring_code: string | null;
  tournament_title: string;
  tournament_slug: string;
  tournament_date: string | null;
  course_name: string | null;
  organization_id: string;
}

export default function PlayerHub() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [data, setData] = useState<PlayerHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError("Missing access token.");
        setLoading(false);
        return;
      }
      const { data: rows, error: err } = await supabase.rpc(
        "get_player_hub_by_token" as any,
        { _token: token }
      );
      if (err) {
        setError("This link is no longer valid. Please contact your tournament organizer.");
      } else if (!rows || (rows as any[]).length === 0) {
        setError("This link has expired or was deactivated. Please contact your tournament organizer.");
      } else {
        const row = (rows as any[])[0] as PlayerHubData;
        if (slug && row.tournament_slug && row.tournament_slug !== slug) {
          setError("This link doesn't match this tournament.");
        } else {
          setData(row);
        }
      }
      setLoading(false);
    };
    load();
  }, [token, slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-display font-bold text-foreground">Access link unavailable</h1>
          <p className="text-muted-foreground">{error}</p>
          {slug && (
            <Link to={`/t/${slug}`} className="inline-block mt-4 text-secondary underline">
              Visit tournament page
            </Link>
          )}
        </div>
      </div>
    );
  }

  const fullName = `${data.first_name} ${data.last_name}`.trim();
  const tiles: { title: string; description: string; icon: any; to: string; external?: boolean }[] = [
    {
      title: "Live Scoring",
      description: "Enter scores for your group, hole-by-hole.",
      icon: PenLine,
      to: `/t/${data.tournament_slug}/scoring?code=${data.scoring_code ?? ""}`,
    },
    {
      title: "Live Leaderboard",
      description: "See real-time standings across the field.",
      icon: BarChart3,
      to: `/live/${data.tournament_slug}`,
    },
    {
      title: "Schedule & Details",
      description: "Tee times, format, contests, and event flow.",
      icon: Calendar,
      to: `/t/${data.tournament_slug}#schedule`,
    },
    {
      title: "Photo Gallery",
      description: "Browse and share photos from the event.",
      icon: ImageIcon,
      to: `/t/${data.tournament_slug}#gallery`,
    },
    {
      title: "Contact Organizer",
      description: "Questions? Reach the tournament team.",
      icon: MessageCircle,
      to: `/t/${data.tournament_slug}#contact`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${fullName} — Player Hub | ${data.tournament_title}`}
        description={`Personal tournament hub for ${fullName} at ${data.tournament_title}.`}
        noIndex
      />

      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-sm uppercase tracking-widest text-secondary font-semibold">
            Player Hub
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold mt-1">
            Welcome, {data.first_name}!
          </h1>
          <p className="mt-3 text-primary-foreground/80">
            {data.tournament_title}
            {data.tournament_date && ` · ${new Date(data.tournament_date).toLocaleDateString()}`}
          </p>
          {data.course_name && (
            <p className="text-primary-foreground/70 text-sm flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5" /> {data.course_name}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
            {data.group_number != null && (
              <div className="bg-primary-foreground/10 rounded-lg p-3">
                <p className="text-xs text-primary-foreground/60">Group</p>
                <p className="text-xl font-bold text-secondary">#{data.group_number}</p>
              </div>
            )}
            {data.group_position != null && (
              <div className="bg-primary-foreground/10 rounded-lg p-3">
                <p className="text-xs text-primary-foreground/60">Position</p>
                <p className="text-xl font-bold text-secondary">{data.group_position}</p>
              </div>
            )}
            {data.scoring_code && (
              <div className="bg-primary-foreground/10 rounded-lg p-3 col-span-2 sm:col-span-1">
                <p className="text-xs text-primary-foreground/60">Scoring Code</p>
                <p className="text-xl font-mono font-bold text-secondary">{data.scoring_code}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tiles */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 gap-4">
          {tiles.map((tile) => (
            <Link
              key={tile.title}
              to={tile.to}
              className="bg-card border border-border rounded-xl p-5 hover:border-secondary hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="bg-secondary/15 text-secondary rounded-lg p-2.5 group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                  <tile.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-foreground">{tile.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{tile.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Bookmark this page — your personal hub for the entire tournament.
        </p>
      </div>
    </div>
  );
}
