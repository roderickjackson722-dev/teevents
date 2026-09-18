import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import EnterpriseEventPicker from "@/components/enterprise/EnterpriseEventPicker";
import { useEnterpriseEvent } from "@/components/enterprise/useEnterpriseEvent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Loader2, IdCard, Car, List } from "lucide-react";
import { toast } from "sonner";
import { openPrintWindow } from "@/components/printables/printUtils";
import CartSignsTab from "@/components/printables/CartSignsTab";
import AlphaListTab from "@/components/printables/AlphaListTab";
import NameBadgesTab from "@/components/printables/NameBadgesTab";
import type { Registration, Tournament } from "@/components/printables/types";
import type { RegistrationGroupRow } from "@/components/printables/teamGrouping";
import {
  SCORECARD_TEMPLATES,
  scorecardsPrintCss,
  scorecardsPrintHtml,
  type ScorecardCardData,
  type ScorecardPrintOptions,
  type SkinResult,
} from "@/components/enterprise/enterpriseScorecard";

interface RegRow extends Registration {
  handicap_index?: number | null;
  tee_time?: string | null;
  group_label?: string | null;
}

export default function EnterprisePrintables() {
  const { events, event, settings, loading, selectEvent, saveSettings } = useEnterpriseEvent();
  const [regs, setRegs] = useState<RegRow[]>([]);
  const [groups, setGroups] = useState<RegistrationGroupRow[]>([]);
  const [skins, setSkins] = useState<SkinResult[]>([]);
  const [template, setTemplate] = useState("standard_stroke");
  const [color, setColor] = useState("#1a5c38");
  const [accent, setAccent] = useState("#c8a84e");
  const [rowHeight, setRowHeight] = useState(22);
  const [showQr, setShowQr] = useState(true);
  const [showSkins, setShowSkins] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!event) return;
    setTemplate(settings?.scorecardTemplate || "standard_stroke");
    setColor(event.site_primary_color || "#1a5c38");
    setAccent(event.site_secondary_color || "#c8a84e");
    setShowSkins(Boolean(settings?.skinsGross || settings?.skinsNet));
    (async () => {
      const [regRes, groupRes, skinRes] = await Promise.all([
        (supabase.from("tournament_registrations") as any)
          .select("id, first_name, last_name, email, group_number, group_position, group_label, scoring_code, group_scoring_code, handicap_index, tee_time, flight_id")
          .eq("tournament_id", event.id)
          .order("group_number"),
        (supabase.from("registration_groups") as any)
          .select("id, group_number, team_name, tee_time, cart_sign_names, starting_hole")
          .eq("tournament_id", event.id),
        (supabase.from("division_skin_winners") as any)
          .select("hole_number, winner_name, winning_score, is_net")
          .eq("tournament_id", event.id),
      ]);
      setRegs((regRes.data || []) as RegRow[]);
      setGroups((groupRes.data || []) as RegistrationGroupRow[]);
      setSkins(
        ((skinRes.data || []) as any[]).map((s) => ({
          hole: s.hole_number,
          winner: s.winner_name || "—",
          score: s.winning_score ?? "—",
          net: Boolean(s.is_net),
        })),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  const printTournament: Tournament | null = event
    ? {
        id: event.id,
        title: event.title,
        site_logo_url: event.site_logo_url,
        course_name: event.course_name,
        course_par: event.course_par,
        site_primary_color: color,
        site_secondary_color: accent,
        printable_font: null,
        printable_layout: null,
        hole_pars: event.hole_pars,
      }
    : null;

  const cards: ScorecardCardData[] = useMemo(() => {
    const byGroup = new Map<string, RegRow[]>();
    regs.forEach((r) => {
      const key = r.group_label || (r.group_number != null ? String(r.group_number) : "Unassigned");
      byGroup.set(key, [...(byGroup.get(key) || []), r]);
    });
    return [...byGroup.entries()].map(([label, list]) => ({
      groupLabel: label,
      playerNames: list.map((r) => `${r.first_name} ${r.last_name}`.trim()),
      handicaps: list.map((r) => r.handicap_index ?? null),
      scoringCode: list[0]?.group_scoring_code || list[0]?.scoring_code || null,
      teeTime: list[0]?.tee_time || null,
    }));
  }, [regs]);

  const printCards = () => {
    if (!event) return;
    if (!cards.length) { toast.error("Add players and pairings first."); return; }
    const numHoles = settings?.holes || 18;
    const pars = Array.from({ length: numHoles }, (_, i) =>
      (event.hole_pars && event.hole_pars[i]) || Math.round((event.course_par ?? (numHoles === 9 ? 36 : 72)) / numHoles),
    );
    const opts: ScorecardPrintOptions = {
      eventTitle: event.title,
      courseName: event.course_name || "",
      dateLabel: event.date || "",
      numHoles,
      pars,
      primaryColor: color,
      secondaryColor: accent,
      logoUrl: event.site_logo_url,
      scoringUrl: `${window.location.origin}/t/${event.slug || event.id}/scoring`,
      showQr,
      showSkins,
      skins,
      template,
      rowHeightPx: rowHeight,
    };
    openPrintWindow(`${event.title} — Scorecards`, scorecardsPrintHtml(cards, opts), undefined, scorecardsPrintCss(opts));
  };

  const saveTemplate = async (key: string) => {
    setTemplate(key);
    setBusy(true);
    await saveSettings({ scorecardTemplate: key }, { site_primary_color: color, site_secondary_color: accent });
    setBusy(false);
  };

  return (
    <EnterpriseLayout
      title="Printables"
      description="Scorecards, cart signs, alpha list and name badges — all branded to the event."
      crumbs={[{ label: "Printables" }]}
      actions={<EnterpriseEventPicker events={events} eventId={event?.id} onChange={selectEvent} />}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : !event ? (
        <p className="text-sm text-muted-foreground">Create an event first.</p>
      ) : (
        <Tabs defaultValue="scorecards">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="scorecards"><Printer className="mr-1.5 h-4 w-4" /> Scorecards</TabsTrigger>
            <TabsTrigger value="cart"><Car className="mr-1.5 h-4 w-4" /> Cart Signs</TabsTrigger>
            <TabsTrigger value="alpha"><List className="mr-1.5 h-4 w-4" /> Alpha List</TabsTrigger>
            <TabsTrigger value="badges"><IdCard className="mr-1.5 h-4 w-4" /> Name Badges</TabsTrigger>
          </TabsList>

          <TabsContent value="scorecards" className="mt-3 space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Choose a template</CardTitle></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {SCORECARD_TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => saveTemplate(t.key)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      template === t.key ? "border-primary bg-secondary/30" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.blurb}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Card layout</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Card color</Label>
                  <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 p-1" />
                </div>
                <div>
                  <Label>Accent color</Label>
                  <Input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 p-1" />
                </div>
                <div>
                  <Label>Score row height (px)</Label>
                  <Input type="number" min={14} max={48} value={rowHeight} onChange={(e) => setRowHeight(Number(e.target.value) || 22)} />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center justify-between gap-2 text-sm">
                    QR code to scoring <Switch checked={showQr} onCheckedChange={setShowQr} />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-sm">
                    Skins section <Switch checked={showSkins} onCheckedChange={setShowSkins} />
                  </label>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <Button onClick={printCards} disabled={busy} className="bg-secondary text-primary hover:bg-secondary/90">
                    <Printer className="mr-1.5 h-4 w-4" /> Print {cards.length} scorecard{cards.length === 1 ? "" : "s"}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Every card prints the scoring web address, a scan-to-score QR code and a note that circled scores are birdies.
                    {showSkins && skins.length > 0 && " Skin holes list the winning score and winner."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cart" className="mt-3">
            <CartSignsTab tournament={printTournament} registrations={regs} loading={false} groups={groups} />
          </TabsContent>
          <TabsContent value="alpha" className="mt-3">
            <AlphaListTab tournament={printTournament} registrations={regs} loading={false} showScoringCodes />
          </TabsContent>
          <TabsContent value="badges" className="mt-3">
            <NameBadgesTab tournament={printTournament} registrations={regs} loading={false} groups={groups} />
          </TabsContent>
        </Tabs>
      )}
    </EnterpriseLayout>
  );
}
