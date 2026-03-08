import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { openPrintWindow, downloadHtmlAsPdf } from "./printUtils";
import type { Tournament, Registration } from "./types";

interface Props {
  tournament: Tournament | null;
  registrations: Registration[];
  loading: boolean;
  onUpdate: (id: string, groupNumber: number | null) => void;
}

export default function HoleAssignmentsTab({ tournament, registrations, loading, onUpdate }: Props) {
  const [editingHole, setEditingHole] = useState<{ id: string; value: string } | null>(null);

  const holeGroups = registrations.reduce((acc, r) => {
    const hole = r.group_number ?? 0;
    if (!acc[hole]) acc[hole] = [];
    acc[hole].push(r);
    return acc;
  }, {} as Record<number, Registration[]>);
  const sortedHoles = Object.keys(holeGroups).map(Number).sort((a, b) => a - b);

  const handleSave = async (regId: string) => {
    const v = editingHole?.value ? parseInt(editingHole.value) : null;
    await supabase.from("tournament_registrations").update({ group_number: v }).eq("id", regId);
    onUpdate(regId, v);
    setEditingHole(null);
  };

  const printHtml = `
    <h1 style="font-size:22px;margin-bottom:4px;">${tournament?.title ?? ""}</h1>
    <p style="color:#666;font-size:13px;margin-bottom:24px;">Hole Assignments</p>
    ${sortedHoles.map((hole) => `
      <div style="margin-bottom:20px;">
        <div style="font-size:16px;font-weight:700;padding:6px 12px;background:#f0f0f0;border-radius:4px;margin-bottom:4px;">${hole === 0 ? "Unassigned" : `Hole ${hole}`}</div>
        ${holeGroups[hole].map((r) => `<div style="padding:6px 12px;font-size:14px;border-bottom:1px solid #eee;">${r.last_name}, ${r.first_name}</div>`).join("")}
      </div>
    `).join("")}`;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (registrations.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No registered players yet.</p></div>;

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Hole Assignments - ${tournament?.title}`, printHtml)}>
          <Download className="h-4 w-4 mr-2" /> Save as PDF
        </Button>
        <Button onClick={() => openPrintWindow(`Hole Assignments - ${tournament?.title}`, printHtml)}>
          <Printer className="h-4 w-4 mr-2" /> Print Hole Assignments
        </Button>
      </div>
      <div className="space-y-6">
        {sortedHoles.map((hole) => (
          <motion.div key={hole} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-display font-bold text-foreground">
                {hole === 0 ? "Unassigned" : `Hole ${hole}`}
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {holeGroups[hole].length} player{holeGroups[hole].length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="bg-card rounded-lg border border-border divide-y divide-border">
              {holeGroups[hole].map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <span className="text-sm font-medium text-foreground">{r.last_name}, {r.first_name}</span>
                  {editingHole?.id === r.id ? (
                    <div className="flex items-center gap-2">
                      <Input type="number" className="w-20 h-8 text-sm" value={editingHole.value}
                        onChange={(e) => setEditingHole({ id: r.id, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(r.id);
                          if (e.key === "Escape") setEditingHole(null);
                        }}
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => handleSave(r.id)}>Save</Button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingHole({ id: r.id, value: String(r.group_number ?? "") })} className="text-xs text-primary hover:underline">
                      {r.group_number != null ? `Hole ${r.group_number}` : "Assign"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}
