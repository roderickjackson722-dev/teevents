import { useState } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { Search, CheckCircle2, Users, Download } from "lucide-react";
import { toast } from "sonner";

export default function CheckIn() {
  const { org, loading: orgLoading } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState("");
  const [search, setSearch] = useState("");
  const [showQR, setShowQR] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [qrLayout, setQrLayout] = useState<"spaced" | "compact">("spaced");

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, slug")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!org,
  });

  const currentTournament = tournaments?.find((t: any) => t.id === selectedTournament) as { id: string; title: string; slug: string | null } | undefined;

  const { data: players } = useQuery({
    queryKey: ["checkin-players", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, email, phone, checked_in, check_in_time, group_number, scoring_code")
        .eq("tournament_id", selectedTournament)
        .order("last_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTournament,
  });

  const playerDayOfUrl = (scoring_code: string | null) => {
    const slug = currentTournament?.slug;
    if (!slug || !scoring_code) return "";
    return `${window.location.origin}/day-of/${slug}/${scoring_code}`;
  };

  const handleCheckIn = async (playerId: string, playerName: string) => {
    if (demoGuard()) return;
    if (pendingId) return; // prevent double-clicks racing
    setPendingId(playerId);
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ checked_in: true, check_in_time: new Date().toISOString() })
      .eq("id", playerId);
    setPendingId(null);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${playerName} checked in successfully.`);
      queryClient.invalidateQueries({ queryKey: ["checkin-players", selectedTournament] });
    }
  };

  const handleUndoCheckIn = async (playerId: string, playerName: string) => {
    if (demoGuard()) return;
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ checked_in: false, check_in_time: null })
      .eq("id", playerId);
    if (!error) {
      toast(`${playerName} check-in undone.`);
      queryClient.invalidateQueries({ queryKey: ["checkin-players", selectedTournament] });
    }
  };

  const handleDownloadQRCodes = () => {
    if (!players || !currentTournament?.slug) {
      toast.error("Tournament slug not set – cannot generate QR sheet.");
      return;
    }
    const compact = qrLayout === "compact";
    const cols = compact ? 3 : 2;
    const gap = compact ? "0.5rem" : "1.5rem";
    const qrSize = compact ? 130 : 180;
    const origin = window.location.origin;
    const slug = currentTournament.slug;

    const html = `<!DOCTYPE html><html><head><title>QR Codes – ${escapeAttr(currentTournament.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 1rem; color: #111; }
  h1 { font-size: 16px; margin: 0 0 0.5rem; }
  .meta { font-size: 11px; color: #666; margin-bottom: 1rem; }
  .qr-code-sheet {
    display: grid;
    grid-template-columns: repeat(${cols}, 1fr);
    gap: ${gap};
    padding: 0.25rem;
  }
  .qr-code-item {
    text-align: center;
    padding: ${compact ? "8px" : "16px"};
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .qr-code-item img { width: ${qrSize}px; height: ${qrSize}px; display: block; margin: 0 auto; }
  .name { font-weight: bold; margin-top: 8px; font-size: ${compact ? "12px" : "14px"}; }
  .meta-row { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .code { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #9ca3af; margin-top: 2px; }
  @media print {
    @page { margin: 0.5in; }
    body { padding: 0; }
    .no-print { display: none; }
    .qr-code-sheet { gap: ${gap}; }
    .qr-code-item { break-inside: avoid; page-break-inside: avoid; }
  }
  .toolbar { margin-bottom: 1rem; }
  .toolbar button { padding: 6px 12px; border: 1px solid #1a5c38; background: #1a5c38; color: #fff; border-radius: 6px; cursor: pointer; }
</style></head><body>
  <div class="no-print toolbar"><button onclick="window.print()">Print this sheet</button></div>
  <h1>${escapeAttr(currentTournament.title)} – Day-of QR Codes</h1>
  <div class="meta">Each player scans their QR to open their personalized Day-of Event Page. Layout: ${compact ? "Compact" : "Spaced (recommended)"}.</div>
  <div class="qr-code-sheet">
    ${players.map((p) => {
      const code = (p as any).scoring_code || "";
      const link = code ? `${origin}/day-of/${slug}/${code}` : `${origin}/day-of/${slug}/DEMO`;
      const groupText = p.group_number ? `Hole #${p.group_number}` : "";
      return `<div class="qr-code-item">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(link)}" alt="QR" />
        <div class="name">${escapeAttr(p.first_name)} ${escapeAttr(p.last_name)}</div>
        ${groupText ? `<div class="meta-row">${groupText}</div>` : ""}
        <div class="code">${escapeAttr(code || "no-code")}</div>
      </div>`;
    }).join("")}
  </div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const escapeAttr = (s: string) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

  const filtered = players?.filter((p) => {
    const q = search.toLowerCase();
    return p.first_name.toLowerCase().includes(q) || p.last_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  const checkedInCount = players?.filter((p) => p.checked_in).length || 0;
  const totalCount = players?.length || 0;

  if (orgLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check-In (QR Code & Manual)</h1>
        <p className="text-muted-foreground">
          Players can scan their unique QR code, or staff can check in manually from the list below.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a tournament" />
          </SelectTrigger>
          <SelectContent>
            {tournaments?.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTournament && players && players.length > 0 && (
          <>
            <Select value={qrLayout} onValueChange={(v) => setQrLayout(v as "spaced" | "compact")}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spaced">Spaced layout (easier scanning)</SelectItem>
                <SelectItem value="compact">Compact layout (more per page)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleDownloadQRCodes}>
              <Download className="mr-2 h-4 w-4" /> Print QR Codes
            </Button>
          </>
        )}
      </div>

      {selectedTournament && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{checkedInCount}/{totalCount}</p>
                  <p className="text-xs text-muted-foreground">Checked In</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players..."
              className="pl-9 max-w-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered?.map((p) => {
              const fullName = `${p.first_name} ${p.last_name}`;
              return (
                <Card key={p.id} className={p.checked_in ? "border-primary/30 bg-primary/5" : ""}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{fullName}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                        {p.group_number && (
                          <Badge variant="outline" className="mt-1 text-xs">Hole #{p.group_number}</Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {p.checked_in ? (
                          <>
                            <Badge className="bg-primary/10 text-primary">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Checked In
                            </Badge>
                            <button
                              onClick={() => handleUndoCheckIn(p.id, fullName)}
                              className="text-xs text-muted-foreground hover:text-destructive"
                            >
                              Undo
                            </button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            disabled={pendingId === p.id}
                            onClick={() => handleCheckIn(p.id, fullName)}
                          >
                            {pendingId === p.id ? "..." : "Check In"}
                          </Button>
                        )}
                      </div>
                    </div>
                    {showQR === p.id && (
                      <div className="mt-3 flex justify-center">
                        <QRCodeSVG value={p.id} size={120} />
                      </div>
                    )}
                    <button
                      onClick={() => setShowQR(showQR === p.id ? null : p.id)}
                      className="text-xs text-primary mt-2 hover:underline"
                    >
                      {showQR === p.id ? "Hide QR" : "Show QR Code"}
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <SideEventCheckIn tournamentId={selectedTournament} />
        </>
      )}
    </div>
  );
}

function SideEventCheckIn({ tournamentId }: { tournamentId: string }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");

  const { data: events } = useQuery({
    queryKey: ["se-checkin-events", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("side_events")
        .select("id, name")
        .eq("tournament_id", tournamentId);
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  const { data: tickets } = useQuery({
    queryKey: ["se-checkin-tickets", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("side_event_tickets")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("payment_status", "paid")
        .order("attendee_name");
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  const checkInById = async (id: string) => {
    const { error } = await supabase
      .from("side_event_tickets")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Ticket checked in");
      queryClient.invalidateQueries({ queryKey: ["se-checkin-tickets", tournamentId] });
    }
  };

  const checkInByCode = async () => {
    if (!code.trim()) return;
    const upper = code.trim().toUpperCase();
    const match = tickets?.find((t: any) => t.ticket_code === upper);
    if (!match) {
      toast.error("Ticket code not found");
      return;
    }
    if ((match as any).checked_in_at) {
      toast(`${(match as any).attendee_name} already checked in`);
      return;
    }
    await checkInById((match as any).id);
    setCode("");
  };

  if (!events?.length) return null;

  const checkedIn = tickets?.filter((t: any) => t.checked_in_at).length || 0;
  const total = tickets?.length || 0;

  return (
    <div className="space-y-4 mt-8">
      <div>
        <h2 className="text-xl font-bold">Side Event Check-In</h2>
        <p className="text-sm text-muted-foreground">
          {checkedIn}/{total} attendees checked in (paid tickets only)
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex gap-2">
          <Input
            placeholder="Enter ticket code (e.g. AB12CD34)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkInByCode()}
            className="font-mono"
          />
          <Button onClick={checkInByCode}>Check In</Button>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        {tickets?.map((t: any) => {
          const ev = events.find((e) => e.id === t.side_event_id);
          return (
            <div key={t.id} className={`border rounded-lg p-3 flex justify-between items-center ${t.checked_in_at ? "bg-primary/5 border-primary/30" : ""}`}>
              <div>
                <div className="font-semibold">{t.attendee_name}</div>
                <div className="text-xs text-muted-foreground">{ev?.name} · {t.quantity}× · <span className="font-mono">{t.ticket_code}</span></div>
              </div>
              {t.checked_in_at ? (
                <Badge variant="outline">✓ In</Badge>
              ) : (
                <Button size="sm" onClick={() => checkInById(t.id)}>Check In</Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

