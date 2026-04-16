import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Download, Loader2, Pencil, Check, X, QrCode } from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { openPrintWindow, downloadHtmlAsPdf, getFontImport } from "./printUtils";
import type { Tournament, Registration } from "./types";
import { getPrimaryColor } from "./types";
import PrintableSettings, { getDefaultOptions, type PrintableOptions } from "./PrintableSettings";

interface CourseDataProp {
  hole_pars: number[] | null;
  stroke_indexes: number[] | null;
  hole_distances: number[] | null;
  name: string | null;
  tee_name: string | null;
}

interface Props {
  tournament: Tournament | null;
  registrations: Registration[];
  loading: boolean;
  slug?: string;
  courseData?: CourseDataProp | null;
}

interface EditableReg extends Registration {
  customFirstName?: string;
  customLastName?: string;
  customGroupNumber?: number | null;
}

function getHolePar(tournament: Tournament | null, holeIndex: number, numHoles: number, courseData?: CourseDataProp | null): number {
  // Prefer course data from golf_courses table
  if (courseData?.hole_pars && Array.isArray(courseData.hole_pars) && courseData.hole_pars[holeIndex] != null) {
    return courseData.hole_pars[holeIndex];
  }
  if (tournament?.hole_pars && Array.isArray(tournament.hole_pars) && tournament.hole_pars[holeIndex] != null) {
    return tournament.hole_pars[holeIndex];
  }
  const totalPar = tournament?.course_par ?? (numHoles === 9 ? 36 : 72);
  return Math.round(totalPar / numHoles);
}

function getTotalPar(tournament: Tournament | null, numHoles: number): number {
  if (tournament?.hole_pars && Array.isArray(tournament.hole_pars)) {
    return tournament.hole_pars.slice(0, numHoles).reduce((sum, p) => sum + (p || 0), 0);
  }
  return tournament?.course_par ?? (numHoles === 9 ? 36 : 72);
}

function getScoringUrl(slug: string | undefined, scoringCode: string | undefined): string {
  if (!slug || !scoringCode) return "";
  return `${window.location.origin}/t/${slug}/scoring?code=${scoringCode}`;
}

