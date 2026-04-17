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

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!org,
  });

  const { data: players } = useQuery({
    queryKey: ["checkin-players", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, email, phone, checked_in, check_in_time, group_number")
        .eq("tournament_id", selectedTournament)
        .order("last_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTournament,
  });

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
    if (!players) return;
    const html = `<html><head><title>QR Codes</title><style>
      body { font-family: sans-serif; }
      .card { display: inline-block; text-align: center; padding: 20px; margin: 10px; border: 1px solid #ddd; border-radius: 8px; }
      .name { font-weight: bold; margin-top: 8px; }
    </style></head><body>
      <h1>Tournament Check-In QR Codes</h1>
      ${players.map((p) => `<div class="card">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${p.id}" />
        <div class="name">${p.first_name} ${p.last_name}</div>
        <div style="font-size:10px;color:#999">${p.id.slice(0, 8)}</div>
      </div>`).join("")}
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

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
          <Button variant="outline" size="sm" onClick={handleDownloadQRCodes}>
            <Download className="mr-2 h-4 w-4" /> Print QR Codes
          </Button>
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
        </>
      )}
    </div>
  );
}
