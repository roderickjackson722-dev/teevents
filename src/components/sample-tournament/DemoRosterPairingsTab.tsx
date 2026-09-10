import { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GripVertical, Users, Shuffle, RotateCcw, Flag } from "lucide-react";
import { samplePlayers } from "./sampleDashboardData";

export type DemoRosterPlayer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  handicap?: number | null;
  shirt_size?: string | null;
  dietary?: string | null;
  status?: string | null;
};

const HOLE_COUNT = 12;
const MAX_GROUP_SIZE = 4;

function defaultPlayers(): DemoRosterPlayer[] {
  return samplePlayers.map((p, i) => ({
    id: `demo-player-${i}`,
    name: `${p.first_name} ${p.last_name}`,
    email: p.email,
    phone: p.phone,
    handicap: p.handicap,
    shirt_size: p.shirt_size,
    dietary: p.dietary,
    status: p.status,
  }));
}

/** Roster + drag-and-drop pairings, driven entirely by local state (demo only). */
export default function DemoRosterPairingsTab({ players }: { players?: DemoRosterPlayer[] }) {
  const roster = useMemo(
    () => (players && players.length > 0 ? players : defaultPlayers()),
    [players],
  );

  const seed = useMemo(() => {
    const holes: Record<number, string[]> = {};
    for (let h = 1; h <= HOLE_COUNT; h++) holes[h] = [];
    // Pre-fill the first few holes so the demo looks like a real, in-progress pairing sheet
    const preAssigned = roster.slice(0, Math.min(roster.length, 8));
    preAssigned.forEach((p, i) => {
      const hole = Math.floor(i / MAX_GROUP_SIZE) + 1;
      holes[hole].push(p.id);
    });
    return { holes, unassigned: roster.slice(preAssigned.length).map((p) => p.id) };
  }, [roster]);

  const [holes, setHoles] = useState<Record<number, string[]>>(seed.holes);
  const [unassigned, setUnassigned] = useState<string[]>(seed.unassigned);

  const byId = useMemo(() => {
    const m = new Map<string, DemoRosterPlayer>();
    roster.forEach((p) => m.set(p.id, p));
    return m;
  }, [roster]);

  const assignedCount = Object.values(holes).reduce((s, ids) => s + ids.length, 0);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const nextHoles: Record<number, string[]> = {};
    Object.entries(holes).forEach(([k, v]) => { nextHoles[Number(k)] = [...v]; });
    let nextUnassigned = [...unassigned];

    // Remove from source
    if (source.droppableId === "unassigned") {
      nextUnassigned.splice(source.index, 1);
    } else {
      const h = Number(source.droppableId.replace("hole-", ""));
      nextHoles[h].splice(source.index, 1);
    }

    // Insert into destination
    if (destination.droppableId === "unassigned") {
      nextUnassigned.splice(destination.index, 0, draggableId);
    } else {
      const h = Number(destination.droppableId.replace("hole-", ""));
      if (nextHoles[h].length >= MAX_GROUP_SIZE) return; // foursome is full
      nextHoles[h].splice(destination.index, 0, draggableId);
    }

    setHoles(nextHoles);
    setUnassigned(nextUnassigned);
  };

  const autoAssign = () => {
    const nextHoles: Record<number, string[]> = {};
    for (let h = 1; h <= HOLE_COUNT; h++) nextHoles[h] = [];
    roster.forEach((p, i) => {
      const hole = Math.floor(i / MAX_GROUP_SIZE) + 1;
      if (nextHoles[hole]) nextHoles[hole].push(p.id);
    });
    setHoles(nextHoles);
    setUnassigned([]);
  };

  const clearAll = () => {
    const nextHoles: Record<number, string[]> = {};
    for (let h = 1; h <= HOLE_COUNT; h++) nextHoles[h] = [];
    setHoles(nextHoles);
    setUnassigned(roster.map((p) => p.id));
  };

  const PlayerChip = ({ id, index }: { id: string; index: number }) => {
    const p = byId.get(id);
    if (!p) return null;
    return (
      <Draggable draggableId={id} index={index}>
        {(prov, snapshot) => (
          <div
            ref={prov.innerRef}
            {...prov.draggableProps}
            {...prov.dragHandleProps}
            className={`flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm ${
              snapshot.isDragging ? "border-primary shadow-lg" : "border-border"
            }`}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground truncate">{p.name}</span>
            {p.handicap != null && (
              <Badge variant="outline" className="ml-auto text-[10px]">HCP {p.handicap}</Badge>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roster" className="gap-1.5">
            <Users className="h-4 w-4" /> Player Roster
          </TabsTrigger>
          <TabsTrigger value="pairings" className="gap-1.5">
            <Flag className="h-4 w-4" /> Pairings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Registered Players</CardTitle>
              <Badge variant="outline">{roster.length} players</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {["Name", "Email", "Phone", "Handicap", "Shirt", "Dietary", "Status"].map((h) => (
                        <th key={h} className="text-left p-3 text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3 font-medium text-foreground whitespace-nowrap">{p.name}</td>
                        <td className="p-3 text-xs text-muted-foreground">{p.email || "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground">{p.phone || "—"}</td>
                        <td className="p-3 text-center">{p.handicap ?? "—"}</td>
                        <td className="p-3 text-xs">{p.shirt_size || "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground">{p.dietary || "None"}</td>
                        <td className="p-3">
                          <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                            {p.status || "Paid"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pairings">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Drag players between holes to build foursomes — {assignedCount} of {roster.length} assigned.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={autoAssign}>
                <Shuffle className="h-3.5 w-3.5 mr-1" /> Auto-assign
              </Button>
              <Button size="sm" variant="ghost" onClick={clearAll}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Unassigned ({unassigned.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Droppable droppableId="unassigned">
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.droppableProps}
                        className={`min-h-[120px] space-y-2 rounded-md p-2 transition-colors ${
                          snap.isDraggingOver ? "bg-primary/10" : "bg-muted/30"
                        }`}
                      >
                        {unassigned.map((id, i) => <PlayerChip key={id} id={id} index={i} />)}
                        {unassigned.length === 0 && (
                          <p className="text-xs text-muted-foreground p-2">Everyone is paired.</p>
                        )}
                        {prov.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Object.keys(holes).map((k) => {
                  const hole = Number(k);
                  const ids = holes[hole];
                  const full = ids.length >= MAX_GROUP_SIZE;
                  return (
                    <Card key={hole}>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm">Hole {hole}</CardTitle>
                        <Badge variant={full ? "default" : "outline"} className="text-[10px]">
                          {ids.length}/{MAX_GROUP_SIZE}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <Droppable droppableId={`hole-${hole}`}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.droppableProps}
                              className={`min-h-[104px] space-y-2 rounded-md p-2 transition-colors ${
                                snap.isDraggingOver ? "bg-primary/10" : "bg-muted/30"
                              }`}
                            >
                              {ids.map((id, i) => <PlayerChip key={id} id={id} index={i} />)}
                              {ids.length === 0 && (
                                <p className="text-xs text-muted-foreground p-2">Drop players here</p>
                              )}
                              {prov.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </DragDropContext>
        </TabsContent>
      </Tabs>
    </div>
  );
}
