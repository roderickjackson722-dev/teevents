import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, RefreshCw, Download } from "lucide-react";

function toCsv(rows: Edit[]): string {
  const headers = [
    "timestamp",
    "player_first_name",
    "player_last_name",
    "hole_number",
    "old_score",
    "new_score",
    "editor_email",
    "editor_type",
    "notes",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      new Date(r.created_at).toISOString(),
      r.player_first_name || "",
      r.player_last_name || "",
      r.hole_number,
      r.old_score ?? "",
      r.new_score ?? "",
      r.editor_email || "",
      r.editor_type || "",
      r.notes || "",
    ].map(esc).join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

type Edit = {
  id: string;
  registration_id: string;
  player_first_name: string | null;
  player_last_name: string | null;
  hole_number: number;
  old_score: number | null;
  new_score: number | null;
  edited_by: string | null;
  editor_email: string | null;
  editor_type: string | null;
  notes: string | null;
  created_at: string;
};

interface Props {
  tournamentId: string;
}

export default function ScoreEditHistory({ tournamentId }: Props) {
  const [rows, setRows] = useState<Edit[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [player, setPlayer] = useState("");
  const [hole, setHole] = useState("");
  const [editor, setEditor] = useState("");

  async function load() {
    if (!tournamentId) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_score_edit_history", {
      _tournament_id: tournamentId,
      _limit: limit,
    });
    if (!error) setRows((data as Edit[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, limit]);

  const filtered = useMemo(() => {
    const p = player.trim().toLowerCase();
    const e = editor.trim().toLowerCase();
    const h = hole.trim();
    return rows.filter((r) => {
      if (h && String(r.hole_number) !== h) return false;
      if (p) {
        const name = `${r.player_first_name || ""} ${r.player_last_name || ""}`.toLowerCase();
        if (!name.includes(p)) return false;
      }
      if (e) {
        if (!(r.editor_email || "").toLowerCase().includes(e)) return false;
      }
      return true;
    });
  }, [rows, player, hole, editor]);

  if (!tournamentId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" /> Edit History
          <Badge variant="secondary" className="ml-1">{rows.length}</Badge>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (filtered.length === 0) return;
                const csv = toCsv(filtered);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `score-edit-history-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              disabled={filtered.length === 0}
            >
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={load}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Filter by player"
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            className="max-w-[200px]"
          />
          <Input
            placeholder="Hole #"
            value={hole}
            onChange={(e) => setHole(e.target.value.replace(/[^0-9]/g, ""))}
            className="max-w-[100px]"
          />
          <Input
            placeholder="Filter by editor email"
            value={editor}
            onChange={(e) => setEditor(e.target.value)}
            className="max-w-[240px]"
          />
        </div>

        {loading && rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            <Loader2 className="h-4 w-4 inline animate-spin mr-2" /> Loading history…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No score edits recorded yet.</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">When</th>
                    <th className="text-left px-3 py-2 font-medium">Player</th>
                    <th className="text-center px-3 py-2 font-medium">Hole</th>
                    <th className="text-center px-3 py-2 font-medium">Change</th>
                    <th className="text-left px-3 py-2 font-medium">Editor</th>
                    <th className="text-left px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        {r.player_first_name} {r.player_last_name}
                      </td>
                      <td className="px-3 py-2 text-center">{r.hole_number}</td>
                      <td className="px-3 py-2 text-center font-mono">
                        <span className="text-muted-foreground">{r.old_score ?? "—"}</span>
                        <span className="mx-1">→</span>
                        <span className="font-semibold">{r.new_score ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div>{r.editor_email || <span className="text-muted-foreground">unknown</span>}</div>
                        {r.editor_type && (
                          <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">{r.editor_type}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.notes || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {rows.length >= limit && (
          <div className="text-center">
            <Button size="sm" variant="outline" onClick={() => setLimit((l) => l + 100)}>
              Load more
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
