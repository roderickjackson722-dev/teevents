import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical, Loader2, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  PUBLIC_TABS,
  PublicTabKey,
  normalizeOrder,
  normalizeVisibility,
} from "@/lib/publicTabs";

interface PublicTabsManagerProps {
  tournamentId: string;
  initialVisibility: Partial<Record<string, boolean>> | null | undefined;
  initialOrder: string[] | null | undefined;
}

export const PublicTabsManager = ({
  tournamentId,
  initialVisibility,
  initialOrder,
}: PublicTabsManagerProps) => {
  const { toast } = useToast();
  const [visibility, setVisibility] = useState<Record<PublicTabKey, boolean>>(
    normalizeVisibility(initialVisibility),
  );
  const [order, setOrder] = useState<PublicTabKey[]>(normalizeOrder(initialOrder));
  const [saving, setSaving] = useState(false);

  const tabMeta = (key: PublicTabKey) =>
    PUBLIC_TABS.find((t) => t.key === key) ?? PUBLIC_TABS[0];

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const next = Array.from(order);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setOrder(next);
  };

  const toggle = (key: PublicTabKey, value: boolean) => {
    setVisibility((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({
        public_tabs: visibility as any,
        public_tabs_order: order,
      } as any)
      .eq("id", tournamentId);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save tabs", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Public page tabs saved",
      description: "Your changes are live on the public tournament page.",
    });
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-card space-y-4">
      <div>
        <h3 className="text-base font-bold text-foreground">Public Page Tabs</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose which tabs appear on your public tournament page and drag to reorder them.
          Overview is always shown.
        </p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="public-tabs">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-2"
            >
              {order.map((key, index) => {
                const meta = tabMeta(key);
                const enabled = !!visibility[key];
                return (
                  <Draggable key={key} draggableId={key} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`flex items-center gap-3 rounded-md border bg-background px-3 py-2 transition-shadow ${
                          snapshot.isDragging
                            ? "border-primary shadow-md"
                            : "border-border"
                        }`}
                      >
                        <button
                          type="button"
                          {...dragProvided.dragHandleProps}
                          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
                          aria-label={`Reorder ${meta.label}`}
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(v) => toggle(key, v)}
                          aria-label={`Show ${meta.label} tab`}
                        />
                        <div className="flex-1 min-w-0">
                          <Label className="text-sm font-semibold cursor-pointer block">
                            {meta.label}
                          </Label>
                          <p className="text-xs text-muted-foreground truncate">
                            {meta.helper}
                          </p>
                        </div>
                        {!enabled && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Hidden
                          </span>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-muted-foreground">
          Tip: a tab with no data (e.g. Sponsors with no sponsors yet) is hidden automatically.
        </p>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="ml-1.5">Save Tabs</span>
        </Button>
      </div>
    </div>
  );
};

export default PublicTabsManager;
