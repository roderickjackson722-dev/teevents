import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Printer, Loader2, Car, List, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface Tournament {
  id: string;
  title: string;
  site_logo_url: string | null;
}

interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  group_number: number | null;
  group_position: number | null;
}

const Printables = () => {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHole, setEditingHole] = useState<{ id: string; value: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, site_logo_url")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setTournaments(list);
        if (list.length > 0) setSelectedTournament(list[0].id);
        setLoading(false);
      });
  }, [org]);

  useEffect(() => {
    if (!selectedTournament) return;
    setLoading(true);
    const t = tournaments.find((t) => t.id === selectedTournament) || null;
    setTournament(t);
    supabase
      .from("tournament_registrations")
      .select("id, first_name, last_name, email, group_number, group_position")
      .eq("tournament_id", selectedTournament)
      .order("last_name", { ascending: true })
      .then(({ data }) => {
        setRegistrations(data || []);
        setLoading(false);
      });
  }, [selectedTournament, tournaments]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print - ${tournament?.title || "Tournament"}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Georgia', serif; color: #1a1a1a; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${printRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const handleUpdateHole = async (regId: string, newGroup: number | null) => {
    await supabase
      .from("tournament_registrations")
      .update({ group_number: newGroup })
      .eq("id", regId);
    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, group_number: newGroup } : r))
    );
    setEditingHole(null);
  };

  const alphaList = [...registrations].sort((a, b) =>
    a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
  );

  const holeGroups = registrations.reduce((acc, r) => {
    const hole = r.group_number ?? 0;
    if (!acc[hole]) acc[hole] = [];
    acc[hole].push(r);
    return acc;
  }, {} as Record<number, Registration[]>);
  const sortedHoles = Object.keys(holeGroups)
    .map(Number)
    .sort((a, b) => a - b);

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
          <p className="text-muted-foreground mt-1">
            Generate print-ready materials for your tournament.
          </p>
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

      <Tabs defaultValue="cart-signs">
        <TabsList className="mb-6">
          <TabsTrigger value="cart-signs" className="gap-2">
            <Car className="h-4 w-4" /> Cart Signs
          </TabsTrigger>
          <TabsTrigger value="alpha-list" className="gap-2">
            <List className="h-4 w-4" /> Alpha List
          </TabsTrigger>
          <TabsTrigger value="hole-assignments" className="gap-2">
            <MapPin className="h-4 w-4" /> Hole Assignments
          </TabsTrigger>
        </TabsList>

        {/* ===== CART SIGNS ===== */}
        <TabsContent value="cart-signs">
          <div className="flex justify-end mb-4">
            <Button onClick={handlePrint} disabled={registrations.length === 0}>
              <Printer className="h-4 w-4 mr-2" /> Print Cart Signs
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-muted-foreground">No registered players yet.</p>
            </div>
          ) : (
            <>
              {/* On-screen preview */}
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                {registrations.map((r) => (
                  <CartSignPreview key={r.id} registration={r} tournament={tournament} />
                ))}
              </div>

              {/* Hidden print content */}
              <div className="hidden">
                <div ref={printRef}>
                  {registrations.map((r, i) => (
                    <div
                      key={r.id}
                      style={{
                        pageBreakAfter: i < registrations.length - 1 ? "always" : "auto",
                        width: "100%",
                        height: "5in",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #1a5c38",
                        borderRadius: "12px",
                        padding: "24px",
                        textAlign: "center",
                        position: "relative",
                      }}
                    >
                      {tournament?.site_logo_url && (
                        <img
                          src={tournament.site_logo_url}
                          alt=""
                          style={{ height: "60px", objectFit: "contain", marginBottom: "16px" }}
                        />
                      )}
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#666", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
                        {tournament?.title}
                      </div>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#1a1a1a", marginBottom: "12px" }}>
                        {r.first_name} {r.last_name}
                      </div>
                      {r.group_number != null && (
                        <div style={{ fontSize: "18px", color: "#1a5c38", fontWeight: "600" }}>
                          Starting Hole: {r.group_number}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== ALPHA LIST ===== */}
        <TabsContent value="alpha-list">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => {
                const content = `
                  <html><head><title>Alpha List - ${tournament?.title}</title>
                  <style>
                    body { font-family: Georgia, serif; padding: 40px; }
                    h1 { font-size: 22px; margin-bottom: 4px; }
                    p { color: #666; font-size: 13px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #ddd; font-size: 14px; }
                    th { background: #f5f5f5; font-weight: 700; }
                    @media print { body { padding: 20px; } }
                  </style></head><body>
                  <h1>${tournament?.title}</h1>
                  <p>Alphabetical Player List &bull; ${alphaList.length} Players</p>
                  <table><thead><tr><th>#</th><th>Last Name</th><th>First Name</th><th>Hole</th></tr></thead><tbody>
                  ${alphaList.map((r, i) => `<tr><td>${i + 1}</td><td>${r.last_name}</td><td>${r.first_name}</td><td>${r.group_number ?? "—"}</td></tr>`).join("")}
                  </tbody></table></body></html>`;
                const w = window.open("", "_blank");
                if (!w) return;
                w.document.write(content);
                w.document.close();
                w.focus();
                setTimeout(() => { w.print(); w.close(); }, 300);
              }}
              disabled={alphaList.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" /> Print Alpha List
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : alphaList.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-muted-foreground">No registered players yet.</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-foreground w-12">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Last Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">First Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground w-24">Hole</th>
                  </tr>
                </thead>
                <tbody>
                  {alphaList.map((r, i) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{r.last_name}</td>
                      <td className="px-4 py-3 text-foreground">{r.first_name}</td>
                      <td className="px-4 py-3 text-foreground">{r.group_number ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ===== HOLE ASSIGNMENTS ===== */}
        <TabsContent value="hole-assignments">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => {
                const content = `
                  <html><head><title>Hole Assignments - ${tournament?.title}</title>
                  <style>
                    body { font-family: Georgia, serif; padding: 40px; }
                    h1 { font-size: 22px; margin-bottom: 4px; }
                    p { color: #666; font-size: 13px; margin-bottom: 24px; }
                    .hole { margin-bottom: 20px; }
                    .hole-title { font-size: 16px; font-weight: 700; padding: 6px 12px; background: #f0f0f0; border-radius: 4px; margin-bottom: 4px; }
                    .player { padding: 6px 12px; font-size: 14px; border-bottom: 1px solid #eee; }
                    @media print { body { padding: 20px; } }
                  </style></head><body>
                  <h1>${tournament?.title}</h1>
                  <p>Hole Assignments</p>
                  ${sortedHoles.map((hole) => `
                    <div class="hole">
                      <div class="hole-title">${hole === 0 ? "Unassigned" : `Hole ${hole}`}</div>
                      ${holeGroups[hole].map((r) => `<div class="player">${r.last_name}, ${r.first_name}</div>`).join("")}
                    </div>
                  `).join("")}
                  </body></html>`;
                const w = window.open("", "_blank");
                if (!w) return;
                w.document.write(content);
                w.document.close();
                w.focus();
                setTimeout(() => { w.print(); w.close(); }, 300);
              }}
              disabled={registrations.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" /> Print Hole Assignments
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-muted-foreground">No registered players yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedHoles.map((hole) => (
                <motion.div
                  key={hole}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-display font-bold text-foreground">
                      {hole === 0 ? "Unassigned" : `Hole ${hole}`}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {holeGroups[hole].length} player{holeGroups[hole].length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="bg-card rounded-lg border border-border divide-y divide-border">
                    {holeGroups[hole].map((r) => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                        <span className="text-sm font-medium text-foreground">
                          {r.last_name}, {r.first_name}
                        </span>
                        {editingHole?.id === r.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="w-20 h-8 text-sm"
                              value={editingHole.value}
                              onChange={(e) => setEditingHole({ id: r.id, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const v = editingHole.value ? parseInt(editingHole.value) : null;
                                  handleUpdateHole(r.id, v);
                                }
                                if (e.key === "Escape") setEditingHole(null);
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => {
                                const v = editingHole.value ? parseInt(editingHole.value) : null;
                                handleUpdateHole(r.id, v);
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingHole({ id: r.id, value: String(r.group_number ?? "") })}
                            className="text-xs text-primary hover:underline"
                          >
                            {r.group_number != null ? `Hole ${r.group_number}` : "Assign"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ---------- Cart Sign Preview Card ---------- */
function CartSignPreview({
  registration: r,
  tournament,
}: {
  registration: Registration;
  tournament: Tournament | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border-2 border-primary/30 rounded-xl p-6 flex flex-col items-center text-center gap-2"
    >
      {tournament?.site_logo_url && (
        <img src={tournament.site_logo_url} alt="" className="h-10 object-contain" />
      )}
      <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
        {tournament?.title}
      </p>
      <p className="text-xl font-display font-bold text-foreground">
        {r.first_name} {r.last_name}
      </p>
      {r.group_number != null && (
        <p className="text-sm font-semibold text-primary">
          Starting Hole: {r.group_number}
        </p>
      )}
    </motion.div>
  );
}

export default Printables;
