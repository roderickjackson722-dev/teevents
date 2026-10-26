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
import { Printer, Loader2, IdCard, Car, List, Users, Handshake, ClipboardCheck, Download, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { openPrintWindow, downloadHtmlAsPdf } from "@/components/printables/printUtils";
import CheckInRosterTab from "@/components/printables/CheckInRosterTab";
import { Checkbox } from "@/components/ui/checkbox";
import { addedPlayer, draftFrom, printoutGroups, printoutPlayers, type DraftPlayer } from "@/components/enterprise/printSelections";
import CartSignsTab from "@/components/printables/CartSignsTab";
import AlphaListTab from "@/components/printables/AlphaListTab";
import NameBadgesTab from "@/components/printables/NameBadgesTab";
import PairingsTab from "@/components/printables/PairingsTab";
import SponsorSignsTab from "@/components/printables/SponsorSignsTab";
import type { Registration, Sponsor, Tournament } from "@/components/printables/types";
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
  scoring_code?: string | null;
  group_scoring_code?: string | null;
}

export default function EnterprisePrintables() {
  const { events, event, settings, loading, selectEvent, saveSettings } = useEnterpriseEvent();
  const [regs, setRegs] = useState<RegRow[]>([]);
  const [groups, setGroups] = useState<RegistrationGroupRow[]>([]);
  const [skins, setSkins] = useState<SkinResult[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [template, setTemplate] = useState("standard_stroke");
  const [color, setColor] = useState("#1a5c38");
  const [accent, setAccent] = useState("#c8a84e");
  const [rowHeight, setRowHeight] = useState(22);
  const [showQr, setShowQr] = useState(true);
  const [showSkins, setShowSkins] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<DraftPlayer<RegRow>[]>([]);
  const [editing, setEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newGroup, setNewGroup] = useState("");

  useEffect(() => {
    if (!event) return;
    setTemplate(settings?.scorecardTemplate || "standard_stroke");
    setColor(event.site_primary_color || "#1a5c38");
    setAccent(event.site_secondary_color || "#c8a84e");
    setShowSkins(Boolean(settings?.skinsGross || settings?.skinsNet));
    (async () => {
      const [regRes, groupRes, gameRes, sponsorRes] = await Promise.all([
        (supabase.from("tournament_registrations") as any)
          .select("id, first_name, last_name, email, group_number, group_position, group_label, scoring_code, group_scoring_code, handicap_index, tee_time, flight_id")
          .eq("tournament_id", event.id)
          .order("group_number"),
        (supabase.from("registration_groups") as any)
          .select("id, group_number, team_name, tee_time, cart_sign_names, starting_hole")
          .eq("tournament_id", event.id),
        (supabase.from("division_skins_games") as any)
          .select("id, skin_format")
          .eq("tournament_id", event.id),
        (supabase.from("sponsor_registrations") as any)
          .select("id, company_name, sponsorship_tiers(name), logo_url, website_url")
          .eq("tournament_id", event.id)
          .eq("payment_status", "paid"),
      ]);
      const rows = (regRes.data || []) as RegRow[];
      setRegs(rows);
      setDraft(draftFrom(rows));
      setConfirmed(false);
      setEditing(false);
      setGroups((groupRes.data || []) as RegistrationGroupRow[]);
      setSponsors((sponsorRes.data || []).map((row: any) => ({ id: row.id, name: row.company_name, tier: row.sponsorship_tiers?.name || "Sponsor", logo_url: row.logo_url, website_url: row.website_url })));

      const games = (gameRes.data || []) as { id: string; skin_format: string }[];
      if (games.length) {
        const { data: winners } = await (supabase.from("division_skin_winners") as any)
          .select("hole_number, score, registration_id, skins_game_id")
          .in("skins_game_id", games.map((g) => g.id));
        const nameOf = (id: string | null) => {
          const r = rows.find((x) => x.id === id);
          return r ? `${r.first_name} ${r.last_name}`.trim() : "—";
        };
        setSkins(
          ((winners || []) as any[])
            .map((w) => ({
              hole: w.hole_number,
              winner: nameOf(w.registration_id),
              score: w.score ?? "—",
              net: games.find((g) => g.id === w.skins_game_id)?.skin_format === "net",
            }))
            .sort((a, b) => a.hole - b.hole),
        );
      } else {
        setSkins([]);
      }
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

  const printRegs = useMemo(() => printoutPlayers(draft), [draft]);
  const printGroups = useMemo(() => printoutGroups(groups, printRegs), [groups, printRegs]);

  const cards: ScorecardCardData[] = useMemo(() => {
    const byGroup = new Map<string, RegRow[]>();
    printRegs.forEach((r) => {
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
  }, [printRegs]);

  const printCards = (download = false) => {
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
    (download ? downloadHtmlAsPdf : openPrintWindow)(`${event.title} — Scorecards`, scorecardsPrintHtml(cards, opts), undefined, scorecardsPrintCss(opts));
  };

  const saveTemplate = async (key: string) => {
    setTemplate(key);
    setBusy(true);
    await saveSettings({ scorecardTemplate: key }, { site_primary_color: color, site_secondary_color: accent });
    setBusy(false);
  };

  const hasPlayers = printRegs.length > 0;
  const hasGrouped = printRegs.some((r) => r.group_number != null);
  const selectedGroupCount = new Set(printRegs.map((r) => r.group_number ?? "none")).size;
  const typeTrigger = (value: string, icon: import("react").ReactNode, label: string, available: boolean) => (
    <TabsTrigger value={value} disabled={!available} className="flex-col items-start gap-0 sm:flex-row sm:items-center">
      <span className="flex items-center">{icon} {label}</span>
      {!available && <span className="text-[11px] font-normal text-muted-foreground sm:ml-1.5">Not available for this event</span>}
    </TabsTrigger>
  );

  const teamName = (n: number | null) => {
    if (n == null) return "Not in a group";
    const g = groups.find((x) => x.group_number === n) as any;
    return g?.team_name ? `Group ${n} · ${g.team_name}` : `Group ${n}`;
  };
  const groupNumbers = [...new Set(draft.map((d) => d.group_number))].sort((a, b) => (a ?? 1e9) - (b ?? 1e9));
  const patch = (id: string, change: Partial<DraftPlayer<RegRow>>) =>
    setDraft((list) => list.map((d) => (d.id === id ? { ...d, ...change } : d)));
  const setGroupIncluded = (n: number | null, include: boolean) =>
    setDraft((list) => list.map((d) => (d.group_number === n ? { ...d, include } : d)));
  const addPlayer = () => {
    if (!newFirst.trim() && !newLast.trim()) { toast.error("Enter a name to add."); return; }
    const g = newGroup.trim() ? Number(newGroup) : null;
    setDraft((list) => [...list, addedPlayer(newFirst, newLast, Number.isFinite(g as number) ? g : null) as DraftPlayer<RegRow>]);
    setNewFirst(""); setNewLast(""); setNewGroup("");
  };
  const includedCount = draft.filter((d) => d.include).length;

  const selectionStep = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Choose who to include</CardTitle>
        <p className="text-sm text-muted-foreground">Select players, teams and groups for this printout. Changes here affect the printout only, never the event, pairings or scores.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDraft((l) => l.map((d) => ({ ...d, include: true })))}>Select all</Button>
          <Button variant="outline" size="sm" onClick={() => setDraft((l) => l.map((d) => ({ ...d, include: false })))}>Clear all</Button>
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}><Pencil className="mr-1.5 h-4 w-4" />Edit selections</Button>
          <span className="text-sm text-muted-foreground">{includedCount} of {draft.length} selected</span>
        </div>
        {draft.length === 0 && <p className="text-sm text-muted-foreground">No players registered for this event yet.</p>}
        <div className="space-y-3">
          {groupNumbers.map((n) => {
            const members = draft.filter((d) => d.group_number === n);
            const all = members.every((m) => m.include);
            const some = members.some((m) => m.include);
            return (
              <div key={String(n)} className="rounded-lg border border-border" data-testid="print-group">
                <label className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-sm font-medium">
                  <Checkbox checked={all ? true : some ? "indeterminate" : false} onCheckedChange={(v) => setGroupIncluded(n, Boolean(v))} aria-label={`Include ${teamName(n)}`} />
                  {teamName(n)}
                </label>
                <div className="divide-y divide-border">
                  {members.map((m) => (
                    <div key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                      <label className="flex min-w-[10rem] flex-1 items-center gap-2">
                        <Checkbox checked={m.include} onCheckedChange={(v) => patch(m.id, { include: Boolean(v) })} aria-label={`Include ${m.first_name} ${m.last_name}`} />
                        {`${m.first_name} ${m.last_name}`.trim() || "Unnamed player"}
                        {m.added && <span className="text-xs text-muted-foreground">(printout only)</span>}
                      </label>
                      {editing && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs">Tee time</Label>
                            <Input className="h-8 w-28" value={m.tee_time ?? ""} onChange={(e) => patch(m.id, { tee_time: e.target.value || null })} aria-label={`Tee time for ${m.first_name}`} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs">Group</Label>
                            <Input className="h-8 w-20" type="number" min={1} value={m.group_number ?? ""} onChange={(e) => patch(m.id, { group_number: e.target.value ? Number(e.target.value) : null })} aria-label={`Group for ${m.first_name}`} />
                          </div>
                          {m.added && <Button variant="ghost" size="sm" onClick={() => setDraft((l) => l.filter((d) => d.id !== m.id))}>Remove</Button>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {editing && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
            <div><Label className="text-xs">First name</Label><Input className="h-8 w-36" aria-label="First name" value={newFirst} onChange={(e) => setNewFirst(e.target.value)} /></div>
            <div><Label className="text-xs">Last name</Label><Input className="h-8 w-36" aria-label="Last name" value={newLast} onChange={(e) => setNewLast(e.target.value)} /></div>
            <div><Label className="text-xs">Group</Label><Input className="h-8 w-20" type="number" min={1} aria-label="Group for new player" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} /></div>
            <Button variant="outline" size="sm" onClick={addPlayer}><Plus className="mr-1.5 h-4 w-4" />Add player to printout</Button>
          </div>
        )}
        <Button onClick={() => { setConfirmed(true); setEditing(false); }} disabled={includedCount === 0 && sponsors.length === 0}>Confirm selections</Button>
      </CardContent>
    </Card>
  );

  return (
    <EnterpriseLayout
      title="Printables"
      description="Branded scorecards, signs, lists, badges and pairings for event day."
      crumbs={[{ label: "Printables" }]}
      actions={<div className="flex flex-col gap-1"><Label className="text-xs">Select event</Label><EnterpriseEventPicker events={events} eventId={event?.id} onChange={selectEvent} /></div>}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : !event ? (
        <p className="text-sm text-muted-foreground">Create an event first.</p>
      ) : !confirmed ? (
        selectionStep
      ) : (
        <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm"><span className="font-medium">{printRegs.length}</span> player{printRegs.length === 1 ? "" : "s"} in {selectedGroupCount} group{selectedGroupCount === 1 ? "" : "s"} selected for this printout.</p>
            <Button variant="outline" size="sm" onClick={() => { setConfirmed(false); setEditing(true); }}><Pencil className="mr-1.5 h-4 w-4" />Edit selections</Button>
          </CardContent>
        </Card>
        <Tabs defaultValue="scorecards">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            {typeTrigger("scorecards", <Printer className="mr-1.5 h-4 w-4" />, "Scorecards", hasPlayers)}
            {typeTrigger("cart", <Car className="mr-1.5 h-4 w-4" />, "Cart Signs", hasPlayers)}
            {typeTrigger("alpha", <List className="mr-1.5 h-4 w-4" />, "Alpha List", hasPlayers)}
            {typeTrigger("badges", <IdCard className="mr-1.5 h-4 w-4" />, "Name Badges", hasPlayers)}
            {typeTrigger("pairings", <Users className="mr-1.5 h-4 w-4" />, "Pairings", hasGrouped)}
            {typeTrigger("checkin", <ClipboardCheck className="mr-1.5 h-4 w-4" />, "Check-In Roster", hasPlayers)}
            {typeTrigger("sponsors", <Handshake className="mr-1.5 h-4 w-4" />, "Sponsor Signs", sponsors.length > 0)}
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
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => printCards()} disabled={busy} className="bg-secondary text-primary hover:bg-secondary/90">
                      <Printer className="mr-1.5 h-4 w-4" /> Print {cards.length} scorecard{cards.length === 1 ? "" : "s"}
                    </Button>
                    <Button variant="outline" onClick={() => printCards(true)} disabled={busy}>
                      <Download className="mr-1.5 h-4 w-4" /> Download
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Every card prints the scoring web address, a scan-to-score QR code and a note that circled scores are birdies.
                    {showSkins && skins.length > 0 && " Skin holes list the winning score and winner."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cart" className="mt-3">
            <CartSignsTab tournament={printTournament} registrations={printRegs} loading={false} groups={printGroups} printOnly />
          </TabsContent>
          <TabsContent value="alpha" className="mt-3">
            <AlphaListTab tournament={printTournament} registrations={printRegs} loading={false} showScoringCodes />
          </TabsContent>
          <TabsContent value="badges" className="mt-3">
            <NameBadgesTab tournament={printTournament} registrations={printRegs} loading={false} groups={printGroups} />
          </TabsContent>
          <TabsContent value="pairings" className="mt-3">
            <PairingsTab tournament={printTournament} registrations={printRegs} loading={false} groups={printGroups} />
          </TabsContent>
          <TabsContent value="checkin" className="mt-3">
            <CheckInRosterTab tournament={printTournament ? { ...printTournament, slug: event.slug } : null} registrations={printRegs as RegRow[]} loading={false} />
          </TabsContent>
          <TabsContent value="sponsors" className="mt-3">
            <SponsorSignsTab tournament={printTournament} sponsors={sponsors} loading={false} />
          </TabsContent>
        </Tabs>
        </div>
      )}
    </EnterpriseLayout>
  );
}
