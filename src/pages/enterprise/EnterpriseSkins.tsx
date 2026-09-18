import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import EnterpriseEventPicker from "@/components/enterprise/EnterpriseEventPicker";
import { useEnterpriseEvent } from "@/components/enterprise/useEnterpriseEvent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Coins, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface PlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  in_skins: boolean | null;
  in_deuces: boolean | null;
}

export default function EnterpriseSkins() {
  const { events, event, settings, loading, selectEvent, saveSettings } = useEnterpriseEvent();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!event) return;
    (supabase.from("tournament_registrations") as any)
      .select("id, first_name, last_name, in_skins, in_deuces")
      .eq("tournament_id", event.id)
      .order("last_name")
      .then(({ data }: any) => setPlayers((data || []) as PlayerRow[]));
  }, [event]);

  const toggle = async (id: string, field: "in_skins" | "in_deuces", value: boolean) => {
    setPlayers((p) => p.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
    const { error } = await (supabase.from("tournament_registrations") as any).update({ [field]: value }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const setAll = async (field: "in_skins" | "in_deuces", value: boolean) => {
    if (!event) return;
    setBusy(true);
    setPlayers((p) => p.map((x) => ({ ...x, [field]: value })));
    await (supabase.from("tournament_registrations") as any).update({ [field]: value }).eq("tournament_id", event.id);
    setBusy(false);
  };

  const games = [
    { key: "skinsGross" as const, label: "Gross skins" },
    { key: "skinsNet" as const, label: "Net skins" },
    { key: "deucesGross" as const, label: "Gross deuces" },
    { key: "deucesNet" as const, label: "Net deuces" },
  ];

  return (
    <EnterpriseLayout
      title="Skins & Deuces"
      description="Pick the games in play and who is in them. Winners and payouts stay in Scoring & Payouts."
      crumbs={[{ label: "Skins & Deuces" }]}
      actions={<EnterpriseEventPicker events={events} eventId={event?.id} onChange={selectEvent} />}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : !event ? (
        <p className="text-sm text-muted-foreground">Create an event first.</p>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Coins className="h-4 w-4 text-secondary" /> Games in play</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-5">
              {games.map((g) => (
                <label key={g.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(settings?.[g.key])}
                    onCheckedChange={(v) =>
                      saveSettings(
                        { [g.key]: Boolean(v) } as never,
                        g.key.startsWith("skins") ? { skins_enabled: true } : {},
                      )
                    }
                  />
                  {g.label}
                </label>
              ))}
              <Button asChild variant="outline" size="sm" className="ml-auto">
                <Link to={`/dashboard/scoring-payouts?tournament_id=${event.id}`}>
                  Purse & winners <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base">Players ({players.length})</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setAll("in_skins", true)}>All in skins</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setAll("in_skins", false)}>Clear skins</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setAll("in_deuces", true)}>All in deuces</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setAll("in_deuces", false)}>Clear deuces</Button>
              </div>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <p className="text-sm text-muted-foreground">No players added yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  <div className="flex items-center gap-4 pb-2 text-xs font-semibold uppercase text-muted-foreground">
                    <span className="flex-1">Player</span>
                    <span className="w-16 text-center">Skins</span>
                    <span className="w-16 text-center">Deuces</span>
                  </div>
                  {players.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 py-2 text-sm">
                      <span className="flex-1">{p.first_name} {p.last_name}</span>
                      <span className="flex w-16 justify-center">
                        <Checkbox checked={Boolean(p.in_skins)} onCheckedChange={(v) => toggle(p.id, "in_skins", Boolean(v))} />
                      </span>
                      <span className="flex w-16 justify-center">
                        <Checkbox checked={Boolean(p.in_deuces)} onCheckedChange={(v) => toggle(p.id, "in_deuces", Boolean(v))} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </EnterpriseLayout>
  );
}