function scorecardHtml(r: EditableReg, tournament: Tournament | null, numHoles: number, opts: PrintableOptions, showScoringQR: boolean, slug?: string, courseData?: CourseDataProp | null) {
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
  const totalPar = getTotalPar(tournament, numHoles);

  const borderStyle = layout === "bold" ? `3px solid ${color}` : layout === "modern" ? `1px solid #e0e0e0` : `2px solid ${color}`;
  const headerBg = layout === "bold" ? color : "transparent";
  const headerColor = layout === "bold" ? "#fff" : "#1a1a1a";

  const firstName = r.customFirstName ?? r.first_name;
  const lastName = r.customLastName ?? r.last_name;
  const groupNum = r.customGroupNumber !== undefined ? r.customGroupNumber : r.group_number;
  const scoringCode = (r as any).scoring_code;
  const scoringUrl = getScoringUrl(slug, scoringCode);

  const holeCells = Array.from({ length: numHoles }, (_, i) =>
    `<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:12px;font-weight:600;width:36px;">${i + 1}</td>`
  ).join("");

  const parCells = Array.from({ length: numHoles }, (_, i) =>
    `<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:11px;color:#666;">${getHolePar(tournament, i, numHoles, courseData)}</td>`
  ).join("");

  const siValues = courseData?.stroke_indexes;
  const siCells = siValues ? Array.from({ length: numHoles }, (_, i) =>
    `<td style="border:1px solid #ccc;padding:3px 6px;text-align:center;font-size:10px;color:#999;">${siValues[i] || ""}</td>`
  ).join("") : "";

  const distValues = courseData?.hole_distances;
  const distCells = distValues && (distValues as number[]).some((d: number) => d > 0) ? Array.from({ length: numHoles }, (_, i) =>
    `<td style="border:1px solid #ccc;padding:3px 6px;text-align:center;font-size:10px;color:#999;">${(distValues as number[])[i] || ""}</td>`
  ).join("") : "";

  const emptyCells = Array.from({ length: numHoles }, () =>
    `<td style="border:1px solid #ccc;padding:10px 6px;text-align:center;">&nbsp;</td>`
  ).join("");

  const qrSection = showScoringQR && scoringUrl ? `
    <div style="display:flex;align-items:center;gap:12px;padding:0 16px 12px;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(scoringUrl)}" style="width:80px;height:80px;" />
      <div>
        <div style="font-size:11px;font-weight:600;color:${color};">Scan to Enter Scores</div>
        <div style="font-size:10px;color:#888;">Code: ${scoringCode}</div>
      </div>
    </div>` : "";

  return `
    <div style="page-break-inside:avoid;margin-bottom:24px;border:${borderStyle};border-radius:8px;overflow:hidden;font-family:${font};">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:${headerBg};color:${headerColor};">
        <div>
          ${opts.showTournamentTitle ? `<div style="font-size:10px;font-weight:600;${layout === "bold" ? "color:rgba(255,255,255,0.7)" : "color:#666"};letter-spacing:2px;text-transform:uppercase;">${tournament?.title ?? ""}</div>` : ""}
          <div style="font-size:18px;font-weight:bold;">${firstName} ${lastName}</div>
          ${opts.showCourseName && (courseData?.name || tournament?.course_name) ? `<div style="font-size:12px;${layout === "bold" ? "color:rgba(255,255,255,0.7)" : "color:#666"};">${courseData?.name || tournament?.course_name}${courseData?.tee_name ? ` &bull; ${courseData.tee_name} Tees` : ""} &bull; Par ${totalPar} &bull; ${numHoles} Holes</div>` : ""}
        </div>
        ${opts.showLogo && tournament?.site_logo_url ? `<img src="${tournament.site_logo_url}" style="height:40px;object-fit:contain;${layout === "bold" ? "filter:brightness(0) invert(1);" : ""}" />` : ""}
      </div>
      <div style="padding:0 16px 16px;overflow-x:auto;">
        <table style="border-collapse:collapse;width:100%;">
          <tr style="background:#f5f5f5;">${holeCells}<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:12px;font-weight:700;background:#e8e8e8;">TOT</td></tr>
          <tr>${parCells}<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:11px;color:#666;font-weight:600;">${totalPar}</td></tr>
          ${siCells ? `<tr style="background:#fafafa;"><td style="border:1px solid #ccc;padding:2px 4px;text-align:left;font-size:9px;color:#999;font-weight:600;">SI</td>${siCells.substring(siCells.indexOf('>')+1)}</tr>` : ""}
          ${distCells ? `<tr style="background:#fafafa;"><td style="border:1px solid #ccc;padding:2px 4px;text-align:left;font-size:9px;color:#999;font-weight:600;">Yds</td>${distCells.substring(distCells.indexOf('>')+1)}</tr>` : ""}
          <tr>${emptyCells}<td style="border:1px solid #ccc;padding:10px 6px;text-align:center;">&nbsp;</td></tr>
        </table>
      </div>
      ${opts.showStartingHole && groupNum != null ? `<div style="padding:0 16px ${showScoringQR ? '8px' : '12px'};font-size:11px;color:${color};">Starting Hole: ${groupNum}</div>` : ""}
      ${qrSection}
    </div>`;
}

export default function ScorecardsTab({ tournament, registrations, loading, slug, courseData }: Props) {
  const [numHoles, setNumHoles] = useState<9 | 18>(18);
  const [opts, setOpts] = useState<PrintableOptions>(() => getDefaultOptions(tournament));
  const [edits, setEdits] = useState<Record<string, EditableReg>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", groupNumber: "" });
  const [showScoringQR, setShowScoringQR] = useState(false);

  const totalPar = getTotalPar(tournament, numHoles);
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
  const allHtml = editableRegs.map((r) => scorecardHtml(r, tournament, numHoles, opts, showScoringQR, slug, courseData)).join("");

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (registrations.length === 0) return <div className="text-center py-12 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No registered players yet.</p></div>;

  return (
    <>
      <PrintableSettings options={opts} onChange={setOpts} showCourseName />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Holes:</span>
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setNumHoles(9)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${numHoles === 9 ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                9 Holes
              </button>
              <button onClick={() => setNumHoles(18)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${numHoles === 18 ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                18 Holes
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={showScoringQR} onCheckedChange={setShowScoringQR} id="toggle-scoring-qr" />
            <Label htmlFor="toggle-scoring-qr" className="text-xs cursor-pointer flex items-center gap-1">
              <QrCode className="h-3.5 w-3.5" /> Scoring QR Code
            </Label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadHtmlAsPdf(`Scorecards - ${tournament?.title}`, allHtml, fontImport)}>
            <Download className="h-4 w-4 mr-2" /> Save as PDF
          </Button>
          <Button onClick={() => openPrintWindow(`Scorecards - ${tournament?.title}`, allHtml, fontImport)}>
            <Printer className="h-4 w-4 mr-2" /> Print Scorecards
          </Button>
        </div>
      </div>

      {tournament?.hole_pars && tournament.hole_pars.length > 0 && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Custom Hole Pars (edit in Site Builder)</p>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: numHoles }, (_, i) => (
              <span key={i} className="inline-flex items-center justify-center w-8 h-8 text-xs font-medium bg-card border border-border rounded">
                {getHolePar(tournament, i, numHoles, courseData)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {registrations.map((r) => {
          const er = getEditableReg(r);
          const isEditing = editingId === r.id;
          const firstName = er.customFirstName ?? er.first_name;
          const lastName = er.customLastName ?? er.last_name;
          const groupNum = er.customGroupNumber !== undefined ? er.customGroupNumber : er.group_number;
          const scoringCode = (r as any).scoring_code as string | undefined;
          const scoringUrl = getScoringUrl(slug, scoringCode);

          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border-2 border-primary/30 rounded-lg p-4 relative group">

              {!isEditing && (
                <button onClick={() => startEdit(r)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-muted hover:bg-muted/80">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}

              <div className="flex items-center justify-between mb-3">
                {isEditing ? (
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2 max-w-sm">
                      <Input value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" className="text-sm" />
                      <Input value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className="text-sm" />
                    </div>
                    <Input value={editForm.groupNumber} onChange={(e) => setEditForm((p) => ({ ...p, groupNumber: e.target.value }))} placeholder="Starting hole" type="number" className="text-sm max-w-[160px]" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(r)} className="gap-1"><Check className="h-3.5 w-3.5" /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1"><X className="h-3.5 w-3.5" /> Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {opts.showTournamentTitle && <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{tournament?.title}</p>}
                    <p className="text-lg font-display font-bold text-foreground">{firstName} {lastName}</p>
                    {opts.showCourseName && tournament?.course_name && (
                      <p className="text-xs text-muted-foreground">{tournament.course_name} &bull; Par {totalPar} &bull; {numHoles} Holes</p>
                    )}
                  </div>
                )}
                {!isEditing && opts.showLogo && tournament?.site_logo_url && <img src={tournament.site_logo_url} alt="" className="h-8 object-contain" />}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      {Array.from({ length: numHoles }, (_, i) => (
                        <th key={i} className="border border-border px-1.5 py-1 text-center font-semibold text-foreground">{i + 1}</th>
                      ))}
                      <th className="border border-border px-1.5 py-1 text-center font-bold text-foreground bg-muted">TOT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {Array.from({ length: numHoles }, (_, i) => (
                        <td key={i} className="border border-border px-1.5 py-1 text-center text-muted-foreground">
                          {getHolePar(tournament, i, numHoles, courseData)}
                        </td>
                      ))}
                      <td className="border border-border px-1.5 py-1 text-center font-semibold text-foreground">{totalPar}</td>
                    </tr>
                    <tr>
                      {Array.from({ length: numHoles + 1 }, (_, i) => (
                        <td key={i} className="border border-border px-1.5 py-3 text-center">&nbsp;</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              {!isEditing && opts.showStartingHole && groupNum != null && <p className="text-xs text-primary mt-2">Starting Hole: {groupNum}</p>}
              
              {/* Scoring QR Code */}
              {!isEditing && showScoringQR && scoringCode && scoringUrl && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(scoringUrl)}`} 
                    alt="Scoring QR" 
                    className="w-16 h-16" 
                  />
                  <div>
                    <p className="text-xs font-semibold text-primary flex items-center gap-1">
                      <QrCode className="h-3 w-3" /> Scan to Enter Scores
                    </p>
                    <p className="text-[10px] text-muted-foreground">Code: {scoringCode}</p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
