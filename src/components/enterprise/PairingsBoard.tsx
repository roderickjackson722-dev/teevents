import { useMemo } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GripVertical, Plus, Shuffle, Users } from "lucide-react";

export interface PairingPlayer {
  id: string;
  name: string;
  handicap: number | null;
}

export interface PairingGroup {
  /** group slot number */
  number: number;
  /** hole label such as "1", "1A" */
  hole: string;
  playerIds: string[];
}

interface Props {
  players: PairingPlayer[];
  groups: PairingGroup[];
  unassigned: string[];
  playersPerPairing: number;
  onChange: (groups: PairingGroup[], unassigned: string[]) => void;
  onAutoAssign: (mode: "handicap" | "random") => void;
  onAddGroup: () => void;
  onHoleChange: (groupNumber: number, hole: string) => void;
}

/**
 * Drag-and-drop pairings board. Each column is one starting-hole slot; the
 * left column holds players who are not in a group yet.
 */
export default function PairingsBoard({
  players,
  groups,
  unassigned,
  playersPerPairing,
  onChange,
  onAutoAssign,
  onAddGroup,
  onHoleChange,
}: Props) {
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const nextGroups = groups.map((g) => ({ ...g, playerIds: [...g.playerIds] }));
    let nextUnassigned = [...unassigned];

    const take = (listId: string, index: number): string => {
      if (listId === "unassigned") return nextUnassigned.splice(index, 1)[0];
      const g = nextGroups.find((x) => String(x.number) === listId)!;
      return g.playerIds.splice(index, 1)[0];
    };
    const put = (listId: string, index: number, id: string) => {
      if (listId === "unassigned") nextUnassigned.splice(index, 0, id);
      else nextGroups.find((x) => String(x.number) === listId)!.playerIds.splice(index, 0, id);
    };

    const moved = take(source.droppableId, source.index);
    if (!moved) return;
    put(destination.droppableId, destination.index, moved);
    onChange(nextGroups, nextUnassigned);
  };

  const Chip = ({ id, index }: { id: string; index: number }) => {
    const p = byId.get(id);
    return (
      <Draggable draggableId={id} index={index}>
        {(prov, snap) => (
          <div
            ref={prov.innerRef}
            {...prov.draggableProps}
            {...prov.dragHandleProps}
            className={`mb-1.5 flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-sm ${
              snap.isDragging ? "shadow-lg" : ""
            }`}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{p?.name || "Player"}</span>
            {p?.handicap != null && (
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{p.handicap}</span>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onAutoAssign("handicap")}>
          <Users className="mr-1.5 h-4 w-4" /> Auto-Assign by Handicap
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAutoAssign("random")}>
          <Shuffle className="mr-1.5 h-4 w-4" /> Auto-Assign Randomly
        </Button>
        <Button variant="outline" size="sm" onClick={onAddGroup}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Empty Group
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="p-3 md:col-span-1">
            <p className="mb-2 text-sm font-semibold text-foreground">
              Unassigned <span className="text-muted-foreground">({unassigned.length})</span>
            </p>
            <Droppable droppableId="unassigned">
              {(prov) => (
                <div ref={prov.innerRef} {...prov.droppableProps} className="min-h-16 rounded-md bg-muted/40 p-2">
                  {unassigned.map((id, i) => <Chip key={id} id={id} index={i} />)}
                  {prov.placeholder}
                </div>
              )}
            </Droppable>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 md:col-span-3 lg:grid-cols-3">
            {groups.map((g) => (
              <Card key={g.number} className="p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Hole</span>
                  <input
                    value={g.hole}
                    onChange={(e) => onHoleChange(g.number, e.target.value)}
                    className="h-7 w-16 rounded-md border border-border bg-background px-2 text-sm"
                    aria-label={`Starting hole for group ${g.number}`}
                  />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {g.playerIds.length}/{playersPerPairing}
                  </span>
                </div>
                <Droppable droppableId={String(g.number)}>
                  {(prov) => (
                    <div ref={prov.innerRef} {...prov.droppableProps} className="min-h-16 rounded-md bg-muted/40 p-2">
                      {g.playerIds.map((id, i) => <Chip key={id} id={id} index={i} />)}
                      {prov.placeholder}
                    </div>
                  )}
                </Droppable>
              </Card>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
