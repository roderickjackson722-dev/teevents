import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Loader2,
  ExternalLink,
  Trash2,
  Search,
  MapPin,
  Calendar,
  Users,
  Plane,
  KeyRound,
  Plus,
  Pencil,
  UserCog,
} from "lucide-react";
import AdminTripCreateDialog from "./AdminTripCreateDialog";
import AdminTripEditDrawer from "./AdminTripEditDrawer";
import AdminTripParticipantsDialog from "./AdminTripParticipantsDialog";

interface Trip {
  id: string;
  title: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  status: string;
  organizer_id: string;
  share_token: string | null;
  created_at: string;
  is_published?: boolean;
  organizer_email?: string;
  participant_count?: number;
}

const statusColor: Record<string, string> = {
  planning: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  active: "bg-green-500/15 text-green-700 dark:text-green-300",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export default function AdminGroupTrips() {
  const [flagEnabled, setFlagEnabled] = useState(false);
  const [flagLoading, setFlagLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTrip, setEditTrip] = useState<Trip | null>(null);
  const [participantsTrip, setParticipantsTrip] = useState<Trip | null>(null);

  const loadFlag = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "enable_group_trips")
      .maybeSingle();
    setFlagEnabled(data?.value === true);
    setFlagLoading(false);
  };

  const loadTrips = async () => {
    setLoading(true);
    const { data: tripsData, error } = await supabase
      .from("golf_trips")
      .select("id, title, destination, start_date, end_date, status, organizer_id, share_token, created_at, is_published")
      .order("start_date", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const enriched: Trip[] = await Promise.all(
      (tripsData || []).map(async (t: any) => {
        const { count } = await supabase
          .from("trip_participants" as any)
          .select("*", { count: "exact", head: true })
          .eq("trip_id", t.id);
        return { ...t, participant_count: count ?? 0 };
      })
    );

    setTrips(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadFlag();
    loadTrips();
  }, []);

  const toggleFlag = async (on: boolean) => {
    setFlagEnabled(on);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "enable_group_trips", value: on as any }, { onConflict: "key" });
    if (error) {
      toast.error(error.message);
      loadFlag();
      return;
    }
    toast.success(`Group Trips ${on ? "enabled" : "disabled"} platform-wide`);
  };

  const deleteTrip = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("golf_trips").delete().eq("id", id);
    setDeletingId(null);
    setConfirmDelete(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Trip deleted");
    loadTrips();
  };

  const filtered = trips.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.destination || "").toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
  });

  const upcoming = filtered.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const past = filtered.filter((t) => t.status === "completed" || t.status === "cancelled");

  return (
    <div className="space-y-6">
      {/* Feature Flag Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle>Module Status</CardTitle>
          </div>
          <CardDescription>
            Control whether the Group Trips module is visible to all users platform-wide.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-muted/30">
            <div>
              <Label className="text-sm font-medium">Enable Group Trips Module</Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, the "Group Trips" link appears in the main navigation for authenticated users.
              </p>
              {flagEnabled && (
                <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                  ✓ Module is currently <strong>live</strong>. All users can access /trips.
                </p>
              )}
            </div>
            {flagLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Switch checked={flagEnabled} onCheckedChange={toggleFlag} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Trips List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>All Group Trips</CardTitle>
                <CardDescription>
                  {trips.length} total trip{trips.length === 1 ? "" : "s"} across all organizers
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search trips..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create Trip
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No trips have been created yet.
            </div>
          ) : (
            <>
              <TripSection
                title="Upcoming & Active"
                trips={upcoming}
                deletingId={deletingId}
                confirmDelete={confirmDelete}
                setConfirmDelete={setConfirmDelete}
                onDelete={deleteTrip}
                onEdit={setEditTrip}
                onParticipants={setParticipantsTrip}
              />
              {past.length > 0 && upcoming.length > 0 && <Separator />}
              <TripSection
                title="Past & Cancelled"
                trips={past}
                deletingId={deletingId}
                confirmDelete={confirmDelete}
                setConfirmDelete={setConfirmDelete}
                onDelete={deleteTrip}
                onEdit={setEditTrip}
                onParticipants={setParticipantsTrip}
              />
            </>
          )}
        </CardContent>
      </Card>

      <AdminTripCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={loadTrips}
      />
      <AdminTripEditDrawer
        trip={editTrip}
        open={!!editTrip}
        onOpenChange={(o) => !o && setEditTrip(null)}
        onSaved={loadTrips}
      />
      <AdminTripParticipantsDialog
        tripId={participantsTrip?.id || null}
        tripTitle={participantsTrip?.title || ""}
        shareToken={participantsTrip?.share_token || null}
        open={!!participantsTrip}
        onOpenChange={(o) => !o && setParticipantsTrip(null)}
      />
    </div>
  );
}

function TripSection({
  title,
  trips,
  deletingId,
  confirmDelete,
  setConfirmDelete,
  onDelete,
  onEdit,
  onParticipants,
}: {
  title: string;
  trips: Trip[];
  deletingId: string | null;
  confirmDelete: string | null;
  setConfirmDelete: (id: string | null) => void;
  onDelete: (id: string) => void;
  onEdit: (trip: Trip) => void;
  onParticipants: (trip: Trip) => void;
}) {
  if (trips.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        {title} ({trips.length})
      </h3>
      <div className="space-y-2">
        {trips.map((t) => (
          <div
            key={t.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{t.title}</h4>
                <Badge variant="secondary" className={statusColor[t.status] || ""}>
                  {t.status}
                </Badge>
                {t.is_published === false && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Unpublished
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                {t.destination && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {t.destination}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(t.start_date), "MMM d")} – {format(new Date(t.end_date), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {t.participant_count ?? 0} participant
                  {t.participant_count === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => onParticipants(t)}>
                <UserCog className="h-3.5 w-3.5 mr-1" /> Participants
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(t)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to={`/trips/${t.id}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
              {t.share_token && (
                <Button asChild size="sm" variant="ghost">
                  <Link to={`/trips/public/${t.share_token}`} target="_blank">
                    Public
                  </Link>
                </Button>
              )}
              {confirmDelete === t.id ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(t.id)}
                    disabled={deletingId === t.id}
                  >
                    {deletingId === t.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(t.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
