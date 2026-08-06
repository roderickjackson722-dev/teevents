import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Trophy, ListOrdered, Flag, BarChart3, PencilLine, QrCode,
  Users, Megaphone, Phone, Copy, Download, Mail, MessageCircle, Share2, Facebook, Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import { TeeventsFooter } from "@/components/TeeventsFooter";
import { DEFAULT_TEAM_HQ_SETTINGS, parseTeamHqSettings, type TeamHqSettings } from "@/lib/teamHqSettings";


interface TeamTournament {
  id: string;
  title: string;
  slug: string | null;
  date: string | null;
  course_name: string | null;
  site_logo_url: string | null;
  site_primary_color: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  day_of_director_name: string | null;
  day_of_director_email: string | null;
  day_of_director_phone: string | null;
  day_of_emergency_contact: string | null;
  day_of_welcome_message: string | null;
  day_of_announcements: string | null;
  day_of_announcements_list: unknown;
}

interface RosterRow {
  registration_id: string;
  first_name: string | null;
  last_name: string | null;
  group_number: number | null;
  group_position: number | null;
  team_name: string | null;
  tee_time: string | null;
}

const qrUrl = (url: string, size = 180) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&margin=0&data=${encodeURIComponent(url)}`;

function QrCard({ label, url }: { label: string; url: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <img src={qrUrl(url)} alt={`QR code for ${label}`} className="mx-auto h-32 w-32" loading="lazy" />
      <a href={url} target="_blank" rel="noreferrer" className="mt-2 block text-[11px] text-primary underline break-all">
        Open link
      </a>
    </div>
  );
}

export default function TeamHomepage() {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<TeamTournament | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hq, setHq] = useState<TeamHqSettings>(DEFAULT_TEAM_HQ_SETTINGS);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: resolved } = await (supabase as any).rpc("resolve_public_tournament", { _slug: slug });
      const row = Array.isArray(resolved) ? resolved[0] : resolved;
      if (!row?.id) {
        if (!cancelled) { setNotFound(true); setLoading(false); }
        return;
      }
      const [tRes, rRes] = await Promise.all([
        supabase
          .from("tournaments")
          .select("id, title, slug, date, course_name, site_logo_url, site_primary_color, contact_name, contact_email, contact_phone, day_of_director_name, day_of_director_email, day_of_director_phone, day_of_emergency_contact, day_of_welcome_message, day_of_announcements, day_of_announcements_list, team_hq_settings")
          .eq("id", row.id)
          .maybeSingle(),
        (supabase as any).rpc("get_public_team_roster", { _tournament_id: row.id }),
      ]);
      if (cancelled) return;
      const tData: any = tRes.data ?? null;
      const parsed = parseTeamHqSettings(tData?.team_hq_settings);
      setHq(parsed);
      if (tData && !parsed.enabled) { setNotFound(true); setLoading(false); return; }
      setTournament(tData);
      setRoster(((rRes as any).data || []) as RosterRow[]);

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://teevents.golf";
  const publicSlug = tournament?.slug || slug || "";
  const teamUrl = `${origin}/team/${publicSlug}`;
  const liveUrl = `${origin}/live/${publicSlug}`;
  const scoringUrl = `${origin}/t/${publicSlug}/scoring`;
  const tournamentUrl = `${origin}/t/${publicSlug}`;

  const alphaList = useMemo(
    () => [...roster].sort((a, b) =>
      (a.last_name || "").localeCompare(b.last_name || "") || (a.first_name || "").localeCompare(b.first_name || "")
    ),
    [roster],
  );

  const holeGroups = useMemo(() => {
    const map = new Map<number, RosterRow[]>();
    roster.forEach((r) => {
      if (r.group_number == null) return;
      const list = map.get(r.group_number) || [];
      list.push(r);
      map.set(r.group_number, list);
    });
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hole, players]) => ({
        hole,
        teamName: players.find((p) => p.team_name)?.team_name || `Hole ${hole}`,
        teeTime: players.find((p) => p.tee_time)?.tee_time || null,
        players: players.sort((a, b) => (a.group_position ?? 99) - (b.group_position ?? 99)),
      }));
  }, [roster]);

  const announcements = useMemo(() => {
    const list = tournament?.day_of_announcements_list;
    if (Array.isArray(list)) {
      return list
        .map((a: any) => (typeof a === "string" ? a : a?.text || a?.message || ""))
        .filter(Boolean) as string[];
    }
    return tournament?.day_of_announcements ? [tournament.day_of_announcements] : [];
  }, [tournament]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(teamUrl);
      toast.success("Team homepage link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const shareText = `${tournament?.title ?? "Tournament"} — Team Resources: ${teamUrl}`;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (notFound || !tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <h1 className="text-xl font-display font-bold text-foreground">Team page not available</h1>
        <p className="text-muted-foreground mt-1 text-sm">This tournament could not be found or is not published yet.</p>
      </div>
    );
  }

  const dateStr = tournament.date
    ? new Date(`${tournament.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : null;

  const quickLinks: Array<{ label: string; icon: typeof ListOrdered; href: string; external?: boolean; show: boolean }> = [
    { label: "Alpha List", icon: ListOrdered, href: "#alpha-list", show: hq.show_alpha_list },
    { label: "Hole Assignments", icon: Flag, href: "#hole-assignments", show: hq.show_hole_assignments },
    { label: "Live Leaderboard", icon: BarChart3, href: liveUrl, external: true, show: hq.show_leaderboard },
    { label: "Scoring Entry", icon: PencilLine, href: scoringUrl, external: true, show: hq.show_scoring },
    { label: "QR Codes", icon: QrCode, href: "#qr-codes", show: hq.show_qr_codes },
    { label: "Pairings & Tee Times", icon: Users, href: "#hole-assignments", show: hq.show_hole_assignments },
    { label: "Announcements", icon: Megaphone, href: "#announcements", show: hq.show_announcements },
    { label: "Contact Info", icon: Phone, href: "#contact", show: hq.show_contact },
  ].filter((l) => l.show);


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-3">
          {tournament.site_logo_url && (
            <img src={tournament.site_logo_url} alt="" className="h-10 w-10 object-contain rounded" />
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Team Resources</p>
            <h1 className="text-xl font-display font-bold text-foreground leading-tight">{tournament.title}</h1>
            <p className="text-xs text-muted-foreground">
              {[dateStr, tournament.course_name].filter(Boolean).join(" • ")}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {hq.intro_note && (
          <p className="text-sm text-foreground bg-primary/5 border border-primary/20 rounded-lg p-3 whitespace-pre-line">
            {hq.intro_note}
          </p>
        )}

        {hq.show_welcome && tournament.day_of_welcome_message && (
          <p className="text-sm text-muted-foreground bg-muted/40 border border-border rounded-lg p-3">
            {tournament.day_of_welcome_message}
          </p>
        )}

        {hq.show_quick_links && quickLinks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Links</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickLinks.map(({ label, icon: Icon, href, external }) => (
              <a
                key={label}
                href={href}
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center hover:bg-muted/40 transition-colors min-h-[84px]"
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-foreground leading-tight">{label}</span>
              </a>
            ))}
          </div>
        </section>
        )}

        {hq.show_alpha_list && (
        <section id="alpha-list" className="scroll-mt-4">

          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-primary" /> Alpha List (All Players)
          </h2>
          <div className="rounded-xl border border-border bg-card divide-y divide-border max-h-96 overflow-y-auto">
            {alphaList.length === 0 && <p className="p-4 text-sm text-muted-foreground">No players yet.</p>}
            {alphaList.map((r, i) => (
              <div key={r.registration_id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="text-foreground">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {r.last_name}, {r.first_name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {r.group_number != null ? `Hole ${r.group_number}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
        )}

        {hq.show_hole_assignments && (
        <section id="hole-assignments" className="scroll-mt-4">

          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" /> Hole Assignments, Pairings &amp; Tee Times
          </h2>
          <div className="space-y-2">
            {holeGroups.length === 0 && (
              <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Pairings have not been assigned yet.</p>
            )}
            {holeGroups.map((g) => (
              <div key={g.hole} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">Hole {g.hole}: {g.teamName}</p>
                  {hq.show_tee_times && g.teeTime && <span className="text-xs text-muted-foreground">{g.teeTime}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {g.players.map((p) => `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()).join(" • ")}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Live Leaderboard &amp; Scoring
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="flex-1">
              <a href={liveUrl} target="_blank" rel="noreferrer">Open Live Leaderboard</a>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <a href={scoringUrl} target="_blank" rel="noreferrer">Open Scoring Entry</a>
            </Button>
          </div>
        </section>

        <section id="qr-codes" className="scroll-mt-4">
          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" /> QR Codes
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <QrCard label="Live Leaderboard" url={liveUrl} />
            <QrCard label="Scoring Entry" url={scoringUrl} />
            <QrCard label="Team Homepage" url={teamUrl} />
            <QrCard label="Alpha List" url={`${teamUrl}#alpha-list`} />
            <QrCard label="Hole Assignments" url={`${teamUrl}#hole-assignments`} />
            <QrCard label="Tournament Page" url={tournamentUrl} />
          </div>
        </section>

        <section id="announcements" className="scroll-mt-4">
          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Announcements
          </h2>
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements posted.</p>}
            {announcements.map((a, i) => (
              <p key={i} className="text-sm text-foreground">• {a}</p>
            ))}
          </div>
        </section>

        <section id="contact" className="scroll-mt-4">
          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> Contact Info
          </h2>
          <div className="rounded-xl border border-border bg-card p-3 space-y-1.5 text-sm">
            {(tournament.day_of_director_name || tournament.contact_name) && (
              <p className="text-foreground font-medium">{tournament.day_of_director_name || tournament.contact_name}</p>
            )}
            {(tournament.day_of_director_phone || tournament.contact_phone) && (
              <a href={`tel:${tournament.day_of_director_phone || tournament.contact_phone}`} className="block text-primary underline">
                {tournament.day_of_director_phone || tournament.contact_phone}
              </a>
            )}
            {(tournament.day_of_director_email || tournament.contact_email) && (
              <a href={`mailto:${tournament.day_of_director_email || tournament.contact_email}`} className="block text-primary underline break-all">
                {tournament.day_of_director_email || tournament.contact_email}
              </a>
            )}
            {tournament.day_of_emergency_contact && (
              <p className="text-muted-foreground text-xs">Emergency: {tournament.day_of_emergency_contact}</p>
            )}
            {!tournament.day_of_director_name && !tournament.contact_name &&
              !tournament.day_of_director_email && !tournament.contact_email &&
              !tournament.day_of_director_phone && !tournament.contact_phone && (
              <p className="text-muted-foreground">No contact details added yet.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" /> Share Team Homepage
          </h2>
          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={teamUrl} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button variant="outline" onClick={copyLink} className="shrink-0">
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <img src={qrUrl(teamUrl)} alt="Team homepage QR code" className="h-28 w-28" />
              <Button asChild variant="outline" size="sm">
                <a href={qrUrl(teamUrl, 512)} download={`team-qr-${publicSlug}.png`} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-1" /> Download QR Code
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`mailto:?subject=${encodeURIComponent(`${tournament.title} — Team Resources`)}&body=${encodeURIComponent(shareText)}`}>
                  <Mail className="h-4 w-4 mr-1" /> Email
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`sms:?&body=${encodeURIComponent(shareText)}`}>
                  <MessageCircle className="h-4 w-4 mr-1" /> SMS
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(teamUrl)}`} target="_blank" rel="noreferrer">
                  <Facebook className="h-4 w-4 mr-1" /> Facebook
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(teamUrl)}`} target="_blank" rel="noreferrer">
                  <Linkedin className="h-4 w-4 mr-1" /> LinkedIn
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <TeeventsFooter tournament={tournament as any} />
    </div>
  );
}
