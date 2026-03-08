import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Download, Loader2, Pencil, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { openPrintWindow, downloadHtmlAsPdf, getFontImport } from "./printUtils";
import type { Tournament, Registration } from "./types";
import { getPrimaryColor, getFontFamily } from "./types";
import PrintableSettings, { getDefaultOptions, type PrintableOptions } from "./PrintableSettings";

interface Props {
  tournament: Tournament | null;
  registrations: Registration[];
  loading: boolean;
}

interface EditableReg extends Registration {
  customFirstName?: string;
  customLastName?: string;
  customGroupNumber?: number | null;
}

function cartSignHtml(r: EditableReg, tournament: Tournament | null, opts: PrintableOptions) {
  const color = getPrimaryColor(tournament);
  const fontMap: Record<string, string> = {
    georgia: "'Georgia', serif",
    helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    playfair: "'Playfair Display', Georgia, serif",
    roboto: "'Roboto', 'Helvetica Neue', sans-serif",
    courier: "'Courier New', Courier, monospace",
  };
  const font = fontMap[opts.font] || fontMap.georgia;
  const layout = opts.layout;

  const borderStyle = layout === "bold" ? `3px solid ${color}` : layout === "modern" ? `1px solid #e0e0e0` : `2px solid ${color}`;
  const bgStyle = layout === "bold" ? `background:${color};` : "";
  const nameColor = layout === "bold" ? "#fff" : "#1a1a1a";
  const subtitleColor = layout === "bold" ? "rgba(255,255,255,0.7)" : "#666";
  const accentColor = layout === "bold" ? "rgba(255,255,255,0.9)" : color;

  const firstName = r.customFirstName ?? r.first_name;
  const lastName = r.customLastName ?? r.last_name;
  const groupNum = r.customGroupNumber !== undefined ? r.customGroupNumber : r.group_number;

  return `
    <div style="width:100%;height:5in;display:flex;flex-direction:column;align-items:center;justify-content:center;border:${borderStyle};border-radius:12px;padding:24px;text-align:center;position:relative;font-family:${font};${bgStyle}">
      ${opts.showLogo && tournament?.site_logo_url ? `<img src="${tournament.site_logo_url}" alt="" style="height:60px;object-fit:contain;margin-bottom:16px;${layout === "bold" ? "filter:brightness(0) invert(1);" : ""}" />` : ""}
      ${opts.showTournamentTitle ? `<div style="font-size:14px;font-weight:600;color:${subtitleColor};letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">${tournament?.title ?? ""}</div>` : ""}
      <div style="font-size:32px;font-weight:bold;color:${nameColor};margin-bottom:12px;">${firstName} ${lastName}</div>
      ${opts.showStartingHole && groupNum != null ? `<div style="font-size:18px;color:${accentColor};font-weight:600;">Starting Hole: ${groupNum}</div>` : ""}
    </div>`;
}

export default function CartSignsTab({ tournament, registrations, loading }: Props) {
  const [opts, setOpts] = useState<PrintableOptions>(() => getDefaultOptions(tournament));
  const [edits, setEdits] = useState<Record<string, EditableReg>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", groupNumber: "" });

  const fontImport = getFontImport(opts.font);

  const getEditableReg = (r: Registration): EditableReg => edits[r.id] || r;

  const startEdit = (r: Registration) => {
    const e = getEditableReg(r);
    setEditForm({
      firstName: e.customFirstName ?? e.first_name,
      lastName: e.customLastName ?? e.last_name,
      groupNumber: (e.customGroupNumber !== undefined ? e.customGroupNumber : e.group_number)?.toString() ?? "",
    });
    setEditingId(r.id);
  };

  const saveEdit = (r: Registration) => {
    setEdits((prev) => ({
      ...prev,
      [r.id]: {
        ...r,
        customFirstName: editForm.firstName,
        customLastName: editForm.lastName,
        customGroupNumber: editForm.groupNumber ? parseInt(editForm.groupNumber) : null,
      },
    }));
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const editableRegs = registrations.map(getEditableReg);
  const allHtml = editableRegs.map((r, i) =>
    `<div style="page-break-after:${i < editableRegs.length - 1 ? "always" : "auto"};">${cartSignHtml(r, tournament, opts)}</div>`
  ).join("");

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (registrations.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No registered players yet.</p></div>;

  return (
    <>
      <PrintableSettings options={opts} onChange={setOpts} />

      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Cart Signs - ${tournament?.title}`, allHtml, fontImport)}>
          <Download className="h-4 w-4 mr-2" /> Save as PDF
        </Button>
        <Button onClick={() => openPrintWindow(`Cart Signs - ${tournament?.title}`, allHtml, fontImport)}>
          <Printer className="h-4 w-4 mr-2" /> Print Cart Signs
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {registrations.map((r) => {
          const er = getEditableReg(r);
          const isEditing = editingId === r.id;
          const firstName = er.customFirstName ?? er.first_name;
          const lastName = er.customLastName ?? er.last_name;
          const groupNum = er.customGroupNumber !== undefined ? er.customGroupNumber : er.group_number;

          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border-2 border-primary/30 rounded-xl p-6 flex flex-col items-center text-center gap-2 relative group">

              {!isEditing && (
                <button onClick={() => startEdit(r)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-muted hover:bg-muted/80">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}

              {isEditing ? (
                <div className="w-full space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" className="text-sm" />
                    <Input value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className="text-sm" />
                  </div>
                  <Input value={editForm.groupNumber} onChange={(e) => setEditForm((p) => ({ ...p, groupNumber: e.target.value }))} placeholder="Starting hole" type="number" className="text-sm" />
                  <div className="flex justify-center gap-2">
                    <Button size="sm" onClick={() => saveEdit(r)} className="gap-1"><Check className="h-3.5 w-3.5" /> Save</Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1"><X className="h-3.5 w-3.5" /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  {opts.showLogo && tournament?.site_logo_url && <img src={tournament.site_logo_url} alt="" className="h-10 object-contain" />}
                  {opts.showTournamentTitle && <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{tournament?.title}</p>}
                  <p className="text-xl font-display font-bold text-foreground">{firstName} {lastName}</p>
                  {opts.showStartingHole && groupNum != null && <p className="text-sm font-semibold text-primary">Starting Hole: {groupNum}</p>}
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
