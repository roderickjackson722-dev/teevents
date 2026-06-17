import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useBookings, type BookingSlot } from "@/hooks/useBookings";
import { BookingSlotList } from "@/components/bookings/BookingSlotList";
import { BookingSlotEditor } from "@/components/bookings/BookingSlotEditor";
import { BookingCategoryManager } from "@/components/bookings/BookingCategoryManager";
import { BookingReservationsDrawer } from "@/components/bookings/BookingReservationsDrawer";
import { BookingExportMenu } from "@/components/bookings/BookingExportMenu";
import { BookingNotificationSettings } from "@/components/bookings/BookingNotificationSettings";

export default function CollegeHubBookings() {
  const { toast } = useToast();
  const [params] = useSearchParams();
  const CONTEXT = params.get("context") || "college-hub";
  const label = params.get("label") || "College Hub";
  const { slots, categories, loading, reload } = useBookings(CONTEXT);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<BookingSlot | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSlot, setDrawerSlot] = useState<BookingSlot | null>(null);

  const addSlot = () => { setEditingSlot(null); setEditorOpen(true); };
  const editSlot = (s: BookingSlot) => { setEditingSlot(s); setEditorOpen(true); };
  const viewBookings = (s: BookingSlot) => { setDrawerSlot(s); setDrawerOpen(true); };

  const deleteSlot = async (s: BookingSlot) => {
    if (!confirm(`Delete slot "${s.title}"? This will also remove all bookings for it.`)) return;
    const { error } = await (supabase as any).from("booking_slots").delete().eq("id", s.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Slot deleted" }); reload(); }
  };

  const publicUrl = `/college-hub/bookings?context=${encodeURIComponent(CONTEXT)}`;

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to admin
          </Link>
          <h1 className="text-2xl font-bold mt-1">{label} — Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage Team Therapy and other booking slots for coaches. Context: <code className="text-xs">{CONTEXT}</code></p>
        </div>
        <Button asChild variant="outline">
          <Link to={publicUrl} target="_blank"><ExternalLink className="w-4 h-4 mr-2" />Public Page</Link>
        </Button>
      </div>

      <Tabs defaultValue="slots">
        <TabsList>
          <TabsTrigger value="slots">Slots</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="slots" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={addSlot}><Plus className="w-4 h-4 mr-1" />Add Slot</Button>
          </div>
          {loading ? <p>Loading...</p> : (
            <BookingSlotList
              slots={slots}
              categories={categories}
              mode="admin"
              onEdit={editSlot}
              onDelete={deleteSlot}
              onViewBookings={viewBookings}
            />
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <BookingCategoryManager categories={categories} context={CONTEXT} onChanged={reload} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <BookingNotificationSettings context={CONTEXT} />
        </TabsContent>

        <TabsContent value="export" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">Download all bookings for this context.</p>
          <BookingExportMenu context={CONTEXT} />
        </TabsContent>
      </Tabs>

      <BookingSlotEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        categories={categories}
        slot={editingSlot}
        context={CONTEXT}
        onSaved={reload}
      />
      <BookingReservationsDrawer
        slot={drawerSlot}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onChanged={reload}
      />
    </div>
  );
}
