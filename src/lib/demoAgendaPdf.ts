import jsPDF from "jspdf";
import { AGENDA_FLOW, PLATFORM_LABELS, TALKING_POINTS, type PlatformKey } from "./demoTalkingPoints";

export function generateDemoAgendaPdf(opts: {
  tournamentName: string;
  prospectName?: string | null;
  platform?: PlatformKey | null;
  notes?: string | null;
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const M = 48;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = M;

  const ensure = (need: number) => {
    if (y + need > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const h1 = (s: string) => {
    ensure(28);
    doc.setFont("helvetica", "bold").setFontSize(18).setTextColor("#1a5c38");
    doc.text(s, M, y);
    y += 24;
  };
  const h2 = (s: string) => {
    ensure(22);
    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor("#1a1a1a");
    doc.text(s, M, y);
    y += 18;
  };
  const p = (s: string, color = "#333") => {
    doc.setFont("helvetica", "normal").setFontSize(10.5).setTextColor(color);
    const lines = doc.splitTextToSize(s, W - M * 2);
    ensure(lines.length * 13 + 4);
    doc.text(lines, M, y);
    y += lines.length * 13 + 4;
  };
  const bullet = (s: string) => {
    doc.setFont("helvetica", "normal").setFontSize(10.5).setTextColor("#333");
    const lines = doc.splitTextToSize(s, W - M * 2 - 16);
    ensure(lines.length * 13 + 2);
    doc.text("•", M, y);
    doc.text(lines, M + 14, y);
    y += lines.length * 13 + 2;
  };

  // Cover
  h1("Tournament Demo Agenda");
  p(`Prepared for: ${opts.prospectName || "Prospect"}`);
  p(`Tournament: ${opts.tournamentName}`);
  if (opts.platform) p(`Currently using: ${PLATFORM_LABELS[opts.platform]}`);
  y += 8;

  // Flow
  h1("Demo Flow (15 minutes)");
  for (const step of AGENDA_FLOW) {
    h2(`${step.title} (${step.minutes} min)`);
    for (const b of step.bullets) bullet(b);
    y += 4;
  }

  // Pain points
  if (opts.platform && TALKING_POINTS[opts.platform]) {
    h1("Pain Points & TeeVents Solutions");
    for (const tp of TALKING_POINTS[opts.platform]) {
      h2(tp.pain);
      bullet(tp.solution);
    }
  }

  // Notes
  if (opts.notes && opts.notes.trim()) {
    h1("Custom Notes");
    p(opts.notes);
  }

  // Next steps
  h1("Next Steps");
  bullet("After the demo, click 'Convert to Live Tournament' in the admin dashboard.");
  bullet("The prospect receives a signup link to claim the tournament.");
  bullet("All mock data is removed; settings are kept.");

  doc.save(`demo-agenda-${opts.tournamentName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
