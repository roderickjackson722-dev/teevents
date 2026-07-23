import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trophy, Loader2, ExternalLink, Trash2, Search, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  league_name: string;
  league_slug: string | null;
  organization_id: string;
  season_year: number | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  org_name?: string;
  member_count?: number;
  event_count?: number;
}

export default function AdminLeagues() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("golf_leagues")
      .select("id, league_name, league_slug, organization_id, season_year, is_active, is_public, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load leagues", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const list = (data as Row[]) || [];
    const orgIds = Array.from(new Set(list.map((r) => r.organization_id).filter(Boolean)));
    const { data: orgs } = orgIds.length
      ? await (supabase as any).from("organizations").select("id, name").in("id", orgIds)
      : { data: [] as any[] };
    const orgMap = new Map<string, string>((orgs || []).map((o: any) => [o.id, o.name]));

    const enriched = await Promise.all(
      list.map(async (l) => {
        const [{ count: mCount }, { count: eCount }] = await Promise.all([
          (supabase as any).from("league_members").select("id", { count: "exact", head: true }).eq("league_id", l.id),
          (supabase as any).from("league_events").select("id", { count: "exact", head: true }).eq("league_id", l.id),
        ]);
        return {
          ...l,
          org_name: orgMap.get(l.organization_id) || "(unknown org)",
          member_count: mCount || 0,
          event_count: eCount || 0,
        };
      })
    );
    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.league_name.toLowerCase().includes(q) ||
      (r.org_name || "").toLowerCase().includes(q) ||
      (r.league_slug || "").toLowerCase().includes(q)
    );
  });

  const openAsAdmin = (row: Row) => {
    // Reuse the org impersonation param already supported by useOrgContext
    navigate(`/dashboard/leagues/${row.id}?admin_org=${row.organization_id}`);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      toast({ title: "Type DELETE to confirm", variant: "destructive" });
      return;
    }
    setDeleting(true);
    const { error } = await (supabase as any).from("golf_leagues").delete().eq("id", pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "League deleted", description: pendingDelete.league_name });
    setPendingDelete(null);
    setConfirmText("");
    load();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin</Link>
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Golf Leagues (All Organizations)
          </h1>
          <p className="text-muted-foreground mt-1">
            Admin view of every league on the platform. Open a league to manage it on behalf of the organizer.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search leagues or organizations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {rows.length === 0 ? "No leagues have been created yet." : "No leagues match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((l) => (
            <Card key={l.id}>
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 space-y-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex flex-wrap items-center gap-2 break-words text-lg">
                    <span className="break-words">{l.league_name}</span>
                    {l.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    {l.is_public && <Badge variant="outline">Public</Badge>}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                    <span>Org: <span className="font-medium text-foreground">{l.org_name}</span></span>
                    <span>{l.member_count} members</span>
                    <span>{l.event_count} events</span>
                    {l.season_year && <span>Season: {l.season_year}</span>}
                    {l.league_slug && <span>/league/{l.league_slug}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button onClick={() => openAsAdmin(l)}>
                    Manage as Admin
                  </Button>
                  {l.league_slug && (
                    <Button asChild variant="outline">
                      <a href={`/league/${l.league_slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" /> Public Page
                      </a>
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => { setPendingDelete(l); setConfirmText(""); }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) { setPendingDelete(null); setConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this league?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete <strong>{pendingDelete?.league_name}</strong> from{" "}
              <strong>{pendingDelete?.org_name}</strong>. This will remove members, events, scores, and standings
              associated with this league. This action cannot be undone.
              <br /><br />
              Type <code className="font-mono font-bold">DELETE</code> below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting || confirmText.trim().toUpperCase() !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete League
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
