import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical, Loader2, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  PUBLIC_TABS,
  PublicTabKey,
  normalizeOrder,
  normalizeVisibility,
  normalizeSectionTitles,
  type PublicSectionTitles,
} from "@/lib/publicTabs";

interface PublicTabsManagerProps {
  tournamentId: string;
  initialVisibility: Partial<Record<string, boolean>> | null | undefined;
  initialOrder: string[] | null | undefined;
  initialTitles?: unknown;
  onSaved?: (values: { public_tabs: Record<PublicTabKey, boolean>; public_tabs_order: PublicTabKey[]; public_section_titles: PublicSectionTitles }) => void;
  onChange?: (values: { public_tabs: Record<PublicTabKey, boolean>; public_tabs_order: PublicTabKey[]; public_section_titles: PublicSectionTitles }) => void;
  hideSave?: boolean;
  enhancedDrag?: boolean;
  /** @deprecated no longer used — Registration is now a reorderable section */
  initialGolfersFirst?: boolean | null;
}

export const PublicTabsManager = ({
  tournamentId,
  initialVisibility,
  initialOrder,
  initialTitles,
  onSaved,
  onChange,
  hideSave = false,
  enhancedDrag = false,
}: PublicTabsManagerProps) => {
  const { toast } = useToast();
  const [visibility, setVisibility] = useState<Record<PublicTabKey, boolean>>(
    normalizeVisibility(initialVisibility),
  );
  const [order, setOrder] = useState<PublicTabKey[]>(normalizeOrder(initialOrder));
  const [titles, setTitles] = useState<PublicSectionTitles>(normalizeSectionTitles(initialTitles));
  const [saving, setSaving] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const tabMeta = (key: PublicTabKey) =>
    PUBLIC_TABS.find((t) => t.key === key) ?? PUBLIC_TABS[0];

  const onDragEnd = (result: DropResult) => {
    setDropIndex(null);
    if (!result.destination) return;
    const next = Array.from(order);
    const [moved] = next.splice(result.source.index, 1);
    if (!moved) return;
    next.splice(result.destination.index, 0, moved);
    setOrder(next);
    onChange?.({ public_tabs: visibility, public_tabs_order: next, public_section_titles: normalizeSectionTitles(titles) });
  };

  const toggle = (key: PublicTabKey, value: boolean) => {
    const next = { ...visibility, [key]: value };
    setVisibility(next);
    onChange?.({ public_tabs: next, public_tabs_order: order, public_section_titles: normalizeSectionTitles(titles) });
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({
        public_tabs: visibility as any,
        public_tabs_order: order,
        public_section_titles: normalizeSectionTitles(titles),
      } as any)
      .eq("id", tournamentId);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save tabs", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Page layout saved",
      description: "Your changes are live on the public tournament page.",
    });
    onSaved?.({ public_tabs: visibility, public_tabs_order: order, public_section_titles: normalizeSectionTitles(titles) });
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-card space-y-4">
      <div>
        <h3 className="text-base font-bold text-foreground">Page Layout</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Drag to reorder sections and use the toggle to show or hide each one.
          The order controls both your public page's navigation tabs and the order
          of the matching sections on the page. Hidden sections are removed from
          both the page and the nav. Home and Contact always appear.
        </p>
      </div>

      <DragDropContext onDragEnd={onDragEnd} onDragUpdate={(update) => setDropIndex(update.destination?.index ?? null)} onBeforeDragStart={(start) => setDropIndex(start.source.index)}>
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
                  <Draggable key={key} draggableId={key} index={index} disableInteractiveElementBlocking={enhancedDrag}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`relative flex items-center gap-3 rounded-md border px-3 py-2 transition-shadow ${
                          snapshot.isDragging
                            ? enhancedDrag ? "border-secondary bg-secondary text-primary ring-2 ring-primary shadow-lg" : "border-primary bg-background shadow-md"
                            : "border-border bg-background"
                        }`}
                      >
                        {enhancedDrag && !snapshot.isDragging && dropIndex === index && <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 rounded-md border-2 border-dashed border-primary bg-secondary/20 ring-2 ring-secondary"><span className="absolute right-2 top-0 rounded-b bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Drop here</span></span>}
                         <Button
                          type="button"
                           variant="ghost"
                           size="icon"
                          {...dragProvided.dragHandleProps}
                          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
                          aria-label={`Reorder ${meta.label}`}
                        >
                          <GripVertical className="h-4 w-4" />
                         </Button>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(v) => toggle(key, v)}
                          aria-label={`Show ${meta.label} tab`}
                        />
                        <div className="flex-1 min-w-0">
                           <Label htmlFor={`section-title-${tournamentId}-${key}`} className="text-sm font-semibold block">
                            {meta.label}
                          </Label>
                           <Input
                             id={`section-title-${tournamentId}-${key}`}
                             aria-label={`${meta.label} section title`}
                             value={titles[key] ?? ""}
                             placeholder={meta.label}
                             maxLength={80}
                             onChange={(event) => {
                               const next = { ...titles, [key]: event.target.value };
                               setTitles(next);
                               onChange?.({ public_tabs: visibility, public_tabs_order: order, public_section_titles: normalizeSectionTitles(next) });
                             }}
                             className="mt-1 mb-1 h-8 text-sm"
                           />
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
        {!hideSave && <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="ml-1.5">Save Layout</span>
        </Button>}
      </div>
    </div>
  );
};

export default PublicTabsManager;
