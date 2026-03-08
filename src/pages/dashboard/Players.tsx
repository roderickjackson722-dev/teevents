import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Trophy,
  Loader2,
  Search,
  GripVertical,
  UserPlus,
  Download,
  Trash2,
  Plus,
  QrCode,
  Pencil,
  Check,
  X,
} from "lucide-react";
import PlayerImport from "@/components/PlayerImport";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  handicap: number | null;
  shirt_size: string | null;
  payment_status: string;
  group_number: number | null;
  group_position: number | null;
  created_at: string;
  scoring_code: string | null;
}

interface Tournament {
  id: string;
  title: string;
  max_players: number | null;
}

const Players = () => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [players, setPlayers] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"roster" | "pairings">("roster");
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    handicap: "",
    shirt_size: "",
    payment_status: "paid",
  });
  const [emptyGroups, setEmptyGroups] = useState<number[]>([]);
  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, max_players")
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
    supabase
      .from("tournament_registrations")
      .select("*")
      .eq("tournament_id", selectedTournament)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setPlayers((data as Registration[]) || []);
        setLoading(false);
      });
  }, [selectedTournament]);

  const filteredPlayers = players.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  });

  const handleDeletePlayer = async (id: string) => {
    const { error } = await supabase.from("tournament_registrations").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Player removed" });
    }
  };

  const handleExportCSV = () => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Handicap", "Shirt Size", "Group", "Payment"];
    const rows = players.map((p) => [
      p.first_name,
      p.last_name,
      p.email,
      p.phone || "",
      p.handicap?.toString() || "",
      p.shirt_size || "",
      p.group_number?.toString() || "Unassigned",
      p.payment_status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "players.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddPlayer = async () => {
    if (!selectedTournament || !newPlayer.first_name.trim() || !newPlayer.last_name.trim() || !newPlayer.email.trim()) {
      toast({ title: "Missing fields", description: "First name, last name, and email are required.", variant: "destructive" });
      return;
    }
    setAddingPlayer(true);
    const { data, error } = await supabase.from("tournament_registrations").insert({
      tournament_id: selectedTournament,
      first_name: newPlayer.first_name.trim(),
      last_name: newPlayer.last_name.trim(),
      email: newPlayer.email.trim().toLowerCase(),
      phone: newPlayer.phone.trim() || null,
      handicap: newPlayer.handicap ? parseInt(newPlayer.handicap) : null,
      shirt_size: newPlayer.shirt_size || null,
      payment_status: newPlayer.payment_status,
    }).select("*").single();
    setAddingPlayer(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setPlayers((prev) => [...prev, data as Registration]);
      setNewPlayer({ first_name: "", last_name: "", email: "", phone: "", handicap: "", shirt_size: "", payment_status: "paid" });
      setAddPlayerOpen(false);
      toast({ title: "Player added", description: `${data.first_name} ${data.last_name} has been added.` });
    }
  };


  const maxGroupSize = 4;
  const unassigned = players.filter((p) => p.group_number === null);
  const groupNumbers = [...new Set(players.filter((p) => p.group_number !== null).map((p) => p.group_number!))].sort((a, b) => a - b);
  const groupsFromPlayers = groupNumbers.map((num) => ({
    number: num,
    players: players
      .filter((p) => p.group_number === num)
      .sort((a, b) => (a.group_position || 0) - (b.group_position || 0)),
  }));

  // Merge empty groups that have no players yet
  const allGroupNumbers = [...new Set([...groupNumbers, ...emptyGroups])].sort((a, b) => a - b);
  const groups = allGroupNumbers.map((num) => {
    const existing = groupsFromPlayers.find((g) => g.number === num);
    return existing || { number: num, players: [] };
  });

  const nextGroupNumber = allGroupNumbers.length > 0 ? Math.max(...allGroupNumbers) + 1 : 1;

  const handleAddGroup = () => {
    setEmptyGroups((prev) => [...prev, nextGroupNumber]);
    toast({ title: `Group ${nextGroupNumber} created` });
  };

  const handleAssignPlayer = async (playerId: string, groupNum: number, position: number) => {
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ group_number: groupNum, group_position: position })
      .eq("id", playerId);

    if (!error) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, group_number: groupNum, group_position: position } : p
        )
      );
    }
  };

  const handleUnassignPlayer = async (playerId: string) => {
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ group_number: null, group_position: null })
      .eq("id", playerId);

    if (!error) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, group_number: null, group_position: null } : p
        )
      );
    }
  };

  const handleAutoAssign = async () => {
    const unassignedPlayers = players.filter((p) => p.group_number === null);
    if (unassignedPlayers.length === 0) return;

    let currentGroup = nextGroupNumber;
    let positionInGroup = 1;

    // Fill existing groups first
    const updates: { id: string; group_number: number; group_position: number }[] = [];
    let idx = 0;

    for (const group of groups) {
      while (group.players.length + (updates.filter((u) => u.group_number === group.number).length) < maxGroupSize && idx < unassignedPlayers.length) {
        const pos = group.players.length + updates.filter((u) => u.group_number === group.number).length + 1;
        updates.push({ id: unassignedPlayers[idx].id, group_number: group.number, group_position: pos });
        idx++;
      }
    }

    // Remaining into new groups
    while (idx < unassignedPlayers.length) {
      updates.push({ id: unassignedPlayers[idx].id, group_number: currentGroup, group_position: positionInGroup });
      positionInGroup++;
      if (positionInGroup > maxGroupSize) {
        positionInGroup = 1;
        currentGroup++;
      }
      idx++;
    }

    // Batch update
    for (const update of updates) {
      await supabase
        .from("tournament_registrations")
        .update({ group_number: update.group_number, group_position: update.group_position })
        .eq("id", update.id);
    }

    setPlayers((prev) =>
      prev.map((p) => {
        const u = updates.find((u) => u.id === p.id);
        return u ? { ...p, group_number: u.group_number, group_position: u.group_position } : p;
      })
    );

    toast({ title: "Auto-assigned!", description: `${updates.length} players assigned to groups.` });
  };

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    if (sourceId === destId && source.index === destination.index) return;

    // Parse destination group
    let destGroupNum: number | null = null;
    if (destId === "unassigned") {
      destGroupNum = null;
    } else {
      destGroupNum = parseInt(destId.replace("group-", ""));
    }

    // Check group size limit
    if (destGroupNum !== null) {
      const destGroup = groups.find((g) => g.number === destGroupNum);
      const currentSize = destGroup ? destGroup.players.length : 0;
      const isMovingWithinSameGroup = sourceId === destId;
      if (!isMovingWithinSameGroup && currentSize >= maxGroupSize) {
        toast({ title: "Group is full", description: "Maximum 4 players per group.", variant: "destructive" });
        return;
      }
    }

    if (destGroupNum === null) {
      await handleUnassignPlayer(draggableId);
    } else {
      await handleAssignPlayer(draggableId, destGroupNum, destination.index + 1);
    }
  };

  const paymentColors: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    paid: "bg-primary/10 text-primary",
    refunded: "bg-destructive/10 text-destructive",
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
        <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-display font-bold text-foreground mb-2">No tournaments yet</h3>
        <p className="text-muted-foreground">Create a tournament first to manage players.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Players & Pairings</h1>
          <p className="text-muted-foreground mt-1">
            {players.length} registered player{players.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-[240px] bg-card">
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
      </div>

      {/* View Toggle + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 bg-card rounded-lg border border-border p-1">
          <button
            onClick={() => setView("roster")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === "roster" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4 inline mr-1.5" />
            Roster
          </button>
          <button
            onClick={() => setView("pairings")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === "pairings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GripVertical className="h-4 w-4 inline mr-1.5" />
            Pairings
          </button>
        </div>
        <div className="flex items-center gap-3">
          {view === "roster" && (
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search players..."
                className="pl-9 w-[200px] bg-card"
              />
            </div>
          )}
          {selectedTournament && (
            <PlayerImport
              tournamentId={selectedTournament}
              onImported={() => {
                supabase
                  .from("tournament_registrations")
                  .select("*")
                  .eq("tournament_id", selectedTournament)
                  .order("created_at", { ascending: true })
                  .then(({ data }) => setPlayers((data as Registration[]) || []));
              }}
            />
          )}
          <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Player Manually</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ap-first">First Name *</Label>
                    <Input id="ap-first" value={newPlayer.first_name} onChange={(e) => setNewPlayer((p) => ({ ...p, first_name: e.target.value }))} placeholder="John" />
                  </div>
                  <div>
                    <Label htmlFor="ap-last">Last Name *</Label>
                    <Input id="ap-last" value={newPlayer.last_name} onChange={(e) => setNewPlayer((p) => ({ ...p, last_name: e.target.value }))} placeholder="Smith" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ap-email">Email *</Label>
                  <Input id="ap-email" type="email" value={newPlayer.email} onChange={(e) => setNewPlayer((p) => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ap-phone">Phone</Label>
                    <Input id="ap-phone" value={newPlayer.phone} onChange={(e) => setNewPlayer((p) => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <Label htmlFor="ap-hcp">Handicap</Label>
                    <Input id="ap-hcp" type="number" value={newPlayer.handicap} onChange={(e) => setNewPlayer((p) => ({ ...p, handicap: e.target.value }))} placeholder="12" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ap-shirt">Shirt Size</Label>
                    <Select value={newPlayer.shirt_size} onValueChange={(v) => setNewPlayer((p) => ({ ...p, shirt_size: v }))}>
                      <SelectTrigger id="ap-shirt"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["S", "M", "L", "XL", "XXL"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ap-payment">Payment Status</Label>
                    <Select value={newPlayer.payment_status} onValueChange={(v) => setNewPlayer((p) => ({ ...p, payment_status: v }))}>
                      <SelectTrigger id="ap-payment"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="comp">Comp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleAddPlayer} disabled={addingPlayer} className="w-full">
                  {addingPlayer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Add Player
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-lg border border-border">
          <UserPlus className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold text-foreground mb-2">No registrations yet</h3>
          <p className="text-muted-foreground mb-4">
            Players will appear here once they register, or you can add them manually.
          </p>
          <Button onClick={() => setAddPlayerOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add First Player
          </Button>
        </div>
      ) : view === "roster" ? (
        /* Roster View */
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-semibold px-4 py-3">Name</th>
                  <th className="text-left font-semibold px-4 py-3">Email</th>
                  <th className="text-left font-semibold px-4 py-3">Phone</th>
                  <th className="text-center font-semibold px-4 py-3">HCP</th>
                  <th className="text-center font-semibold px-4 py-3">Shirt</th>
                  <th className="text-center font-semibold px-4 py-3">Group</th>
                  <th className="text-center font-semibold px-4 py-3">Payment</th>
                  <th className="text-center font-semibold px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone || "—"}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {p.handicap !== null ? p.handicap : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{p.shirt_size || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {p.group_number ? (
                        <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                          #{p.group_number}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${paymentColors[p.payment_status] || paymentColors.pending}`}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Player</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {p.first_name} {p.last_name} from this tournament? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePlayer(p.id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Pairings View */
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Button onClick={handleAutoAssign} variant="outline" size="sm">
              Auto-Assign All
            </Button>
            <Button onClick={handleAddGroup} variant="outline" size="sm">
              New Group
            </Button>
            <span className="text-sm text-muted-foreground ml-auto">
              Drag and drop players between groups
            </span>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Unassigned */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Unassigned ({unassigned.length})
                </h3>
                <Droppable droppableId="unassigned">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`bg-card rounded-lg border-2 border-dashed min-h-[80px] p-3 space-y-2 transition-colors ${
                        snapshot.isDraggingOver ? "border-secondary bg-secondary/5" : "border-border"
                      }`}
                    >
                      {unassigned.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          All players assigned!
                        </p>
                      )}
                      {unassigned.map((p, index) => (
                        <Draggable key={p.id} draggableId={p.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center gap-3 bg-background rounded-md border border-border px-3 py-2 text-sm ${
                                snapshot.isDragging ? "shadow-lg ring-2 ring-secondary" : ""
                              }`}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-foreground">
                                {p.first_name} {p.last_name}
                              </span>
                              {p.handicap !== null && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  HCP {p.handicap}
                                </span>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Groups */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Groups ({groups.length})
                </h3>
                {groups.map((group) => (
                  <div key={group.number}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-foreground">
                        Group {group.number}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {group.players.length}/{maxGroupSize}
                      </span>
                    </div>
                    <Droppable droppableId={`group-${group.number}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`bg-card rounded-lg border-2 min-h-[60px] p-3 space-y-2 transition-colors ${
                            snapshot.isDraggingOver
                              ? "border-secondary bg-secondary/5"
                              : "border-border"
                          }`}
                        >
                          {group.players.map((p, index) => (
                            <Draggable key={p.id} draggableId={p.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex items-center gap-3 bg-background rounded-md border border-border px-3 py-2 text-sm ${
                                    snapshot.isDragging ? "shadow-lg ring-2 ring-secondary" : ""
                                  }`}
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium text-foreground">
                                    {p.first_name} {p.last_name}
                                  </span>
                                  {p.handicap !== null && (
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      HCP {p.handicap}
                                    </span>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
                {groups.length === 0 && (
                  <div className="text-center py-8 bg-card rounded-lg border border-dashed border-border">
                    <p className="text-sm text-muted-foreground">
                      No groups yet. Click "Auto-Assign All" or "New Group" to start.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DragDropContext>
        </div>
      )}
    </div>
  );
};

export default Players;
