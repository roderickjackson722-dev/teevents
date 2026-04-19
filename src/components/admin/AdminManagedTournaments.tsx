import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Calendar, MapPin } from "lucide-react";

interface Tournament {
  id: string;
  title: string;
  slug: string | null;
  custom_slug: string | null;
  date: string | null;
  location: string | null;
  managed_by_teevents?: boolean;
  show_in_public_search?: boolean;
  site_published?: boolean;
  organizations?: { name: string } | null;
}

interface Props {
  tournaments: Tournament[];
  onTogglePublicSearch: (id: string, value: boolean) => Promise<void>;
}

export default function AdminManagedTournaments({ tournaments, onTogglePublicSearch }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleToggle = async (id: string, value: boolean) => {
    setPendingId(id);
    await onTogglePublicSearch(id, value);
    setPendingId(null);
  };

  if (tournaments.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        No tournaments yet.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-lg p-4 text-sm text-muted-foreground">
        Every tournament on the platform is managed by TeeVents.
        Use the public-search toggle below to control whether each one appears on /tournaments/search.
      </div>

      {tournaments.map(t => {
        const slug = t.custom_slug || t.slug;
        return (
          <Card key={t.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{t.title}</h3>
                  {t.site_published && <Badge className="bg-primary text-primary-foreground">Live Site</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                  {t.organizations?.name && <span>{t.organizations.name}</span>}
                  {t.date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{new Date(t.date).toLocaleDateString()}
                    </span>
                  )}
                  {t.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{t.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={!!t.show_in_public_search}
                    disabled={pendingId === t.id}
                    onCheckedChange={(v) => handleToggle(t.id, v)}
                  />
                  <span>Public search</span>
                  {pendingId === t.id && <Loader2 className="h-3 w-3 animate-spin" />}
                </label>
                {slug && (
                  <a href={`/t/${slug}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />View site
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
