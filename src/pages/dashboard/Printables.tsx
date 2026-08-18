import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Printer, Loader2, Car, List, MapPin, ClipboardList, BadgeCheck, QrCode } from "lucide-react";
import { toast } from "sonner";
import type { Tournament, Registration, Sponsor } from "@/components/printables/types";
import CartSignsTab from "@/components/printables/CartSignsTab";
import AlphaListTab from "@/components/printables/AlphaListTab";
import HoleAssignmentsTab from "@/components/printables/HoleAssignmentsTab";
import ScorecardsTab from "@/components/printables/ScorecardsTab";
import CheckInRosterTab from "@/components/printables/CheckInRosterTab";
import NameBadgesTab from "@/components/printables/NameBadgesTab";
import QRCodesTab, { type PrintableAddon } from "@/components/printables/QRCodesTab";
import PrintablesOptionsCard, { DEFAULT_PRINTABLE_OPTIONS, type PrintableOptions } from "@/components/printables/PrintablesOptionsCard";
import { rosterForPrintables } from "@/components/printables/rosterSource";
import type { RegistrationGroupRow } from "@/components/printables/teamGrouping";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";


interface TournamentWithSlug extends Tournament {
  slug: string | null;
}

const Printables = () => {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<TournamentWithSlug[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [tournament, setTournament] = useState<TournamentWithSlug | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [addons, setAddons] = useState<PrintableAddon[]>([]);
  const [options, setOptions] = useState<PrintableOptions>(DEFAULT_PRINTABLE_OPTIONS);
  const [savedOptions, setSavedOptions] = useState<PrintableOptions>(DEFAULT_PRINTABLE_OPTIONS);
  const [savingOptions, setSavingOptions] = useState(false);
  const [groups, setGroups] = useState<RegistrationGroupRow[]>([]);
  const [groupsRefresh, setGroupsRefresh] = useState(0);

  useEffect(() => {
    if (!selectedTournament) { setGroups([]); return; }
    (supabase.from("registration_groups") as any)
      .select("id, group_number, team_name, cart_sign_names")
      .eq("tournament_id", selectedTournament)
      .then(({ data }: any) => setGroups((data || []) as RegistrationGroupRow[]));
  }, [selectedTournament, groupsRefresh]);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, site_logo_url, printable_logo_url, course_name, course_par, site_primary_color, site_secondary_color, printable_font, printable_layout, hole_pars, slug, printable_options, scoring_format, date")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data || []) as TournamentWithSlug[];
        setTournaments(list);
        if (list.length > 0) setSelectedTournament(pickTournamentId(list));
        setLoading(false);
      });
  }, [org]);

  const [courseData, setCourseData] = useState<{
    hole_pars: number[] | null;
    stroke_indexes: number[] | null;
    hole_distances: number[] | null;
    name: string | null;
    tee_name: string | null;
  } | null>(null);

  useEffect(() => {
    if (!selectedTournament) return;
    setLoading(true);
    const t = tournaments.find((t) => t.id === selectedTournament) || null;
    setTournament(t);

    Promise.all([
      supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, email, payment_status, group_number, group_position, group_label, scoring_code, group_scoring_code, checked_in, created_at")
        .eq("tournament_id", selectedTournament)
        .order("last_name", { ascending: true }),
      supabase
        .from("tournament_sponsors")
        .select("id, name, tier, logo_url, website_url")
        .eq("tournament_id", selectedTournament)
        .order("sort_order", { ascending: true }),
      supabase
        .from("tournament_registration_addons")
        .select("id, name, description, price_cents, is_active")
        .eq("tournament_id", selectedTournament)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("golf_courses")
        .select("hole_pars, stroke_indexes, hole_distances, name, tee_name")
        .eq("tournament_id", selectedTournament)
        .limit(1)
        .maybeSingle(),
    ]).then(([regRes, sponsorRes, addonRes, courseRes]) => {
      setAddons((addonRes.data || []) as PrintableAddon[]);
      const opts = { ...DEFAULT_PRINTABLE_OPTIONS, ...(((t as any)?.printable_options as Partial<PrintableOptions>) || {}) };
      setOptions(opts);
      setSavedOptions(opts);
      setRegistrations((regRes.data || []) as Registration[]);
      setSponsors((sponsorRes.data || []) as Sponsor[]);
      setCourseData(courseRes.data ? {
        hole_pars: courseRes.data.hole_pars as number[] | null,
        stroke_indexes: courseRes.data.stroke_indexes as number[] | null,
        hole_distances: courseRes.data.hole_distances as number[] | null,
        name: courseRes.data.name,
        tee_name: courseRes.data.tee_name,
      } : null);
      setLoading(false);
    });
  }, [selectedTournament, tournaments]);

  const saveOptions = async () => {
    if (!selectedTournament) return;
    setSavingOptions(true);
    const { error } = await (supabase.from("tournaments") as any)
      .update({ printable_options: options })
      .eq("id", selectedTournament);
    if (error) toast.error("Could not save printables settings");
    else {
      setSavedOptions(options);
      toast.success("Printables settings saved");
    }
    setSavingOptions(false);
  };

  // Printables mirror the Players & Pairings roster: paid players only, no duplicates.
  const printRegistrations = useMemo(
    () => rosterForPrintables(registrations as any, options.data_source) as Registration[],
    [registrations, options.data_source],
  );

  const handleUpdateHole = (regId: string, newGroup: number | null) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, group_number: newGroup } : r))
    );
  };

  if (loading && tournaments.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-20 bg-card rounded-lg border border-border">
        <Printer className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-display font-bold text-foreground mb-2">No tournaments yet</h3>
        <p className="text-muted-foreground">Create a tournament first to access printables.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Printables</h1>
          <p className="text-muted-foreground mt-1">Generate print-ready materials for your tournament.</p>
        </div>
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-[280px] bg-card">
            <Trophy className="h-4 w-4 mr-2 text-primary" />
            <SelectValue placeholder="Select tournament" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PrintablesOptionsCard
        options={options}
        addons={addons}
        saving={savingOptions}
        dirty={JSON.stringify(options) !== JSON.stringify(savedOptions)}
        onChange={setOptions}
        onSave={saveOptions}
      />

      <Tabs defaultValue="cart-signs">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="cart-signs" className="gap-2"><Car className="h-4 w-4" /> Cart Signs</TabsTrigger>
          <TabsTrigger value="scorecards" className="gap-2"><ClipboardList className="h-4 w-4" /> Scorecards</TabsTrigger>
          <TabsTrigger value="name-badges" className="gap-2"><BadgeCheck className="h-4 w-4" /> Name Badges</TabsTrigger>
          
          <TabsTrigger value="alpha-list" className="gap-2"><List className="h-4 w-4" /> Alpha List</TabsTrigger>
          <TabsTrigger value="hole-assignments" className="gap-2"><MapPin className="h-4 w-4" /> Hole Assignments</TabsTrigger>
          <TabsTrigger value="check-in-roster" className="gap-2"><QrCode className="h-4 w-4" /> Check-In Roster</TabsTrigger>
          <TabsTrigger value="qr-codes" className="gap-2"><QrCode className="h-4 w-4" /> QR Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="check-in-roster">
          <CheckInRosterTab tournament={tournament} registrations={printRegistrations as any} loading={loading} />
        </TabsContent>

        <TabsContent value="qr-codes">
          <QRCodesTab
            tournament={tournament}
            addons={addons}
            loading={loading}
            enabled={{ walkup: savedOptions.qr_walkup, donation: savedOptions.qr_donation, addonIds: savedOptions.qr_addon_ids }}
          />
        </TabsContent>

        <TabsContent value="cart-signs">
          <CartSignsTab
            tournament={tournament}
            registrations={printRegistrations}
            loading={loading}
            groups={groups}
            onGroupsChanged={() => setGroupsRefresh((n) => n + 1)}
          />
        </TabsContent>
        <TabsContent value="scorecards">
          <ScorecardsTab tournament={tournament} registrations={printRegistrations} loading={loading} slug={tournament?.slug || undefined} courseData={courseData} groups={groups} scoringFormat={(tournament as any)?.scoring_format} />
        </TabsContent>
        <TabsContent value="name-badges">
          <NameBadgesTab tournament={tournament} registrations={printRegistrations} loading={loading} />
        </TabsContent>
        <TabsContent value="alpha-list">
          <AlphaListTab tournament={tournament} registrations={printRegistrations} loading={loading} showScoringCodes={savedOptions.show_scoring_codes_alpha} />
        </TabsContent>
        <TabsContent value="hole-assignments">
          <HoleAssignmentsTab tournament={tournament} registrations={printRegistrations} loading={loading} onUpdate={handleUpdateHole} showScoringCodes={savedOptions.show_scoring_codes_holes} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Printables;
