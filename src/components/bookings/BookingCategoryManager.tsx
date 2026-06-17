import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BookingCategory } from "@/hooks/useBookings";

interface Props {
  categories: BookingCategory[];
  context: string;
  onChanged: () => void;
}

export function BookingCategoryManager({ categories, context, onChanged }: Props) {
  const { toast } = useToast();
  const [newCat, setNewCat] = useState({ name: "", description: "", color: "#1a5c38" });

  const add = async () => {
    if (!newCat.name.trim()) return;
    const { error } = await (supabase as any).from("booking_categories").insert({ ...newCat, context });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setNewCat({ name: "", description: "", color: "#1a5c38" });
    toast({ title: "Category added" });
    onChanged();
  };

  const update = async (id: string, patch: Partial<BookingCategory>) => {
    const { error } = await (supabase as any).from("booking_categories").update(patch).eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); onChanged(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await (supabase as any).from("booking_categories").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); onChanged(); }
  };

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr,80px,auto] gap-2 items-end">
          <div><label className="text-xs">Name</label><Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="Physical Therapy" /></div>
          <div><label className="text-xs">Description</label><Input value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })} placeholder="Optional" /></div>
          <div><label className="text-xs">Color</label><Input type="color" value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} /></div>
          <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
      </Card>
      <div className="space-y-2">
        {categories.map((c) => (
          <CategoryRow key={c.id} cat={c} onSave={(patch) => update(c.id, patch)} onDelete={() => remove(c.id)} />
        ))}
        {categories.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No categories yet.</p>}
      </div>
    </div>
  );
}

function CategoryRow({ cat, onSave, onDelete }: { cat: BookingCategory; onSave: (p: Partial<BookingCategory>) => void; onDelete: () => void }) {
  const [edit, setEdit] = useState({ name: cat.name, description: cat.description || "", color: cat.color || "#1a5c38" });
  const dirty = edit.name !== cat.name || edit.description !== (cat.description || "") || edit.color !== (cat.color || "#1a5c38");
  return (
    <Card className="p-3">
      <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr,80px,auto,auto] gap-2 items-center">
        <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        <Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
        <Input type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} />
        <Button size="sm" variant="outline" disabled={!dirty} onClick={() => onSave(edit)}><Save className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
      </div>
    </Card>
  );
}
