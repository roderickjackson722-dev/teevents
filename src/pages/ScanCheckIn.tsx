import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Search, ScanLine, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  group_number: number | null;
  checked_in: boolean | null;
  check_in_time: string | null;
}

export default function ScanCheckIn() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<{ id: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState("");
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [lastCheckedIn, setLastCheckedIn] = useState<Player | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    Promise.all([
      supabase.from("tournaments").select("id, title").eq("id", tournamentId).single(),
      supabase.from("tournament_registrations")
        .select("id, first_name, last_name, email, group_number, checked_in, check_in_time")
        .eq("tournament_id", tournamentId)
        .order("last_name"),
    ]).then(([tRes, pRes]) => {
      setTournament(tRes.data);
      setPlayers((pRes.data as Player[]) || []);
      setLoading(false);
    });
  }, [tournamentId]);

  const handleScan = async () => {
    const id = scanInput.trim();
    if (!id) return;
    const player = players.find((p) => p.id === id);
    if (player) {
      if (player.checked_in) { toast.info(`${player.first_name} ${player.last_name} is already checked in.`); setScanInput(""); return; }
      const { error } = await supabase
        .from("tournament_registrations")
        .update({ checked_in: true, check_in_time: new Date().toISOString() })
        .eq("id", id);
      if (error) toast.error(error.message);
      else {
        const updated = { ...player, checked_in: true, check_in_time: new Date().toISOString() };
        setPlayers((prev) => prev.map((p) => (p.id === id ? updated : p)));
        setLastCheckedIn(updated);
        toast.success(`${player.first_name} ${player.last_name} checked in!`);
      }
      setScanInput("");
      return;
    }

    // Try vendor check-in (by code or vendor id)
    const { data, error } = await supabase.functions.invoke("vendor-check-in", {
      body: id.length === 6 ? { code: id, tournament_id: tournamentId } : { vendor_registration_id: id, tournament_id: tournamentId },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Not found — check the code");
    } else {
      const v = (data as any).vendor;
      if ((data as any).already) toast.info(`Vendor ${v.vendor_name} was already checked in.`);
      else toast.success(`Vendor ${v.vendor_name} checked in!`);
    }
    setScanInput("");
  };

  const handleManualCheckIn = async (player: Player) => {
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ checked_in: true, check_in_time: new Date().toISOString() })
      .eq("id", player.id);

    if (!error) {
      const updated = { ...player, checked_in: true, check_in_time: new Date().toISOString() };
      setPlayers((prev) => prev.map((p) => (p.id === player.id ? updated : p)));
      setLastCheckedIn(updated);
      toast.success(`${player.first_name} ${player.last_name} checked in!`);
    }
  };

  const checkedIn = players.filter((p) => p.checked_in).length;
  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    return p.first_name.toLowerCase().includes(q) || p.last_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Tournament not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{tournament.title}</h1>
          <p className="text-muted-foreground text-sm">QR Code Check-In Station</p>
          <div className="flex justify-center mt-2">
            <Badge variant="outline" className="text-sm">
              <Users className="h-3.5 w-3.5 mr-1" /> {checkedIn}/{players.length} Checked In
            </Badge>
          </div>
        </div>

        {/* Scan input - auto-focused for barcode scanner */}
        <Card>
          <CardContent className="pt-5">
            <label className="text-sm font-medium mb-2 block">Scan QR Code or Enter Player ID</label>
            <div className="flex gap-2">
              <Input
                autoFocus
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                placeholder="Scan or paste player ID..."
                className="font-mono"
              />
              <Button onClick={handleScan}>
                <ScanLine className="h-4 w-4 mr-1" /> Check In
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Last checked in feedback */}
        {lastCheckedIn && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold">{lastCheckedIn.first_name} {lastCheckedIn.last_name}</p>
                <p className="text-xs text-muted-foreground">
                  {lastCheckedIn.group_number ? `Group ${lastCheckedIn.group_number}` : "No group assigned"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>

        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id} className={p.checked_in ? "border-primary/20 bg-primary/5" : ""}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </div>
                {p.checked_in ? (
                  <Badge className="bg-primary/10 text-primary">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleManualCheckIn(p)}>
                    Check In
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
